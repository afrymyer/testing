/**
 * Social Source Ingestion (Tier 3)
 * Monitors public social signals from Reddit.
 * X/LinkedIn/Facebook require authenticated APIs - this module
 * focuses on what's publicly queryable without API keys.
 *
 * Treat social sources as signals only, not confirmation.
 */

const { fetchWithRetry } = require('../retry');

class SocialSource {
  constructor(options = {}) {
    this.name = 'Social';
    this.pollIntervalMs = options.pollIntervalMs || 30 * 60 * 1000; // 30 min
    this.lastPollAt = null;
  }

  /**
   * Search Reddit for PA cyber incident mentions via JSON API.
   */
  async fetchReddit(queries) {
    const items = [];
    const seenIds = new Set();

    for (const query of queries) {
      try {
        const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=25&t=week`;
        const response = await fetchWithRetry(url, {
          headers: {
            'User-Agent': 'PA-CyberWatch-Feed/1.0',
          },
          timeout: 15000,
        });

        if (!response.ok) {
          console.warn(`[SocialSource] Reddit HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        if (!data.data || !data.data.children) continue;

        for (const child of data.data.children) {
          const post = child.data;
          if (seenIds.has(post.id)) continue;
          seenIds.add(post.id);

          items.push({
            headline: post.title || '',
            url: `https://www.reddit.com${post.permalink}`,
            publishedAt: post.created_utc
              ? new Date(post.created_utc * 1000).toISOString()
              : new Date().toISOString(),
            description: (post.selftext || '').substring(0, 500),
            sourceName: `r/${post.subreddit}`,
            sourceType: 'social',
            rawSource: 'Reddit',
            socialMeta: {
              platform: 'reddit',
              subreddit: post.subreddit,
              score: post.score,
              numComments: post.num_comments,
              author: post.author,
            },
          });
        }

        await new Promise(r => setTimeout(r, 2000)); // Reddit rate limiting
      } catch (err) {
        console.error(`[SocialSource] Reddit error: ${err.message}`);
      }
    }

    return items;
  }

  /**
   * Get default social search queries for PA cyber incidents.
   */
  getDefaultQueries() {
    return [
      'Pennsylvania cyberattack OR ransomware',
      'PA township breach OR hack',
      'Pennsylvania school district ransomware',
      'Pennsylvania hospital data breach',
      'PA municipal authority cyber',
    ];
  }

  /**
   * Fetch all social sources.
   */
  async fetchAll(queries) {
    const searchQueries = queries || this.getDefaultQueries();
    const items = await this.fetchReddit(searchQueries);

    this.lastPollAt = new Date().toISOString();
    return items;
  }
}

module.exports = { SocialSource };
