/**
 * Incident keyword groups and search pattern builder for PA Cyber Watch Feed.
 */

const KEYWORD_GROUPS = {
  attack: [
    'breach',
    'cyberattack',
    'cyber attack',
    'ransomware',
    'data breach',
    'security incident',
    'unauthorized access',
    'compromised',
    'network intrusion',
    'malware',
    'phishing attack',
    'incident response',
    'systems outage',
    'IT outage',
    'outage after cyberattack',
  ],
  localGov: [
    'township',
    'borough',
    'municipality',
    'municipal authority',
    'county',
    'school district',
    'water authority',
    'sewer authority',
    'public works',
    'police department',
    'tax office',
  ],
  paQualifiers: [
    'Pennsylvania',
    'PA',
  ],
};

// Confidence-language mapping for scoring
const INCIDENT_LANGUAGE = {
  confirmed: {
    score: 25,
    patterns: [
      'confirmed breach',
      'ransomware attack',
      'data breach',
      'confirmed cyberattack',
      'confirmed cyber attack',
      'confirmed hack',
      'breach notification',
      'data exposed',
      'records stolen',
      'data exfiltrated',
    ],
  },
  suspected: {
    score: 15,
    patterns: [
      'security incident',
      'network disruption',
      'systems outage',
      'service disruption',
      'IT outage',
      'investigating incident',
      'unauthorized access',
      'suspicious activity',
      'network intrusion',
      'phishing attack',
    ],
  },
  unconfirmed: {
    score: 5,
    patterns: [
      'rumored',
      'possible',
      'unconfirmed',
      'alleged',
      'reportedly',
      'sources say',
      'may have been',
      'potential breach',
      'possible hack',
    ],
  },
};

// Incident type classification
const INCIDENT_TYPES = {
  RANSOMWARE: { label: 'Ransomware', keywords: ['ransomware', 'ransom', 'encrypted files', 'decryption key'] },
  DATA_BREACH: { label: 'Data Breach', keywords: ['data breach', 'data exposed', 'records stolen', 'data exfiltrated', 'personal information exposed'] },
  PHISHING: { label: 'Phishing', keywords: ['phishing', 'spear phishing', 'business email compromise', 'BEC'] },
  NETWORK_INTRUSION: { label: 'Network Intrusion', keywords: ['network intrusion', 'unauthorized access', 'compromised', 'hacked'] },
  OUTAGE: { label: 'Service Outage', keywords: ['outage', 'systems down', 'service disruption', 'systems offline', 'network disruption'] },
  MALWARE: { label: 'Malware', keywords: ['malware', 'trojan', 'worm', 'virus', 'backdoor'] },
  GENERAL: { label: 'Cyber Incident', keywords: ['cyber incident', 'security incident', 'cyberattack', 'cyber attack'] },
};

/**
 * Classify the incident type from text.
 */
function classifyIncidentType(text) {
  const lower = text.toLowerCase();
  for (const [type, config] of Object.entries(INCIDENT_TYPES)) {
    for (const kw of config.keywords) {
      if (lower.includes(kw)) {
        return { type, label: config.label };
      }
    }
  }
  return { type: 'GENERAL', label: 'Cyber Incident' };
}

/**
 * Score the incident language in text.
 */
function scoreIncidentLanguage(text) {
  const lower = text.toLowerCase();
  let maxScore = 0;
  let matchedLevel = null;

  for (const [level, config] of Object.entries(INCIDENT_LANGUAGE)) {
    for (const pattern of config.patterns) {
      if (lower.includes(pattern) && config.score > maxScore) {
        maxScore = config.score;
        matchedLevel = level;
      }
    }
  }

  return { score: maxScore, level: matchedLevel };
}

/**
 * Check if text contains any incident-related keywords.
 */
function hasIncidentKeywords(text) {
  const lower = text.toLowerCase();
  return KEYWORD_GROUPS.attack.some(kw => lower.includes(kw));
}

/**
 * Build broad PA search queries for news/GDELT.
 */
function buildBroadSearchQueries() {
  return [
    '("Pennsylvania" OR "PA") AND ("township" OR "borough" OR "municipality") AND (breach OR ransomware OR cyberattack)',
    '("municipal authority" OR "school district") AND Pennsylvania AND ("data breach" OR "network outage" OR ransomware)',
    'Pennsylvania AND (cyberattack OR ransomware OR "data breach" OR "security incident")',
    '"PA" AND ("county government" OR "municipal") AND ("cyber" OR "breach" OR "ransomware")',
  ];
}

module.exports = {
  KEYWORD_GROUPS,
  INCIDENT_LANGUAGE,
  INCIDENT_TYPES,
  classifyIncidentType,
  scoreIncidentLanguage,
  hasIncidentKeywords,
  buildBroadSearchQueries,
};
