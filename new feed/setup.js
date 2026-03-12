const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, [
    'PA_FEED_PORT=3001',
    '',
    '# Optional: Teams webhook for incident alerts',
    '# TEAMS_WEBHOOK_URL=',
    '',
    '# Optional: Enable Reddit social monitoring (true/false)',
    '# PA_FEED_ENABLE_SOCIAL=false',
    '',
    '# Optional: Auto-start polling every 30 min on server launch',
    '# PA_FEED_AUTO_START=false',
    '',
    '# Optional: Minimum confidence score to send Teams alerts (default: 50)',
    '# PA_FEED_MIN_ALERT_CONFIDENCE=50',
    '',
  ].join('\n'));
  console.log('Created .env file with defaults (port 3001)');
} else {
  console.log('.env already exists, skipping');
}

console.log('\nReady! Run: npm start');
console.log('Then open: http://localhost:3001');
