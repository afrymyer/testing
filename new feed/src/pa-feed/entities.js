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
  // More Dauphin County
  {
    entityName: 'Middletown Borough',
    entityType: 'Borough',
    aliases: ['Middletown', 'Borough of Middletown'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.middletownborough.com',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Susquehanna Township',
    entityType: 'Township',
    aliases: ['Susquehanna Twp', 'Susquehanna Twp.'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.susquehannatwp.com',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Swatara Township',
    entityType: 'Township',
    aliases: ['Swatara Twp', 'Swatara Twp.'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.swataratwp.com',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Penbrook Borough',
    entityType: 'Borough',
    aliases: ['Penbrook', 'Borough of Penbrook'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.penbrook.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Paxtang Borough',
    entityType: 'Borough',
    aliases: ['Paxtang', 'Borough of Paxtang'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.paxtang.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // More Cumberland County
  {
    entityName: 'Mechanicsburg Borough',
    entityType: 'Borough',
    aliases: ['Mechanicsburg', 'Borough of Mechanicsburg'],
    county: 'Cumberland',
    region: 'Central PA',
    website: 'https://www.mechanicsburgborough.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Camp Hill Borough',
    entityType: 'Borough',
    aliases: ['Camp Hill', 'Borough of Camp Hill'],
    county: 'Cumberland',
    region: 'Central PA',
    website: 'https://www.camphillborough.com',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'East Pennsboro Township',
    entityType: 'Township',
    aliases: ['East Pennsboro Twp', 'East Pennsboro'],
    county: 'Cumberland',
    region: 'Central PA',
    website: 'https://www.eastpennsboro.net',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Hampden Township',
    entityType: 'Township',
    aliases: ['Hampden Twp', 'Hampden Twp.'],
    county: 'Cumberland',
    region: 'Central PA',
    website: 'https://www.hampdentownship.us',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Silver Spring Township',
    entityType: 'Township',
    aliases: ['Silver Spring Twp', 'Silver Spring'],
    county: 'Cumberland',
    region: 'Central PA',
    website: 'https://www.sstwp.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Cumberland Valley School District',
    entityType: 'School District',
    aliases: ['Cumberland Valley SD', 'CV School District', 'CV Schools'],
    county: 'Cumberland',
    region: 'Central PA',
    website: 'https://www.cvschools.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // More Lancaster County
  {
    entityName: 'East Hempfield Township',
    entityType: 'Township',
    aliases: ['East Hempfield Twp', 'East Hempfield'],
    county: 'Lancaster',
    region: 'Central PA',
    website: 'https://www.easthempfield.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Lancaster Township',
    entityType: 'Township',
    aliases: ['Lancaster Twp', 'Lancaster Twp.'],
    county: 'Lancaster',
    region: 'Central PA',
    website: 'https://www.twp.lancaster.pa.us',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Ephrata Borough',
    entityType: 'Borough',
    aliases: ['Ephrata', 'Borough of Ephrata'],
    county: 'Lancaster',
    region: 'Central PA',
    website: 'https://www.ephrataboro.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Lititz Borough',
    entityType: 'Borough',
    aliases: ['Lititz', 'Borough of Lititz'],
    county: 'Lancaster',
    region: 'Central PA',
    website: 'https://www.lititzboro.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'School District of Lancaster',
    entityType: 'School District',
    aliases: ['Lancaster SD', 'SDoL', 'Lancaster City Schools'],
    county: 'Lancaster',
    region: 'Central PA',
    website: 'https://www.lancaster.k12.pa.us',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Lancaster General Health',
    entityType: 'Healthcare',
    aliases: ['Lancaster General', 'LGH', 'LG Health', 'Penn Medicine Lancaster General'],
    county: 'Lancaster',
    region: 'Central PA',
    website: 'https://www.lancastergeneralhealth.org',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Lancaster County Sewer Authority',
    entityType: 'Sewer Authority',
    aliases: ['LCSA', 'Lancaster Sewer Authority'],
    county: 'Lancaster',
    region: 'Central PA',
    website: 'https://www.lcsa.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // More York County
  {
    entityName: 'York Township',
    entityType: 'Township',
    aliases: ['York Twp', 'York Twp.'],
    county: 'York',
    region: 'Central PA',
    website: 'https://www.yorktownship.com',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Spring Garden Township',
    entityType: 'Township',
    aliases: ['Spring Garden Twp', 'Spring Garden'],
    county: 'York',
    region: 'Central PA',
    website: 'https://www.springgardentwp.com',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'York City School District',
    entityType: 'School District',
    aliases: ['York City SD', 'York Schools'],
    county: 'York',
    region: 'Central PA',
    website: 'https://www.ycs.k12.pa.us',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'York Water Company',
    entityType: 'Utility',
    aliases: ['York Water', 'York Water Co'],
    county: 'York',
    region: 'Central PA',
    website: 'https://www.yorkwater.com',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // More Lebanon County
  {
    entityName: 'North Lebanon Township',
    entityType: 'Township',
    aliases: ['North Lebanon Twp', 'North Lebanon'],
    county: 'Lebanon',
    region: 'Central PA',
    website: 'https://www.nlebanontownship.com',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Lebanon Valley College',
    entityType: 'School District',
    aliases: ['LVC', 'Lebanon Valley'],
    county: 'Lebanon',
    region: 'Central PA',
    website: 'https://www.lvc.edu',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: false,
  },
  // Allegheny County / Pittsburgh
  {
    entityName: 'Allegheny County',
    entityType: 'County',
    aliases: ['County of Allegheny', 'Allegheny Co', 'Allegheny Co.'],
    county: 'Allegheny',
    region: 'Western PA',
    website: 'https://www.alleghenycounty.us',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'City of Pittsburgh',
    entityType: 'Municipality',
    aliases: ['Pittsburgh', 'Pittsburgh City', 'City of Pittsburgh PA'],
    county: 'Allegheny',
    region: 'Western PA',
    website: 'https://www.pittsburghpa.gov',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Pittsburgh Public Schools',
    entityType: 'School District',
    aliases: ['Pittsburgh SD', 'PPS', 'Pittsburgh School District'],
    county: 'Allegheny',
    region: 'Western PA',
    website: 'https://www.pghschools.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Philadelphia
  {
    entityName: 'City of Philadelphia',
    entityType: 'Municipality',
    aliases: ['Philadelphia', 'Philly', 'Philadelphia City'],
    county: 'Philadelphia',
    region: 'Southeast PA',
    website: 'https://www.phila.gov',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Philadelphia County',
    entityType: 'County',
    aliases: ['County of Philadelphia'],
    county: 'Philadelphia',
    region: 'Southeast PA',
    website: 'https://www.phila.gov',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'School District of Philadelphia',
    entityType: 'School District',
    aliases: ['Philadelphia SD', 'Philly Schools', 'SDP'],
    county: 'Philadelphia',
    region: 'Southeast PA',
    website: 'https://www.philasd.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Suburban Philadelphia counties
  {
    entityName: 'Bucks County',
    entityType: 'County',
    aliases: ['County of Bucks', 'Bucks Co', 'Bucks Co.'],
    county: 'Bucks',
    region: 'Southeast PA',
    website: 'https://www.buckscounty.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Chester County',
    entityType: 'County',
    aliases: ['County of Chester', 'Chester Co', 'Chester Co.'],
    county: 'Chester',
    region: 'Southeast PA',
    website: 'https://www.chesco.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Montgomery County',
    entityType: 'County',
    aliases: ['County of Montgomery', 'Montgomery Co', 'MontCo', 'Montco'],
    county: 'Montgomery',
    region: 'Southeast PA',
    website: 'https://www.montcopa.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Delaware County',
    entityType: 'County',
    aliases: ['County of Delaware', 'Delaware Co', 'Delco', 'DelCo'],
    county: 'Delaware',
    region: 'Southeast PA',
    website: 'https://www.delcopa.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Lehigh Valley
  {
    entityName: 'Lehigh County',
    entityType: 'County',
    aliases: ['County of Lehigh', 'Lehigh Co', 'Lehigh Co.'],
    county: 'Lehigh',
    region: 'Lehigh Valley',
    website: 'https://www.lehighcounty.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Northampton County',
    entityType: 'County',
    aliases: ['County of Northampton', 'Northampton Co'],
    county: 'Northampton',
    region: 'Lehigh Valley',
    website: 'https://www.northamptoncounty.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'City of Allentown',
    entityType: 'Municipality',
    aliases: ['Allentown', 'Allentown City'],
    county: 'Lehigh',
    region: 'Lehigh Valley',
    website: 'https://www.allentownpa.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'City of Bethlehem',
    entityType: 'Municipality',
    aliases: ['Bethlehem', 'Bethlehem City'],
    county: 'Northampton',
    region: 'Lehigh Valley',
    website: 'https://www.bethlehem-pa.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Lehigh Valley Health Network',
    entityType: 'Healthcare',
    aliases: ['LVHN', 'Lehigh Valley Health', 'LVH', 'Lehigh Valley Hospital'],
    county: 'Lehigh',
    region: 'Lehigh Valley',
    website: 'https://www.lvhn.org',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: "St. Luke's University Health Network",
    entityType: 'Healthcare',
    aliases: ["St. Luke's", "St Lukes", "St. Luke's Hospital", 'SLUHN'],
    county: 'Northampton',
    region: 'Lehigh Valley',
    website: 'https://www.slhn.org',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Northeast PA
  {
    entityName: 'Lackawanna County',
    entityType: 'County',
    aliases: ['County of Lackawanna', 'Lackawanna Co'],
    county: 'Lackawanna',
    region: 'Northeast PA',
    website: 'https://www.lackawannacounty.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Luzerne County',
    entityType: 'County',
    aliases: ['County of Luzerne', 'Luzerne Co'],
    county: 'Luzerne',
    region: 'Northeast PA',
    website: 'https://www.luzernecounty.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'City of Scranton',
    entityType: 'Municipality',
    aliases: ['Scranton', 'Scranton City'],
    county: 'Lackawanna',
    region: 'Northeast PA',
    website: 'https://www.scrantonpa.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'City of Wilkes-Barre',
    entityType: 'Municipality',
    aliases: ['Wilkes-Barre', 'Wilkes Barre', 'W-B'],
    county: 'Luzerne',
    region: 'Northeast PA',
    website: 'https://www.wilkes-barre.city',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Erie
  {
    entityName: 'Erie County',
    entityType: 'County',
    aliases: ['County of Erie', 'Erie Co', 'Erie Co.'],
    county: 'Erie',
    region: 'Northwest PA',
    website: 'https://www.eriecountypa.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'City of Erie',
    entityType: 'Municipality',
    aliases: ['Erie', 'Erie City'],
    county: 'Erie',
    region: 'Northwest PA',
    website: 'https://www.erie.pa.us',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Centre County / State College
  {
    entityName: 'Centre County',
    entityType: 'County',
    aliases: ['County of Centre', 'Centre Co'],
    county: 'Centre',
    region: 'Central PA',
    website: 'https://www.centrecountypa.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'State College Borough',
    entityType: 'Borough',
    aliases: ['State College', 'Borough of State College'],
    county: 'Centre',
    region: 'Central PA',
    website: 'https://www.statecollegepa.us',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // South Central PA
  {
    entityName: 'Franklin County',
    entityType: 'County',
    aliases: ['County of Franklin', 'Franklin Co', 'Franklin Co.'],
    county: 'Franklin',
    region: 'South Central PA',
    website: 'https://www.franklincountypa.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Adams County',
    entityType: 'County',
    aliases: ['County of Adams', 'Adams Co', 'Adams Co.'],
    county: 'Adams',
    region: 'South Central PA',
    website: 'https://www.adamscountypa.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Borough of Chambersburg',
    entityType: 'Borough',
    aliases: ['Chambersburg', 'Chambersburg Borough'],
    county: 'Franklin',
    region: 'South Central PA',
    website: 'https://www.borough.chambersburg.pa.us',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Borough of Gettysburg',
    entityType: 'Borough',
    aliases: ['Gettysburg', 'Gettysburg Borough'],
    county: 'Adams',
    region: 'South Central PA',
    website: 'https://www.gettysburgpa.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Berks County
  {
    entityName: 'Berks County',
    entityType: 'County',
    aliases: ['County of Berks', 'Berks Co', 'Berks Co.'],
    county: 'Berks',
    region: 'Southeast PA',
    website: 'https://www.countyofberks.com',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Reading School District',
    entityType: 'School District',
    aliases: ['Reading SD', 'Reading Schools'],
    county: 'Berks',
    region: 'Southeast PA',
    website: 'https://www.readingsd.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Reading Hospital',
    entityType: 'Healthcare',
    aliases: ['Tower Health Reading Hospital', 'Reading Hospital Tower Health'],
    county: 'Berks',
    region: 'Southeast PA',
    website: 'https://www.towerhealth.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Healthcare - statewide
  {
    entityName: 'Geisinger Health System',
    entityType: 'Healthcare',
    aliases: ['Geisinger', 'Geisinger Medical Center', 'Geisinger Health'],
    county: 'Montour',
    region: 'Central PA',
    website: 'https://www.geisinger.org',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Tower Health',
    entityType: 'Healthcare',
    aliases: ['Tower Health System', 'Tower Health Network'],
    county: 'Berks',
    region: 'Southeast PA',
    website: 'https://www.towerhealth.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Highmark Health',
    entityType: 'Healthcare',
    aliases: ['Highmark', 'Highmark Blue Cross', 'Highmark Blue Shield'],
    county: 'Allegheny',
    region: 'Western PA',
    website: 'https://www.highmark.com',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Utilities
  {
    entityName: 'PPL Corporation',
    entityType: 'Utility',
    aliases: ['PPL', 'PPL Electric', 'PPL Electric Utilities', 'Pennsylvania Power and Light'],
    county: 'Lehigh',
    region: 'Statewide',
    website: 'https://www.pplelectric.com',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'PECO Energy',
    entityType: 'Utility',
    aliases: ['PECO', 'PECO Energy Company', 'Philadelphia Electric Company'],
    county: 'Philadelphia',
    region: 'Southeast PA',
    website: 'https://www.peco.com',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Duquesne Light',
    entityType: 'Utility',
    aliases: ['Duquesne Light Company', 'DLC', 'Duquesne Light Holdings'],
    county: 'Allegheny',
    region: 'Western PA',
    website: 'https://www.duquesnelight.com',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Higher Education
  {
    entityName: 'Penn State University',
    entityType: 'School District',
    aliases: ['Penn State', 'PSU', 'Pennsylvania State University', 'Penn State Harrisburg'],
    county: 'Centre',
    region: 'Statewide',
    website: 'https://www.psu.edu',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'University of Pittsburgh',
    entityType: 'School District',
    aliases: ['Pitt', 'U of Pitt', 'University of Pittsburgh PA'],
    county: 'Allegheny',
    region: 'Western PA',
    website: 'https://www.pitt.edu',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Temple University',
    entityType: 'School District',
    aliases: ['Temple', 'Temple U', 'Temple University PA'],
    county: 'Philadelphia',
    region: 'Southeast PA',
    website: 'https://www.temple.edu',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'HACC Central Pennsylvania Community College',
    entityType: 'School District',
    aliases: ['HACC', 'Harrisburg Area Community College'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.hacc.edu',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Drexel University',
    entityType: 'School District',
    aliases: ['Drexel', 'Drexel U'],
    county: 'Philadelphia',
    region: 'Southeast PA',
    website: 'https://www.drexel.edu',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: false,
  },
  {
    entityName: 'Carnegie Mellon University',
    entityType: 'School District',
    aliases: ['CMU', 'Carnegie Mellon'],
    county: 'Allegheny',
    region: 'Western PA',
    website: 'https://www.cmu.edu',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: false,
  },
  // Police Departments
  {
    entityName: 'Harrisburg Bureau of Police',
    entityType: 'Police Department',
    aliases: ['Harrisburg Police', 'Harrisburg PD', 'Harrisburg Police Department'],
    county: 'Dauphin',
    region: 'Central PA',
    website: 'https://www.harrisburgpa.gov/police',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Lancaster Bureau of Police',
    entityType: 'Police Department',
    aliases: ['Lancaster Police', 'Lancaster PD', 'Lancaster City Police'],
    county: 'Lancaster',
    region: 'Central PA',
    website: 'https://www.cityoflancasterpa.com/police',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Pennsylvania State Police',
    entityType: 'Police Department',
    aliases: ['PA State Police', 'PSP', 'State Police PA'],
    county: 'Dauphin',
    region: 'Statewide',
    website: 'https://www.psp.pa.gov',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // State entities
  {
    entityName: 'Commonwealth of Pennsylvania',
    entityType: 'Municipality',
    aliases: ['Commonwealth of PA', 'PA State Government', 'Pennsylvania State Government'],
    county: 'Dauphin',
    region: 'Statewide',
    website: 'https://www.pa.gov',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'PennDOT',
    entityType: 'Municipality',
    aliases: ['Pennsylvania Department of Transportation', 'PA DOT', 'Penn DOT'],
    county: 'Dauphin',
    region: 'Statewide',
    website: 'https://www.penndot.pa.gov',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'PA Department of Education',
    entityType: 'Municipality',
    aliases: ['Pennsylvania Department of Education', 'PDE', 'PA Dept of Education'],
    county: 'Dauphin',
    region: 'Statewide',
    website: 'https://www.education.pa.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'PA Treasury Department',
    entityType: 'Municipality',
    aliases: ['Pennsylvania Treasury', 'PA Treasury', 'State Treasury PA'],
    county: 'Dauphin',
    region: 'Statewide',
    website: 'https://www.patreasury.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Cambria / Johnstown
  {
    entityName: 'Cambria County',
    entityType: 'County',
    aliases: ['County of Cambria', 'Cambria Co'],
    county: 'Cambria',
    region: 'Western PA',
    website: 'https://www.co.cambria.pa.us',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'City of Johnstown',
    entityType: 'Municipality',
    aliases: ['Johnstown', 'Johnstown City'],
    county: 'Cambria',
    region: 'Western PA',
    website: 'https://www.cityofjohnstownpa.net',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Blair / Altoona
  {
    entityName: 'Blair County',
    entityType: 'County',
    aliases: ['County of Blair', 'Blair Co'],
    county: 'Blair',
    region: 'Central PA',
    website: 'https://www.blaircountypa.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'City of Altoona',
    entityType: 'Municipality',
    aliases: ['Altoona', 'Altoona City'],
    county: 'Blair',
    region: 'Central PA',
    website: 'https://www.altoonapa.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Lycoming / Williamsport
  {
    entityName: 'Lycoming County',
    entityType: 'County',
    aliases: ['County of Lycoming', 'Lycoming Co'],
    county: 'Lycoming',
    region: 'North Central PA',
    website: 'https://www.lyco.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'City of Williamsport',
    entityType: 'Municipality',
    aliases: ['Williamsport', 'Williamsport City'],
    county: 'Lycoming',
    region: 'North Central PA',
    website: 'https://www.cityofwilliamsport.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Washington County
  {
    entityName: 'Washington County',
    entityType: 'County',
    aliases: ['County of Washington', 'Washington Co PA'],
    county: 'Washington',
    region: 'Western PA',
    website: 'https://www.co.washington.pa.us',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Westmoreland County
  {
    entityName: 'Westmoreland County',
    entityType: 'County',
    aliases: ['County of Westmoreland', 'Westmoreland Co'],
    county: 'Westmoreland',
    region: 'Western PA',
    website: 'https://www.co.westmoreland.pa.us',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Schuylkill County
  {
    entityName: 'Schuylkill County',
    entityType: 'County',
    aliases: ['County of Schuylkill', 'Schuylkill Co'],
    county: 'Schuylkill',
    region: 'Northeast PA',
    website: 'https://www.co.schuylkill.pa.us',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'City of Pottsville',
    entityType: 'Municipality',
    aliases: ['Pottsville', 'Pottsville City'],
    county: 'Schuylkill',
    region: 'Northeast PA',
    website: 'https://www.city.pottsville.pa.us',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Monroe County / Poconos
  {
    entityName: 'Monroe County',
    entityType: 'County',
    aliases: ['County of Monroe', 'Monroe Co'],
    county: 'Monroe',
    region: 'Northeast PA',
    website: 'https://www.monroecountypa.gov',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  // Additional transit / authorities
  {
    entityName: 'SEPTA',
    entityType: 'Municipal Authority',
    aliases: ['Southeastern Pennsylvania Transportation Authority'],
    county: 'Philadelphia',
    region: 'Southeast PA',
    website: 'https://www.septa.org',
    priorityTier: PRIORITY_TIERS.HIGH,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Port Authority of Allegheny County',
    entityType: 'Municipal Authority',
    aliases: ['Pittsburgh Port Authority', 'Port Authority Transit', 'PAT'],
    county: 'Allegheny',
    region: 'Western PA',
    website: 'https://www.portauthority.org',
    priorityTier: PRIORITY_TIERS.STANDARD,
    intermixITProspectOrClient: false,
    watched: true,
  },
  {
    entityName: 'Pennsylvania Turnpike Commission',
    entityType: 'Municipal Authority',
    aliases: ['PA Turnpike', 'PTC', 'PA Turnpike Commission'],
    county: 'Dauphin',
    region: 'Statewide',
    website: 'https://www.paturnpike.com',
    priorityTier: PRIORITY_TIERS.HIGH,
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
   * Compute similarity between two strings (0-1).
   * Uses token overlap (Jaccard-like) for fuzzy matching.
   */
  _similarity(a, b) {
    const tokensA = new Set(a.split(' ').filter(t => t.length > 2));
    const tokensB = new Set(b.split(' ').filter(t => t.length > 2));
    if (tokensA.size === 0 || tokensB.size === 0) return 0;
    let overlap = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) overlap++;
    }
    return overlap / Math.max(tokensA.size, tokensB.size);
  }

  /**
   * Search text for entity mentions. Returns matches with type (exact/alias/fuzzy).
   * Tries exact substring match first, then fuzzy token matching.
   */
  matchEntities(text) {
    const normalizedText = this._normalize(text);
    const matches = [];
    const seen = new Set();

    for (const entity of this.entities) {
      if (seen.has(entity.entityName)) continue;

      const allNames = [entity.entityName, ...(entity.aliases || [])];
      let matched = false;

      // Pass 1: exact substring match
      for (const name of allNames) {
        const normalizedName = this._normalize(name);
        if (normalizedName.length < 4) continue;
        if (normalizedText.includes(normalizedName)) {
          matches.push({
            entity,
            matchedAlias: name,
            matchType: name === entity.entityName ? 'exact' : 'alias',
          });
          seen.add(entity.entityName);
          matched = true;
          break;
        }
      }

      // Pass 2: fuzzy token match (catches misspellings, partial references)
      if (!matched) {
        const normalizedPrimary = this._normalize(entity.entityName);
        // Only attempt fuzzy on names with 2+ tokens (avoids false positives on short names)
        if (normalizedPrimary.split(' ').length >= 2) {
          const sim = this._similarity(normalizedPrimary, normalizedText);
          if (sim >= 0.6) {
            matches.push({
              entity,
              matchedAlias: entity.entityName,
              matchType: 'fuzzy',
              similarity: sim,
            });
            seen.add(entity.entityName);
          }
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
