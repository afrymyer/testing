/**
 * CISA Source Ingestion
 * Fetches CISA cybersecurity alerts, advisories, and KEV catalog entries.
 * Tier 1 enrichment source - not for victim identification, but for
 * context about threats relevant to PA municipalities and SMBs.
 */

const fetch = require('node-fetch');

const CISA_ALERTS_RSS = 'https://www.cisa.gov/cybersecurity-advisories/all.xml';
const CISA_KEV_JSON = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

class CisaSource {
  constructor(options = {}) {
    this.name = 'CISA';
    this.pollIntervalMs = options.pollIntervalMs || 60 * 60 * 1000; // 60 min
    this.lastPollAt = null;
  }

  /**
   * Fetch CISA alerts/advisories RSS feed.
   */
  async fetchAlerts() {
    try {
      const response = await fetch(CISA_ALERTS_RSS, {
        headers: { 'User-Agent': 'PA-CyberWatch-Feed/1.0' },
        timeout: 20000,
      });

      if (!response.ok) {
        console.warn(`[CisaSource] Alerts RSS HTTP ${response.status}`);
        return [];
      }

      const xml = await response.text();
      return this._parseAlertRss(xml);
    } catch (err) {
      console.error(`[CisaSource] Alerts error: ${err.message}`);
      return [];
    }
  }

  /**
   * Parse CISA RSS alerts into normalized items.
   */
  _parseAlertRss(xml) {
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
        description: this._decode(this._stripHtml(description || '')),
        sourceName: 'CISA',
        sourceType: 'government',
        rawSource: 'CISA_Alerts',
        cisaType: this._classifyCisaType(title || ''),
      });
    }

    return items;
  }

  /**
   * Fetch the CISA Known Exploited Vulnerabilities catalog.
   * Useful for enrichment: if a CVE in the KEV matches software used by PA entities.
   */
  async fetchKEV() {
    try {
      const response = await fetch(CISA_KEV_JSON, {
        headers: { 'User-Agent': 'PA-CyberWatch-Feed/1.0' },
        timeout: 20000,
      });

      if (!response.ok) {
        console.warn(`[CisaSource] KEV HTTP ${response.status}`);
        return [];
      }

      const data = await response.json();
      if (!data.vulnerabilities) return [];

      // Return only recent entries (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      return data.vulnerabilities
        .filter(v => new Date(v.dateAdded) >= thirtyDaysAgo)
        .map(v => ({
          headline: `KEV: ${v.cveID} - ${v.vendorProject} ${v.product}`,
          url: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
          publishedAt: new Date(v.dateAdded).toISOString(),
          description: v.shortDescription || `${v.vulnerabilityName} - ${v.vendorProject} ${v.product}`,
          sourceName: 'CISA KEV',
          sourceType: 'government',
          rawSource: 'CISA_KEV',
          cisaType: 'KEV',
          kevData: {
            cveId: v.cveID,
            vendor: v.vendorProject,
            product: v.product,
            vulnerabilityName: v.vulnerabilityName,
            dateAdded: v.dateAdded,
            dueDate: v.dueDate,
            knownRansomwareCampaignUse: v.knownRansomwareCampaignUse,
          },
        }));
    } catch (err) {
      console.error(`[CisaSource] KEV error: ${err.message}`);
      return [];
    }
  }

  /**
   * Fetch all CISA sources.
   */
  async fetchAll() {
    const [alerts, kev] = await Promise.all([
      this.fetchAlerts(),
      this.fetchKEV(),
    ]);

    this.lastPollAt = new Date().toISOString();
    return [...alerts, ...kev];
  }

  _classifyCisaType(title) {
    const lower = title.toLowerCase();
    if (lower.includes('alert')) return 'Alert';
    if (lower.includes('advisory')) return 'Advisory';
    if (lower.includes('ics')) return 'ICS Advisory';
    if (lower.includes('update')) return 'Update';
    return 'Advisory';
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

module.exports = { CisaSource };
