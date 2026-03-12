/**
 * PA Entity Reference Table
 * Manages the list of Pennsylvania organizations to monitor for cyber incidents.
 */

// Entity types
const ENTITY_TYPES = [
  'Business',
  'Township',
  'Borough',
  'Municipality',
  'County',
  'School District',
  'Municipal Authority',
  'Utility',
  'Healthcare',
  'Nonprofit',
  'Police Department',
  'Water Authority',
  'Sewer Authority',
  'Public Works',
  'Tax Office',
];

// Priority tiers
const PRIORITY_TIERS = {
  CRITICAL: 1,   // Client or high-value prospect
  HIGH: 2,       // Watched entity or key infrastructure
  STANDARD: 3,   // General PA entity
};

/**
 * Entity schema:
 * {
 *   entityName: string,
 *   entityType: string,
 *   aliases: string[],
 *   county: string,
 *   region: string,
 *   website: string,
 *   priorityTier: number,
 *   intermixITProspectOrClient: boolean,
 *   watched: boolean,
 * }
 */

// Seed data: example PA entities across types
const DEFAULT_ENTITIES = [
  // Dauphin County
  {
    entityName: 'Lower Swatara Township',
    entityType: 'Township',
    aliases: ['Lower Swatara', 'Township of Lower Swatara', 'Lower Swatara Twp', 'Lower Swatara Twp.'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.lowerswatara.org',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Derry Township',
    entityType: 'Township',
    aliases: ['Derry Twp', 'Derry Twp.', 'Township of Derry'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.derrytownship.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Steelton Borough',
    entityType: 'Borough',
    aliases: ['Steelton', 'Borough of Steelton'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.steeltonpa.com',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Dauphin County',
    entityType: 'County',
    aliases: ['County of Dauphin', 'Dauphin Co', 'Dauphin Co.'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.dauphincounty.org',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Derry Township School District',
    entityType: 'School District',
    aliases: ['Derry Township SD', 'Derry Twp School District', 'Derry Twp SD'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.hershey.k12.pa.us',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Dauphin County Technical School',
    entityType: 'School District',
    aliases: ['DCTS', 'Dauphin County Tech'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.dcts.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: false,
  },
  // Lancaster County
  {
    entityName: 'Lancaster County',
    entityType: 'County',
    aliases: ['County of Lancaster', 'Lancaster Co', 'Lancaster Co.'],
    county: 'Lancaster',
    region: 'Central PA',
    website: 'https://www.co.lancaster.pa.us',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'City of Lancaster',
    entityType: 'Municipality',
    aliases: ['Lancaster City', 'Lancaster'],
    county: 'Lancaster',
    region: 'Central PA',
    website: 'https://www.cityoflancasterpa.com',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Manheim Township',
    entityType: 'Township',
    aliases: ['Manheim Twp', 'Manheim Twp.', 'Township of Manheim'],
    county: 'Lancaster',
    region: 'Central PA',
    website: 'https://www.manheimtownship.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Cumberland County
  {
    entityName: 'Cumberland County',
    entityType: 'County',
    aliases: ['County of Cumberland', 'Cumberland Co', 'Cumberland Co.'],
    county: 'Cumberland',
    region: 'Central PA',
    website: 'https://www.ccpa.net',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Carlisle Borough',
    entityType: 'Borough',
    aliases: ['Carlisle', 'Borough of Carlisle'],
    county: 'Cumberland',
    region: 'Central PA',
    website: 'https://www.carlislepa.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // York County
  {
    entityName: 'York County',
    entityType: 'County',
    aliases: ['County of York', 'York Co', 'York Co.'],
    county: 'York',
    region: 'Central PA',
    website: 'https://www.yorkcountypa.gov',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'City of York',
    entityType: 'Municipality',
    aliases: ['York City', 'York'],
    county: 'York',
    region: 'Central PA',
    website: 'https://www.yorkcity.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Lebanon County
  {
    entityName: 'Lebanon County',
    entityType: 'County',
    aliases: ['County of Lebanon', 'Lebanon Co', 'Lebanon Co.'],
    county: 'Lebanon',
    region: 'Central PA',
    website: 'https://www.lebcounty.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'City of Lebanon',
    entityType: 'Municipality',
    aliases: ['Lebanon City', 'Lebanon'],
    county: 'Lebanon',
    region: 'Central PA',
    website: 'https://www.lebanonpa.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Perry County
  {
    entityName: 'Perry County',
    entityType: 'County',
    aliases: ['County of Perry', 'Perry Co', 'Perry Co.'],
    county: 'Perry',
    region: 'Central PA',
    website: 'https://www.perrycountypa.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Berks County
  {
    entityName: 'City of Reading',
    entityType: 'Municipality',
    aliases: ['Reading', 'Reading City'],
    county: 'Berks',
    region: 'Southeast PA',
    website: 'https://www.readingpa.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Healthcare
  {
    entityName: 'Penn State Health',
    entityType: 'Healthcare',
    aliases: ['Penn State Health System', 'PSH', 'Hershey Medical Center', 'Penn State Hershey Medical Center'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.pennstatehealth.org',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'UPMC',
    entityType: 'Healthcare',
    aliases: ['University of Pittsburgh Medical Center', 'UPMC Health System', 'UPMC Pinnacle'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.upmc.com',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'WellSpan Health',
    entityType: 'Healthcare',
    aliases: ['WellSpan', 'WellSpan Health System'],
    county: 'York',
    region: 'Central PA',
    website: 'https://www.wellspan.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Utilities / Authorities
  {
    entityName: 'Capital Region Water',
    entityType: 'Water Authority',
    aliases: ['CRW', 'Capital Region Water Authority'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.capitalregionwater.com',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Harrisburg Authority',
    entityType: 'Municipal Authority',
    aliases: ['The Harrisburg Authority', 'THA'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.harrisburgauthority.com',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'City of Harrisburg',
    entityType: 'Municipality',
    aliases: ['Harrisburg', 'Harrisburg City'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.harrisburgpa.gov',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // School Districts
  {
    entityName: 'Central Dauphin School District',
    entityType: 'School District',
    aliases: ['Central Dauphin SD', 'CD School District', 'Central Dauphin Schools'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.cdschools.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Harrisburg School District',
    entityType: 'School District',
    aliases: ['Harrisburg SD', 'Harrisburg City Schools'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.hbgsd.us',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
];

// Pennsylvania county list for geography matching
const PA_COUNTIES = [
  'Adams', 'Allegheny', 'Armstrong', 'Beaver', 'Bedford', 'Berks', 'Blair',
  'Bradford', 'Bucks', 'Butler', 'Cambria', 'Cameron', 'Carbon', 'Centre',
  'Chester', 'Clarion', 'Clearfield', 'Clinton', 'Columbia', 'Crawford',
  'Cumberland', 'Dauphin', 'Delaware', 'Elk', 'Erie', 'Fayette', 'Forest',
  'Franklin', 'Fulton', 'Greene', 'Huntingdon', 'Indiana', 'Jefferson',
  'Juniata', 'Lackawanna', 'Lancaster', 'Lawrence', 'Lebanon', 'Lehigh',
  'Luzerne', 'Lycoming', 'McKean', 'Mercer', 'Mifflin', 'Monroe',
  'Montgomery', 'Montour', 'Northampton', 'Northumberland', 'Perry', 'Pike',
  'Potter', 'Schuylkill', 'Snyder', 'Somerset', 'Sullivan', 'Susquehanna',
  'Tioga', 'Union', 'Venango', 'Warren', 'Washington', 'Wayne',
  'Westmoreland', 'Wyoming', 'York',
];

// Major PA cities for geography matching
const PA_CITIES = [
  'Philadelphia', 'Pittsburgh', 'Allentown', 'Reading', 'Erie',
  'Harrisburg', 'Lancaster', 'York', 'Scranton', 'Bethlehem',
  'Wilkes-Barre', 'Chester', 'Easton', 'Lebanon', 'Carlisle',
  'Hershey', 'Mechanicsburg', 'Camp Hill', 'New Cumberland',
  'Chambersburg', 'Gettysburg', 'State College', 'Williamsport',
  'Pottsville', 'Hazleton', 'Johnstown', 'Altoona',
];

class EntityManager {
  constructor(entities = DEFAULT_ENTITIES) {
    this.entities = [...entities];
    this._buildIndex();
  }

  _buildIndex() {
    // Build a lookup index: normalized name/alias -> entity
    this.nameIndex = new Map();
    for (const entity of this.entities) {
      const names = [entity.entityName, ...(entity.aliases || [])];
      for (const name of names) {
        this.nameIndex.set(this._normalize(name), entity);
      }
    }
  }

  _normalize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Search text for entity mentions. Returns matches with type (exact/alias/geography).
   */
  matchEntities(text) {
    const normalizedText = this._normalize(text);
    const matches = [];
    const seen = new Set();

    for (const entity of this.entities) {
      if (seen.has(entity.entityName)) continue;

      const allNames = [entity.entityName, ...(entity.aliases || [])];
      for (const name of allNames) {
        const normalizedName = this._normalize(name);
        if (normalizedName.length < 4) continue; // skip very short aliases
        if (normalizedText.includes(normalizedName)) {
          const isExact = name === entity.entityName;
          matches.push({
            entity,
            matchedAlias: name,
            matchType: isExact ? 'exact' : 'alias',
          });
          seen.add(entity.entityName);
          break;
        }
      }
    }

    return matches;
  }

  /**
   * Check if text mentions Pennsylvania geography without a specific entity.
   */
  matchGeography(text) {
    const lower = text.toLowerCase();
    const geoMatches = [];

    // Check for PA qualifiers
    const hasPAQualifier = lower.includes('pennsylvania') ||
      /\bpa\b/.test(lower) ||
      lower.includes('commonwealth of pennsylvania');

    if (!hasPAQualifier) return geoMatches;

    // Check counties
    for (const county of PA_COUNTIES) {
      if (lower.includes(county.toLowerCase() + ' county') || lower.includes(county.toLowerCase())) {
        geoMatches.push({ type: 'county', name: county });
      }
    }

    // Check cities
    for (const city of PA_CITIES) {
      if (lower.includes(city.toLowerCase())) {
        geoMatches.push({ type: 'city', name: city });
      }
    }

    return geoMatches;
  }

  addEntity(entity) {
    this.entities.push(entity);
    this._buildIndex();
  }

  getWatchedEntities() {
    return this.entities.filter(e => e.watched);
  }

  getClientEntities() {
    return this.entities.filter(e => e.intermixITProspectOrClient);
  }

  getByCounty(county) {
    return this.entities.filter(e => e.county === county);
  }

  getByType(entityType) {
    return this.entities.filter(e => e.entityType === entityType);
  }

  /**
   * Generate search query patterns for an entity.
   */
  buildSearchQueries(entity) {
    const names = [entity.entityName, ...(entity.aliases || []).slice(0, 2)];
    const queries = [];

    for (const name of names) {
      queries.push(`"${name}" AND (breach OR ransomware OR cyberattack OR "security incident")`);
      queries.push(`"${name}" AND ("data breach" OR "network outage" OR "systems outage")`);
    }

    return queries;
  }

  toJSON() {
    return this.entities;
  }
}

module.exports = {
  EntityManager,
  ENTITY_TYPES,
  PRIORITY_TIERS,
  PA_COUNTIES,
  PA_CITIES,
  DEFAULT_ENTITIES,
};
