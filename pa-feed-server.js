/**
 * PA Cyber Watch Feed - Standalone Server
 * Runs independently with no Fabric, Autotask, or other dependencies.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const { PAFeedOrchestrator } = require('./src/pa-feed/orchestrator');

const app = express();
const PORT = process.env.PA_FEED_PORT || process.env.PORT || 3001;

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize feed
const paFeed = new PAFeedOrchestrator({
  enableSocial: process.env.PA_FEED_ENABLE_SOCIAL === 'true',
  enableAlerts: !!process.env.TEAMS_WEBHOOK_URL,
  enableSummarization: !!process.env.ANTHROPIC_API_KEY,
  teams: {
    webhookUrl: process.env.TEAMS_WEBHOOK_URL,
    minConfidenceForAlert: parseInt(process.env.PA_FEED_MIN_ALERT_CONFIDENCE || '50'),
  },
});

if (process.env.PA_FEED_AUTO_START === 'true') {
  paFeed.start();
}

// ── Routes ──

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pa-feed.html'));
});

app.get('/api/pa-feed/status', (req, res) => {
  res.json(paFeed.getState());
});

app.post('/api/pa-feed/run', async (req, res) => {
  try {
    const result = await paFeed.runCycle();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pa-feed/incidents', (req, res) => {
  const filters = {};
  if (req.query.county) filters.county = req.query.county;
  if (req.query.entityType) filters.entityType = req.query.entityType;
  if (req.query.confidenceBand) filters.confidenceBand = req.query.confidenceBand;
  if (req.query.incidentType) filters.incidentType = req.query.incidentType;
  if (req.query.minConfidence) filters.minConfidence = parseInt(req.query.minConfidence);
  if (req.query.watchedOnly === 'true') filters.watchedOnly = true;
  if (req.query.clientOnly === 'true') filters.clientOnly = true;
  if (req.query.since) filters.since = req.query.since;

  const incidents = paFeed.getFilteredIncidents(filters);
  res.json({ incidents, total: incidents.length, filters });
});

app.get('/api/pa-feed/entities', (req, res) => {
  let entities = paFeed.entityManager.entities;
  if (req.query.county) entities = entities.filter(e => e.county === req.query.county);
  if (req.query.entityType) entities = entities.filter(e => e.entityType === req.query.entityType);
  if (req.query.watchedOnly === 'true') entities = entities.filter(e => e.watched);
  res.json({ entities, total: entities.length });
});

app.post('/api/pa-feed/entities', (req, res) => {
  const entity = req.body;
  if (!entity.entityName) {
    return res.status(400).json({ error: 'entityName is required' });
  }
  paFeed.entityManager.addEntity(entity);
  res.json({ success: true, entity });
});

app.post('/api/pa-feed/start', (req, res) => {
  paFeed.start();
  res.json({ started: true });
});

app.post('/api/pa-feed/stop', (req, res) => {
  paFeed.stop();
  res.json({ stopped: true });
});

app.post('/api/pa-feed/digest', async (req, res) => {
  const incidents = paFeed.incidents;
  const card = paFeed.teamsAlerter.buildDigestCard(incidents, req.body.dateRange);
  const result = await paFeed.teamsAlerter.postToTeams(card);
  res.json({ ...result, incidentCount: incidents.length });
});

app.listen(PORT, () => {
  console.log(`PA Cyber Watch Feed running on http://localhost:${PORT}`);
  console.log(`AI Summaries: ${paFeed.summarizer.isConfigured() ? 'Enabled' : 'Disabled (set ANTHROPIC_API_KEY)'}`);
  console.log(`Teams Alerts: ${paFeed.teamsAlerter.isConfigured() ? 'Enabled' : 'Disabled (set TEAMS_WEBHOOK_URL)'}`);
  console.log(`Social Monitoring: ${paFeed.enableSocial ? 'Enabled' : 'Disabled'}`);
  console.log(`Auto-poll: ${process.env.PA_FEED_AUTO_START === 'true' ? 'Every 30 min' : 'Off (manual only)'}`);
});
