/**
 * AlienVault OTX (Open Threat Exchange) Source
 * Queries OTX public pulse feed for threat intelligence relevant
 * to PA organizations and the broader cyber threat landscape.
 *
 * OTX provides:
 *   - Malicious indicators (IPs, domains, hashes)
 *   - Attack campaigns and threat groups
 *   - Infrastructure used in attacks
 *
 * Public API — no key required for pulse browsing.
 */

const { fetchWithRetry } = require('../retry');

const OTX_API = 'https://otx.alienvault.com/api/v1';

class OTXSource {
  constructor(options = {}) {
    this.name = 'OTX';
    this.pollIntervalMs = options.pollIntervalMs || 60 * 60 * 1000; // 60 min
    this.apiKey = options.apiKey || process.env.OTX_API_KEY || null;
    this.lastPollAt = null;
  }

  /**
   * Fetch recent pulses (threat intelligence reports).
   */
  async fetchPulses() {
    try {
      const headers = {
        'User-Agent': 'PA-CyberWatch-Feed/1.0',
      };
      if (this.apiKey) {
        headers['X-OTX-API-KEY'] = this.apiKey;
      }

      // Fetch pulses modified in the last 7 days
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const sinceStr = since.toISOString().split('T')[0];

      const url = `${OTX_API}/pulses/subscribed?modified_since=${sinceStr}&limit=50`;
      const altUrl = `${OTX_API}/pulses/activity?modified_since=${sinceStr}&limit=50`;

      // Try subscribed first (requires key), fallback to activity
      const targetUrl = this.apiKey ? url : altUrl;

      const response = await fetchWithRetry(targetUrl, {
        headers,
        timeout: 20000,
      });

      if (!response.ok) {
        console.warn(`[OTXSource] HTTP ${response.status}`);
        return [];
      }

      const data = await response.json();
      const pulses = data.results || data || [];
      if (!Array.isArray(pulses)) return [];

      return pulses
        .filter(p => this._isRelevant(p))
        .map(p => this._normalize(p));
    } catch (err) {
      console.error(`[OTXSource] Error: ${err.message}`);
      return [];
    }
  }

  /**
   * Filter for pulses relevant to our monitoring focus:
   * ransomware, government/municipal targets, data breaches.
   */
  _isRelevant(pulse) {
    const text = `${pulse.name || ''} ${pulse.description || ''} ${(pulse.tags || []).join(' ')}`.toLowerCase();
    const keywords = [
      'ransomware', 'breach', 'government', 'municipal', 'healthcare',
      'education', 'school', 'utility', 'pennsylvania', 'critical infrastructure',
      'lockbit', 'blackcat', 'alphv', 'clop', 'akira', 'play', 'rhysida',
      'phishing', 'data leak', 'credential', 'exploit',
    ];
    return keywords.some(kw => text.includes(kw));
  }

  /**
   * Normalize an OTX pulse into the standard item format.
   */
  _normalize(pulse) {
    const tags = (pulse.tags || []).slice(0, 8).join(', ');
    const indicatorCount = pulse.indicator_count || (pulse.indicators || []).length || 0;

    return {
      headline: `Threat Intel: ${pulse.name || 'Unknown Pulse'}`,
      url: `https://otx.alienvault.com/pulse/${pulse.id}`,
      publishedAt: new Date(pulse.modified || pulse.created).toISOString(),
      description: [
        (pulse.description || '').slice(0, 300),
        tags ? `Tags: ${tags}` : '',
        indicatorCount ? `${indicatorCount} indicators` : '',
      ].filter(Boolean).join(' | '),
      sourceName: 'AlienVault OTX',
      sourceType: 'trade_press',
      rawSource: 'OTX',
      otxData: {
        pulseId: pulse.id,
        tags: pulse.tags || [],
        indicatorCount,
        tlp: pulse.TLP || 'white',
        adversary: pulse.adversary || '',
        targetedCountries: pulse.targeted_countries || [],
      },
    };
  }

  async fetchAll() {
    const pulses = await this.fetchPulses();
    this.lastPollAt = new Date().toISOString();
    console.log(`[OTXSource] Fetched ${pulses.length} relevant threat pulses`);
    return pulses;
  }
}

module.exports = { OTXSource };
