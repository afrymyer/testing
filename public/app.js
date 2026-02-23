// ── State ──
let allTickets = [];
let currentAnalytics = null;
let currentScript = null;
let allResources = []; // { id, name, email }
let selectedTechnicians = []; // resource IDs

// ── DOM Elements ──
const $ = (sel) => document.querySelector(sel);
const statusBar = $('#status-bar');
const statusText = $('#status-text');
const ticketsContainer = $('#tickets');

// ── Demo Tickets (for testing without Autotask credentials) ──
const DEMO_TICKETS = [
  { id: 1001, ticketNumber: 'T20240101.0001', title: 'User locked out - cannot login to computer', description: 'John Smith is locked out of his account. Tried password multiple times. Needs password reset and account unlock.', priority: 1, createDate: '2024-01-15T08:30:00Z' },
  { id: 1002, ticketNumber: 'T20240101.0002', title: 'Printer not working in accounting dept', description: 'HP printer on 3rd floor is not printing. Jobs stuck in queue. Print spooler may need restart.', priority: 2, createDate: '2024-01-15T09:15:00Z' },
  { id: 1003, ticketNumber: 'T20240101.0003', title: 'C: drive full on DESKTOP-HR01', description: 'User reports low disk space warning. C drive shows 2GB free out of 256GB. Need to clean temp files and old Windows updates.', priority: 3, createDate: '2024-01-16T10:00:00Z' },
  { id: 1004, ticketNumber: 'T20240101.0004', title: 'Cannot connect to VPN from home', description: 'Remote user unable to connect to VPN. Getting timeout error. DNS may need flushing.', priority: 2, createDate: '2024-01-16T14:20:00Z' },
  { id: 1005, ticketNumber: 'T20240101.0005', title: 'Outlook keeps crashing when opening', description: 'User reports Outlook crashes immediately on launch. Tried restarting computer. May need cache cleared or Office repair.', priority: 2, createDate: '2024-01-17T08:45:00Z' },
  { id: 1006, ticketNumber: 'T20240101.0006', title: 'Teams showing blank screen', description: 'Microsoft Teams opens but shows white screen. No messages or channels visible. Cache issue suspected.', priority: 3, createDate: '2024-01-17T11:30:00Z' },
  { id: 1007, ticketNumber: 'T20240101.0007', title: 'New hire starting Monday - need account setup', description: 'New employee Jane Doe starting in Marketing dept. Need AD account, email, Teams, and shared drive access.', priority: 3, createDate: '2024-01-18T09:00:00Z' },
  { id: 1008, ticketNumber: 'T20240101.0008', title: 'Map network drive for finance team', description: 'Need to map \\\\fileserver\\finance$ as F: drive for 5 users in the finance department.', priority: 4, createDate: '2024-01-18T13:15:00Z' },
  { id: 1009, ticketNumber: 'T20240101.0009', title: 'Employee departure - disable account', description: 'Bob Johnson last day was Friday. Need to disable AD account, remove groups, convert mailbox to shared, forward email to manager.', priority: 2, createDate: '2024-01-19T08:00:00Z' },
  { id: 1010, ticketNumber: 'T20240101.0010', title: 'Computer running very slow', description: 'User says computer takes 10 minutes to boot and applications hang. Machine has not been rebooted in 45 days.', priority: 4, createDate: '2024-01-19T10:30:00Z' },
  { id: 1011, ticketNumber: 'T20240101.0011', title: 'Set out of office for CEO vacation', description: 'CEO on vacation next week. Need out of office auto-reply set up for internal and external emails. Start Monday, end Friday.', priority: 2, createDate: '2024-01-19T15:00:00Z' },
  { id: 1012, ticketNumber: 'T20240101.0012', title: 'SMART warning on workstation SSD', description: 'Datto RMM alert: SMART failure predicted on DESKTOP-SALES03 primary drive. Need to verify disk health.', priority: 1, createDate: '2024-01-20T07:45:00Z' },
  { id: 1013, ticketNumber: 'T20240101.0013', title: 'Install printer on new workstation', description: 'New HP LaserJet at IP 192.168.1.50 needs to be added to DESKTOP-ACCT02.', priority: 4, createDate: '2024-01-20T11:00:00Z' },
  { id: 1014, ticketNumber: 'T20240101.0014', title: 'Group policy not applying after OU move', description: 'Moved 3 workstations to new OU but GPO for drive mappings not applying. Need gpupdate force.', priority: 3, createDate: '2024-01-21T09:30:00Z' },
  { id: 1015, ticketNumber: 'T20240101.0015', title: 'Excel crashes when opening large files', description: 'User reports Excel 365 crashes with files over 50MB. Other Office apps seem fine. May need Office repair.', priority: 3, createDate: '2024-01-21T14:00:00Z' },
  { id: 1016, ticketNumber: 'T20240101.0016', title: 'Windows service stopped - backup agent', description: 'Backup agent service (Veeam Agent) stopped on SERVER02. Need service restarted.', priority: 1, createDate: '2024-01-22T06:30:00Z' },
  { id: 1017, ticketNumber: 'T20240101.0017', title: 'Need mailbox permissions report for audit', description: 'Annual audit requires report of all shared mailbox permissions. Need Full Access, Send As, and Send on Behalf exported.', priority: 3, createDate: '2024-01-22T10:15:00Z' },
  { id: 1018, ticketNumber: 'T20240101.0018', title: 'MFA reset for remote user', description: 'User got a new phone and needs MFA re-enrolled. Reset authenticator app registration.', priority: 2, createDate: '2024-01-22T16:00:00Z' },
];

// ── Date Helpers ──
function countBusinessDays(startDate, endDate) {
  let count = 0;
  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function subtractBusinessDays(fromDate, numDays) {
  const d = new Date(fromDate);
  let remaining = numDays;
  while (remaining > 0) {
    d.setDate(d.getDate() - 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return d;
}

function getDateRange(preset) {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  let from = null;

  switch (preset) {
    case 'today':
      from = to;
      break;
    case '7d':
      from = new Date(now - 7 * 86400000).toISOString().slice(0, 10);
      break;
    case '14d':
      from = new Date(now - 14 * 86400000).toISOString().slice(0, 10);
      break;
    case '30d':
      from = new Date(now - 30 * 86400000).toISOString().slice(0, 10);
      break;
    case '60d':
      from = new Date(now - 60 * 86400000).toISOString().slice(0, 10);
      break;
    case '90d':
      from = new Date(now - 90 * 86400000).toISOString().slice(0, 10);
      break;
    case 'custom':
      from = $('#date-from').value || null;
      return { from, to: $('#date-to').value || to };
    case 'all':
    default:
      return { from: null, to: null };
  }

  return { from, to };
}

// ── Init ──
async function init() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    if (data.autotaskConfigured) {
      statusBar.className = 'status-bar connected';
      statusText.textContent = 'Connected to IntermixIT Ticket Analyzer. Select filters and click "Fetch Tickets" to load and analyze.';
      loadQueues();
      loadResources();
    } else {
      statusBar.className = 'status-bar demo';
      statusText.textContent = 'API not configured. Use "Load Demo Tickets" to test, or configure .env for live data.';
    }
  } catch {
    statusBar.className = 'status-bar demo';
    statusText.textContent = 'Server connection issue. Use demo mode.';
  }

  showEmptyState();
}

// ── Load Queues into Multi-Select ──
let selectedQueues = [];
let allQueues = [];

function getQueueName(queueID) {
  if (!queueID) return 'Unknown';
  const q = allQueues.find(q => String(q.value) === String(queueID));
  return q ? q.label : `Queue ${queueID}`;
}

function isMACQueue(queueID) {
  if (!queueID) return false;
  const name = getQueueName(queueID).toLowerCase();
  return name.includes('m/a/c') || name.includes('mac') || name.includes('move') || name.includes('add') || name.includes('change');
}

function isReactiveQueue(queueID) {
  if (!queueID) return false;
  const name = getQueueName(queueID).toLowerCase();
  return name.includes('reactive');
}

async function loadQueues() {
  try {
    const res = await fetch('/api/queues');
    if (!res.ok) return;
    const queues = await res.json();
    allQueues = queues;
    const container = $('#queue-options');

    for (const q of queues) {
      if (!q.isActive) continue;
      const label = document.createElement('label');
      label.className = 'multi-select-option';
      label.innerHTML = `<input type="checkbox" value="${q.value}" /> ${escHtml(q.label)}`;
      label.querySelector('input').addEventListener('change', updateQueueSelection);
      container.appendChild(label);
    }
  } catch {
    // Silently fail - queue selection stays at "All Queues"
  }
}

function updateQueueSelection() {
  const checked = document.querySelectorAll('#queue-options input:checked');
  selectedQueues = Array.from(checked).map(cb => cb.value);
  const trigger = $('#queue-trigger');

  if (selectedQueues.length === 0) {
    trigger.textContent = 'All Queues';
  } else if (selectedQueues.length <= 2) {
    const labels = Array.from(checked).map(cb => cb.parentElement.textContent.trim());
    trigger.textContent = labels.join(', ');
  } else {
    trigger.textContent = `${selectedQueues.length} queues selected`;
  }
}

function setupQueueDropdown() {
  const trigger = $('#queue-trigger');
  const dropdown = $('#queue-dropdown');

  trigger.addEventListener('click', () => {
    dropdown.classList.toggle('hidden');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!$('#queue-select-wrap').contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

// ── Load Resources (Technicians) ──
async function loadResources() {
  try {
    const res = await fetch('/api/resources');
    if (!res.ok) return;
    allResources = await res.json();
    const container = $('#tech-options');

    const sorted = [...allResources].sort((a, b) => a.name.localeCompare(b.name));
    for (const r of sorted) {
      const label = document.createElement('label');
      label.className = 'multi-select-option';
      label.innerHTML = `<input type="checkbox" value="${r.id}" /> ${escHtml(r.name)}`;
      label.querySelector('input').addEventListener('change', updateTechSelection);
      container.appendChild(label);
    }
  } catch {
    // Silently fail - tech selection stays at "All Technicians"
  }
}

function updateTechSelection() {
  const checked = document.querySelectorAll('#tech-options input:checked');
  selectedTechnicians = Array.from(checked).map(cb => parseInt(cb.value));
  const trigger = $('#tech-trigger');
  const note = $('#tech-filter-note');

  if (selectedTechnicians.length === 0) {
    trigger.textContent = 'All Technicians';
    note.textContent = '';
  } else if (selectedTechnicians.length <= 2) {
    const labels = Array.from(checked).map(cb => cb.parentElement.textContent.trim());
    trigger.textContent = labels.join(', ');
    note.textContent = `Metrics filtered to ${selectedTechnicians.length} technician${selectedTechnicians.length > 1 ? 's' : ''}`;
  } else {
    trigger.textContent = `${selectedTechnicians.length} technicians selected`;
    note.textContent = `Metrics filtered to ${selectedTechnicians.length} technicians`;
  }

  // Re-render SDE metrics with new technician filter
  if (allTickets.length > 0) {
    renderSDEMetrics();
  }
}

function setupTechDropdown() {
  const trigger = $('#tech-trigger');
  const dropdown = $('#tech-dropdown');

  trigger.addEventListener('click', () => {
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!$('#tech-select-wrap').contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

// ── Fetch from Autotask ──
async function fetchTickets() {
  statusText.innerHTML = '<span class="loading-spinner"></span>Fetching tickets...';

  const { from, to } = getDateRange($('#timeframe-select').value);
  const includeCompleted = $('#include-completed').checked;

  const excludeZeroHours = $('#exclude-zero-hours').checked;

  const params = new URLSearchParams();
  if (selectedQueues.length > 0) params.set('queueIds', selectedQueues.join(','));
  if (from) params.set('dateFrom', from);
  if (to) params.set('dateTo', to);
  if (includeCompleted) params.set('includeCompleted', 'true');
  if (excludeZeroHours) params.set('excludeZeroHours', 'true');

  try {
    const res = await fetch(`/api/tickets?${params}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    const data = await res.json();
    allTickets = data.tickets;
    currentAnalytics = data.analytics;

    renderSummary(data.summary);
    renderAnalytics(data.analytics, data.summary);
    applyFilters();

    statusBar.className = 'status-bar connected';
    const queueLabel = selectedQueues.length > 0 ? ` in ${selectedQueues.length} queue${selectedQueues.length > 1 ? 's' : ''}` : '';
    const timeLabel = from ? ` (${from} to ${to})` : '';
    statusText.textContent = `Loaded ${allTickets.length} tickets${queueLabel}${timeLabel}. ${data.summary.quickHitterCount} quick hitters found.`;
  } catch (err) {
    statusBar.className = 'status-bar error';
    statusText.textContent = `Error: ${err.message}`;
  }
}

// ── Demo Mode ──
async function loadDemo() {
  statusText.innerHTML = '<span class="loading-spinner"></span>Analyzing demo tickets...';
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickets: DEMO_TICKETS }),
    });
    const data = await res.json();
    allTickets = data.tickets;
    currentAnalytics = data.analytics;

    renderSummary(data.summary);
    renderAnalytics(data.analytics, data.summary);
    applyFilters();

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
}

// ── Render Analytics Tabs ──
function renderAnalytics(analytics, summary) {
  if (!analytics) return;

  $('#analytics-section').classList.remove('hidden');

  // Category bars
  renderCategoryBars(summary.categoryBreakdown);

  // Category detail table
  renderCategoryTable(analytics.categoryDeepBreakdown);

  // Priority bars
  renderPriorityBars(analytics.priorityBreakdown);

  // Trend chart
  renderTrendChart(analytics.trendData);

  // Top opportunities
  renderOpportunities(analytics.topOpportunities);

  // ROI projection
  renderROI(analytics.roiProjection);

  // Quick Wins tab
  renderQuickWins();

  // SDE Metrics tab
  renderSDEMetrics();
}

function renderCategoryBars(categoryBreakdown) {
  const barsContainer = $('#category-bars');
  barsContainer.innerHTML = '';

  const maxCount = Math.max(...Object.values(categoryBreakdown));
  const sorted = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]);
  const colors = ['fill-primary', 'fill-green', 'fill-yellow', 'fill-orange', 'fill-purple', 'fill-cyan', 'fill-red'];

  sorted.forEach(([label, count], i) => {
    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
    const color = colors[i % colors.length];
    barsContainer.innerHTML += `
      <div class="cat-bar-row">
        <span class="cat-bar-label">${label}</span>
        <div class="cat-bar-track">
          <div class="cat-bar-fill ${color}" style="width: ${pct}%"></div>
        </div>
        <span class="cat-bar-count">${count}</span>
      </div>`;
  });
}

function renderCategoryTable(categoryDeepBreakdown) {
  const tbody = $('#category-detail-table tbody');
  tbody.innerHTML = '';

  for (const cat of categoryDeepBreakdown) {
    tbody.innerHTML += `
      <tr>
        <td>${cat.category}</td>
        <td>${cat.count}</td>
        <td>${cat.pctOfTotal}%</td>
        <td>${cat.avgAutomationScore}%</td>
        <td>${cat.totalMinutesSaveable}</td>
        <td>${cat.quickHitters}</td>
      </tr>`;
  }
}

function renderPriorityBars(priorityBreakdown) {
  const container = $('#priority-bars');
  container.innerHTML = '';

  const maxCount = Math.max(...Object.values(priorityBreakdown));
  const colorMap = { 'Critical': 'fill-red', 'High': 'fill-orange', 'Medium': 'fill-yellow', 'Low': 'fill-green' };

  const entries = Object.entries(priorityBreakdown).sort((a, b) => {
    const order = ['Critical', 'High', 'Medium', 'Low'];
    return order.indexOf(a[0]) - order.indexOf(b[0]);
  });

  for (const [label, count] of entries) {
    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
    const color = colorMap[label] || 'fill-primary';
    container.innerHTML += `
      <div class="cat-bar-row">
        <span class="cat-bar-label">${label}</span>
        <div class="cat-bar-track">
          <div class="cat-bar-fill ${color}" style="width: ${pct}%"></div>
        </div>
        <span class="cat-bar-count">${count}</span>
      </div>`;
  }
}

function renderTrendChart(trendData) {
  const container = $('#trend-chart');
  const note = $('#trend-note');

  if (!trendData || trendData.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No date data available for trend analysis. Live tickets include creation dates.</p></div>';
    note.textContent = '';
    return;
  }

  const maxCount = Math.max(...trendData.map(d => d.count));
  container.innerHTML = trendData.map(d => {
    const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
    const dateLabel = d.date.slice(5); // MM-DD
    return `
      <div class="trend-bar-wrap" title="${d.date}: ${d.count} tickets">
        <div class="trend-bar" style="height: ${Math.max(heightPct, 3)}%"></div>
        <span class="trend-bar-label">${dateLabel}</span>
      </div>`;
  }).join('');

  const total = trendData.reduce((s, d) => s + d.count, 0);
  const avg = (total / trendData.length).toFixed(1);
  note.textContent = `${trendData.length} days shown | ${total} total tickets | ${avg} avg/day`;
}

function renderOpportunities(topOpportunities) {
  const container = $('#opportunities-list');

  if (!topOpportunities || topOpportunities.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No automation opportunities identified yet.</p></div>';
    return;
  }

  container.innerHTML = topOpportunities.map((opp, i) => `
    <div class="opportunity-card">
      <div class="opp-rank">#${i + 1}</div>
      <div class="opp-details">
        <div class="opp-name">${opp.category}</div>
        <div class="opp-stats">
          <span>${opp.count} tickets</span>
          <span>Auto: ${opp.avgAutomationScore}%</span>
          <span>${opp.totalMinutesSaveable} min saveable</span>
        </div>
      </div>
      <div class="opp-impact">
        <div class="opp-impact-number">${opp.impactScore}</div>
        <div class="opp-impact-label">Impact Score</div>
      </div>
    </div>
  `).join('');
}

function renderROI(roi) {
  const container = $('#roi-content');

  if (!roi) {
    container.innerHTML = '<div class="empty-state"><p>No ROI data available.</p></div>';
    return;
  }

  container.innerHTML = `
    <div class="roi-card">
      <div class="roi-number">${roi.totalMinutesInBatch}</div>
      <div class="roi-label">Total Minutes in Batch</div>
    </div>
    <div class="roi-card">
      <div class="roi-number">${roi.automatableMinutes}</div>
      <div class="roi-label">Automatable Minutes</div>
    </div>
    <div class="roi-card">
      <div class="roi-number">${roi.monthlySavingsHours}h</div>
      <div class="roi-label">Monthly Hours Saved</div>
    </div>
    <div class="roi-card">
      <div class="roi-number">${roi.annualSavingsHours}h</div>
      <div class="roi-label">Annual Hours Saved</div>
    </div>
    <div class="roi-card roi-highlight">
      <div class="roi-number">$${roi.annualCostSavings.toLocaleString()}</div>
      <div class="roi-label">Annual Cost Savings</div>
    </div>
    <div class="roi-card">
      <div class="roi-number">$${roi.hourlyRateUsed}/hr</div>
      <div class="roi-label">Rate Used</div>
    </div>
  `;
}

// ── Render Tickets ──
function renderTickets(tickets) {
  if (!tickets.length) {
    showEmptyState();
    $('#ticket-count-label').textContent = '';
    return;
  }

  $('#ticket-count-label').textContent = `Showing ${tickets.length} of ${allTickets.length}`;

  ticketsContainer.innerHTML = tickets.map(t => {
    const scoreClass = t.automationScore >= 80 ? 'high' : t.automationScore >= 50 ? 'medium' : 'low';
    const scripts = (t.suggestedScripts || []).map(s =>
      `<button class="script-btn" onclick="event.stopPropagation(); viewScript('${s.type}', '${s.name}')">${s.label}</button>`
    ).join('');

    const priorityMap = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' };
    const priorityLabel = priorityMap[t.priority] || '';
    const priorityClass = priorityLabel ? `badge-priority-${priorityLabel.toLowerCase()}` : '';

    const readinessClass = t.automationReadiness || 'manual';
    const resourceName = getResourceName(t.assignedResourceID);

    return `
      <div class="ticket-card ${t.isQuickHitter ? 'quick-hitter' : ''}" onclick="openTicketDetail('${t.ticketId}')">
        <div class="ticket-header">
          <span class="ticket-title">${escHtml(t.title)}</span>
          <span class="ticket-id">#${t.ticketNumber || t.ticketId}</span>
        </div>
        <div class="ticket-meta">
          <span class="badge badge-category">${t.categoryLabel}</span>
          <span class="badge badge-readiness badge-readiness-${readinessClass}">${t.automationReadinessLabel || 'Manual'}</span>
          ${t.isQuickHitter ? '<span class="badge badge-quick">Quick Hitter</span>' : ''}
          ${t.estimatedMinutes ? `<span class="badge badge-time">~${t.estimatedMinutes} min</span>` : ''}
          ${t.workedHours > 0 ? `<span class="badge badge-worked">${t.workedHours.toFixed(2)}h worked</span>` : ''}
          ${resourceName ? `<span class="badge badge-tech">${escHtml(resourceName)}</span>` : ''}
          ${priorityLabel ? `<span class="badge ${priorityClass}">${priorityLabel}</span>` : ''}
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
      <p>Click "Fetch Tickets" to pull live data, or "Load Demo Tickets" to see sample data.</p>
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
  } else if (category === 'auto_ready') {
    filtered = filtered.filter(t => t.automationReadiness === 'auto_ready');
  } else if (category === 'quick_wins') {
    filtered = filtered.filter(t => t.isQuickHitter && t.automationReadiness === 'auto_ready');
  } else if (category === 'automatable') {
    filtered = filtered.filter(t => t.automationScore >= 70);
  }

  if (sort === 'time') {
    filtered.sort((a, b) => (a.estimatedMinutes || 99) - (b.estimatedMinutes || 99));
  } else if (sort === 'confidence') {
    filtered.sort((a, b) => b.matchConfidence - a.matchConfidence);
  } else if (sort === 'priority') {
    filtered.sort((a, b) => (a.priority || 99) - (b.priority || 99));
  } else {
    filtered.sort((a, b) => b.automationScore - a.automationScore);
  }

  renderTickets(filtered);
}

// ── Tab Switching ──
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// ── Timeframe Toggle ──
function setupTimeframeToggle() {
  const timeframeSelect = $('#timeframe-select');
  const customRange = $('#custom-date-range');

  timeframeSelect.addEventListener('change', () => {
    if (timeframeSelect.value === 'custom') {
      customRange.classList.remove('hidden');
    } else {
      customRange.classList.add('hidden');
    }
  });
}

// ── Toast Notification ──
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

// ── Ticket Detail Modal ──
function openTicketDetail(ticketId) {
  const t = allTickets.find(tk => String(tk.ticketId) === String(ticketId));
  if (!t) return;

  const priorityMap = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' };
  const priorityLabel = priorityMap[t.priority] || 'Unknown';
  const priorityClass = priorityLabel ? `badge-priority-${priorityLabel.toLowerCase()}` : '';
  const scoreClass = t.automationScore >= 80 ? 'high' : t.automationScore >= 50 ? 'medium' : 'low';
  const readinessClass = t.automationReadiness || 'manual';
  const resourceName = getResourceName(t.assignedResourceID);

  const scripts = (t.suggestedScripts || []).map(s =>
    `<button class="script-btn" onclick="event.stopPropagation(); viewScript('${s.type}', '${s.name}')">${s.label}</button>`
  ).join('');

  const createdDate = t.createDate ? new Date(t.createDate).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'N/A';

  $('#detail-modal-title').textContent = `#${t.ticketNumber || t.ticketId}`;
  $('#detail-modal-body').innerHTML = `
    <div class="detail-content">
      <h3 class="detail-ticket-title">${escHtml(t.title)}</h3>

      <div class="detail-badges">
        <span class="badge badge-category">${t.categoryLabel}</span>
        <span class="badge badge-readiness badge-readiness-${readinessClass}">${t.automationReadinessLabel || 'Manual'}</span>
        ${t.isQuickHitter ? '<span class="badge badge-quick">Quick Hitter</span>' : ''}
        ${t.estimatedMinutes ? `<span class="badge badge-time">~${t.estimatedMinutes} min</span>` : ''}
        ${t.workedHours > 0 ? `<span class="badge badge-worked">${t.workedHours.toFixed(2)}h worked</span>` : ''}
        ${resourceName ? `<span class="badge badge-tech">${escHtml(resourceName)}</span>` : ''}
        <span class="badge ${priorityClass}">${priorityLabel}</span>
      </div>

      ${t.description ? `
        <div class="detail-section">
          <h4>Description</h4>
          <p class="detail-description">${escHtml(t.description)}</p>
        </div>
      ` : ''}

      <div class="detail-grid">
        <div class="detail-stat">
          <div class="detail-stat-label">Created</div>
          <div class="detail-stat-value">${createdDate}</div>
        </div>
        <div class="detail-stat">
          <div class="detail-stat-label">Est. Time</div>
          <div class="detail-stat-value">${t.estimatedMinutes ? t.estimatedMinutes + ' min' : 'Unknown'}</div>
        </div>
        <div class="detail-stat">
          <div class="detail-stat-label">Worked Hours</div>
          <div class="detail-stat-value">${t.workedHours > 0 ? t.workedHours.toFixed(2) + 'h' : 'None'}</div>
        </div>
        <div class="detail-stat">
          <div class="detail-stat-label">Match Confidence</div>
          <div class="detail-stat-value">${t.matchConfidence}%</div>
        </div>
        <div class="detail-stat">
          <div class="detail-stat-label">Assigned To</div>
          <div class="detail-stat-value">${resourceName || 'Unassigned'}</div>
        </div>
        <div class="detail-stat">
          <div class="detail-stat-label">Quick Win Value</div>
          <div class="detail-stat-value">${t.quickWinValue || 0}</div>
        </div>
      </div>

      <div class="detail-section">
        <h4>Automation Score</h4>
        <div class="detail-score-bar">
          <div class="score-track detail-score-track">
            <div class="score-fill ${scoreClass}" style="width: ${t.automationScore}%"></div>
          </div>
          <span class="detail-score-value">${t.automationScore}%</span>
        </div>
      </div>

      <div class="detail-section detail-automation-path">
        <h4>Automation Readiness: <span class="badge badge-readiness badge-readiness-${readinessClass}">${t.automationReadinessLabel || 'Manual'}</span></h4>
        <p>${t.automationPath || 'No automation path determined.'}</p>
      </div>

      ${t.resolution ? `
        <div class="detail-section">
          <h4>Resolution (How It Was Solved)</h4>
          <p class="detail-resolution-text">${t.resolution}</p>
        </div>
      ` : ''}

      ${t.resolutionAnalysis && t.resolutionAnalysis.length ? `
        <div class="detail-section">
          <h4>Score Adjustments from Resolution</h4>
          <ul class="resolution-analysis-list">
            ${t.resolutionAnalysis.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${t.suggestedScripts && t.suggestedScripts.length ? `
        <div class="detail-section">
          <h4>Available Scripts ${t.scriptMatchType === 'symptom' ? '<span class="match-type-label match-symptom">Matched by symptoms</span>' : '<span class="match-type-label match-fallback">Category fallback</span>'}</h4>
          <div class="detail-scripts-list">
            ${t.suggestedScripts.map(s => `
              <div class="detail-script-card">
                <div class="detail-script-header">
                  <button class="script-btn" onclick="event.stopPropagation(); viewScript('${s.type}', '${s.name}')">${s.label}</button>
                  ${s.relevance ? `<span class="script-relevance ${s.relevance >= 70 ? 'relevance-high' : s.relevance >= 40 ? 'relevance-med' : 'relevance-low'}">${s.relevance}% match</span>` : ''}
                </div>
                ${s.resolves ? `<p class="script-resolves">${s.resolves}</p>` : ''}
                ${s.requires ? `<p class="script-requires">Requires: ${s.requires}</p>` : ''}
                ${s.matchedSymptoms && s.matchedSymptoms.length ? `<p class="script-matched">Matched: ${s.matchedSymptoms.map(sym => `<code>${sym}</code>`).join(' ')}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${t.isQuickHitter && t.automationReadiness === 'auto_ready' ? `
        <div class="detail-quickwin-banner">
          <div class="quickwin-banner-icon">&#9889;</div>
          <div class="quickwin-banner-text">
            <strong>Quick Win Candidate</strong>
            <p>This ${t.estimatedMinutes}-min task has automation scripts ready. Deploy the script to eliminate this ticket type and save ~${t.estimatedMinutes} min per occurrence.</p>
          </div>
        </div>
      ` : ''}
    </div>
  `;
  $('#detail-modal').classList.remove('hidden');
}

window.openTicketDetail = openTicketDetail;

function closeDetailModal() {
  $('#detail-modal').classList.add('hidden');
}

// ── Quick Wins Tab ──
function renderQuickWins() {
  const quickWins = allTickets.filter(t => t.isQuickHitter && t.automationReadiness === 'auto_ready');
  const semiAuto = allTickets.filter(t => t.isQuickHitter && t.automationReadiness === 'semi_auto');
  const manualQuick = allTickets.filter(t => t.isQuickHitter && (t.automationReadiness === 'manual' || t.automationReadiness === 'script_assist'));

  const totalMinSaved = quickWins.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);

  const summaryContainer = $('#quickwins-summary');
  summaryContainer.innerHTML = `
    <div class="qw-stat-row">
      <div class="qw-stat">
        <div class="qw-stat-number qw-green">${quickWins.length}</div>
        <div class="qw-stat-label">Auto-Ready Quick Wins</div>
      </div>
      <div class="qw-stat">
        <div class="qw-stat-number qw-yellow">${semiAuto.length}</div>
        <div class="qw-stat-label">Semi-Auto Quick Hits</div>
      </div>
      <div class="qw-stat">
        <div class="qw-stat-number qw-dim">${manualQuick.length}</div>
        <div class="qw-stat-label">Manual Quick Hits</div>
      </div>
      <div class="qw-stat">
        <div class="qw-stat-number qw-green">${totalMinSaved} min</div>
        <div class="qw-stat-label">Automatable Right Now</div>
      </div>
    </div>
  `;

  // Group quick wins by category
  const listContainer = $('#quickwins-list');
  if (quickWins.length === 0) {
    listContainer.innerHTML = '<div class="empty-state"><p>No auto-ready quick wins found in this batch. Try loading more tickets.</p></div>';
    return;
  }

  const byCategory = {};
  for (const t of quickWins) {
    if (!byCategory[t.categoryLabel]) {
      byCategory[t.categoryLabel] = { tickets: [], scripts: t.suggestedScripts, avgMinutes: t.estimatedMinutes, automationScore: t.automationScore };
    }
    byCategory[t.categoryLabel].tickets.push(t);
  }

  const sorted = Object.entries(byCategory).sort((a, b) => b[1].tickets.length - a[1].tickets.length);

  listContainer.innerHTML = sorted.map(([category, data]) => {
    const totalMin = data.tickets.length * data.avgMinutes;
    const scriptBtns = (data.scripts || []).map(s =>
      `<button class="script-btn" onclick="event.stopPropagation(); viewScript('${s.type}', '${s.name}')">${s.label}</button>`
    ).join('');

    const ticketRows = data.tickets.map(t => `
      <div class="qw-ticket-row" onclick="openTicketDetail('${t.ticketId}')">
        <span class="qw-ticket-title">${escHtml(t.title)}</span>
        <span class="qw-ticket-id">#${t.ticketNumber || t.ticketId}</span>
        <span class="badge badge-time">~${t.estimatedMinutes} min</span>
      </div>
    `).join('');

    return `
      <div class="qw-category-group">
        <div class="qw-category-header">
          <div class="qw-category-info">
            <span class="qw-category-name">${category}</span>
            <span class="qw-category-count">${data.tickets.length} ticket${data.tickets.length > 1 ? 's' : ''}</span>
            <span class="badge badge-readiness badge-readiness-auto_ready">Auto-Ready</span>
          </div>
          <div class="qw-category-stats">
            <span class="qw-save-total">${totalMin} min saveable</span>
            <span class="qw-auto-score">Auto: ${data.automationScore}%</span>
          </div>
        </div>
        <div class="qw-category-scripts">${scriptBtns}</div>
        <div class="qw-tickets">${ticketRows}</div>
      </div>
    `;
  }).join('');
}

// ── SDE Metrics ──

// Store computed ticket sets for drill-down on click
let sdeMetricSets = {};

// KPI descriptions for each metric
const SDE_KPI_INFO = {
  'Reactive Tickets Received': 'Number of new reactive tickets received in the period, whether closed or still open. Excludes junk, duplicate, or deleted tickets. Only includes tickets with time entered. Helps identify workload variations and establish team capacity requirements.',
  'Reactive Tickets Closed': 'Number of all reactive tickets closed for the month. Excludes tickets with no time entered against them. Helps identify workload variations and establish team capacity requirements.',
  'Non-Billable MAC Received': 'Number of new non-billable MAC requests received in the Reactive Services Queue, whether closed or still open. Excludes junk, duplicate, or deleted tickets. Only includes tickets with time entered. Helps identify workload variations and establish team capacity requirements.',
  'Non-Billable MAC Closed': 'Number of non-billable MAC requests closed during the period. Excludes tickets/requests closed with no time entered.',
  'Total Received': 'Total reactive tickets and non-billable MAC requests received for the month, whether closed or still open. Excludes junk, duplicate, or trash tickets. Helps identify workload variations and establish team capacity requirements.',
  'Total Closed': 'Number of all reactive tickets and non-billable MAC requests closed for the month. Excludes tickets/requests closed with no time entered. Helps identify workload variations and establish team capacity requirements.',
  'Kill Rate': 'Percentage of tickets closed compared to opened during the month. Target: 100% or higher. With 70% same-day resolution target, kill rate must average 100% over time. If not achieved, tickets on board at days end will continuously increase.',
  'SDE Headcount': 'Number of Service Desk Engineers in the period. Auto-set when technicians are selected.',
  'Avg Closed/Day/SDE': 'Average tickets closed per business day per SDE. Reactive Closed / Business Days / Headcount.',
  'Avg Escalation Closed/Day': 'Number of escalation tickets closed during the month, divided by business days. Target: 4 or higher per day. Identifies escalation engineer efficiency and ensures escalated issues are resolved without stagnation. Escalation tickets are identified by the Autotask UDF "Escalate" = Yes.',
  'Avg Resolution Time': 'Average time from ticket creation to resolution (Resolved Time Met in Autotask) for closed reactive tickets with worked hours. Target: 30 minutes or less.',
  'Avg Response Time': 'Average time from ticket creation to resolution plan being set (Resolution Plan Met in Autotask) for closed reactive tickets with worked hours. Target: 30 minutes or less.',
  'Total Time Entered': 'Total time entered by SDEs on all reactive tickets and non-billable MAC requests worked for the month, regardless of open or closed status. Actual time must be reported. Helps determine SDE effective utilization and labor per endpoint. Assists leadership with analysis of SDE efficiency and ensures time is accurately applied for resolution time KPI accuracy.',
  'Open Tickets at EOD': 'Average number of reactive tickets open at end of each business day across the selected time frame. Target: 25 or fewer. More than 25 or a steadily rising count indicates team capacity, operational process, or skill set issues.',
  'Tickets > 5 Days Old': 'Average number of tickets over 5 days old in the reactive services queue for the month. Target: 10 tickets or fewer. Helps identify stagnating tickets and SDE resource, performance, and technical skillset challenges. Also helps identify if escalation processes are being used effectively by team members.',
  'Agreement Utilization': 'Billable hours logged by SDEs (against agreements or MACs) compared to dedicated team hours. Auto-calculated based on SDE headcount assuming a 40-hour work week. Target: 90% or higher billable utilization. Remaining time is typically utilized by internal meetings, PTO, and training.',
  'CSAT Score Average': 'Average CSAT score for all closed tickets that received a CSAT response for the month. Target: Highest possible — aim for an "A" rating. An "A" rating ensures clients are happy with Service Desk performance and is critical to client success and managed service agreement longevity. Manual input.',
  'CSAT Response Rate': 'Percentage of closed tickets that received a CSAT response for the month. Calculated as tickets with CSAT scores divided by total tickets closed. Target: Highest possible. Receiving client feedback is critical to client success and agreement longevity. Manual input.',
};

function renderSDEMetrics() {
  const headcount = parseInt($('#sde-headcount').value) || 1;

  // Auto-calculate business days from selected time frame
  const { from, to } = getDateRange($('#timeframe-select').value);
  if (from) {
    const autoBusinessDays = countBusinessDays(new Date(from), new Date(to || new Date()));
    if (autoBusinessDays > 0) {
      $('#sde-business-days').value = autoBusinessDays;
    }
  }
  const businessDays = parseInt($('#sde-business-days').value) || 20;
  const csatScore = parseFloat($('#sde-csat-score').value) || null;
  const csatRate = parseFloat($('#sde-csat-rate').value) || null;
  const agreementUtil = parseFloat($('#sde-agreement-util').value) || null;
  const escalationClosed = parseInt($('#sde-escalation-closed').value) || 0;

  // Filter tickets by selected technicians (if any selected)
  const filteredTickets = selectedTechnicians.length > 0
    ? allTickets.filter(t => t.assignedResourceID && selectedTechnicians.includes(t.assignedResourceID))
    : allTickets;

  // Auto-calculated from ticket data
  const totalTickets = filteredTickets.length;
  const closedTicketsList = filteredTickets.filter(t => t.status === 5 || t.status === 'Complete');
  const closedTickets = closedTicketsList.length;

  // Split tickets by queue type (filtered = per-tech for closed metrics)
  const reactiveTicketsFiltered = filteredTickets.filter(t => isReactiveQueue(t.queueID));
  const macTicketsFiltered = filteredTickets.filter(t => isMACQueue(t.queueID));
  // Tickets not in either known queue fall into reactive by default
  const unclassifiedTickets = filteredTickets.filter(t => !isReactiveQueue(t.queueID) && !isMACQueue(t.queueID));

  const hasQueueData = allQueues.length > 0 && allTickets.some(t => t.queueID);

  // All queue splits from allTickets (not tech-filtered) with worked hours > 0
  const allReactiveTickets = allTickets.filter(t => isReactiveQueue(t.queueID));
  const allMACTickets = allTickets.filter(t => isMACQueue(t.queueID));

  const reactiveReceivedList = hasQueueData
    ? allReactiveTickets.filter(t => t.workedHours > 0)
    : allTickets.filter(t => t.workedHours > 0);
  const macReceivedList = hasQueueData
    ? allMACTickets.filter(t => t.workedHours > 0)
    : [];

  const reactiveClosedList = hasQueueData
    ? allReactiveTickets.filter(t => (t.status === 5 || t.status === 'Complete') && t.workedHours > 0)
    : allTickets.filter(t => (t.status === 5 || t.status === 'Complete') && t.workedHours > 0);
  const macClosedList = hasQueueData
    ? allMACTickets.filter(t => (t.status === 5 || t.status === 'Complete') && t.workedHours > 0)
    : [];

  const hasCompletedData = closedTickets > 0;
  const reactiveReceived = reactiveReceivedList.length;
  const reactiveClosed = reactiveClosedList.length;
  const macReceived = hasQueueData ? macReceivedList.length : (parseInt($('#sde-mac-received').value) || 0);
  const macClosed = hasQueueData ? macClosedList.length : (parseInt($('#sde-mac-closed').value) || 0);

  const totalReceived = reactiveReceived + macReceived;
  const totalClosed = reactiveClosed + macClosed;

  // Total Kill Rate = all closed vs all received (entire queue)
  const totalKillRate = totalReceived > 0 ? ((totalClosed / totalReceived) * 100).toFixed(1) : 'N/A';

  // Tech Kill Rate = selected tech's closed vs all received
  const techReactiveClosedList = hasQueueData
    ? reactiveTicketsFiltered.filter(t => (t.status === 5 || t.status === 'Complete') && t.workedHours > 0)
    : closedTicketsList.filter(t => t.workedHours > 0);
  const techMACClosedList = hasQueueData
    ? macTicketsFiltered.filter(t => (t.status === 5 || t.status === 'Complete') && t.workedHours > 0)
    : [];
  const techClosed = techReactiveClosedList.length + (hasQueueData ? techMACClosedList.length : (parseInt($('#sde-mac-closed').value) || 0));
  const techKillRate = totalReceived > 0 ? ((techClosed / totalReceived) * 100).toFixed(1) : 'N/A';

  // Use tech kill rate as the primary display when techs are selected, otherwise total
  const hasTechFilter = selectedTechnicians.length > 0;
  const killRate = hasTechFilter ? techKillRate : totalKillRate;

  const sdeCount = selectedTechnicians.length > 0 ? selectedTechnicians.length : headcount;

  // Avg Closed/Day/SDE — uses full queue closed (not tech-filtered)
  const avgClosedPerDayPerSDE = (reactiveClosed > 0 && businessDays > 0 && headcount > 0)
    ? (reactiveClosed / businessDays / headcount).toFixed(1)
    : 'N/A';

  // Tech Avg Closed/Day — selected tech's closed per day (only shown when techs selected)
  const techReactiveClosed = techReactiveClosedList.length;
  const techMACClosed = techMACClosedList.length;
  const techTotalClosed = techReactiveClosed + (hasQueueData ? techMACClosed : (parseInt($('#sde-mac-closed').value) || 0));
  const techAvgClosedPerDay = (hasTechFilter && techReactiveClosed > 0 && businessDays > 0)
    ? (techReactiveClosed / businessDays / sdeCount).toFixed(1)
    : null;

  const avgEscPerDay = (escalationClosed > 0 && businessDays > 0)
    ? (escalationClosed / businessDays).toFixed(1)
    : 'N/A';

  // Time metrics - use all tickets with worked hours (both queues)
  const ticketsWithWorkedHours = filteredTickets.filter(t => t.workedHours > 0);
  const ticketsWithTime = filteredTickets.filter(t => t.estimatedMinutes > 0);
  const hasRealTimeData = ticketsWithWorkedHours.length > 0;

  // Avg Response Time - from Autotask resolutionPlanDateTime (Resolution Plan Met)
  // Completed, Reactive queue (002 - Reactive), worked hours > 0, has resolutionPlanDateTime
  const ticketsWithResponsePlan = filteredTickets.filter(t =>
    (t.status === 5 || t.status === 'Complete') && isReactiveQueue(t.queueID) && t.workedHours > 0 && t.createDate && t.resolutionPlanDateTime
  );
  // Live math debug logging for Avg Response Time
  console.group('📊 Avg Response Time - Live Math');
  console.log(`Qualifying tickets: ${ticketsWithResponsePlan.length}`);
  let responseTimeSum = 0;
  ticketsWithResponsePlan.forEach((t, i) => {
    const created = new Date(t.createDate).getTime();
    const planMet = new Date(t.resolutionPlanDateTime).getTime();
    const diffMs = planMet - created;
    const diffMin = diffMs / 60000;
    responseTimeSum += diffMs;
    console.log(`  Ticket #${t.ticketNumber || i + 1}: createDate=${t.createDate} | resolutionPlanDateTime=${t.resolutionPlanDateTime} | diff=${diffMs}ms (${diffMin.toFixed(2)} min)`);
  });
  if (ticketsWithResponsePlan.length > 0) {
    console.log(`  Sum: ${responseTimeSum}ms`);
    console.log(`  Divide by ${ticketsWithResponsePlan.length} tickets: ${responseTimeSum / ticketsWithResponsePlan.length}ms`);
    console.log(`  Convert to minutes: ${(responseTimeSum / ticketsWithResponsePlan.length / 60000).toFixed(4)} min`);
    console.log(`  Math.round: ${Math.round(responseTimeSum / ticketsWithResponsePlan.length / 60000)} min`);
  }
  console.groupEnd();

  const avgResponseTime = ticketsWithResponsePlan.length > 0
    ? Math.round(ticketsWithResponsePlan.reduce((s, t) => {
        const created = new Date(t.createDate).getTime();
        const planMet = new Date(t.resolutionPlanDateTime).getTime();
        return s + (planMet - created);
      }, 0) / ticketsWithResponsePlan.length / 60000) // convert ms to minutes
    : 'N/A';
  const avgResponseSource = ticketsWithResponsePlan.length > 0 ? 'auto' : 'needs-data';

  // Avg Resolution Time - from Autotask resolvedDateTime (Resolved Time Met)
  // Completed, Reactive queue (002 - Reactive), worked hours > 0, has resolvedDateTime
  const ticketsWithResolved = filteredTickets.filter(t =>
    (t.status === 5 || t.status === 'Complete') && isReactiveQueue(t.queueID) && t.workedHours > 0 && t.createDate && t.resolvedDateTime
  );
  const avgResolutionTime = ticketsWithResolved.length > 0
    ? Math.round(ticketsWithResolved.reduce((s, t) => {
        const created = new Date(t.createDate).getTime();
        const resolved = new Date(t.resolvedDateTime).getTime();
        return s + (resolved - created);
      }, 0) / ticketsWithResolved.length / 60000) // convert ms to minutes
    : 'N/A';

  // Total Time Entered - all tickets regardless of queue
  const totalTimeEntered = hasRealTimeData
    ? Math.round(ticketsWithWorkedHours.reduce((s, t) => s + t.workedHours, 0) * 60)
    : ticketsWithTime.reduce((s, t) => s + t.estimatedMinutes, 0);

  const timeSource = hasRealTimeData ? 'auto' : (ticketsWithTime.length > 0 ? 'est' : 'needs-data');
  const resTimeSource = ticketsWithResolved.length > 0 ? 'auto' : 'needs-data';

  // Avg Open Tickets at EOD - reactive only, averaged across each business day in the range
  const reactiveAll = hasQueueData ? allReactiveTickets : allTickets;
  const reactiveWithDates = reactiveAll.filter(t => t.createDate);
  let avgOpenAtEOD = 'N/A';
  const openAtEODList = [];
  if (reactiveWithDates.length > 0 && from) {
    const rangeStart = new Date(from);
    const rangeEnd = new Date(to || new Date());
    rangeEnd.setHours(23, 59, 59, 999);
    let dayCount = 0;
    let totalOpen = 0;
    const cur = new Date(rangeStart);
    cur.setHours(23, 59, 59, 999); // end of day
    while (cur <= rangeEnd) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) {
        // Count tickets that existed by EOD (created on or before) and were not yet completed
        const eodTime = cur.getTime();
        let openCount = 0;
        for (const t of reactiveWithDates) {
          const created = new Date(t.createDate).getTime();
          if (created > eodTime) continue; // not created yet
          // If ticket has a resolvedDateTime before this EOD, it was already closed
          if (t.resolvedDateTime && new Date(t.resolvedDateTime).getTime() <= eodTime) continue;
          // If no resolvedDateTime but status is complete, use lastActivityDate or completedDate as proxy
          if (!t.resolvedDateTime && (t.status === 5 || t.status === 'Complete')) {
            const completedTime = t.completedDate ? new Date(t.completedDate).getTime()
              : t.lastActivityDate ? new Date(t.lastActivityDate).getTime() : null;
            if (completedTime && completedTime <= eodTime) continue;
          }
          openCount++;
        }
        totalOpen += openCount;
        dayCount++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    avgOpenAtEOD = dayCount > 0 ? Math.round(totalOpen / dayCount) : 'N/A';
  }
  // Build the list of currently-open reactive tickets for drilldown
  const openTicketsList = reactiveAll.filter(t => t.status !== 5 && t.status !== 'Complete');

  const now = new Date();
  const fiveBusinessDaysAgo = subtractBusinessDays(now, 5);
  const reactiveFiltered = hasQueueData ? filteredTickets.filter(t => isReactiveQueue(t.queueID)) : filteredTickets;
  const oldTicketsList = reactiveFiltered.filter(t => {
    if (!t.createDate) return false;
    return new Date(t.createDate) < fiveBusinessDaysAgo;
  });

  const macSource = hasQueueData ? 'auto' : 'manual';
  const reactiveSource = hasQueueData ? 'auto' : 'auto';

  // Hide manual MAC inputs when queue data auto-calculates them
  const macReceivedGroup = document.getElementById('sde-mac-received-group');
  const macClosedGroup = document.getElementById('sde-mac-closed-group');
  if (macReceivedGroup) macReceivedGroup.style.display = hasQueueData ? 'none' : '';
  if (macClosedGroup) macClosedGroup.style.display = hasQueueData ? 'none' : '';

  // Store ticket sets for drill-down
  sdeMetricSets = {
    'Reactive Tickets Received': reactiveReceivedList,
    'Reactive Tickets Closed': hasTechFilter ? techReactiveClosedList : reactiveClosedList,
    'Non-Billable MAC Received': macReceivedList,
    'Non-Billable MAC Closed': hasTechFilter ? techMACClosedList : macClosedList,
    'Total Received': [...reactiveReceivedList, ...macReceivedList],
    'Total Closed': hasTechFilter ? [...techReactiveClosedList, ...techMACClosedList] : [...reactiveClosedList, ...macClosedList],
    'Kill Rate': {
      received: totalReceived,
      closed: totalClosed,
      rate: totalKillRate,
      techClosed: hasTechFilter ? techClosed : null,
      techRate: hasTechFilter ? techKillRate : null,
      tickets: hasTechFilter ? [...techReactiveClosedList, ...techMACClosedList] : [...reactiveClosedList, ...macClosedList],
    },
    'Avg Closed/Day/SDE': hasTechFilter ? techReactiveClosedList : reactiveClosedList,
    'Avg Resolution Time': ticketsWithResolved,
    'Avg Response Time': ticketsWithResponsePlan,
    'Total Time Entered': ticketsWithWorkedHours.length > 0 ? ticketsWithWorkedHours : ticketsWithTime,
    'Open Tickets at EOD': openTicketsList,
    'Tickets > 5 Days Old': oldTicketsList,
  };

  // --- Render Volume ---
  $('#sde-volume-grid').innerHTML = `
    ${sdeCard('SDE Headcount', selectedTechnicians.length > 0 ? selectedTechnicians.length : headcount, selectedTechnicians.length > 0 ? 'auto' : '')}
    ${sdeCard('Reactive Tickets Received', reactiveReceived, reactiveSource)}
    ${sdeCard('Non-Billable MAC Received', macReceived, macSource)}
    ${sdeCard('Total Received', totalReceived, 'calc')}
    ${sdeCard('Reactive Tickets Closed',
      hasTechFilter ? techReactiveClosed + ' tech / ' + reactiveClosed + ' total' : reactiveClosed,
      hasCompletedData ? reactiveSource : 'needs-data')}
    ${sdeCard('Non-Billable MAC Closed',
      hasTechFilter ? techMACClosed + ' tech / ' + macClosed + ' total' : macClosed,
      hasCompletedData ? macSource : (hasQueueData ? macSource : 'manual'))}
    ${sdeCard('Total Closed',
      hasTechFilter ? techTotalClosed + ' tech / ' + totalClosed + ' total' : totalClosed,
      'calc')}
    ${sdeCard('Kill Rate',
      hasTechFilter
        ? (techKillRate !== 'N/A' ? techKillRate + '% tech / ' + totalKillRate + '% total' : 'N/A')
        : (totalKillRate !== 'N/A' ? totalKillRate + '%' : 'N/A'),
      totalReceived > 0 ? 'calc' : 'needs-data')}
  `;

  // --- Render Efficiency ---
  $('#sde-efficiency-grid').innerHTML = `
    ${sdeCard('Avg Closed/Day/SDE',
      hasTechFilter && techAvgClosedPerDay
        ? techAvgClosedPerDay + ' tech / ' + avgClosedPerDayPerSDE + ' team'
        : avgClosedPerDayPerSDE,
      hasCompletedData ? 'calc' : 'needs-data')}
    ${sdeCard('Avg Escalation Closed/Day', avgEscPerDay, escalationClosed > 0 ? 'calc' : 'manual')}
    ${sdeCard('Avg Resolution Time', avgResolutionTime !== 'N/A' ? avgResolutionTime + ' min' : 'N/A', avgResolutionTime !== 'N/A' ? resTimeSource : 'needs-data')}
    ${sdeCard('Avg Response Time', avgResponseTime !== 'N/A' ? avgResponseTime + ' min' : 'N/A', avgResponseSource)}
    ${sdeCard('Total Time Entered', totalTimeEntered + ' min', timeSource)}
    ${sdeCard('Open Tickets at EOD', avgOpenAtEOD !== 'N/A' ? avgOpenAtEOD + ' avg' : 'N/A', avgOpenAtEOD !== 'N/A' ? 'auto' : 'needs-data')}
    ${sdeCard('Tickets > 5 Days Old', oldTicketsList.length, 'auto')}
  `;

  // --- Render Quality ---
  $('#sde-quality-grid').innerHTML = `
    ${sdeCard('Agreement Utilization', agreementUtil !== null ? agreementUtil + '%' : 'N/A', agreementUtil !== null ? '' : 'manual')}
    ${sdeCard('CSAT Score Average', csatScore !== null ? csatScore.toFixed(1) : 'N/A', csatScore !== null ? '' : 'manual')}
    ${sdeCard('CSAT Response Rate', csatRate !== null ? csatRate + '%' : 'N/A', csatRate !== null ? '' : 'manual')}
  `;
}

function sdeCard(label, value, source, tooltip) {
  const sourceLabels = {
    'auto': 'From ticket data',
    'manual': 'Manual input',
    'calc': 'Calculated',
    'needs-data': 'Needs completed tickets',
    'est': 'Estimated',
  };
  const sourceText = sourceLabels[source] || '';
  const sourceClass = source || '';
  const hasData = sdeMetricSets[label];
  const clickable = hasData ? 'sde-clickable' : '';
  const kpiDesc = SDE_KPI_INFO[label] || tooltip || sourceText;

  return `
    <div class="sde-metric-card ${clickable}" onclick="openSDEDrilldown('${escHtml(label)}')" title="${escHtml(kpiDesc)}">
      <div class="sde-metric-value">${value}</div>
      <div class="sde-metric-label">${label}</div>
      ${sourceText ? `<div class="sde-metric-source sde-source-${sourceClass}">${sourceText}</div>` : ''}
      ${hasData ? '<div class="sde-drilldown-hint">Click to view tickets</div>' : ''}
    </div>
  `;
}

// ── SDE Drill-Down Modal ──
function openSDEDrilldown(metricLabel) {
  const data = sdeMetricSets[metricLabel];
  if (!data) return;

  $('#drilldown-title').textContent = metricLabel;

  // Special case: Kill Rate shows total + tech-filtered calculation
  if (metricLabel === 'Kill Rate' && data.rate !== undefined) {
    const tickets = data.tickets || [];
    const kpiDesc = SDE_KPI_INFO[metricLabel] || '';
    const techSection = data.techRate !== null ? `
        <div class="drilldown-formula drilldown-formula-tech">
          <span class="drilldown-formula-label">Selected Tech(s):</span>
          Tech Closed (${data.techClosed}) / Total Received (${data.received}) x 100 = <strong>${data.techRate}%</strong>
        </div>
        <div class="drilldown-formula drilldown-formula-remainder">
          <span class="drilldown-formula-label">Remainder of Team:</span>
          ${data.closed - data.techClosed} closed of ${data.received} received = <strong>${data.received > 0 ? (((data.closed - data.techClosed) / data.received) * 100).toFixed(1) : 'N/A'}%</strong>
        </div>
    ` : '';
    const calcHtml = `
      <div class="drilldown-calc">
        <div class="drilldown-desc">${kpiDesc}</div>
        <div class="drilldown-formula">
          <span class="drilldown-formula-label">Total Kill Rate:</span>
          Total Closed (${data.closed}) / Total Received (${data.received}) x 100 = <strong>${data.rate}%</strong>
        </div>
        ${techSection}
      </div>
    `;
    const tableHtml = tickets.length > 0 ? renderDrilldownTable(tickets, metricLabel) : '';
    $('#drilldown-body').innerHTML = calcHtml + tableHtml;
    $('#drilldown-modal').classList.remove('hidden');
    return;
  }

  // Normal case: array of tickets
  const tickets = Array.isArray(data) ? data : [];
  if (tickets.length === 0) return;

  const kpiDesc = SDE_KPI_INFO[metricLabel] || '';
  const descHtml = kpiDesc ? `<div class="drilldown-desc">${kpiDesc}</div>` : '';
  const summaryHtml = `<div class="drilldown-summary">${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}</div>`;

  $('#drilldown-body').innerHTML = descHtml + summaryHtml + renderDrilldownTable(tickets, metricLabel);
  $('#drilldown-modal').classList.remove('hidden');
}

function renderDrilldownTable(tickets, metricLabel) {
  const showWorkedHours = ['Avg Resolution Time', 'Avg Response Time', 'Total Time Entered'].includes(metricLabel);
  const showStatus = ['Reactive Tickets Received', 'Non-Billable MAC Received', 'Total Received', 'Open Tickets at EOD', 'Tickets > 5 Days Old'].includes(metricLabel);
  const showQueue = allQueues.length > 0;

  const headerCols = `
    <th>Ticket #</th>
    <th>Title</th>
    <th>Category</th>
    ${showQueue ? '<th>Queue</th>' : ''}
    ${showStatus ? '<th>Status</th>' : ''}
    ${showWorkedHours ? '<th>Worked Hours</th>' : ''}
    <th>Assigned To</th>
    <th>Created</th>
  `;

  const rows = tickets.map(t => {
    const resourceName = getResourceName(t.assignedResourceID) || 'Unassigned';
    const statusLabel = (t.status === 5 || t.status === 'Complete') ? 'Closed' : 'Open';
    const createdDate = t.createDate ? new Date(t.createDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';
    return `
      <tr class="drilldown-row" onclick="closeSDEDrilldown(); openTicketDetail('${t.ticketId}')">
        <td class="drilldown-ticket-id">${t.ticketNumber || t.ticketId}</td>
        <td class="drilldown-ticket-title">${escHtml(t.title)}</td>
        <td><span class="badge badge-category">${t.categoryLabel}</span></td>
        ${showQueue ? `<td>${escHtml(getQueueName(t.queueID))}</td>` : ''}
        ${showStatus ? `<td><span class="badge ${statusLabel === 'Closed' ? 'badge-status-closed' : 'badge-status-open'}">${statusLabel}</span></td>` : ''}
        ${showWorkedHours ? `<td>${t.workedHours > 0 ? t.workedHours.toFixed(2) + 'h' : (t.estimatedMinutes ? '~' + t.estimatedMinutes + 'm est' : 'N/A')}</td>` : ''}
        <td>${escHtml(resourceName)}</td>
        <td>${createdDate}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="drilldown-table-wrap">
      <table class="data-table drilldown-table">
        <thead><tr>${headerCols}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function closeSDEDrilldown() {
  $('#drilldown-modal').classList.add('hidden');
}

window.openSDEDrilldown = openSDEDrilldown;
window.closeSDEDrilldown = closeSDEDrilldown;

// ── Get Resource Name by ID ──
function getResourceName(resourceId) {
  if (!resourceId || allResources.length === 0) return null;
  const r = allResources.find(res => res.id === resourceId);
  return r ? r.name : null;
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
$('#detail-close').addEventListener('click', closeDetailModal);
$('#drilldown-close').addEventListener('click', closeSDEDrilldown);
$('#filter-category').addEventListener('change', applyFilters);
$('#sort-by').addEventListener('change', applyFilters);
$('#btn-calc-sde').addEventListener('click', renderSDEMetrics);

// Close modals on backdrop click
$('#script-modal').addEventListener('click', (e) => {
  if (e.target === $('#script-modal')) closeScriptModal();
});
$('#library-modal').addEventListener('click', (e) => {
  if (e.target === $('#library-modal')) $('#library-modal').classList.add('hidden');
});
$('#detail-modal').addEventListener('click', (e) => {
  if (e.target === $('#detail-modal')) closeDetailModal();
});
$('#drilldown-modal').addEventListener('click', (e) => {
  if (e.target === $('#drilldown-modal')) closeSDEDrilldown();
});

// Setup tabs, timeframe toggle, queue & technician dropdowns
setupTabs();
setupTimeframeToggle();
setupQueueDropdown();
setupTechDropdown();

// Init on load
init();
