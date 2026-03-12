/**
 * JSON File Persistence for PA Cyber Watch Feed.
 * Saves incidents and entities to local JSON files so data survives restarts.
 */

const fs = require('fs');
const path = require('path');

class FeedStorage {
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(process.cwd(), 'data');
    this.incidentsFile = path.join(this.dataDir, 'incidents.json');
    this.entitiesFile = path.join(this.dataDir, 'entities.json');
    this.stateFile = path.join(this.dataDir, 'feed-state.json');
    this._ensureDir();
  }

  _ensureDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  _readJson(filePath, fallback) {
    try {
      if (!fs.existsSync(filePath)) return fallback;
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[Storage] Error reading ${filePath}: ${err.message}`);
      return fallback;
    }
  }

  _writeJson(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error(`[Storage] Error writing ${filePath}: ${err.message}`);
    }
  }

  // Incidents
  loadIncidents() {
    return this._readJson(this.incidentsFile, []);
  }

  saveIncidents(incidents) {
    this._writeJson(this.incidentsFile, incidents);
  }

  // Entities
  loadEntities() {
    return this._readJson(this.entitiesFile, null);
  }

  saveEntities(entities) {
    this._writeJson(this.entitiesFile, entities);
  }

  // Feed state (run count, last run, stats)
  loadState() {
    return this._readJson(this.stateFile, null);
  }

  saveState(state) {
    this._writeJson(this.stateFile, state);
  }

  /**
   * Import entities from a CSV string.
   * Expected columns: entityName, entityType, aliases, county, region, website, priorityTier, intermixITProspectOrClient, watched
   * Aliases should be pipe-separated within the CSV field.
   */
  importEntitiesFromCsv(csvString) {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"/, '').replace(/"$/, ''));
    const entities = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this._parseCsvLine(lines[i]);
      if (values.length < 2) continue;

      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      entities.push({
        entityName: row.entityName || row.EntityName || '',
        entityType: row.entityType || row.EntityType || 'Business',
        aliases: (row.aliases || row.Aliases || '').split('|').map(a => a.trim()).filter(Boolean),
        county: row.county || row.County || '',
        region: row.region || row.Region || 'PA',
        website: row.website || row.Website || '',
        priorityTier: parseInt(row.priorityTier || row.PriorityTier || '3'),
        intermixITProspectOrClient: (row.intermixITProspectOrClient || row.IntermixITProspectOrClient || 'false').toLowerCase() === 'true',
        watched: (row.watched || row.Watched || 'true').toLowerCase() !== 'false',
      });
    }

    return entities.filter(e => e.entityName);
  }

  _parseCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    return values;
  }
}

module.exports = { FeedStorage };
