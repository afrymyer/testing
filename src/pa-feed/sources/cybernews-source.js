/**
 * Cybersecurity News RSS Source
 * Aggregates RSS feeds from top cybersecurity news outlets:
 *   - BleepingComputer (fastest ransomware reporting)
 *   - SecurityWeek (enterprise breach / municipal ransomware)
 *   - DataBreaches.net (long-tail breach tracking, healthcare/municipal)
 *   - Recorded Future blog (ransomware group intel)
 */

const { fetchWithRetry } = require('../retry');

const RSS_FEEDS = [
  {
    name: 'BleepingComputer',
    url: 'https://www.bleepingcomputer.com/feed/',
    sourceType: 'trade_press',
    tags: ['ransomware', 'breaches', 'vulnerabilities'],
  },
  {
    name: 'SecurityWeek',
    url: 'https://www.securityweek.com/feed/',
    sourceType: 'trade_press',
    tags: ['enterprise', 'municipal', 'supply-chain'],
  },
  {
    name: 'DataBreaches.net',
    url: 'https://databreaches.net/feed/',
    sourceType: 'trade_press',
    tags: ['breach-tracking', 'healthcare', 'municipal'],
  },
  {
    name: 'Recorded Future',
    url: 'https://www.recordedfuture.com/feed',
    sourceType: 'trade_press',
    tags: ['ransomware-groups', 'threat-intel', 'campaigns'],
  },
];

class CyberNewsSource {
  constructor(options = {}) {
    this.name = 'CyberNews';
    this.pollIntervalMs = options.pollIntervalMs || 30 * 60 * 1000; // 30 min
    this.feeds = options.feeds || RSS_FEEDS;
    this.lastPollAt = null;
  }

  /**
   * Fetch and parse a single RSS feed.
   */
  async fetchFeed(feed) {
    try {
      const response = await fetchWithRetry(feed.url, {
        headers: { 'User-Agent': 'PA-CyberWatch-Feed/1.0' },
        timeout: 15000,
      });

      if (!response.ok) {
        console.warn(`[CyberNewsSource] ${feed.name} HTTP ${response.status}`);
        return [];
      }

      const xml = await response.text();
      return this._parseRss(xml, feed);
    } catch (err) {
      console.error(`[CyberNewsSource] ${feed.name} error: ${err.message}`);
      return [];
    }
  }

  /**
   * Parse RSS XML into normalized items.
   */
  _parseRss(xml, feed) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = this._extractTag(itemXml, 'title');
      const link = this._extractTag(itemXml, 'link');
      const pubDate = this._extractTag(itemXml, 'pubDate');
      const description = this._extractTag(itemXml, 'description');
      const category = this._extractAllTags(itemXml, 'category');

      items.push({
        headline: this._decode(title || ''),
        url: link || '',
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        description: this._decode(this._stripHtml(description || '')).slice(0, 500),
        sourceName: feed.name,
        sourceType: feed.sourceType,
        rawSource: `CyberNews_${feed.name.replace(/[^a-zA-Z]/g, '')}`,
        categories: category,
        feedTags: feed.tags,
      });
    }

    return items;
  }

  /**
   * Fetch all cybersecurity RSS feeds. Deduplicates by URL.
   */
  async fetchAll() {
    const allItems = [];
    const seenUrls = new Set();

    // Fetch all feeds in parallel
    const results = await Promise.all(
      this.feeds.map(feed => this.fetchFeed(feed))
    );

    for (const feedItems of results) {
      for (const item of feedItems) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          allItems.push(item);
        }
      }
    }

    this.lastPollAt = new Date().toISOString();
    console.log(`[CyberNewsSource] Fetched ${allItems.length} items from ${this.feeds.length} feeds`);
    return allItems;
  }

  _extractTag(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`);
    const match = regex.exec(xml);
    return match ? match[1].trim() : null;
  }

  _extractAllTags(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'g');
    const results = [];
    let match;
    while ((match = regex.exec(xml)) !== null) {
      results.push(match[1].trim());
    }
    return results;
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
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'");
  }
}

module.exports = { CyberNewsSource };
