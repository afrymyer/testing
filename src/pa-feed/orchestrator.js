/**
 * PA Cyber Watch Feed Orchestrator
 * Main pipeline that coordinates source ingestion, entity matching,
 * scoring, deduplication, summarization, and alerting.
 */

const { EntityManager } = require('./entities');
const { classifyIncidentType, hasIncidentKeywords, buildBroadSearchQueries } = require('./keywords');
const { scoreItem } = require('./scoring');
const { IncidentDeduplicator } = require('./dedup');
const { IncidentSummarizer } = require('./summarizer');
const { TeamsAlerter } = require('./teams-alert');
const { NewsSource } = require('./sources/news-source');
const { GdeltSource } = require('./sources/gdelt-source');
const { CisaSource } = require('./sources/cisa-source');
const { SocialSource } = require('./sources/social-source');

class PAFeedOrchestrator {
  constructor(options = {}) {
    // Core components
    this.entityManager = new EntityManager(options.entities);
    this.deduplicator = new IncidentDeduplicator();
    this.summarizer = new IncidentSummarizer(options.summarizer);
    this.teamsAlerter = new TeamsAlerter(options.teams);

    // Sources
    this.newsSrc = new NewsSource(options.news);
    this.gdeltSrc = new GdeltSource(options.gdelt);
    this.cisaSrc = new CisaSource(options.cisa);
    this.socialSrc = new SocialSource(options.social);

    // Config
    this.enableSocial = options.enableSocial || false;
    this.enableAlerts = options.enableAlerts !== false;
    this.enableSummarization = options.enableSummarization !== false;

    // State
    this.lastRunAt = null;
    this.runCount = 0;
    this.incidents = [];
    this.rawItems = [];
    this.stats = { total: 0, high: 0, medium: 0, low: 0, noise: 0 };

    // Scheduler
    this._timers = [];
  }

  /**
   * Run a single feed cycle: ingest -> match -> score -> dedupe -> summarize -> alert.
   */
  async runCycle() {
    const cycleStart = new Date();
    console.log(`[PAFeed] Starting cycle #${this.runCount + 1} at ${cycleStart.toISOString()}`);

    try {
      // Step 1: Build search queries
      const entityQueries = this._buildEntityQueries();
      const broadQueries = buildBroadSearchQueries();

      // Step 2: Ingest from all sources in parallel
      const [newsItems, gdeltItems, cisaItems, socialItems] = await Promise.all([
        this.newsSrc.fetchAll([...entityQueries.slice(0, 10), ...broadQueries]),
        this.gdeltSrc.fetchAll(this.gdeltSrc.getDefaultQueries()),
        this.cisaSrc.fetchAll(),
        this.enableSocial ? this.socialSrc.fetchAll() : Promise.resolve([]),
      ]);

      console.log(`[PAFeed] Ingested: news=${newsItems.length}, gdelt=${gdeltItems.length}, cisa=${cisaItems.length}, social=${socialItems.length}`);

      // Step 3: Combine and filter
      const allRawItems = [...newsItems, ...gdeltItems, ...cisaItems, ...socialItems];
      this.rawItems = allRawItems;

      // Step 4: Process each item through the pipeline
      const scoredItems = [];
      for (const item of allRawItems) {
        const text = `${item.headline} ${item.description || ''}`;

        // Check for incident keywords (skip items with no relevant keywords, except CISA)
        if (item.rawSource !== 'CISA_Alerts' && item.rawSource !== 'CISA_KEV') {
          if (!hasIncidentKeywords(text)) continue;
        }

        // Entity matching
        const entityMatches = this.entityManager.matchEntities(text);
        const geoMatches = this.entityManager.matchGeography(text);

        // Skip items with no PA relevance (no entity match and no geography match)
        if (entityMatches.length === 0 && geoMatches.length === 0 &&
            item.rawSource !== 'CISA_Alerts' && item.rawSource !== 'CISA_KEV') {
          continue;
        }

        // Classify incident type
        const incidentClass = classifyIncidentType(text);

        // Score the item
        const score = scoreItem({
          text,
          url: item.url,
          sourceName: item.sourceName,
          entityMatches,
          geoMatches,
        });

        // Build scored record
        const primaryEntity = entityMatches[0]?.entity || null;
        scoredItems.push({
          detectedAt: cycleStart.toISOString(),
          publishedAt: item.publishedAt,
          entityName: primaryEntity?.entityName || (geoMatches[0]?.name || 'Unknown PA Entity'),
          matchedAlias: entityMatches[0]?.matchedAlias || '',
          entityType: primaryEntity?.entityType || '',
          county: primaryEntity?.county || (geoMatches[0]?.type === 'county' ? geoMatches[0].name : ''),
          headline: item.headline,
          sourceName: item.sourceName,
          sourceType: score.sourceType,
          url: item.url,
          incidentType: incidentClass.type,
          incidentLabel: incidentClass.label,
          description: item.description || '',
          confidenceScore: score.total,
          confidenceBand: score.band.label,
          category: score.category.label,
          verificationStatus: 'Unverified',
          analystNotes: '',
          requiresAction: score.total >= 50,
          mappedClientOrProspect: primaryEntity?.intermixITProspectOrClient || false,
          rawSource: item.rawSource,
          scoreBreakdown: score,
        });
      }

      console.log(`[PAFeed] Scored ${scoredItems.length} relevant items from ${allRawItems.length} raw items`);

      // Step 5: Deduplicate
      this.incidents = this.deduplicator.process(scoredItems);
      console.log(`[PAFeed] ${this.incidents.length} deduplicated incidents`);

      // Step 6: AI Summarization (for medium+ confidence)
      if (this.enableSummarization && this.summarizer.isConfigured()) {
        const needsSummary = this.incidents.filter(i =>
          i.confidenceScore >= 40 && !i.aiSummary
        );
        if (needsSummary.length > 0) {
          const summarized = await this.summarizer.summarizeBatch(needsSummary);
          // Merge summaries back
          for (const item of summarized) {
            const idx = this.incidents.findIndex(i =>
              i.duplicateGroupId === item.duplicateGroupId
            );
            if (idx >= 0) {
              this.incidents[idx].aiSummary = item.aiSummary;
            }
          }
          console.log(`[PAFeed] Summarized ${summarized.length} incidents`);
        }
      }

      // Step 7: Send alerts for new high/medium items
      if (this.enableAlerts && this.teamsAlerter.isConfigured()) {
        const alertResults = await this.teamsAlerter.alertOnIncidents(this.incidents);
        console.log(`[PAFeed] Sent ${alertResults.filter(r => r.sent).length} Teams alerts`);
      }

      // Update stats
      this.stats = {
        total: this.incidents.length,
        high: this.incidents.filter(i => i.confidenceBand === 'High').length,
        medium: this.incidents.filter(i => i.confidenceBand === 'Medium').length,
        low: this.incidents.filter(i => i.confidenceBand === 'Low').length,
        noise: this.incidents.filter(i => i.confidenceBand === 'Noise').length,
        rawItemCount: allRawItems.length,
        scoredItemCount: scoredItems.length,
      };

      this.lastRunAt = cycleStart.toISOString();
      this.runCount++;

      console.log(`[PAFeed] Cycle complete. Stats:`, this.stats);
      return { incidents: this.incidents, stats: this.stats };

    } catch (err) {
      console.error(`[PAFeed] Cycle error: ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * Build entity-specific search queries from the watched entity list.
   */
  _buildEntityQueries() {
    const watched = this.entityManager.getWatchedEntities();
    const queries = [];

    for (const entity of watched) {
      const q = this.entityManager.buildSearchQueries(entity);
      queries.push(...q.slice(0, 2)); // Limit to 2 queries per entity
    }

    return queries;
  }

  /**
   * Start scheduled polling.
   */
  start() {
    console.log('[PAFeed] Starting scheduled polling...');

    // Run immediately
    this.runCycle().catch(err => console.error('[PAFeed] Initial cycle error:', err.message));

    // Schedule news + GDELT every 30 minutes
    const mainTimer = setInterval(() => {
      this.runCycle().catch(err => console.error('[PAFeed] Cycle error:', err.message));
    }, 30 * 60 * 1000);

    this._timers.push(mainTimer);
    return this;
  }

  /**
   * Stop scheduled polling.
   */
  stop() {
    for (const timer of this._timers) {
      clearInterval(timer);
    }
    this._timers = [];
    console.log('[PAFeed] Stopped.');
  }

  /**
   * Get current feed state for API/dashboard.
   */
  getState() {
    return {
      lastRunAt: this.lastRunAt,
      runCount: this.runCount,
      stats: this.stats,
      incidents: this.incidents,
      entityCount: this.entityManager.entities.length,
      watchedCount: this.entityManager.getWatchedEntities().length,
      sources: {
        news: { lastPoll: this.newsSrc.lastPollAt },
        gdelt: { lastPoll: this.gdeltSrc.lastPollAt },
        cisa: { lastPoll: this.cisaSrc.lastPollAt },
        social: { lastPoll: this.socialSrc.lastPollAt, enabled: this.enableSocial },
      },
      config: {
        enableSocial: this.enableSocial,
        enableAlerts: this.enableAlerts,
        enableSummarization: this.enableSummarization,
      },
    };
  }

  /**
   * Get incidents filtered by various criteria.
   */
  getFilteredIncidents(filters = {}) {
    let results = [...this.incidents];

    if (filters.county) {
      results = results.filter(i => i.county === filters.county);
    }
    if (filters.entityType) {
      results = results.filter(i => i.entityType === filters.entityType);
    }
    if (filters.confidenceBand) {
      results = results.filter(i => i.confidenceBand === filters.confidenceBand);
    }
    if (filters.incidentType) {
      results = results.filter(i => i.incidentType === filters.incidentType);
    }
    if (filters.minConfidence) {
      results = results.filter(i => i.confidenceScore >= filters.minConfidence);
    }
    if (filters.watchedOnly) {
      const watchedNames = new Set(
        this.entityManager.getWatchedEntities().map(e => e.entityName)
      );
      results = results.filter(i => watchedNames.has(i.entityName));
    }
    if (filters.clientOnly) {
      results = results.filter(i => i.mappedClientOrProspect);
    }
    if (filters.since) {
      const sinceDate = new Date(filters.since).toISOString();
      results = results.filter(i =>
        (i.firstMention?.publishedAt || i.latestUpdate?.publishedAt) >= sinceDate
      );
    }

    return results;
  }
}

module.exports = { PAFeedOrchestrator };
