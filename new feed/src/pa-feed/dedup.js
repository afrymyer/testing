/**
 * De-duplication and Incident Grouping for PA Cyber Watch Feed.
 *
 * Groups mentions of the same incident using:
 *   - Normalized entity name
 *   - Incident type
 *   - 7-day date window
 *
 * Keeps: earliest mention, most authoritative source, most recent update.
 */

const crypto = require('crypto');

class IncidentDeduplicator {
  constructor() {
    // Map of dedupeKey -> incident group
    this.groups = new Map();
  }

  /**
   * Generate a dedupe key for an item.
   * Key = normalized entity name + incident type + week bucket.
   */
  _dedupeKey(item) {
    const entityName = this._normalizeEntity(item.entityName || item.matchedAlias || '');
    const incidentType = (item.incidentType || 'unknown').toLowerCase();
    const weekBucket = this._weekBucket(item.publishedAt || item.detectedAt);
    return `${entityName}|${incidentType}|${weekBucket}`;
  }

  _normalizeEntity(name) {
    return name.toLowerCase()
      .replace(/\b(township|twp|twp\.|borough|boro|municipality|county|co|co\.)\b/g, '')
      .replace(/\b(of|the)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Get a week bucket string from a date.
   * Groups dates into 7-day windows anchored to Monday.
   */
  _weekBucket(dateStr) {
    try {
      const d = new Date(dateStr);
      const dayOfWeek = d.getUTCDay();
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - ((dayOfWeek + 6) % 7));
      return monday.toISOString().substring(0, 10);
    } catch {
      return 'unknown';
    }
  }

  /**
   * Source authority ranking for keeping the most authoritative source.
   */
  _sourceAuthority(sourceType) {
    const ranking = {
      government: 5,
      local_news: 4,
      national_news: 3,
      trade_press: 3,
      unknown: 2,
      social: 1,
    };
    return ranking[sourceType] || 1;
  }

  /**
   * Process a batch of scored items and group duplicates.
   * Returns an array of deduplicated incident records.
   *
   * @param {Object[]} items - scored feed items
   * @returns {Object[]} deduplicated incidents
   */
  process(items) {
    for (const item of items) {
      const key = this._dedupeKey(item);
      const existing = this.groups.get(key);

      if (!existing) {
        this.groups.set(key, {
          duplicateGroupId: this._generateGroupId(key),
          entityName: item.entityName || '',
          matchedAlias: item.matchedAlias || '',
          entityType: item.entityType || '',
          county: item.county || '',
          incidentType: item.incidentType || '',
          incidentLabel: item.incidentLabel || '',
          confidenceScore: item.confidenceScore || 0,
          confidenceBand: item.confidenceBand || '',
          category: item.category || '',
          // Track first, best, and latest
          firstMention: {
            detectedAt: item.detectedAt || new Date().toISOString(),
            publishedAt: item.publishedAt,
            headline: item.headline,
            url: item.url,
            sourceName: item.sourceName,
            sourceType: item.sourceType,
          },
          bestSource: {
            headline: item.headline,
            url: item.url,
            sourceName: item.sourceName,
            sourceType: item.sourceType,
            authority: this._sourceAuthority(item.sourceType),
          },
          latestUpdate: {
            publishedAt: item.publishedAt,
            headline: item.headline,
            url: item.url,
            sourceName: item.sourceName,
          },
          allSources: [{
            headline: item.headline,
            url: item.url,
            sourceName: item.sourceName,
            sourceType: item.sourceType,
            publishedAt: item.publishedAt,
          }],
          crossSourceCount: 1,
          summary: item.summary || '',
          analystNotes: '',
          requiresAction: item.requiresAction || false,
          mappedClientOrProspect: item.mappedClientOrProspect || false,
          verificationStatus: 'Unverified',
        });
      } else {
        // Update existing group
        existing.crossSourceCount++;

        // Update confidence score (cross-source boost)
        if (item.confidenceScore > existing.confidenceScore) {
          existing.confidenceScore = item.confidenceScore;
          existing.confidenceBand = item.confidenceBand;
          existing.category = item.category;
        }

        // Track first mention
        if (item.publishedAt < existing.firstMention.publishedAt) {
          existing.firstMention = {
            detectedAt: item.detectedAt || new Date().toISOString(),
            publishedAt: item.publishedAt,
            headline: item.headline,
            url: item.url,
            sourceName: item.sourceName,
            sourceType: item.sourceType,
          };
        }

        // Track most authoritative source
        const authority = this._sourceAuthority(item.sourceType);
        if (authority > existing.bestSource.authority) {
          existing.bestSource = {
            headline: item.headline,
            url: item.url,
            sourceName: item.sourceName,
            sourceType: item.sourceType,
            authority,
          };
        }

        // Track latest update
        if (item.publishedAt > existing.latestUpdate.publishedAt) {
          existing.latestUpdate = {
            publishedAt: item.publishedAt,
            headline: item.headline,
            url: item.url,
            sourceName: item.sourceName,
          };
        }

        // Add to source list (cap at 20)
        if (existing.allSources.length < 20) {
          existing.allSources.push({
            headline: item.headline,
            url: item.url,
            sourceName: item.sourceName,
            sourceType: item.sourceType,
            publishedAt: item.publishedAt,
          });
        }

        this.groups.set(key, existing);
      }
    }

    return this.getIncidents();
  }

  /**
   * Get all deduplicated incidents, sorted by confidence score descending.
   */
  getIncidents() {
    return Array.from(this.groups.values())
      .sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Get incidents filtered by confidence band.
   */
  getByBand(bandLabel) {
    return this.getIncidents().filter(i => i.confidenceBand === bandLabel);
  }

  /**
   * Get the cross-source count for an entity+incident.
   */
  getCrossSourceCount(entityName, incidentType) {
    for (const [, group] of this.groups) {
      if (this._normalizeEntity(group.entityName) === this._normalizeEntity(entityName) &&
          group.incidentType === incidentType) {
        return group.crossSourceCount;
      }
    }
    return 0;
  }

  /**
   * Clear all groups (for fresh run).
   */
  clear() {
    this.groups.clear();
  }

  _generateGroupId(key) {
    return crypto.createHash('md5').update(key).digest('hex').substring(0, 12);
  }
}

module.exports = { IncidentDeduplicator };
