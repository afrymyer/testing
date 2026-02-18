const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');

/**
 * Load a PowerShell script by type (datto|pia) and filename.
 */
function loadScript(type, filename) {
  const filePath = path.join(SCRIPTS_DIR, type, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * List all available scripts grouped by type.
 */
function listScripts() {
  const result = {};
  for (const type of ['datto', 'pia']) {
    const dir = path.join(SCRIPTS_DIR, type);
    if (!fs.existsSync(dir)) continue;
    result[type] = fs.readdirSync(dir)
      .filter(f => f.endsWith('.ps1'))
      .map(f => ({
        filename: f,
        type,
        name: f.replace('.ps1', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      }));
  }
  return result;
}

module.exports = { loadScript, listScripts };
