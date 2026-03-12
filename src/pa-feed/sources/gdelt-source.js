/**
 * GDELT Source Ingestion
 * Queries the GDELT DOC API for articles mentioning PA organizations + cyber incidents.
 * Tier 2 source - broad discovery, refreshes every 15 minutes.
 */

const fetch = require('node-fetch');

const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';

class GdeltSource {
  constructor(options = {}) {
    this.name = 'GDELT';
    this.pollIntervalMs = options.pollIntervalMs || 30 * 60 * 1000; // 30 min
    this.maxRecords = options.maxRecords || 75;
    this.lastPollAt = null;
  }

  /**
   * Build a GDELT DOC API query URL.
   * GDELT DOC API supports free-text queries, date ranges, and geographic filters.
   */
  _buildUrl(query, options = {}) {
    const params = new URLSearchParams({
      query: query,
      mode: 'ArtList',
      maxrecords: String(options.maxRecords || this.maxRecords),
      format: 'json',
      sort: 'DateDesc',
    });

    if (options.timespan) {
      params.set('timespan', options.timespan);
    } else {
      // Default: last 24 hours
      params.set('timespan', '24h');
    }

    if (options.sourceLang) {
      params.set('sourcelang', options.sourceLang);
    }

    return `${GDELT_DOC_API}?${params.toString()}`;
  }

  /**
   * Parse GDELT article list response into normalized items.
   */
  _parseArticles(data) {
    if (!data || !data.articles) return [];

    return data.articles.map(article => ({
      headline: article.title || '',
      url: article.url || '',
      publishedAt: article.seendate
        ? this._parseGdeltDate(article.seendate)
        : new Date().toISOString(),
      description: article.title || '', // GDELT doesn't always provide a snippet
      sourceName: article.domain || article.source || 'GDELT',
      sourceType: 'news',
      rawSource: 'GDELT',
      gdeltTone: article.tone || null,
      gdeltLanguage: article.language || 'English',
      gdeltSourceCountry: article.sourcecountry || '',
    }));
  }

  /**
   * Parse GDELT's date format (YYYYMMDDHHmmSS) to ISO.
   */
  _parseGdeltDate(dateStr) {
    try {
      const cleaned = dateStr.replace(/T/g, '').replace(/Z/g, '');
      if (cleaned.length >= 14) {
        const y = cleaned.substring(0, 4);
        const m = cleaned.substring(4, 6);
        const d = cleaned.substring(6, 8);
        const h = cleaned.substring(8, 10);
        const min = cleaned.substring(10, 12);
        const s = cleaned.substring(12, 14);
        return new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`).toISOString();
      }
      return new Date(dateStr).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  /**
   * Fetch articles for a single query.
   */
  async fetchQuery(query, options = {}) {
    const url = this._buildUrl(query, options);
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'PA-CyberWatch-Feed/1.0' },
        timeout: 20000,
      });

      if (!response.ok) {
        console.warn(`[GdeltSource] HTTP ${response.status} for query: ${query}`);
        return [];
      }

      const data = await response.json();
      return this._parseArticles(data);
    } catch (err) {
      console.error(`[GdeltSource] Error: ${err.message}`);
      return [];
    }
  }

  /**
   * Run standard PA cyber-incident discovery queries.
   */
  async fetchAll(queries, options = {}) {
    const allItems = [];
    const seenUrls = new Set();

    for (const query of queries) {
      const items = await this.fetchQuery(query, options);
      for (const item of items) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          allItems.push(item);
        }
      }
      await new Promise(r => setTimeout(r, 500));
    }

    this.lastPollAt = new Date().toISOString();
    return allItems;
  }

  /**
   * Pre-built discovery queries for PA cyber incidents.
   */
  getDefaultQueries() {
    return [
      'Pennsylvania cyberattack OR ransomware OR "data breach"',
      'Pennsylvania township OR borough OR municipality breach OR hack',
      'Pennsylvania "school district" OR "municipal authority" ransomware OR cyberattack',
      'Pennsylvania hospital OR healthcare "security incident" OR "data breach"',
      'PA county government cyber OR breach OR ransomware',
    ];
  }
}

module.exports = { GdeltSource };
