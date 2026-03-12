/**
 * Confidence Scoring Engine for PA Cyber Watch Feed.
 *
 * Scores each detected mention 0–100 based on:
 *   - Source credibility (0–35)
 *   - Entity match quality (0–25)
 *   - Incident language strength (0–25)
 *   - Cross-source validation (0–25)
 */

const { scoreIncidentLanguage } = require('./keywords');

// Source credibility scores
const SOURCE_CREDIBILITY = {
  government: 35,    // Official government / advisory source (CISA, PA AG)
  local_news: 25,    // Reputable local/regional news
  national_news: 20, // National news outlet
  trade_press: 20,   // Cybersecurity trade press
  social: 5,         // Social-only mention
  unknown: 10,       // Unclassified source
};

// Entity match scores
const ENTITY_MATCH = {
  exact: 25,       // Exact entity name match
  alias: 15,       // Alias match
  geography: 5,    // Generic PA geography match only
};

// Confidence bands
const CONFIDENCE_BANDS = {
  HIGH: { min: 75, max: 100, label: 'High', description: 'Likely confirmed' },
  MEDIUM: { min: 50, max: 74, label: 'Medium', description: 'Credible but needs review' },
  LOW: { min: 25, max: 49, label: 'Low', description: 'Possible lead' },
  NOISE: { min: 0, max: 24, label: 'Noise', description: 'Suppress or hold for analyst review' },
};

// Output categories
const OUTPUT_CATEGORIES = {
  CONFIRMED: {
    id: 1,
    label: 'Confirmed Incident',
    description: 'Public reporting or official statement clearly indicates a breach, ransomware event, or cyberattack.',
  },
  SUSPECTED: {
    id: 2,
    label: 'Suspected Incident',
    description: 'Credible reporting points to an event, but no direct confirmation yet.',
  },
  ADVISORY: {
    id: 3,
    label: 'Official Advisory / Risk Context',
    description: 'No victim named, but a CISA alert or KEV item is relevant to PA municipalities or SMBs.',
  },
  SOCIAL_CHATTER: {
    id: 4,
    label: 'Social Chatter / Needs Verification',
    description: 'Public post suggests an incident; hold below the fold until corroborated.',
  },
};

/**
 * Classify source type from URL or source name.
 */
function classifySource(url, sourceName) {
  const lower = (url + ' ' + (sourceName || '')).toLowerCase();

  // Government / advisory
  if (lower.includes('cisa.gov') || lower.includes('us-cert') ||
      lower.includes('attorneygeneral') || lower.includes('.gov') ||
      lower.includes('ic3.gov') || lower.includes('fbi.gov')) {
    return 'government';
  }

  // Local / regional news
  if (lower.includes('pennlive') || lower.includes('abc27') ||
      lower.includes('wgal') || lower.includes('fox43') ||
      lower.includes('witf') || lower.includes('lancasteronline') ||
      lower.includes('ldnews') || lower.includes('ydr.com') ||
      lower.includes('readingeagle') || lower.includes('dailylocal') ||
      lower.includes('mcall.com') || lower.includes('thetimes-tribune') ||
      lower.includes('tribdem') || lower.includes('post-gazette') ||
      lower.includes('inquirer.com') || lower.includes('phillymag') ||
      lower.includes('pahomepage') || lower.includes('wnep.com') ||
      lower.includes('wpxi') || lower.includes('wtae') ||
      lower.includes('cbslocal') || lower.includes('nbcphiladelphia') ||
      lower.includes('6abc.com')) {
    return 'local_news';
  }

  // National news
  if (lower.includes('cnn.com') || lower.includes('nytimes') ||
      lower.includes('washingtonpost') || lower.includes('apnews') ||
      lower.includes('reuters') || lower.includes('bbc.com') ||
      lower.includes('usatoday') || lower.includes('nbcnews') ||
      lower.includes('abcnews') || lower.includes('cbsnews') ||
      lower.includes('foxnews')) {
    return 'national_news';
  }

  // Cybersecurity trade press
  if (lower.includes('bleepingcomputer') || lower.includes('krebsonsecurity') ||
      lower.includes('therecord.media') || lower.includes('darkreading') ||
      lower.includes('securityweek') || lower.includes('threatpost') ||
      lower.includes('cyberscoop') || lower.includes('hackernews') ||
      lower.includes('infosecurity-magazine') || lower.includes('scmagazine')) {
    return 'trade_press';
  }

  // Social
  if (lower.includes('twitter.com') || lower.includes('x.com') ||
      lower.includes('reddit.com') || lower.includes('facebook.com') ||
      lower.includes('linkedin.com') || lower.includes('mastodon') ||
      lower.includes('bsky.app')) {
    return 'social';
  }

  return 'unknown';
}

/**
 * Score a single mention/article.
 *
 * @param {Object} params
 * @param {string} params.text - headline + body text
 * @param {string} params.url - source URL
 * @param {string} params.sourceName - source name
 * @param {Object[]} params.entityMatches - from EntityManager.matchEntities()
 * @param {Object[]} params.geoMatches - from EntityManager.matchGeography()
 * @param {number} params.crossSourceCount - number of independent sources for same incident
 * @returns {Object} score breakdown
 */
function scoreItem({ text, url, sourceName, entityMatches = [], geoMatches = [], crossSourceCount = 0 }) {
  const breakdown = {
    sourceCredibility: 0,
    entityMatch: 0,
    incidentLanguage: 0,
    crossSource: 0,
    total: 0,
    band: null,
    category: null,
    sourceType: null,
  };

  // 1. Source credibility
  const sourceType = classifySource(url || '', sourceName || '');
  breakdown.sourceType = sourceType;
  breakdown.sourceCredibility = SOURCE_CREDIBILITY[sourceType] || SOURCE_CREDIBILITY.unknown;

  // 2. Entity match
  if (entityMatches.length > 0) {
    const bestMatch = entityMatches.reduce((best, m) => {
      const score = ENTITY_MATCH[m.matchType] || 0;
      return score > best.score ? { score, match: m } : best;
    }, { score: 0, match: null });
    breakdown.entityMatch = bestMatch.score;
  } else if (geoMatches.length > 0) {
    breakdown.entityMatch = ENTITY_MATCH.geography;
  }

  // 3. Incident language
  const langScore = scoreIncidentLanguage(text || '');
  breakdown.incidentLanguage = langScore.score;

  // 4. Cross-source validation
  if (crossSourceCount >= 3) {
    breakdown.crossSource = 25;
  } else if (crossSourceCount >= 2) {
    breakdown.crossSource = 15;
  }

  // Total
  breakdown.total = Math.min(100,
    breakdown.sourceCredibility +
    breakdown.entityMatch +
    breakdown.incidentLanguage +
    breakdown.crossSource
  );

  // Confidence band
  if (breakdown.total >= CONFIDENCE_BANDS.HIGH.min) {
    breakdown.band = CONFIDENCE_BANDS.HIGH;
  } else if (breakdown.total >= CONFIDENCE_BANDS.MEDIUM.min) {
    breakdown.band = CONFIDENCE_BANDS.MEDIUM;
  } else if (breakdown.total >= CONFIDENCE_BANDS.LOW.min) {
    breakdown.band = CONFIDENCE_BANDS.LOW;
  } else {
    breakdown.band = CONFIDENCE_BANDS.NOISE;
  }

  // Output category
  if (sourceType === 'government' && entityMatches.length === 0) {
    breakdown.category = OUTPUT_CATEGORIES.ADVISORY;
  } else if (sourceType === 'social' && breakdown.total < 50) {
    breakdown.category = OUTPUT_CATEGORIES.SOCIAL_CHATTER;
  } else if (breakdown.total >= 75) {
    breakdown.category = OUTPUT_CATEGORIES.CONFIRMED;
  } else if (breakdown.total >= 50) {
    breakdown.category = OUTPUT_CATEGORIES.SUSPECTED;
  } else if (breakdown.total >= 25) {
    breakdown.category = OUTPUT_CATEGORIES.SOCIAL_CHATTER;
  } else {
    breakdown.category = OUTPUT_CATEGORIES.SOCIAL_CHATTER;
  }

  return breakdown;
}

module.exports = {
  scoreItem,
  classifySource,
  SOURCE_CREDIBILITY,
  ENTITY_MATCH,
  CONFIDENCE_BANDS,
  OUTPUT_CATEGORIES,
};
