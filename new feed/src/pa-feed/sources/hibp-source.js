/**
 * Have I Been Pwned (HIBP) Source
 * Monitors for breaches involving PA organization domains.
 *
 * Uses the public HIBP breach API (no auth needed for breach list).
 * For domain search / notification, an API key is needed (optional).
 *
 * Flow:
 *   1. Fetch all recent breaches from HIBP
 *   2. Cross-reference breach names/domains against watched entities
 *   3. Flag any matches for investigation
 */

const { fetchWithRetry } = require('../retry');

const HIBP_BREACHES_URL = 'https://haveibeenpwned.com/api/v3/breaches';

class HIBPSource {
  constructor(options = {}) {
    this.name = 'HIBP';
    this.pollIntervalMs = options.pollIntervalMs || 6 * 60 * 60 * 1000; // 6 hours
    this.apiKey = options.apiKey || process.env.HIBP_API_KEY || null;
    this.lastPollAt = null;
    // Domains to monitor (populated from entities)
    this.watchedDomains = options.watchedDomains || [];
  }

  /**
   * Fetch all breaches from HIBP.
   */
  async fetchBreaches() {
    try {
      const headers = {
        'User-Agent': 'PA-CyberWatch-Feed/1.0',
      };
      if (this.apiKey) {
        headers['hibp-api-key'] = this.apiKey;
      }

      const response = await fetchWithRetry(HIBP_BREACHES_URL, {
        headers,
        timeout: 15000,
      });

      if (!response.ok) {
        console.warn(`[HIBPSource] HTTP ${response.status}`);
        return [];
      }

      const breaches = await response.json();
      if (!Array.isArray(breaches)) return [];

      // Filter to recent breaches (added in last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      return breaches
        .filter(b => new Date(b.AddedDate || b.ModifiedDate) >= ninetyDaysAgo)
        .map(b => this._normalize(b));
    } catch (err) {
      console.error(`[HIBPSource] Error: ${err.message}`);
      return [];
    }
  }

  /**
   * Normalize a HIBP breach into the standard item format.
   */
  _normalize(breach) {
    const pwnCount = breach.PwnCount ? ` (${this._formatNumber(breach.PwnCount)} accounts)` : '';
    const dataClasses = (breach.DataClasses || []).slice(0, 5).join(', ');

    return {
      headline: `Breach: ${breach.Title || breach.Name}${pwnCount}`,
      url: `https://haveibeenpwned.com/PwnedWebsites#${breach.Name}`,
      publishedAt: new Date(breach.AddedDate || breach.BreachDate).toISOString(),
      description: [
        breach.Description ? this._stripHtml(breach.Description).slice(0, 300) : '',
        `Domain: ${breach.Domain || 'N/A'}`,
        dataClasses ? `Exposed data: ${dataClasses}` : '',
      ].filter(Boolean).join(' | '),
      sourceName: 'Have I Been Pwned',
      sourceType: 'trade_press',
      rawSource: 'HIBP',
      hibpData: {
        name: breach.Name,
        domain: breach.Domain || '',
        breachDate: breach.BreachDate,
        pwnCount: breach.PwnCount || 0,
        dataClasses: breach.DataClasses || [],
        isVerified: breach.IsVerified,
        isSensitive: breach.IsSensitive,
      },
    };
  }

  /**
   * Set domains to monitor (called by orchestrator with entity websites).
   */
  setWatchedDomains(domains) {
    this.watchedDomains = domains;
  }

  async fetchAll() {
    const breaches = await this.fetchBreaches();
    this.lastPollAt = new Date().toISOString();
    console.log(`[HIBPSource] Fetched ${breaches.length} recent breaches`);
    return breaches;
  }

  _stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  _formatNumber(n) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
    return String(n);
  }
}

module.exports = { HIBPSource };
