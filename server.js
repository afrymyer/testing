require('dotenv').config();
const express = require('express');
const path = require('path');
const AutotaskClient = require('./src/autotask-client');
const { analyzeTickets, getSummary, getDeepAnalytics, CATEGORY_PATTERNS } = require('./src/ticket-analyzer');
const { loadScript, listScripts } = require('./src/script-mapper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
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

// ── API Routes ──

/**
 * GET /api/status - Check if Autotask is configured
 */
app.get('/api/status', (req, res) => {
  res.json({
    autotaskConfigured: !!autotaskClient,
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

    const { queueId, maxRecords, dateFrom, dateTo, includeCompleted } = req.query;
    const opts = {
      queueId: queueId ? parseInt(queueId) : undefined,
      maxRecords: maxRecords ? parseInt(maxRecords) : 500,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    let tickets = await autotaskClient.getOpenTickets(opts);

    // Optionally merge completed tickets for full analysis
    if (includeCompleted === 'true') {
      const completed = await autotaskClient.getCompletedTickets(opts);
      tickets = tickets.concat(completed);
    }

    const analyzed = analyzeTickets(tickets);
    const summary = getSummary(analyzed);
    const analytics = getDeepAnalytics(analyzed, tickets);

    res.json({ tickets: analyzed, summary, analytics });
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

app.listen(PORT, () => {
  console.log(`Autotask Analysis Tool running on http://localhost:${PORT}`);
  console.log(`Autotask API: ${autotaskClient ? 'Configured' : 'Not configured (demo mode)'}`);
});
