// ── State ──
let allTickets = [];
let currentScript = null;

// ── DOM Elements ──
const $ = (sel) => document.querySelector(sel);
const statusBar = $('#status-bar');
const statusText = $('#status-text');
const ticketsContainer = $('#tickets');

// ── Demo Tickets (for testing without Autotask credentials) ──
const DEMO_TICKETS = [
  { id: 1001, ticketNumber: 'T20240101.0001', title: 'User locked out - cannot login to computer', description: 'John Smith is locked out of his account. Tried password multiple times. Needs password reset and account unlock.' },
  { id: 1002, ticketNumber: 'T20240101.0002', title: 'Printer not working in accounting dept', description: 'HP printer on 3rd floor is not printing. Jobs stuck in queue. Print spooler may need restart.' },
  { id: 1003, ticketNumber: 'T20240101.0003', title: 'C: drive full on DESKTOP-HR01', description: 'User reports low disk space warning. C drive shows 2GB free out of 256GB. Need to clean temp files and old Windows updates.' },
  { id: 1004, ticketNumber: 'T20240101.0004', title: 'Cannot connect to VPN from home', description: 'Remote user unable to connect to VPN. Getting timeout error. DNS may need flushing.' },
  { id: 1005, ticketNumber: 'T20240101.0005', title: 'Outlook keeps crashing when opening', description: 'User reports Outlook crashes immediately on launch. Tried restarting computer. May need cache cleared or Office repair.' },
  { id: 1006, ticketNumber: 'T20240101.0006', title: 'Teams showing blank screen', description: 'Microsoft Teams opens but shows white screen. No messages or channels visible. Cache issue suspected.' },
  { id: 1007, ticketNumber: 'T20240101.0007', title: 'New hire starting Monday - need account setup', description: 'New employee Jane Doe starting in Marketing dept. Need AD account, email, Teams, and shared drive access.' },
  { id: 1008, ticketNumber: 'T20240101.0008', title: 'Map network drive for finance team', description: 'Need to map \\\\fileserver\\finance$ as F: drive for 5 users in the finance department.' },
  { id: 1009, ticketNumber: 'T20240101.0009', title: 'Employee departure - disable account', description: 'Bob Johnson last day was Friday. Need to disable AD account, remove groups, convert mailbox to shared, forward email to manager.' },
  { id: 1010, ticketNumber: 'T20240101.0010', title: 'Computer running very slow', description: 'User says computer takes 10 minutes to boot and applications hang. Machine has not been rebooted in 45 days.' },
  { id: 1011, ticketNumber: 'T20240101.0011', title: 'Set out of office for CEO vacation', description: 'CEO on vacation next week. Need out of office auto-reply set up for internal and external emails. Start Monday, end Friday.' },
  { id: 1012, ticketNumber: 'T20240101.0012', title: 'SMART warning on workstation SSD', description: 'Datto RMM alert: SMART failure predicted on DESKTOP-SALES03 primary drive. Need to verify disk health.' },
  { id: 1013, ticketNumber: 'T20240101.0013', title: 'Install printer on new workstation', description: 'New HP LaserJet at IP 192.168.1.50 needs to be added to DESKTOP-ACCT02.' },
  { id: 1014, ticketNumber: 'T20240101.0014', title: 'Group policy not applying after OU move', description: 'Moved 3 workstations to new OU but GPO for drive mappings not applying. Need gpupdate force.' },
  { id: 1015, ticketNumber: 'T20240101.0015', title: 'Excel crashes when opening large files', description: 'User reports Excel 365 crashes with files over 50MB. Other Office apps seem fine. May need Office repair.' },
  { id: 1016, ticketNumber: 'T20240101.0016', title: 'Windows service stopped - backup agent', description: 'Backup agent service (Veeam Agent) stopped on SERVER02. Need service restarted.' },
  { id: 1017, ticketNumber: 'T20240101.0017', title: 'Need mailbox permissions report for audit', description: 'Annual audit requires report of all shared mailbox permissions. Need Full Access, Send As, and Send on Behalf exported.' },
  { id: 1018, ticketNumber: 'T20240101.0018', title: 'MFA reset for remote user', description: 'User got a new phone and needs MFA re-enrolled. Reset authenticator app registration.' },
];

// ── Init ──
async function init() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    if (data.autotaskConfigured) {
      statusBar.className = 'status-bar connected';
      statusText.textContent = 'Connected to Autotask API. Click "Fetch Tickets" to load and analyze.';
    } else {
      statusBar.className = 'status-bar demo';
      statusText.textContent = 'Autotask API not configured. Use "Load Demo Tickets" to test, or configure .env for live data.';
    }
  } catch {
    statusBar.className = 'status-bar demo';
    statusText.textContent = 'Server connection issue. Use demo mode.';
  }

  showEmptyState();
}

// ── Fetch from Autotask ──
async function fetchTickets() {
  statusText.textContent = 'Fetching tickets from Autotask...';
  try {
    const res = await fetch('/api/tickets');
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    const data = await res.json();
    allTickets = data.tickets;
    renderSummary(data.summary);
    renderTickets(allTickets);
    statusBar.className = 'status-bar connected';
    statusText.textContent = `Loaded ${allTickets.length} tickets from Autotask. ${data.summary.quickHitterCount} quick hitters found.`;
  } catch (err) {
    statusBar.className = 'status-bar error';
    statusText.textContent = `Error: ${err.message}`;
  }
}

// ── Demo Mode ──
async function loadDemo() {
  statusText.textContent = 'Analyzing demo tickets...';
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickets: DEMO_TICKETS }),
    });
    const data = await res.json();
    allTickets = data.tickets;
    renderSummary(data.summary);
    renderTickets(allTickets);
    statusBar.className = 'status-bar demo';
    statusText.textContent = `Demo: ${allTickets.length} tickets analyzed. ${data.summary.quickHitterCount} quick hitters identified.`;
  } catch (err) {
    statusBar.className = 'status-bar error';
    statusText.textContent = `Error: ${err.message}`;
  }
}

// ── Render Summary ──
function renderSummary(summary) {
  $('#summary').classList.remove('hidden');
  $('#stat-total').textContent = summary.totalTickets;
  $('#stat-quick').textContent = summary.quickHitterCount;
  $('#stat-automatable').textContent = summary.automatableCount;
  $('#stat-time-saved').textContent = summary.estimatedTimeSaved;
  $('#stat-avg-score').textContent = summary.avgAutomationScore + '%';

  // Category breakdown
  const breakdown = $('#category-breakdown');
  const barsContainer = $('#category-bars');
  breakdown.classList.remove('hidden');
  barsContainer.innerHTML = '';

  const maxCount = Math.max(...Object.values(summary.categoryBreakdown));
  const sorted = Object.entries(summary.categoryBreakdown).sort((a, b) => b[1] - a[1]);

  for (const [label, count] of sorted) {
    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
    barsContainer.innerHTML += `
      <div class="cat-bar-row">
        <span class="cat-bar-label">${label}</span>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width: ${pct}%"></div>
        </div>
        <span class="cat-bar-count">${count}</span>
      </div>`;
  }
}

// ── Render Tickets ──
function renderTickets(tickets) {
  if (!tickets.length) {
    showEmptyState();
    return;
  }

  ticketsContainer.innerHTML = tickets.map(t => {
    const scoreClass = t.automationScore >= 80 ? 'high' : t.automationScore >= 50 ? 'medium' : 'low';
    const scripts = (t.suggestedScripts || []).map(s =>
      `<button class="script-btn" onclick="viewScript('${s.type}', '${s.name}')">${s.label}</button>`
    ).join('');

    return `
      <div class="ticket-card ${t.isQuickHitter ? 'quick-hitter' : ''}">
        <div class="ticket-header">
          <span class="ticket-title">${escHtml(t.title)}</span>
          <span class="ticket-id">#${t.ticketNumber || t.ticketId}</span>
        </div>
        <div class="ticket-meta">
          <span class="badge badge-category">${t.categoryLabel}</span>
          ${t.isQuickHitter ? '<span class="badge badge-quick">Quick Hitter</span>' : ''}
          ${t.estimatedMinutes ? `<span class="badge badge-time">~${t.estimatedMinutes} min</span>` : ''}
          <div class="score-bar">
            Auto:
            <div class="score-track">
              <div class="score-fill ${scoreClass}" style="width: ${t.automationScore}%"></div>
            </div>
            ${t.automationScore}%
          </div>
        </div>
        ${scripts ? `<div class="ticket-scripts">${scripts}</div>` : ''}
      </div>`;
  }).join('');
}

function showEmptyState() {
  ticketsContainer.innerHTML = `
    <div class="empty-state">
      <h3>No tickets loaded</h3>
      <p>Click "Fetch Tickets" to pull from Autotask, or "Load Demo Tickets" to see sample data.</p>
    </div>`;
}

// ── Script Viewer ──
async function viewScript(type, filename) {
  try {
    const res = await fetch(`/api/scripts/${type}/${filename}`);
    if (!res.ok) throw new Error('Script not found');
    const data = await res.json();
    currentScript = data;

    $('#modal-title').textContent = `${type.toUpperCase()} / ${filename}`;
    $('#modal-code').textContent = data.content;
    $('#script-modal').classList.remove('hidden');
  } catch (err) {
    showToast('Failed to load script');
  }
}

// Make viewScript available globally for onclick handlers
window.viewScript = viewScript;

function closeScriptModal() {
  $('#script-modal').classList.add('hidden');
  currentScript = null;
}

function copyScript() {
  if (!currentScript) return;
  navigator.clipboard.writeText(currentScript.content).then(() => {
    showToast('Script copied to clipboard!');
  });
}

function downloadScript() {
  if (!currentScript) return;
  const blob = new Blob([currentScript.content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentScript.filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Script Library Browser ──
async function browseScripts() {
  try {
    const res = await fetch('/api/scripts');
    const scripts = await res.json();
    let html = '';

    for (const [type, list] of Object.entries(scripts)) {
      html += `<div class="library-section">
        <h3>${type === 'datto' ? 'Datto RMM Scripts' : 'PIA / M365 Admin Scripts'}</h3>
        <div class="library-grid">
          ${list.map(s => `
            <div class="library-card" onclick="viewScript('${s.type}', '${s.filename}')">
              <div class="library-card-name">${s.name}</div>
              <div class="library-card-file">${s.filename}</div>
            </div>`).join('')}
        </div>
      </div>`;
    }

    $('#library-content').innerHTML = html;
    $('#library-modal').classList.remove('hidden');
  } catch {
    showToast('Failed to load script library');
  }
}

// ── Filtering & Sorting ──
function applyFilters() {
  let filtered = [...allTickets];
  const category = $('#filter-category').value;
  const sort = $('#sort-by').value;

  if (category === 'quick') {
    filtered = filtered.filter(t => t.isQuickHitter);
  }

  if (sort === 'time') {
    filtered.sort((a, b) => (a.estimatedMinutes || 99) - (b.estimatedMinutes || 99));
  } else if (sort === 'confidence') {
    filtered.sort((a, b) => b.matchConfidence - a.matchConfidence);
  } else {
    filtered.sort((a, b) => b.automationScore - a.automationScore);
  }

  renderTickets(filtered);
}

// ── Toast Notification ──
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

// ── Escape HTML ──
function escHtml(str) {
  const el = document.createElement('span');
  el.textContent = str || '';
  return el.innerHTML;
}

// ── Event Listeners ──
$('#btn-fetch').addEventListener('click', fetchTickets);
$('#btn-demo').addEventListener('click', loadDemo);
$('#btn-scripts').addEventListener('click', browseScripts);
$('#modal-close').addEventListener('click', closeScriptModal);
$('#btn-copy-script').addEventListener('click', copyScript);
$('#btn-download-script').addEventListener('click', downloadScript);
$('#library-close').addEventListener('click', () => $('#library-modal').classList.add('hidden'));
$('#filter-category').addEventListener('change', applyFilters);
$('#sort-by').addEventListener('change', applyFilters);

// Close modals on backdrop click
$('#script-modal').addEventListener('click', (e) => {
  if (e.target === $('#script-modal')) closeScriptModal();
});
$('#library-modal').addEventListener('click', (e) => {
  if (e.target === $('#library-modal')) $('#library-modal').classList.add('hidden');
});

// Init on load
init();
