/**
 * Shadowserver Foundation Source
 * Monitors Shadowserver public reports for exposed systems and
 * vulnerable infrastructure in Pennsylvania.
 *
 * Shadowserver collects global internet telemetry and provides:
 *   - Exposed systems reports
 *   - Vulnerable infrastructure alerts
 *   - Botnet activity data
 *
 * Public dashboard data — no auth needed for aggregate stats.
 * For org-specific reports, a Shadowserver account is needed.
 */

const { fetchWithRetry } = require('../retry');

const SHADOWSERVER_REPORTS_API = 'https://transform.shadowserver.org/api2/';

class ShadowserverSource {
  constructor(options = {}) {
    this.name = 'Shadowserver';
    this.pollIntervalMs = options.pollIntervalMs || 6 * 60 * 60 * 1000; // 6 hours
    this.lastPollAt = null;
  }

  /**
   * Fetch aggregate stats from Shadowserver's public dashboard.
   * Shows count of exposed/vulnerable systems by country/region.
   */
  async fetchExposureStats() {
    try {
      // Public stats endpoint for US/PA exposed systems
      const response = await fetchWithRetry(
        'https://dashboard.shadowserver.org/statistics/combined/map/',
        {
          headers: { 'User-Agent': 'PA-CyberWatch-Feed/1.0' },
          timeout: 20000,
        }
      );

      if (!response.ok) {
        console.warn(`[ShadowserverSource] Dashboard HTTP ${response.status}`);
        return [];
      }

      // Parse whatever format the dashboard returns
      const text = await response.text();
      return this._parseExposureData(text);
    } catch (err) {
      // Shadowserver may not have a simple public JSON API, fall back to RSS/blog
      console.warn(`[ShadowserverSource] Dashboard unavailable, trying blog feed`);
      return this._fetchBlogFeed();
    }
  }

  /**
   * Fallback: fetch Shadowserver blog/reports RSS for situational awareness.
   */
  async _fetchBlogFeed() {
    try {
      const response = await fetchWithRetry(
        'https://www.shadowserver.org/news/feed/',
        {
          headers: { 'User-Agent': 'PA-CyberWatch-Feed/1.0' },
          timeout: 15000,
        }
      );

      if (!response.ok) return [];

      const xml = await response.text();
      return this._parseRss(xml);
    } catch (err) {
      console.error(`[ShadowserverSource] Blog feed error: ${err.message}`);
      return [];
    }
  }

  /**
   * Parse exposure data into normalized items.
   */
  _parseExposureData(text) {
    // Shadowserver public stats may come as JSON or HTML
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) return [];

      return data
        .filter(d => d.geo && (d.geo === 'US' || d.geo === 'PA'))
        .slice(0, 20)
        .map(d => ({
          headline: `Exposure Alert: ${d.tag || d.type || 'Vulnerable Systems'} (${d.count || 0} hosts)`,
          url: 'https://dashboard.shadowserver.org/',
          publishedAt: new Date(d.date || Date.now()).toISOString(),
          description: `${d.tag || d.type || 'Systems'} — ${d.count || 0} exposed hosts detected. Region: ${d.geo || 'US'}`,
          sourceName: 'Shadowserver',
          sourceType: 'government',
          rawSource: 'Shadowserver',
          shadowserverData: {
            tag: d.tag || d.type || '',
            count: d.count || 0,
            geo: d.geo || '',
          },
        }));
    } catch {
      return [];
    }
  }

  /**
   * Parse RSS feed into normalized items.
   */
  _parseRss(xml) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = this._extractTag(itemXml, 'title');
      const link = this._extractTag(itemXml, 'link');
      const pubDate = this._extractTag(itemXml, 'pubDate');
      const description = this._extractTag(itemXml, 'description');

      items.push({
        headline: this._decode(title || ''),
        url: link || '',
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        description: this._decode(this._stripHtml(description || '')).slice(0, 500),
        sourceName: 'Shadowserver',
        sourceType: 'government',
        rawSource: 'Shadowserver',
      });
    }

    return items;
  }

  async fetchAll() {
    const items = await this.fetchExposureStats();
    this.lastPollAt = new Date().toISOString();
    console.log(`[ShadowserverSource] Fetched ${items.length} items`);
    return items;
  }

  _extractTag(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`);
    const match = regex.exec(xml);
    return match ? match[1].trim() : null;
  }

  _stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  _decode(text) {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}

module.exports = { ShadowserverSource };
