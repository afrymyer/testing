/**
 * AI Result Cache
 *
 * Caches AI analysis results per ticket hash to avoid re-analyzing
 * the same tickets. Cache is in-memory with configurable TTL.
 */
const crypto = require('crypto');
const logger = require('./logger');

class AICache {
  constructor({ ttlMs = 30 * 60 * 1000, maxEntries = 5000 } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generate a hash for a ticket based on its content.
   * Only content that affects AI analysis is included.
   */
  _hashTicket(ticket) {
    const key = JSON.stringify({
      id: ticket.id || ticket.ticketId,
      title: ticket.title || '',
      description: ticket.description || '',
      resolution: ticket.resolution || '',
      priority: ticket.priority,
      issueTypeName: ticket.issueTypeName || null,
      subIssueTypeName: ticket.subIssueTypeName || null,
    });
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Get cached AI result for a ticket.
   * @returns {object|null} Cached AI result or null if miss.
   */
  get(ticket) {
    const hash = this._hashTicket(ticket);
    const entry = this.cache.get(hash);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(hash);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.result;
  }

  /**
   * Store AI result for a ticket.
   */
  set(ticket, result) {
    const hash = this._hashTicket(ticket);
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    this.cache.set(hash, { result, timestamp: Date.now() });
  }

  /**
   * Batch get: returns { cached: Map<ticketId, result>, uncached: ticket[] }
   */
  getBatch(tickets) {
    const cached = new Map();
    const uncached = [];
    for (const ticket of tickets) {
      const result = this.get(ticket);
      const id = ticket.id || ticket.ticketId;
      if (result) {
        cached.set(String(id), result);
      } else {
        uncached.push(ticket);
      }
    }
    return { cached, uncached };
  }

  /**
   * Batch set: store results for multiple tickets.
   */
  setBatch(tickets, results) {
    for (let i = 0; i < tickets.length; i++) {
      if (results[i]) {
        this.set(tickets[i], results[i]);
      }
    }
  }

  /**
   * Clear all cached entries.
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    logger.info({ component: 'ai-cache' }, 'Cache cleared');
  }

  /**
   * Get cache stats.
   */
  getStats() {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      ttlMs: this.ttlMs,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? Math.round((this.hits / (this.hits + this.misses)) * 100)
        : 0,
    };
  }
}

// Singleton instance
const aiCache = new AICache({
  ttlMs: parseInt(process.env.AI_CACHE_TTL_MS) || 30 * 60 * 1000, // 30 min default
  maxEntries: parseInt(process.env.AI_CACHE_MAX_ENTRIES) || 5000,
});

module.exports = aiCache;
