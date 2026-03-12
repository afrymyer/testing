/**
 * News Source Ingestion
 * Fetches articles from Google News RSS and structured news search APIs.
 * Tier 1 source - high confidence.
 */

const fetch = require('node-fetch');

const GOOGLE_NEWS_RSS_BASE = 'https://news.google.com/rss/search';

class NewsSource {
  constructor(options = {}) {
    this.name = 'GoogleNews';
    this.pollIntervalMs = options.pollIntervalMs || 30 * 60 * 1000; // 30 min
    this.maxResults = options.maxResults || 50;
    this.lastPollAt = null;
  }

  /**
   * Build Google News RSS URL for a search query.
   */
  _buildRssUrl(query) {
    const encoded = encodeURIComponent(query);
    return `${GOOGLE_NEWS_RSS_BASE}?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
  }

  /**
   * Parse RSS XML into article objects.
   * Simple XML parser - no external dependency needed for RSS.
   */
  _parseRssItems(xml) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = this._extractTag(itemXml, 'title');
      const link = this._extractTag(itemXml, 'link');
      const pubDate = this._extractTag(itemXml, 'pubDate');
      const description = this._extractTag(itemXml, 'description');
      const source = this._extractTag(itemXml, 'source');

      items.push({
        headline: this._decodeHtmlEntities(title || ''),
        url: link || '',
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        description: this._decodeHtmlEntities(this._stripHtml(description || '')),
        sourceName: this._decodeHtmlEntities(source || 'Google News'),
        sourceType: 'news',
        rawSource: 'GoogleNews',
      });
    }

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

  _decodeHtmlEntities(text) {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'");
  }

  /**
   * Fetch articles for a single search query.
   */
  async fetchQuery(query) {
    const url = this._buildRssUrl(query);
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PA-CyberWatch-Feed/1.0',
        },
        timeout: 15000,
      });

      if (!response.ok) {
        console.warn(`[NewsSource] HTTP ${response.status} for query: ${query}`);
        return [];
      }

      const xml = await response.text();
      return this._parseRssItems(xml);
    } catch (err) {
      console.error(`[NewsSource] Error fetching query "${query}": ${err.message}`);
      return [];
    }
  }

  /**
   * Run a batch of searches. Deduplicates by URL.
   */
  async fetchAll(queries) {
    const allItems = [];
    const seenUrls = new Set();

    for (const query of queries) {
      const items = await this.fetchQuery(query);
      for (const item of items) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          allItems.push(item);
        }
      }
      // Brief delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }

    this.lastPollAt = new Date().toISOString();
    return allItems.slice(0, this.maxResults);
  }
}

module.exports = { NewsSource };
