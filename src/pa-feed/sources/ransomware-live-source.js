/**
 * Ransomware.live Source
 * Monitors ransomware gang leak sites for victim postings.
 * Victims sometimes appear here weeks before public disclosure.
 *
 * Tracks groups like: LockBit, BlackCat/ALPHV, Cl0p, Akira, Play, etc.
 *
 * Uses the public ransomware.live API (no auth needed).
 */

const { fetchWithRetry } = require('../retry');

const RANSOMWARE_LIVE_API = 'https://api.ransomware.live/v2';

class RansomwareLiveSource {
  constructor(options = {}) {
    this.name = 'RansomwareLive';
    this.pollIntervalMs = options.pollIntervalMs || 60 * 60 * 1000; // 60 min
    this.lastPollAt = null;
    // PA-related keywords for filtering victims
    this.paKeywords = [
      'pennsylvania', ' pa ', ' pa,', ',pa ', 'philadelphia', 'pittsburgh',
      'harrisburg', 'allentown', 'scranton', 'erie', 'reading', 'lancaster',
      'bethlehem', 'york', 'wilkes-barre', 'chester', 'lehigh',
    ];
  }

  /**
   * Fetch recent ransomware victims from the API.
   */
  async fetchRecentVictims() {
    try {
      const response = await fetchWithRetry(`${RANSOMWARE_LIVE_API}/victims`, {
        headers: { 'User-Agent': 'PA-CyberWatch-Feed/1.0' },
        timeout: 20000,
      });

      if (!response.ok) {
        console.warn(`[RansomwareLive] Victims HTTP ${response.status}`);
        return [];
      }

      const data = await response.json();
      if (!Array.isArray(data)) return [];

      // Filter to recent entries (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recent = data.filter(v => {
        const date = new Date(v.published || v.discovered || v.date);
        return date >= thirtyDaysAgo;
      });

      return recent.map(v => this._normalize(v));
    } catch (err) {
      console.error(`[RansomwareLive] Error: ${err.message}`);
      return [];
    }
  }

  /**
   * Fetch recent ransomware group activity.
   */
  async fetchGroups() {
    try {
      const response = await fetchWithRetry(`${RANSOMWARE_LIVE_API}/groups`, {
        headers: { 'User-Agent': 'PA-CyberWatch-Feed/1.0' },
        timeout: 15000,
      });

      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error(`[RansomwareLive] Groups error: ${err.message}`);
      return [];
    }
  }

  /**
   * Normalize a victim entry into the standard item format.
   */
  _normalize(victim) {
    const groupName = victim.group_name || victim.group || 'Unknown';
    const victimName = victim.victim || victim.name || victim.post_title || 'Unknown';
    const published = victim.published || victim.discovered || victim.date || new Date().toISOString();

    return {
      headline: `Ransomware: ${groupName} claims ${victimName}`,
      url: victim.post_url || victim.website || '',
      publishedAt: new Date(published).toISOString(),
      description: [
        `Ransomware group "${groupName}" posted "${victimName}" on their leak site.`,
        victim.country ? `Country: ${victim.country}` : '',
        victim.activity ? `Activity: ${victim.activity}` : '',
        victim.website ? `Website: ${victim.website}` : '',
      ].filter(Boolean).join(' '),
      sourceName: 'Ransomware.live',
      sourceType: 'trade_press',
      rawSource: 'RansomwareLive',
      ransomwareData: {
        groupName,
        victimName,
        country: victim.country || '',
        website: victim.website || '',
        activity: victim.activity || '',
      },
    };
  }

  /**
   * Check if a victim entry might be PA-related.
   */
  _isPARelevant(item) {
    const text = `${item.headline} ${item.description}`.toLowerCase();
    return this.paKeywords.some(kw => text.includes(kw));
  }

  /**
   * Fetch all ransomware leak data. Returns all victims (PA filtering
   * happens in the orchestrator via entity/geo matching).
   */
  async fetchAll() {
    const victims = await this.fetchRecentVictims();
    this.lastPollAt = new Date().toISOString();
    console.log(`[RansomwareLive] Fetched ${victims.length} recent victims`);
    return victims;
  }
}

module.exports = { RansomwareLiveSource };
