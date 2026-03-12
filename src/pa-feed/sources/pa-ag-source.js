/**
 * Pennsylvania Attorney General Breach Source
 * Tier 1 source - official state-level breach reporting context.
 * Fetches from the PA AG Bureau of Consumer Protection / BPINA pages.
 */

const fetch = require('node-fetch');
const { fetchWithRetry } = require('../retry');

const PA_AG_BASE = 'https://www.attorneygeneral.gov';
const PA_AG_DATA_BREACH_URL = `${PA_AG_BASE}/taking-action/data-breach-notifications`;

class PAAttorneyGeneralSource {
  constructor(options = {}) {
    this.name = 'PA_AG';
    this.pollIntervalMs = options.pollIntervalMs || 60 * 60 * 1000; // 60 min
    this.lastPollAt = null;
  }

  /**
   * Fetch the PA AG data breach notifications page and extract mentions.
   */
  async fetchBreachNotifications() {
    try {
      const response = await fetchWithRetry(PA_AG_DATA_BREACH_URL, {
        headers: { 'User-Agent': 'PA-CyberWatch-Feed/1.0' },
        timeout: 20000,
      });

      if (!response.ok) {
        console.warn(`[PA_AG] HTTP ${response.status}`);
        return [];
      }

      const html = await response.text();
      return this._parseBreachPage(html);
    } catch (err) {
      console.error(`[PA_AG] Error: ${err.message}`);
      return [];
    }
  }

  /**
   * Parse the breach notifications page for entity mentions.
   * Extracts links and text that reference breaches.
   */
  _parseBreachPage(html) {
    const items = [];

    // Extract links with breach-related text
    const linkRegex = /<a[^>]+href="([^"]*)"[^>]*>([^<]+)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const text = match[2].trim();

      // Filter for breach-relevant links
      if (this._isBreachRelevant(text)) {
        const url = href.startsWith('http') ? href : `${PA_AG_BASE}${href}`;
        items.push({
          headline: `PA AG: ${text}`,
          url,
          publishedAt: new Date().toISOString(),
          description: `Pennsylvania Attorney General notice: ${text}`,
          sourceName: 'PA Attorney General',
          sourceType: 'government',
          rawSource: 'PA_AG',
        });
      }
    }

    // Also extract paragraphs mentioning breaches
    const paraRegex = /<p[^>]*>([^<]*(?:breach|data breach|notification|cyber|ransomware|security incident)[^<]*)<\/p>/gi;
    while ((match = paraRegex.exec(html)) !== null) {
      const text = match[1].trim();
      if (text.length > 30 && text.length < 500) {
        items.push({
          headline: text.substring(0, 150),
          url: PA_AG_DATA_BREACH_URL,
          publishedAt: new Date().toISOString(),
          description: text,
          sourceName: 'PA Attorney General',
          sourceType: 'government',
          rawSource: 'PA_AG',
        });
      }
    }

    return items;
  }

  _isBreachRelevant(text) {
    const lower = text.toLowerCase();
    const keywords = ['breach', 'data breach', 'notification', 'cyber', 'security',
      'ransomware', 'identity theft', 'consumer alert', 'privacy'];
    return keywords.some(kw => lower.includes(kw));
  }

  async fetchAll() {
    const items = await this.fetchBreachNotifications();
    this.lastPollAt = new Date().toISOString();
    return items;
  }
}

module.exports = { PAAttorneyGeneralSource };
