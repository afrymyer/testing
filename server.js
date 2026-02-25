require('dotenv').config();
const express = require('express');
const path = require('path');
const AutotaskClient = require('./src/autotask-client');
const { analyzeTickets, getSummary, getDeepAnalytics, CATEGORY_PATTERNS } = require('./src/ticket-analyzer');
const { loadScript, listScripts } = require('./src/script-mapper');
const { analyzeWithAI, mergeAIResults, generateBatchInsights, isConfigured: isAIConfigured } = require('./src/ai-analyzer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Autotask client (only if credentials are configured)
let autotaskClient = null;
if (process.env.AUTOTASK_API_USER && process.env.AUTOTASK_API_SECRET) {
  autotaskClient = new AutotaskClient({
    apiUser: process.env.AUTOTASK_API_USER,
    apiSecret: process.env.AUTOTASK_API_SECRET,
    integrationCode: process.env.AUTOTASK_API_INTEGRATION_CODE,
    zone: process.env.AUTOTASK_API_ZONE || 'https://webservices6.autotask.net',
  });
}

// Cached priority map (fetched from Autotask on first use)
let cachedPriorityMap = null;

async function getPriorityMap() {
  if (cachedPriorityMap) return cachedPriorityMap;
  if (!autotaskClient) return null; // demo mode uses default map
  try {
    const priorities = await autotaskClient.getPriorities();
    cachedPriorityMap = {};
    for (const p of priorities) {
      cachedPriorityMap[p.value] = p.label;
    }
    console.log(`[Autotask] Priority map loaded:`, cachedPriorityMap);
    return cachedPriorityMap;
  } catch (err) {
    console.warn(`[Autotask] Failed to fetch priority picklist: ${err.message}`);
    return null;
  }
}

// ── API Routes ──

/**
 * GET /api/status - Check if Autotask is configured
 */
app.get('/api/status', (req, res) => {
  res.json({
    autotaskConfigured: !!autotaskClient,
    aiConfigured: isAIConfigured(),
    serverTime: new Date().toISOString(),
    scriptCounts: listScripts(),
  });
});

/**
 * GET /api/tickets - Fetch and analyze open tickets from Autotask
 * Query params: queueId, maxRecords, dateFrom, dateTo, includeCompleted
 */
app.get('/api/tickets', async (req, res) => {
  try {
    if (!autotaskClient) {
      return res.status(503).json({
        error: 'Autotask API not configured. Set credentials in .env file.',
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
      // Fetch ALL tickets (any status) so received counts match Autotask widgets
      if (queueIdList.length > 0) {
        const fetches = queueIdList.map(qid =>
          autotaskClient.getAllTickets({ ...baseOpts, queueId: qid })
        );
        const results = await Promise.all(fetches);
        tickets = results.flat();
      } else {
        tickets = await autotaskClient.getAllTickets(baseOpts);
      }
    } else {
      // Open tickets only (excludes Complete and Waiting Customer)
      if (queueIdList.length > 0) {
        const fetches = queueIdList.map(qid =>
          autotaskClient.getOpenTickets({ ...baseOpts, queueId: qid })
        );
        const results = await Promise.all(fetches);
        tickets = results.flat();
      } else {
        tickets = await autotaskClient.getOpenTickets(baseOpts);
      }
    }

    console.log(`[API] Fetched ${tickets.length} tickets (includeCompleted=${includeCompleted}, queues=${queueIdList.join(',') || 'all'})`);

    // Enrich tickets with worked hours from time entries
    let hoursMap = {};
    const enrichTimeEntries = req.query.enrichHours !== 'false';
    if (enrichTimeEntries && tickets.length > 0) {
      try {
        const ticketIds = tickets.map(t => t.id).filter(Boolean);
        hoursMap = await autotaskClient.getTimeEntriesForTickets(ticketIds);
        const ticketsWithHours = Object.keys(hoursMap).length;
        console.log(`[API] Time entries: ${ticketsWithHours}/${ticketIds.length} tickets have worked hours`);
      } catch (err) {
        console.warn(`[API] Time entry enrichment failed: ${err.message}`);
      }
    }

    // Attach workedHours and assignedResourceID to each ticket before analysis
    const enrichedTickets = tickets.map(t => ({
      ...t,
      workedHours: hoursMap[t.id] || 0,
      assignedResourceID: t.assignedResourceID || null,
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
    const summary = getSummary(analyzed);
    const analytics = getDeepAnalytics(analyzed, filteredTickets, { priorityMap });

    res.json({ tickets: analyzed, summary, analytics, queueDiagnostics: queueDist, priorityMap });
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
  const summary = getSummary(analyzed);
  const analytics = getDeepAnalytics(analyzed, tickets);

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
    if (!autotaskClient) {
      return res.status(503).json({ error: 'Autotask API not configured.' });
    }
    const queues = await autotaskClient.getQueues();
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
    if (!autotaskClient) {
      return res.status(503).json({ error: 'Autotask API not configured.' });
    }
    const resources = await autotaskClient.getResources();
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

    console.log(`[AI] Starting AI analysis of ${tickets.length} tickets...`);
    const startTime = Date.now();

    // Run keyword analysis first
    const keywordAnalyzed = analyzeTickets(tickets);

    // Run AI analysis
    const aiResults = await analyzeWithAI(tickets);

    // Merge AI results into keyword-analyzed tickets
    const merged = mergeAIResults(keywordAnalyzed, aiResults);

    const priorityMap = await getPriorityMap();
    const summary = getSummary(merged);
    const analytics = getDeepAnalytics(merged, tickets, { priorityMap });

    // Generate batch-level strategic insights (with overall timeout guard)
    let batchInsights = null;
    try {
      console.log(`[AI] Generating batch-level insights...`);
      const insightsTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Batch insights overall timeout (5 min)')), 300000)
      );
      batchInsights = await Promise.race([
        generateBatchInsights(tickets, merged),
        insightsTimeout,
      ]);
    } catch (batchErr) {
      console.warn(`[AI] Batch insights failed (non-fatal): ${batchErr.message}`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const aiEnhanced = merged.filter((t) => t.aiInsights).length;
    const categoryChanges = merged.filter((t) => t.aiInsights && t.aiInsights.categoryChanged).length;
    console.log(`[AI] Analysis complete in ${elapsed}s. ${aiEnhanced} tickets enhanced, ${categoryChanges} categories changed.`);

    res.json({
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
    });
  } catch (err) {
    console.error('[AI] Analysis failed:', err.message);
    res.status(500).json({ error: `AI analysis failed: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`IntermixIT Ticket Analyzer running on http://localhost:${PORT}`);
  console.log(`Autotask API: ${autotaskClient ? 'Configured' : 'Not configured (demo mode)'}`);
  console.log(`AI Analysis: ${isAIConfigured() ? 'Configured (Claude)' : 'Not configured — set ANTHROPIC_API_KEY for AI features'}`);
});
