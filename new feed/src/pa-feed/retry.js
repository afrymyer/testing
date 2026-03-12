/**
 * Retry utility with exponential backoff for source fetches.
 */

const fetch = require('node-fetch');

const DEFAULT_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 2000;

/**
 * Fetch with automatic retry and exponential backoff.
 *
 * @param {string} url
 * @param {Object} options - node-fetch options
 * @param {Object} retryOpts - { retries, baseDelayMs }
 * @returns {Response}
 */
async function fetchWithRetry(url, options = {}, retryOpts = {}) {
  const maxRetries = retryOpts.retries || DEFAULT_RETRIES;
  const baseDelay = retryOpts.baseDelayMs || DEFAULT_BASE_DELAY_MS;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Retry on 429 (rate limit) and 5xx errors
      if (attempt < maxRetries && (response.status === 429 || response.status >= 500)) {
        const delay = baseDelay * Math.pow(2, attempt);
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : delay;
        console.warn(`[Retry] HTTP ${response.status} for ${url}, retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(waitMs);
        continue;
      }

      return response;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[Retry] ${err.message} for ${url}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error(`Failed after ${maxRetries} retries: ${url}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { fetchWithRetry, sleep };
