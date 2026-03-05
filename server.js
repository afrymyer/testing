require('dotenv').config();
const express = require('express');
const path = require('path');
const FabricClient = require('./src/fabric-client');
const { analyzeTickets, getSummary, getDeepAnalytics, CATEGORY_PATTERNS } = require('./src/ticket-analyzer');
const { loadScript, listScripts } = require('./src/script-mapper');
const { analyzeWithAI, mergeAIResults, generateBatchInsights, isConfigured: isAIConfigured } = require('./src/ai-analyzer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Fabric SQL client (connects to Microsoft Fabric Lakehouse/Warehouse)
let fabricClient = null;
if (process.env.FABRIC_SQL_SERVER && process.env.FABRIC_DATABASE) {
  fabricClient = new FabricClient({
    sqlServer: process.env.FABRIC_SQL_SERVER,
    database: process.env.FABRIC_DATABASE,
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  });
}

// Cached priority map (fetched from Fabric on first use)
let cachedPriorityMap = null;

async function getPriorityMap() {
  if (cachedPriorityMap) return cachedPriorityMap;
  if (!fabricClient) return null; // demo mode uses default map
  try {
    const priorities = await fabricClient.getPriorities();
    cachedPriorityMap = {};
    for (const p of priorities) {
      cachedPriorityMap[p.value] = p.label;
    }
    console.log(`[Fabric] Priority map loaded:`, cachedPriorityMap);
    return cachedPriorityMap;
  } catch (err) {
    console.warn(`[Fabric] Failed to fetch priority picklist: ${err.message}`);
    return null;
  }
}

// Cached issue type maps (fetched from Fabric on first use)
let cachedIssueTypeMap = null;
let cachedSubIssueTypeMap = null;

async function getIssueTypeMaps() {
  if (cachedIssueTypeMap) return { issueTypeMap: cachedIssueTypeMap, subIssueTypeMap: cachedSubIssueTypeMap };
  if (!fabricClient) return { issueTypeMap: null, subIssueTypeMap: null };
  try {
    const { issueTypes, subIssueTypes } = await fabricClient.getIssueAndSubIssueTypes();
    cachedIssueTypeMap = {};
    for (const it of issueTypes) {
      cachedIssueTypeMap[it.value] = it.label;
    }
    cachedSubIssueTypeMap = {};
    for (const sit of subIssueTypes) {
      cachedSubIssueTypeMap[sit.value] = sit.label;
    }
    console.log(`[Fabric] Issue type map loaded: ${Object.keys(cachedIssueTypeMap).length} types, ${Object.keys(cachedSubIssueTypeMap).length} sub-types`);
    return { issueTypeMap: cachedIssueTypeMap, subIssueTypeMap: cachedSubIssueTypeMap };
  } catch (err) {
    console.warn(`[Fabric] Failed to fetch issue type picklists: ${err.message}`);
    return { issueTypeMap: null, subIssueTypeMap: null };
  }
}

// ── API Routes ──

/**
 * GET /api/status - Check if Fabric SQL is configured
 */
app.get('/api/status', (req, res) => {
  res.json({
    fabricConfigured: !!fabricClient,
    // Keep legacy key for frontend compatibility
    autotaskConfigured: !!fabricClient,
    aiConfigured: isAIConfigured(),
    serverTime: new Date().toISOString(),
    scriptCounts: listScripts(),
  });
});

/**
 * GET /api/health - Test Fabric SQL connectivity (diagnostic endpoint)
 */
app.get('/api/health', async (req, res) => {
  if (!fabricClient) {
    return res.json({ status: 'no-fabric', message: 'Fabric SQL not configured' });
  }
  try {
    const start = Date.now();

    // Test basic connectivity
    await fabricClient.query('SELECT 1 AS ok');
    const connectMs = Date.now() - start;

    // List all tables visible to this connection
    const tables = await fabricClient.query(
      `SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
       FROM INFORMATION_SCHEMA.TABLES
       ORDER BY TABLE_SCHEMA, TABLE_NAME`
    );

    const elapsed = Date.now() - start;
    res.json({
      status: 'ok',
      connectMs,
      totalMs: elapsed,
      server: process.env.FABRIC_SQL_SERVER,
      database: process.env.FABRIC_DATABASE,
      nodeVersion: process.version,
      tableCount: tables.length,
      tables: tables.map(t => `${t.TABLE_SCHEMA}.${t.TABLE_NAME} (${t.TABLE_TYPE})`),
    });
  } catch (err) {
    console.error('[Health] Fabric connectivity test failed:', err.message, err.code || '', err.stack);
    res.status(500).json({
      status: 'error',
      error: err.message,
      code: err.code || null,
      server: process.env.FABRIC_SQL_SERVER,
      database: process.env.FABRIC_DATABASE,
      nodeVersion: process.version,
    });
  }
});

/**
 * GET /api/tickets - Fetch and analyze open tickets from Autotask
 * Query params: queueId, maxRecords, dateFrom, dateTo, includeCompleted
 */
app.get('/api/tickets', async (req, res) => {
  try {
    if (!fabricClient) {
      return res.status(503).json({
        error: 'Fabric SQL not configured. Set FABRIC_SQL_SERVER and FABRIC_DATABASE in Application settings.',
      });
    }

    const { queueId, queueIds, maxRecords, dateFrom, dateTo, includeCompleted } = req.query;

    // Support both single queueId and multi queueIds (comma-separated)
    const queueIdList = queueIds
      ? queueIds.split(',').map(id => parseInt(id.trim())).filter(Boolean)
      : queueId ? [parseInt(queueId)] : [];

    const baseOpts = {
      maxRecords: maxRecords ? parseInt(maxRecords) : 500,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    let tickets = [];
    if (includeCompleted === 'true') {
      // Fetch ALL tickets (any status) so received counts match widgets
      if (queueIdList.length > 0) {
        const fetches = queueIdList.map(qid =>
          fabricClient.getAllTickets({ ...baseOpts, queueId: qid })
        );
        const results = await Promise.all(fetches);
        tickets = results.flat();
      } else {
        tickets = await fabricClient.getAllTickets(baseOpts);
      }
    } else {
      // Open tickets only (excludes Complete and Waiting Customer)
      if (queueIdList.length > 0) {
        const fetches = queueIdList.map(qid =>
          fabricClient.getOpenTickets({ ...baseOpts, queueId: qid })
        );
        const results = await Promise.all(fetches);
        tickets = results.flat();
      } else {
        tickets = await fabricClient.getOpenTickets(baseOpts);
      }
    }

    console.log(`[API] Fetched ${tickets.length} tickets (includeCompleted=${includeCompleted}, queues=${queueIdList.join(',') || 'all'})`);

    // Enrich tickets with worked hours from time entries
    let hoursMap = {};
    const enrichTimeEntries = req.query.enrichHours !== 'false';
    if (enrichTimeEntries && tickets.length > 0) {
      try {
        const ticketIds = tickets.map(t => t.id).filter(Boolean);
        hoursMap = await fabricClient.getTimeEntriesForTickets(ticketIds);
        const ticketsWithHours = Object.keys(hoursMap).length;
        console.log(`[API] Time entries: ${ticketsWithHours}/${ticketIds.length} tickets have worked hours`);
      } catch (err) {
        console.warn(`[API] Time entry enrichment failed: ${err.message}`);
      }
    }

    // Resolve company names from Fabric
    let companyNameMap = {};
    if (fabricClient) {
      try {
        const companyIds = [...new Set(tickets.map(t => t.companyID).filter(Boolean))];
        if (companyIds.length > 0) {
          companyNameMap = await fabricClient.getCompanyNames(companyIds);
          console.log(`[API] Company names resolved: ${Object.keys(companyNameMap).length}/${companyIds.length}`);
        }
      } catch (err) {
        console.warn(`[API] Company name resolution failed: ${err.message}`);
      }
    }

    // Resolve issue type and sub-issue type labels
    const { issueTypeMap, subIssueTypeMap } = await getIssueTypeMaps();

    // Fetch internal notes to detect PIA usage
    let piaTicketIds = new Set();
    if (fabricClient && tickets.length > 0) {
      try {
        const ticketIds = tickets.map(t => t.id).filter(Boolean);
        const notesMap = await fabricClient.getNotesForTickets(ticketIds);

        // PIA API account identifiers (configurable via env, comma-separated)
        // Can match by resource ID, resource name, or text in note body
        const piaIdentifiers = (process.env.PIA_API_IDENTIFIERS || 'pia automated api')
          .split(',')
          .map(s => s.trim().toLowerCase())
          .filter(Boolean);

        for (const [ticketId, notes] of Object.entries(notesMap)) {
          for (const note of notes) {
            // Check if the note creator or note content indicates PIA
            const creatorName = (note.creatorResourceName || '').toLowerCase();
            const noteTitle = (note.title || '').toLowerCase();
            const noteBody = (note.description || '').toLowerCase();
            const noteText = `${creatorName} ${noteTitle} ${noteBody}`;

            const piaMatch = piaIdentifiers.some(id => noteText.includes(id));
            if (piaMatch) {
              piaTicketIds.add(Number(ticketId));
              break; // one match is enough per ticket
            }
          }
        }
        console.log(`[API] PIA detection: ${piaTicketIds.size}/${ticketIds.length} tickets have PIA notes (identifiers: ${piaIdentifiers.join(', ')})`);
      } catch (err) {
        console.warn(`[API] Note enrichment for PIA detection failed: ${err.message}`);
      }
    }

    // Attach workedHours, assignedResourceID, companyName, issue type labels, and PIA flag
    const enrichedTickets = tickets.map(t => ({
      ...t,
      workedHours: hoursMap[t.id] || 0,
      assignedResourceID: t.assignedResourceID || null,
      companyName: companyNameMap[t.companyID] || null,
      issueTypeName: (issueTypeMap && t.issueType) ? issueTypeMap[t.issueType] || null : null,
      subIssueTypeName: (subIssueTypeMap && t.subIssueType) ? subIssueTypeMap[t.subIssueType] || null : null,
      piaDetectedInNotes: piaTicketIds.has(t.id),
    }));

    // Filter out zero worked-hours tickets if requested
    const excludeZeroHours = req.query.excludeZeroHours === 'true';
    const filteredTickets = excludeZeroHours
      ? enrichedTickets.filter(t => t.workedHours > 0)
      : enrichedTickets;

    if (excludeZeroHours) {
      console.log(`[API] After excludeZeroHours filter: ${filteredTickets.length}/${enrichedTickets.length} tickets`);
    }

    // Build queue distribution for diagnostics
    const queueDist = {};
    for (const t of enrichedTickets) {
      const qid = t.queueID || 'null';
      if (!queueDist[qid]) queueDist[qid] = { total: 0, withHours: 0 };
      queueDist[qid].total++;
      if ((hoursMap[t.id] || 0) > 0) queueDist[qid].withHours++;
    }
    console.log(`[API] Queue distribution:`, JSON.stringify(queueDist));

    const priorityMap = await getPriorityMap();
    const analyzed = analyzeTickets(filteredTickets);
    const categorized = analyzed.filter(t => t.category !== 'uncategorized');
    const summary = getSummary(categorized);
    const analytics = getDeepAnalytics(categorized, filteredTickets, { priorityMap });

    // Compute zero-hours chart from unfiltered data so it isn't affected by excludeZeroHours filter
    if (excludeZeroHours && analytics.overviewCharts) {
      const allCompleted = enrichedTickets.filter(t => t.status === 5 || t.status === 'Complete');
      const zeroCount = allCompleted.filter(t => !t.workedHours || t.workedHours === 0).length;
      const hasCount = allCompleted.length - zeroCount;
      analytics.overviewCharts.zeroHoursCompleted = { zeroHours: zeroCount, hasHours: hasCount, total: allCompleted.length };
    }

    res.json({ tickets: analyzed, summary, analytics, queueDiagnostics: queueDist, priorityMap, issueTypeMap, subIssueTypeMap });
  } catch (err) {
    console.error('Failed to fetch tickets:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/analyze - Analyze tickets provided in the request body
 * (for demo/testing without Autotask credentials)
 */
app.post('/api/analyze', (req, res) => {
  const { tickets } = req.body;
  if (!Array.isArray(tickets)) {
    return res.status(400).json({ error: 'tickets must be an array' });
  }

  const analyzed = analyzeTickets(tickets);
  const categorized = analyzed.filter(t => t.category !== 'uncategorized');
  const summary = getSummary(categorized);
  const analytics = getDeepAnalytics(categorized, tickets);

  res.json({ tickets: analyzed, summary, analytics });
});

/**
 * GET /api/scripts - List all available PowerShell scripts
 */
app.get('/api/scripts', (req, res) => {
  res.json(listScripts());
});

/**
 * GET /api/scripts/:type/:filename - Get a specific script's content
 */
app.get('/api/scripts/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  if (!['datto', 'pia'].includes(type)) {
    return res.status(400).json({ error: 'Type must be datto or pia' });
  }

  const content = loadScript(type, filename);
  if (!content) {
    return res.status(404).json({ error: 'Script not found' });
  }

  res.json({ filename, type, content });
});

/**
 * GET /api/categories - List all ticket categories and their patterns
 */
app.get('/api/categories', (req, res) => {
  res.json(CATEGORY_PATTERNS.map(p => ({
    category: p.category,
    label: p.label,
    avgMinutes: p.avgMinutes,
    automationScore: p.automationScore,
    keywordCount: p.keywords.length,
  })));
});

/**
 * GET /api/queues - Fetch Autotask queues for filtering
 */
app.get('/api/queues', async (req, res) => {
  try {
    if (!fabricClient) {
      return res.status(503).json({ error: 'Fabric SQL not configured.' });
    }
    const queues = await fabricClient.getQueues();
    res.json(queues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/resources - Fetch Autotask resources (technicians/SDEs)
 */
app.get('/api/resources', async (req, res) => {
  try {
    if (!fabricClient) {
      return res.status(503).json({ error: 'Fabric SQL not configured.' });
    }
    const resources = await fabricClient.getResources();
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ai-analyze - Run AI analysis on already-analyzed tickets
 * Expects { tickets: [...] } where tickets are the raw ticket objects
 * Returns AI-enhanced analyzed tickets
 */
app.post('/api/ai-analyze', async (req, res) => {
  try {
    if (!isAIConfigured()) {
      return res.status(503).json({
        error: 'AI not configured. Set ANTHROPIC_API_KEY in .env file.',
      });
    }

    const { tickets } = req.body;
    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ error: 'tickets must be a non-empty array' });
    }

    // Set up SSE streaming for progress updates
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    function sendProgress(data) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    console.log(`[AI] Starting AI analysis of ${tickets.length} tickets...`);
    const startTime = Date.now();

    sendProgress({ type: 'progress', phase: 'keyword', message: 'Running keyword analysis...' });

    // Run keyword analysis first
    const keywordAnalyzed = analyzeTickets(tickets);

    sendProgress({ type: 'progress', phase: 'analyzing', message: `Analyzing ${tickets.length} tickets with AI...`, completed: 0, total: tickets.length });

    // Run AI analysis with progress callback
    const aiResults = await analyzeWithAI(tickets, (progress) => {
      sendProgress({
        type: 'progress',
        phase: 'analyzing',
        message: `Analyzing tickets with AI... (${progress.completed}/${progress.total})`,
        completed: progress.completed,
        total: progress.total,
        batch: progress.batch,
        totalBatches: progress.totalBatches,
      });
    });

    sendProgress({ type: 'progress', phase: 'merging', message: 'Merging AI results...' });

    // Merge AI results into keyword-analyzed tickets
    const merged = mergeAIResults(keywordAnalyzed, aiResults);

    const priorityMap = await getPriorityMap();
    const categorized = merged.filter(t => t.category !== 'uncategorized');
    const summary = getSummary(categorized);
    const analytics = getDeepAnalytics(categorized, tickets, { priorityMap });

    // Generate batch-level strategic insights (with overall timeout guard)
    let batchInsights = null;
    try {
      sendProgress({ type: 'progress', phase: 'insights', message: 'Generating strategic insights...' });
      console.log(`[AI] Generating batch-level insights...`);
      const insightsTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Batch insights overall timeout (5 min)')), 300000)
      );
      batchInsights = await Promise.race([
        generateBatchInsights(tickets, categorized, (progress) => {
          sendProgress({
            type: 'progress',
            phase: 'insights',
            message: `Generating strategic insights... (chunk ${progress.chunk}/${progress.totalChunks})`,
          });
        }),
        insightsTimeout,
      ]);
    } catch (batchErr) {
      console.warn(`[AI] Batch insights failed (non-fatal): ${batchErr.message}`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const aiEnhanced = merged.filter((t) => t.aiInsights).length;
    const categoryChanges = merged.filter((t) => t.aiInsights && t.aiInsights.categoryChanged).length;
    console.log(`[AI] Analysis complete in ${elapsed}s. ${aiEnhanced} tickets enhanced, ${categoryChanges} categories changed.`);

    // Send the final result as a 'done' event
    sendProgress({
      type: 'done',
      result: {
        tickets: merged,
        summary,
        analytics,
        batchInsights,
        priorityMap,
        aiStats: {
          enhanced: aiEnhanced,
          categoryChanges,
          elapsedSeconds: parseFloat(elapsed),
        },
      },
    });
    res.end();
  } catch (err) {
    console.error('[AI] Analysis failed:', err.message);
    // If headers already sent (SSE mode), send error as event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: `AI analysis failed: ${err.message}` })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: `AI analysis failed: ${err.message}` });
    }
  }
});

/**
 * POST /api/tickets/update-priority - Update priority on one or more tickets
 * Expects { ticketIds: [number], priority: number }
 * Used to set validated quick hitters to "do it now" priority.
 */
app.post('/api/tickets/update-priority', async (req, res) => {
  if (!fabricClient) {
    return res.status(503).json({ error: 'Fabric SQL not configured. Cannot update tickets in demo mode.' });
  }

  const { ticketIds, priority } = req.body;
  if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
    return res.status(400).json({ error: 'ticketIds must be a non-empty array' });
  }
  if (priority == null || typeof priority !== 'number') {
    return res.status(400).json({ error: 'priority must be a number' });
  }

  const results = { updated: [], failed: [] };

  for (const ticketId of ticketIds) {
    try {
      await fabricClient.updateTicket(ticketId, { priority });
      results.updated.push(ticketId);
    } catch (err) {
      console.warn(`[API] Failed to update ticket ${ticketId} priority: ${err.message}`);
      results.failed.push({ ticketId, error: err.message });
    }
  }

  console.log(`[API] Priority update: ${results.updated.length} updated, ${results.failed.length} failed (priority=${priority})`);
  res.json(results);
});

app.listen(PORT, () => {
  console.log(`IntermixIT Ticket Analyzer running on http://localhost:${PORT}`);
  console.log(`Fabric SQL: ${fabricClient ? 'Configured' : 'Not configured (demo mode)'}`);
  console.log(`AI Analysis: ${isAIConfigured() ? 'Configured (Claude)' : 'Not configured — set ANTHROPIC_API_KEY for AI features'}`);
});
