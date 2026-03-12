/**
 * PA Cyber Watch Feed - Module Index
 *
 * Continuous monitoring feed for public signs of breaches, ransomware events,
 * cyberattacks, outages, and data incidents tied to Pennsylvania organizations.
 *
 * Architecture:
 *   Tier 1 Sources: Google News RSS, CISA alerts/advisories
 *   Tier 2 Sources: GDELT global event database
 *   Tier 3 Sources: Reddit (social chatter)
 *
 * Pipeline: Ingest -> Entity Match -> Score -> Dedupe -> Summarize -> Alert
 */

const { PAFeedOrchestrator } = require('./orchestrator');
const { EntityManager, ENTITY_TYPES, PRIORITY_TIERS, PA_COUNTIES, PA_CITIES } = require('./entities');
const { scoreItem, classifySource, CONFIDENCE_BANDS, OUTPUT_CATEGORIES } = require('./scoring');
const { classifyIncidentType, KEYWORD_GROUPS, INCIDENT_TYPES } = require('./keywords');
const { IncidentDeduplicator } = require('./dedup');
const { IncidentSummarizer } = require('./summarizer');
const { TeamsAlerter } = require('./teams-alert');

module.exports = {
  PAFeedOrchestrator,
  EntityManager,
  ENTITY_TYPES,
  PRIORITY_TIERS,
  PA_COUNTIES,
  PA_CITIES,
  scoreItem,
  classifySource,
  CONFIDENCE_BANDS,
  OUTPUT_CATEGORIES,
  classifyIncidentType,
  KEYWORD_GROUPS,
  INCIDENT_TYPES,
  IncidentDeduplicator,
  IncidentSummarizer,
  TeamsAlerter,
};
