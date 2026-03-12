/**
 * Startup Config Validation
 *
 * Validates required and optional environment variables at boot.
 * Exits with clear error if required configs are missing.
 */
const logger = require('./logger');

const CONFIG_SCHEMA = {
  // Fabric SQL — required for live data
  FABRIC_SQL_SERVER: { required: false, description: 'Fabric SQL endpoint (e.g. xxx.datawarehouse.fabric.microsoft.com)' },
  FABRIC_DATABASE: { required: false, description: 'Fabric database/warehouse name' },
  AZURE_TENANT_ID: { required: false, description: 'Azure AD tenant ID for Fabric auth' },
  AZURE_CLIENT_ID: { required: false, description: 'Azure AD app registration client ID' },
  AZURE_CLIENT_SECRET: { required: false, description: 'Azure AD app registration client secret' },

  // AI
  ANTHROPIC_API_KEY: { required: false, description: 'Anthropic API key for Claude AI analysis' },

  // PA Feed
  TEAMS_WEBHOOK_URL: { required: false, description: 'Microsoft Teams webhook URL for PA Feed alerts' },
  PA_FEED_MIN_ALERT_CONFIDENCE: { required: false, description: 'Minimum confidence for PA Feed alerts (high/medium/low)', default: 'medium' },

  // Server
  PORT: { required: false, description: 'HTTP port for main server', default: '3000' },
  PA_FEED_PORT: { required: false, description: 'HTTP port for PA Feed standalone server', default: '3001' },
  LOG_LEVEL: { required: false, description: 'Logging level (debug/info/warn/error)', default: 'info' },
  NODE_ENV: { required: false, description: 'Environment (development/production)', default: 'development' },

  // PIA Detection
  PIA_API_IDENTIFIERS: { required: false, description: 'Comma-separated PIA API account identifiers', default: 'pia automated api' },
};

function validateConfig() {
  const warnings = [];
  const errors = [];

  // Check for Fabric SQL group — if any is set, all should be set
  const fabricVars = ['FABRIC_SQL_SERVER', 'FABRIC_DATABASE', 'AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'];
  const fabricSet = fabricVars.filter(v => process.env[v]);
  if (fabricSet.length > 0 && fabricSet.length < fabricVars.length) {
    const missing = fabricVars.filter(v => !process.env[v]);
    errors.push(`Partial Fabric SQL config: ${fabricSet.join(', ')} set but missing: ${missing.join(', ')}`);
  }

  if (fabricSet.length === 0) {
    warnings.push('Fabric SQL not configured — running in demo mode only');
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    warnings.push('ANTHROPIC_API_KEY not set — AI analysis features disabled');
  }

  // Log results
  if (errors.length > 0) {
    for (const err of errors) {
      logger.error({ component: 'config' }, err);
    }
    logger.error({ component: 'config' }, 'Fix configuration errors above and restart');
    process.exit(1);
  }

  for (const warn of warnings) {
    logger.warn({ component: 'config' }, warn);
  }

  logger.info({ component: 'config' }, 'Configuration validated successfully');
  return true;
}

function getConfig() {
  return {
    port: parseInt(process.env.PORT) || 3000,
    paFeedPort: parseInt(process.env.PA_FEED_PORT) || 3001,
    fabricConfigured: !!(process.env.FABRIC_SQL_SERVER && process.env.FABRIC_DATABASE),
    aiConfigured: !!process.env.ANTHROPIC_API_KEY,
    logLevel: process.env.LOG_LEVEL || 'info',
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}

module.exports = { validateConfig, getConfig, CONFIG_SCHEMA };
