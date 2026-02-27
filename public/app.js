// ── State ──
let allTickets = [];
let currentAnalytics = null;
let currentScript = null;
let allResources = []; // { id, name, email }
let selectedTechnicians = []; // resource IDs
let lastQueueDiagnostics = null; // server-side queue distribution data
let aiEnabled = false; // whether AI is configured on the server
let aiAnalyzed = false; // whether current tickets have been AI-analyzed
let rawTicketsForAI = []; // raw ticket data needed for AI re-analysis
let currentBatchInsights = null; // AI batch-level insights
let currentPriorityMap = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' }; // dynamic priority map from Autotask

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

    if (data.aiConfigured) {
      aiEnabled = true;
      $('#btn-ai').classList.remove('hidden');
    }

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
  return name.includes('m/a/c') || name.includes('mac') || name.includes('non-billable');
}

function isReactiveQueue(queueID) {
  if (!queueID) return false;
  const name = getQueueName(queueID).toLowerCase();
  return name.includes('reactive');
}

async function loadQueues() {
  try {
    const res = await fetch('/api/queues');
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try { const d = await res.json(); errMsg = d.error || errMsg; } catch {}
      console.error('[Queues] Failed to load:', errMsg);
      const container = $('#queue-options');
      container.innerHTML = `<div class="dropdown-error">Failed to load queues: ${escHtml(errMsg)}</div>`;
      return;
    }
    const queues = await res.json();
    allQueues = queues;
    const container = $('#queue-options');

    for (const q of queues) {
      const label = document.createElement('label');
      label.className = 'multi-select-option';
      label.innerHTML = `<input type="checkbox" value="${q.value}" /> ${escHtml(q.label)}`;
      label.querySelector('input').addEventListener('change', updateQueueSelection);
      container.appendChild(label);
    }
  } catch (err) {
    console.error('[Queues] Failed to load:', err);
    const container = $('#queue-options');
    container.innerHTML = `<div class="dropdown-error">Failed to load queues: ${escHtml(err.message)}</div>`;
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
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try { const d = await res.json(); errMsg = d.error || errMsg; } catch {}
      console.error('[Resources] Failed to load:', errMsg);
      const container = $('#tech-options');
      container.innerHTML = `<div class="dropdown-error">Failed to load technicians: ${escHtml(errMsg)}</div>`;
      return;
    }
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
  } catch (err) {
    console.error('[Resources] Failed to load:', err);
    const container = $('#tech-options');
    container.innerHTML = `<div class="dropdown-error">Failed to load technicians: ${escHtml(err.message)}</div>`;
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
      let errMsg = `HTTP ${res.status}`;
      let errBody = '';
      try {
        const errData = await res.json();
        errMsg = errData.error || errMsg;
      } catch {
        errBody = await res.text().catch(() => '');
        if (errBody) errMsg = errBody;
      }
      // Add troubleshooting hints based on status code
      let hint = '';
      if (res.status === 401) {
        hint = '\n\nFix: Check AUTOTASK_API_USER, AUTOTASK_API_SECRET, and AUTOTASK_API_INTEGRATION_CODE in your .env file. Make sure the API user is active in Autotask.';
      } else if (res.status === 403) {
        hint = '\n\nFix: Your AUTOTASK_API_ZONE is wrong. It should be https://webservicesN.autotask.net (not https://wwN.autotask.net). Check your Autotask zone number.';
      } else if (res.status === 503) {
        hint = '\n\nFix: Autotask credentials are not configured. Create a .env file with your API credentials.';
      }
      throw new Error(errMsg + hint);
    }
    const data = await res.json();
    allTickets = data.tickets;
    currentAnalytics = data.analytics;
    lastQueueDiagnostics = data.queueDiagnostics || null;
    if (data.priorityMap) currentPriorityMap = data.priorityMap;
    aiAnalyzed = false;
    // Store raw enriched tickets for potential AI re-analysis
    rawTicketsForAI = data._rawTickets || allTickets.map(t => ({
      id: t.ticketId, ticketNumber: t.ticketNumber, title: t.title,
      description: t.description, resolution: t.resolution, status: t.status,
      priority: t.priority, queueID: t.queueID, createDate: t.createDate,
      assignedResourceID: t.assignedResourceID, workedHours: t.workedHours,
      companyID: t.companyID, companyName: t.companyName,
      issueType: t.issueType, subIssueType: t.subIssueType,
      issueTypeName: t.issueTypeName, subIssueTypeName: t.subIssueTypeName,
      firstResponseDateTime: t.firstResponseDateTime,
      resolutionPlanDateTime: t.resolutionPlanDateTime,
      resolvedDateTime: t.resolvedDateTime,
    }));

    renderSummary(data.summary);
    renderAnalytics(data.analytics, data.summary);
    applyFilters();

    statusBar.className = 'status-bar connected';
    const queueLabel = selectedQueues.length > 0 ? ` in ${selectedQueues.length} queue${selectedQueues.length > 1 ? 's' : ''}` : '';
    const timeLabel = from ? ` (${from} to ${to})` : '';
    const aiHint = aiEnabled ? ' Click "AI Analyze" for deeper insights.' : '';
    statusText.textContent = `Loaded ${allTickets.length} tickets${queueLabel}${timeLabel}. ${data.summary.quickHitterCount} quick hitters found.${aiHint}`;
  } catch (err) {
    statusBar.className = 'status-bar error';
    statusText.innerHTML = '';
    // Show error in a detailed, visible way
    const errEl = document.createElement('div');
    errEl.className = 'error-detail';
    errEl.innerHTML = `
      <strong>Failed to fetch tickets</strong><br>
      <span class="error-message">${escHtml(err.message).replace(/\n/g, '<br>')}</span>
    `;
    statusText.appendChild(errEl);
    // Also log full details to browser console
    console.error('[Fetch Error]', err);
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
    aiAnalyzed = false;
    rawTicketsForAI = DEMO_TICKETS;

    renderSummary(data.summary);
    renderAnalytics(data.analytics, data.summary);
    applyFilters();

    statusBar.className = 'status-bar demo';
    const aiHint = aiEnabled ? ' Click "AI Analyze" for deeper insights.' : '';
    statusText.textContent = `Demo: ${allTickets.length} tickets analyzed. ${data.summary.quickHitterCount} quick hitters identified.${aiHint}`;
  } catch (err) {
    statusBar.className = 'status-bar error';
    statusText.textContent = `Error: ${err.message}`;
  }
}

// ── AI Analysis ──
async function runAIAnalysis() {
  if (!aiEnabled) {
    showToast('AI not configured on server');
    return;
  }

  const ticketsToAnalyze = rawTicketsForAI.length > 0 ? rawTicketsForAI : DEMO_TICKETS;
  if (ticketsToAnalyze.length === 0) {
    showToast('Load tickets first, then run AI analysis');
    return;
  }

  const btn = $('#btn-ai');
  btn.disabled = true;
  btn.textContent = 'Analyzing...';
  statusBar.className = 'status-bar ai-active';
  statusText.innerHTML = '<span class="loading-spinner"></span> Starting AI analysis of ' + ticketsToAnalyze.length + ' tickets...';

  const aiStartTime = Date.now();

  try {
    const res = await fetch('/api/ai-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickets: ticketsToAnalyze }),
    });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errData = await res.json();
        errMsg = errData.error || errMsg;
      } catch {
        const text = await res.text().catch(() => '');
        if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
          errMsg = `Server returned HTML instead of JSON (HTTP ${res.status}). The server may have crashed — check the terminal for errors.`;
        } else if (text) {
          errMsg = text.substring(0, 500);
        }
      }
      throw new Error(errMsg);
    }

    // Read SSE stream for progress updates
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalData = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          const elapsed = ((Date.now() - aiStartTime) / 1000).toFixed(0);

          if (event.type === 'progress') {
            // Build progress bar for analyzing phase
            let progressHtml = `<span class="loading-spinner"></span> ${escHtml(event.message)}`;
            if (event.phase === 'analyzing' && event.total > 0) {
              const pct = Math.round((event.completed / event.total) * 100);
              progressHtml += `<div class="ai-progress-bar"><div class="ai-progress-fill" style="width:${pct}%"></div></div>`;
            }
            progressHtml += `<span class="ai-elapsed">${elapsed}s</span>`;
            statusText.innerHTML = progressHtml;
            // Update button text with batch count
            if (event.batch && event.totalBatches) {
              btn.textContent = `Analyzing (${event.batch}/${event.totalBatches})...`;
            } else if (event.phase === 'insights') {
              btn.textContent = 'Generating insights...';
            }
          } else if (event.type === 'done') {
            finalData = event.result;
          } else if (event.type === 'error') {
            throw new Error(event.error);
          }
        } catch (parseErr) {
          if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
          // Ignore JSON parse errors from partial lines
        }
      }
    }

    if (!finalData) throw new Error('AI analysis ended without results');

    const data = finalData;
    allTickets = data.tickets;
    currentAnalytics = data.analytics;
    currentBatchInsights = data.batchInsights || null;
    if (data.priorityMap) currentPriorityMap = data.priorityMap;
    aiAnalyzed = true;

    renderSummary(data.summary);
    renderAnalytics(data.analytics, data.summary);
    renderAIInsights(currentBatchInsights);
    applyFilters();

    // Auto-switch to AI Insights tab so user sees the combined view
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    $('#tab-btn-ai-insights').classList.add('active');
    document.getElementById('tab-ai-insights').classList.add('active');

    const stats = data.aiStats || {};
    statusBar.className = 'status-bar ai-active';
    statusText.textContent = `AI Analysis complete (${stats.elapsedSeconds || '?'}s). ${stats.enhanced || 0} tickets enhanced, ${stats.categoryChanges || 0} categories reclassified by AI.`;
    btn.textContent = 'Re-Analyze with AI';
  } catch (err) {
    statusBar.className = 'status-bar error';
    statusText.innerHTML = '';
    const errEl = document.createElement('div');
    errEl.className = 'error-detail';
    errEl.innerHTML = `
      <strong>AI Analysis Failed</strong><br>
      <span class="error-message">${escHtml(err.message).replace(/\n/g, '<br>')}</span>
    `;
    statusText.appendChild(errEl);
    console.error('[AI Error]', err);
  } finally {
    btn.disabled = false;
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

  // Issue Type bars (fall back to category if no issue types)
  const hasIssueTypes = summary.issueTypeBreakdown && Object.keys(summary.issueTypeBreakdown).length > 0;
  renderCategoryBars(hasIssueTypes ? summary.issueTypeBreakdown : summary.categoryBreakdown, hasIssueTypes);

  // Issue Type / Category detail table
  renderCategoryTable(
    hasIssueTypes && analytics.issueTypeDeepBreakdown?.length > 0
      ? analytics.issueTypeDeepBreakdown
      : analytics.categoryDeepBreakdown,
    hasIssueTypes
  );

  // Priority bars
  renderPriorityBars(analytics.priorityBreakdown);

  // Clients tab
  renderClients();

  // Trend chart
  renderTrendChart(analytics.trendData);

  // Top opportunities
  renderOpportunities(analytics.topOpportunities);

  // ROI projection
  renderROI(analytics.roiProjection);

  // SDE Metrics tab
  renderSDEMetrics();

  // Time Analysis (always render when data available)
  renderTimeAnalysis(analytics.timeAnalysis);
  renderTimeLeaks(analytics.timeAnalysis);

  // AI Insights tab (show placeholder if not yet analyzed)
  if (!aiAnalyzed) renderAIInsights(null);
}

function renderCategoryBars(breakdown, isIssueType) {
  const barsContainer = $('#category-bars');
  barsContainer.innerHTML = '';

  // Update the heading based on data type
  const heading = barsContainer.closest('.panel-card')?.querySelector('h3');
  if (heading) heading.textContent = isIssueType ? 'Top 15 Issue Types' : 'Category Breakdown';

  const maxCount = Math.max(...Object.values(breakdown));
  const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const colors = ['fill-primary', 'fill-green', 'fill-yellow', 'fill-orange', 'fill-purple', 'fill-cyan', 'fill-red'];

  sorted.forEach(([label, count], i) => {
    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
    const color = colors[i % colors.length];
    barsContainer.innerHTML += `
      <div class="cat-bar-row">
        <span class="cat-bar-label">${escHtml(label)}</span>
        <div class="cat-bar-track">
          <div class="cat-bar-fill ${color}" style="width: ${pct}%"></div>
        </div>
        <span class="cat-bar-count">${count}</span>
      </div>`;
  });
}

function renderCategoryTable(deepBreakdown, isIssueType) {
  const tbody = $('#category-detail-table tbody');
  tbody.innerHTML = '';

  // Update header label
  const th = $('#category-detail-table thead th:first-child');
  if (th) th.textContent = isIssueType ? 'Issue Type / Sub-Issue' : 'Category';

  // Also update the card heading
  const heading = $('#category-detail-table').closest('.panel-card')?.querySelector('h3');
  if (heading) heading.textContent = isIssueType ? 'Top 15 Issue Type Details' : 'Category Details';

  for (const row of deepBreakdown.slice(0, 15)) {
    const label = row.issueType || row.category;
    tbody.innerHTML += `
      <tr>
        <td>${escHtml(label)}</td>
        <td>${row.count}</td>
        <td>${row.pctOfTotal}%</td>
        <td>${row.avgAutomationScore}%</td>
        <td>${row.totalMinutesSaveable}</td>
        <td>${row.quickHitters}</td>
      </tr>`;
  }
}

function renderPriorityBars(priorityBreakdown) {
  const container = $('#priority-bars');
  container.innerHTML = '';

  const maxCount = Math.max(...Object.values(priorityBreakdown));
  const colorMap = { 'Critical': 'fill-red', 'High': 'fill-orange', 'Medium': 'fill-yellow', 'Low': 'fill-green', 'Standard': 'fill-cyan' };

  const entries = Object.entries(priorityBreakdown).sort((a, b) => {
    const order = ['Critical', 'High', 'Medium', 'Low', 'Standard'];
    const ai = order.indexOf(a[0]);
    const bi = order.indexOf(b[0]);
    // Known priorities sort first in order, unknown priorities sort to end
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
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

  container.innerHTML = `
    <p class="panel-desc" style="margin-bottom: 12px; opacity: 0.6; font-size: 0.85rem;">
      Impact Score = (Avg Automation Score &times; Ticket Count &times; Minutes Saveable) / 100. Click an opportunity to see its tickets.
    </p>` +
    topOpportunities.map((opp, i) => `
    <div class="opportunity-card opp-clickable" onclick="drillIntoOpportunity('${escHtml(opp.category)}')" title="Click to view ${opp.count} tickets in this category">
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

function drillIntoOpportunity(categoryLabel) {
  // Filter tickets to this category and display them
  const matched = allTickets.filter(t => t.categoryLabel === categoryLabel);
  if (matched.length === 0) {
    showToast(`No tickets found for "${categoryLabel}"`);
    return;
  }

  // Build a modal showing the tickets in this opportunity
  const priorityLabel = (t) => currentPriorityMap[t.priority] || '';
  const html = matched.map(t => {
    const pLabel = currentPriorityMap[t.priority] || '';
    const pClass = pLabel ? `badge-priority-${pLabel.toLowerCase()}` : '';
    const scoreClass = t.automationScore >= 80 ? 'high' : t.automationScore >= 50 ? 'medium' : 'low';
    const ai = t.aiInsights;
    return `
      <div class="ticket-card" onclick="closeOppDrill(); openTicketDetail('${t.ticketId}')" style="cursor:pointer;">
        <div class="ticket-header">
          <span class="ticket-title">${escHtml(t.title)}</span>
          <span class="ticket-id">#${t.ticketNumber || t.ticketId}</span>
        </div>
        <div class="ticket-meta">
          <span class="badge badge-category">${t.categoryLabel}</span>
          ${pLabel ? `<span class="badge ${pClass}">${pLabel}</span>` : ''}
          <span class="badge badge-readiness badge-readiness-${t.automationReadiness || 'manual'}">${t.automationReadinessLabel || 'Manual'}</span>
          ${t.isQuickHitter ? '<span class="badge badge-quick">Quick Hitter</span>' : ''}
          ${t.estimatedMinutes ? `<span class="badge badge-time">~${t.estimatedMinutes} min</span>` : ''}
          ${ai && ai.suggestedResolution ? `<div class="ticket-ai-resolution" style="margin-top:6px;">${escHtml(ai.suggestedResolution)}</div>` : ''}
          <div class="score-bar">
            Auto:
            <div class="score-track">
              <div class="score-fill ${scoreClass}" style="width: ${t.automationScore}%"></div>
            </div>
            ${t.automationScore}%
          </div>
        </div>
      </div>`;
  }).join('');

  // Show in a modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'opp-drill-overlay';
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal opp-drill-modal" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
      <div class="modal-header">
        <h2>${escHtml(categoryLabel)} — ${matched.length} Ticket${matched.length !== 1 ? 's' : ''}</h2>
        <button class="modal-close" onclick="closeOppDrill()">&times;</button>
      </div>
      <div class="modal-body" style="padding: 16px;">
        ${html}
      </div>
    </div>`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOppDrill();
  });
  document.body.appendChild(overlay);
}

function closeOppDrill() {
  const overlay = document.getElementById('opp-drill-overlay');
  if (overlay) overlay.remove();
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

// ── Render AI Batch Insights ──
function renderAIInsights(insights) {
  if (!insights) {
    // Show empty state when no AI data
    const execContainer = $('#ai-exec-summary');
    execContainer.innerHTML = `
      <div class="empty-state">
        <h3>No AI Insights Yet</h3>
        <p>Click "AI Analyze" to run Claude AI analysis on your tickets for executive summaries, systemic issue detection, strategic recommendations, and automation opportunities.</p>
      </div>`;
    $('#ai-systemic-issues').innerHTML = '';
    $('#ai-strategic-recs').innerHTML = '';
    $('#ai-workload-insights').innerHTML = '';
    $('#ai-auto-opportunities').innerHTML = '';
    return;
  }

  // Executive Summary
  const execContainer = $('#ai-exec-summary');
  if (insights.executiveSummary) {
    execContainer.innerHTML = `
      <div class="ai-exec-banner">
        <div class="ai-exec-icon">AI</div>
        <div class="ai-exec-content">
          <h3>Executive Summary</h3>
          <p>${escHtml(insights.executiveSummary)}</p>
        </div>
      </div>`;
  } else {
    execContainer.innerHTML = '';
  }

  // Systemic Issues
  const issuesContainer = $('#ai-systemic-issues');
  if (insights.systemicIssues && insights.systemicIssues.length > 0) {
    issuesContainer.innerHTML = `
      <h3>Systemic Issues Detected</h3>
      <p class="panel-desc">Cross-ticket patterns that suggest underlying infrastructure or process problems</p>
      <div class="ai-issues-list">
        ${insights.systemicIssues.map(issue => `
          <div class="ai-issue-card ai-severity-${issue.severity || 'medium'}">
            <div class="ai-issue-header">
              <span class="ai-issue-severity badge-severity-${issue.severity || 'medium'}">${(issue.severity || 'medium').toUpperCase()}</span>
              <span class="ai-issue-title">${escHtml(issue.issue)}</span>
            </div>
            <p class="ai-issue-desc">${escHtml(issue.description)}</p>
            ${issue.recommendation ? `<p class="ai-issue-rec"><strong>Action:</strong> ${escHtml(issue.recommendation)}</p>` : ''}
            ${issue.affectedTickets && issue.affectedTickets.length > 0 ? `
              <p class="ai-issue-tickets">Affected: ${issue.affectedTickets.map(id => `<code>${escHtml(String(id))}</code>`).join(' ')}</p>
            ` : ''}
          </div>
        `).join('')}
      </div>`;
  } else {
    issuesContainer.innerHTML = `
      <h3>Systemic Issues</h3>
      <p class="panel-desc">No systemic issues detected in this batch. This is a positive signal for infrastructure health.</p>`;
  }

  // Strategic Recommendations
  const recsContainer = $('#ai-strategic-recs');
  if (insights.strategicRecommendations && insights.strategicRecommendations.length > 0) {
    recsContainer.innerHTML = `
      <h3>Strategic Recommendations</h3>
      <p class="panel-desc">AI-generated action items to improve operations</p>
      <div class="ai-recs-grid">
        ${insights.strategicRecommendations.map(rec => `
          <div class="ai-rec-card">
            <div class="ai-rec-header">
              <span class="ai-rec-title">${escHtml(rec.title)}</span>
              <div class="ai-rec-tags">
                <span class="ai-rec-tag ai-rec-impact-${rec.impact || 'medium'}">${(rec.impact || 'medium')} impact</span>
                <span class="ai-rec-tag ai-rec-effort-${rec.effort || 'medium'}">${(rec.effort || 'medium')} effort</span>
                ${rec.category ? `<span class="ai-rec-tag ai-rec-cat">${rec.category}</span>` : ''}
              </div>
            </div>
            <p class="ai-rec-desc">${escHtml(rec.description)}</p>
          </div>
        `).join('')}
      </div>`;
  } else {
    recsContainer.innerHTML = '';
  }

  // Workload Insights with Peak Hours chart
  const workloadContainer = $('#ai-workload-insights');
  const wl = insights.workloadInsights;
  if (wl && (wl.volumeAssessment || wl.capacityRisk)) {
    const capacityColorMap = { healthy: 'green', at_risk: 'yellow', overloaded: 'red' };
    const capacityColor = capacityColorMap[wl.capacityRisk] || 'text-dim';

    // Build peak hours bar chart from AI data
    let peakHoursHtml = '';
    if (wl.peakHours && wl.peakHours.length > 0) {
      const maxCount = Math.max(...wl.peakHours.map(h => h.count));
      const topThreshold = maxCount * 0.8;
      const highThreshold = maxCount * 0.5;
      peakHoursHtml = `
        <div class="ai-workload-card" style="grid-column: 1 / -1;">
          <div class="ai-workload-label">Peak Hours</div>
          <div class="peak-hours-chart">
            ${wl.peakHours.map(h => {
              const pct = maxCount > 0 ? (h.count / maxCount * 100) : 0;
              const cls = h.count >= topThreshold ? 'peak-top' : h.count >= highThreshold ? 'peak-high' : '';
              return `<div class="peak-hour-bar ${cls}" style="height: ${Math.max(pct, 4)}%;" title="${h.hour}: ${h.count} tickets (${h.percentage}%)"></div>`;
            }).join('')}
          </div>
          <div class="peak-hours-labels">
            ${wl.peakHours.map(h => `<span>${h.hour.replace(' AM','a').replace(' PM','p')}</span>`).join('')}
          </div>
        </div>`;
    }

    workloadContainer.innerHTML = `
      <h3>Workload Analysis</h3>
      <div class="ai-workload-grid">
        ${wl.capacityRisk ? `
          <div class="ai-workload-card ai-capacity-${wl.capacityRisk}">
            <div class="ai-workload-label">Team Capacity</div>
            <div class="ai-workload-value" style="color: var(--${capacityColor})">${(wl.capacityRisk || 'unknown').replace('_', ' ').toUpperCase()}</div>
            ${wl.capacityNote ? `<div class="ai-workload-note">${escHtml(wl.capacityNote)}</div>` : ''}
          </div>
        ` : ''}
        ${wl.volumeAssessment ? `
          <div class="ai-workload-card">
            <div class="ai-workload-label">Volume Assessment</div>
            <div class="ai-workload-note">${escHtml(wl.volumeAssessment)}</div>
          </div>
        ` : ''}
        ${wl.peakPatterns ? `
          <div class="ai-workload-card">
            <div class="ai-workload-label">Peak Patterns</div>
            <div class="ai-workload-note">${escHtml(wl.peakPatterns)}</div>
          </div>
        ` : ''}
        ${peakHoursHtml}
      </div>`;
  } else {
    workloadContainer.innerHTML = '';
  }

  // Client Insights
  const clientContainer = $('#ai-client-insights');
  const ci = insights.clientInsights;
  if (ci && (ci.topClients?.length > 0 || ci.clientSummary)) {
    clientContainer.innerHTML = `
      <h3>Top Clients</h3>
      ${ci.clientSummary ? `<div class="client-summary">${escHtml(ci.clientSummary)}</div>` : ''}
      <div class="client-insights-grid">
        ${(ci.topClients || []).map(c => `
          <div class="client-row">
            <span class="client-name" title="${escHtml(c.name)}">${escHtml(c.name)}</span>
            <span class="client-count">${c.ticketCount}</span>
            <div class="client-issues">
              ${(c.topIssues || []).map(issue => `<span class="client-issue-badge">${escHtml(issue)}</span>`).join('')}
            </div>
            ${c.note ? `<div class="client-note">${escHtml(c.note)}</div>` : ''}
          </div>
        `).join('')}
      </div>`;
  } else {
    clientContainer.innerHTML = '';
  }

  // Service Delivery Insights
  const sdContainer = $('#ai-service-delivery');
  const sd = insights.serviceDeliveryInsights;
  if (sd && (sd.overallAssessment || sd.improvements?.length > 0)) {
    const impactColors = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--green)' };
    sdContainer.innerHTML = `
      <h3>Service Delivery Insights</h3>
      ${sd.overallAssessment ? `<div class="service-delivery-assessment">${escHtml(sd.overallAssessment)}</div>` : ''}
      ${sd.improvements?.length > 0 ? `
        <h4 style="font-size: 0.85rem; margin-bottom: 0.5rem; color: var(--text-dim);">Improvement Areas</h4>
        <div class="service-delivery-grid">
          ${sd.improvements.map(imp => `
            <div class="service-improvement-card">
              <div class="service-improvement-header">
                <span class="service-improvement-area">${escHtml(imp.area)}</span>
                <span class="badge badge-severity-${imp.impact}" style="color: ${impactColors[imp.impact] || 'var(--text-dim)'}; font-size: 0.7rem;">${(imp.impact || '').toUpperCase()}</span>
              </div>
              <div class="service-improvement-finding">${escHtml(imp.finding)}</div>
              <div class="service-improvement-rec">${escHtml(imp.recommendation)}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${sd.strengths?.length > 0 ? `
        <h4 style="font-size: 0.85rem; margin: 0.75rem 0 0.5rem; color: var(--text-dim);">Strengths</h4>
        <div class="service-strengths">
          ${sd.strengths.map(s => `<span class="service-strength">${escHtml(s)}</span>`).join('')}
        </div>
      ` : ''}
    `;
  } else {
    sdContainer.innerHTML = '';
  }

  // Automation Opportunities
  const autoContainer = $('#ai-auto-opportunities');
  if (insights.automationOpportunities && insights.automationOpportunities.length > 0) {
    autoContainer.innerHTML = `
      <h3>Automation Opportunities</h3>
      <p class="panel-desc">High-impact automation targets identified by AI analysis</p>
      <div class="ai-auto-list">
        ${insights.automationOpportunities.map(opp => `
          <div class="ai-auto-card">
            <div class="ai-auto-header">
              <span class="ai-auto-title">${escHtml(opp.opportunity)}</span>
              ${opp.estimatedTimeSaved ? `<span class="ai-auto-time">${opp.estimatedTimeSaved} min/mo saved</span>` : ''}
            </div>
            <p class="ai-auto-desc">${escHtml(opp.description)}</p>
            ${opp.ticketTypes && opp.ticketTypes.length > 0 ? `
              <div class="ai-auto-types">Affects: ${opp.ticketTypes.map(t => `<span class="badge badge-category">${escHtml(t)}</span>`).join(' ')}</div>
            ` : ''}
          </div>
        `).join('')}
      </div>`;
  } else {
    autoContainer.innerHTML = '';
  }
}

// ── Time Analysis ──
function renderTimeAnalysis(timeAnalysis) {
  const summaryEl = $('#time-analysis-summary');
  const catEl = $('#time-analysis-categories');

  if (!timeAnalysis || !timeAnalysis.summary) {
    summaryEl.innerHTML = `
      <div class="empty-state">
        <h3>No Time Data Available</h3>
        <p>Time analysis requires tickets with logged hours. Fetch tickets with time entries to see actual vs expected comparisons.</p>
      </div>`;
    catEl.innerHTML = '';
    return;
  }

  const s = timeAnalysis.summary;
  const effClass = s.overallEfficiencyPct >= 80 ? 'time-good' : s.overallEfficiencyPct >= 50 ? 'time-warn' : 'time-bad';

  summaryEl.innerHTML = `
    <h3>Time Efficiency Overview</h3>
    <p class="panel-desc">Comparing actual hours worked against baseline expected time across ${s.ticketsWithTime} tickets with logged time</p>
    <div class="time-summary-grid">
      <div class="time-summary-card">
        <div class="time-summary-number">${s.totalActualHours}h</div>
        <div class="time-summary-label">Actual Time Worked</div>
      </div>
      <div class="time-summary-card">
        <div class="time-summary-number">${s.totalExpectedHours}h</div>
        <div class="time-summary-label">Expected Baseline</div>
      </div>
      <div class="time-summary-card ${s.totalOverageHours > 0 ? 'time-overage' : 'time-under'}">
        <div class="time-summary-number">${s.totalOverageHours > 0 ? '+' : ''}${s.totalOverageHours}h</div>
        <div class="time-summary-label">${s.totalOverageHours > 0 ? 'Over Baseline' : 'Under Baseline'}</div>
      </div>
      <div class="time-summary-card ${effClass}">
        <div class="time-summary-number">${s.overallEfficiencyPct != null ? s.overallEfficiencyPct + '%' : 'N/A'}</div>
        <div class="time-summary-label">Efficiency Rating</div>
      </div>
    </div>`;

  // Category breakdown table with visual bars
  const cats = timeAnalysis.byCategory.filter(c => c.ticketsWithTime > 0);
  if (cats.length === 0) {
    catEl.innerHTML = '';
    return;
  }

  const maxActual = Math.max(...cats.map(c => c.avgActualMin));

  catEl.innerHTML = `
    <h3>Time by Category</h3>
    <p class="panel-desc">Average actual vs expected time per ticket, by category</p>
    <div class="time-cat-list">
      ${cats.map(c => {
        const actualPct = maxActual > 0 ? (c.avgActualMin / maxActual) * 100 : 0;
        const expectedPct = maxActual > 0 ? (c.avgExpectedMin / maxActual) * 100 : 0;
        const delta = c.avgActualMin - c.avgExpectedMin;
        const deltaClass = delta > 0 ? 'time-over' : 'time-under';
        const effLabel = c.efficiencyPct != null ? c.efficiencyPct + '%' : '—';
        const effClass = c.efficiencyPct >= 80 ? 'time-good' : c.efficiencyPct >= 50 ? 'time-warn' : 'time-bad';
        return `
          <div class="time-cat-row">
            <div class="time-cat-header">
              <span class="time-cat-name">${escHtml(c.category)}</span>
              <span class="time-cat-count">${c.ticketsWithTime} tickets</span>
              <span class="time-cat-eff ${effClass}">${effLabel} eff</span>
            </div>
            <div class="time-cat-bars">
              <div class="time-bar-row">
                <span class="time-bar-label">Actual</span>
                <div class="time-bar-track">
                  <div class="time-bar-fill time-bar-actual" style="width: ${actualPct}%"></div>
                </div>
                <span class="time-bar-value">${c.avgActualMin}m</span>
              </div>
              <div class="time-bar-row">
                <span class="time-bar-label">Expected</span>
                <div class="time-bar-track">
                  <div class="time-bar-fill time-bar-expected" style="width: ${expectedPct}%"></div>
                </div>
                <span class="time-bar-value">${c.avgExpectedMin}m</span>
              </div>
            </div>
            <div class="time-cat-delta ${deltaClass}">${delta > 0 ? '+' : ''}${delta}m avg delta</div>
          </div>`;
      }).join('')}
    </div>`;
}

function renderTimeLeaks(timeAnalysis) {
  const summaryEl = $('#time-leaks-summary');
  const listEl = $('#time-leaks-list');

  if (!timeAnalysis || !timeAnalysis.timeLeaks || timeAnalysis.timeLeaks.length === 0) {
    summaryEl.innerHTML = `
      <div class="empty-state">
        <h3>No Time Leaks Detected</h3>
        <p>No tickets found where actual time significantly exceeded the expected baseline. This is a good sign for operational efficiency.</p>
      </div>`;
    listEl.innerHTML = '';
    return;
  }

  const leaks = timeAnalysis.timeLeaks;
  const totalLost = timeAnalysis.totalTimeLostMinutes;
  const totalLostHrs = Math.round(totalLost / 60 * 10) / 10;

  summaryEl.innerHTML = `
    <h3>Time Leak Summary</h3>
    <p class="panel-desc">Tickets where actual time exceeded expected baseline by more than 50%. These represent opportunities to improve processes or identify recurring blockers.</p>
    <div class="time-leak-stats">
      <div class="time-leak-stat">
        <div class="time-leak-stat-number">${leaks.length}</div>
        <div class="time-leak-stat-label">Tickets Over Baseline</div>
      </div>
      <div class="time-leak-stat time-leak-stat-alert">
        <div class="time-leak-stat-number">${totalLostHrs}h</div>
        <div class="time-leak-stat-label">Total Time Lost</div>
      </div>
    </div>`;

  listEl.innerHTML = `
    <h3>Time Leak Details</h3>
    <table class="data-table time-leak-table">
      <thead>
        <tr>
          <th>Ticket</th>
          <th>Category</th>
          <th>Expected</th>
          <th>Actual</th>
          <th>Overage</th>
          <th>% Over</th>
          <th>Tech</th>
        </tr>
      </thead>
      <tbody>
        ${leaks.map(l => {
          const overClass = l.overagePct >= 200 ? 'time-leak-critical' : l.overagePct >= 100 ? 'time-leak-high' : 'time-leak-moderate';
          const techName = getResourceName(l.assignedResourceID) || '—';
          // Extract completion notes snippet for "why it took longer"
          const resText = (l.resolution || '').trim();
          const resSnippet = resText.length > 200 ? resText.substring(0, 200) + '...' : resText;
          return `
            <tr class="${overClass}" onclick="openTicketDetail('${l.ticketId}')" style="cursor:pointer">
              <td><strong>#${l.ticketNumber || l.ticketId}</strong><br><span class="time-leak-title">${escHtml(l.title)}</span></td>
              <td><span class="badge badge-category">${escHtml(l.category)}</span></td>
              <td>${l.expectedMinutes}m</td>
              <td>${l.actualMinutes}m</td>
              <td class="time-leak-overage">+${l.overageMinutes}m</td>
              <td><span class="badge ${overClass}">+${l.overagePct}%</span></td>
              <td>${escHtml(techName)}</td>
            </tr>
            <tr class="time-leak-notes-row ${overClass}" onclick="openTicketDetail('${l.ticketId}')" style="cursor:pointer">
              <td colspan="7">
                <div class="time-leak-notes">
                  <span class="time-leak-notes-label">Completion Notes:</span>
                  ${resSnippet ? `<span class="time-leak-notes-text">${escHtml(resSnippet)}</span>` : '<span class="time-leak-notes-empty">No completion notes recorded</span>'}
                </div>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
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

    const priorityLabel = currentPriorityMap[t.priority] || '';
    const priorityClass = priorityLabel ? `badge-priority-${priorityLabel.toLowerCase()}` : '';

    const readinessClass = t.automationReadiness || 'manual';
    const resourceName = getResourceName(t.assignedResourceID);
    const ai = t.aiInsights;
    const catClass = 'cat-' + (t.category || 'general_support').toLowerCase().replace(/[\s\/]+/g, '_');

    return `
      <div class="ticket-card ${catClass} ${t.isQuickHitter ? 'quick-hitter' : ''}" onclick="openTicketDetail('${t.ticketId}')">
        <div class="ticket-header">
          <span class="ticket-title">${escHtml(t.title)}</span>
          <span class="ticket-id">#${t.ticketNumber || t.ticketId}</span>
        </div>
        <div class="ticket-meta">
          <span class="badge badge-category">${t.categoryLabel}</span>
          ${ai ? '<span class="badge badge-ai">AI</span>' : ''}
          ${ai && ai.sentiment ? `<span class="badge badge-sentiment badge-sentiment-${ai.sentiment.level}" title="Urgency: ${ai.sentiment.urgency}/5">${ai.sentiment.level}</span>` : ''}
          ${ai && ai.sentiment && ai.sentiment.businessImpact ? `<span class="badge badge-impact badge-impact-${ai.sentiment.businessImpact}">${ai.sentiment.businessImpact}</span>` : ''}
          ${ai && ai.sentiment && ai.sentiment.needsFollowUp ? '<span class="badge badge-followup">Needs Follow-Up</span>' : ''}
          ${ai && ai.categoryChanged ? `<span class="badge badge-ai-reclassified" title="AI reclassified from ${escHtml(ai.originalCategory)}">Reclassified</span>` : ''}
          ${ai && ai.escalation ? '<span class="badge badge-escalate">Escalate</span>' : ''}
          <span class="badge badge-readiness badge-readiness-${readinessClass}">${t.automationReadinessLabel || 'Manual'}</span>
          ${ai && ai.quickHitter && ai.quickHitter.isQuickWin ? `<span class="badge badge-quick">Quick Win ~${ai.quickHitter.estimatedMinutes || '?'}m</span>` : (t.isQuickHitter ? '<span class="badge badge-quick">Quick Hitter</span>' : '')}
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
        ${ai && ai.suggestedResolution ? `<div class="ticket-ai-resolution">${escHtml(ai.suggestedResolution)}</div>` : ''}
        ${scripts ? `<div class="ticket-scripts">${scripts}</div>` : ''}
      </div>`;
  }).join('');
}

// ── Render Tickets inside AI Insights tab ──
function renderAITickets(tickets) {
  const container = $('#ai-tickets');
  const countLabel = $('#ai-ticket-count-label');
  const wrapper = $('#ai-ticket-list');

  if (!tickets.length) {
    wrapper.style.display = 'none';
    return;
  }

  wrapper.style.display = '';
  const visibleCount = allTickets.filter(t => t.category !== 'uncategorized' && t.categoryLabel !== 'Needs Review').length;
  countLabel.textContent = `Showing ${tickets.length} of ${visibleCount}`;

  container.innerHTML = tickets.map(t => {
    const scoreClass = t.automationScore >= 80 ? 'high' : t.automationScore >= 50 ? 'medium' : 'low';
    const scripts = (t.suggestedScripts || []).map(s =>
      `<button class="script-btn" onclick="event.stopPropagation(); viewScript('${s.type}', '${s.name}')">${s.label}</button>`
    ).join('');

    const priorityLabel = currentPriorityMap[t.priority] || '';
    const priorityClass = priorityLabel ? `badge-priority-${priorityLabel.toLowerCase()}` : '';

    const readinessClass = t.automationReadiness || 'manual';
    const resourceName = getResourceName(t.assignedResourceID);
    const ai = t.aiInsights;
    const catClass = 'cat-' + (t.category || 'general_support').toLowerCase().replace(/[\s\/]+/g, '_');

    return `
      <div class="ticket-card ${catClass} ${t.isQuickHitter ? 'quick-hitter' : ''}" onclick="openTicketDetail('${t.ticketId}')">
        <div class="ticket-header">
          <span class="ticket-title">${escHtml(t.title)}</span>
          <span class="ticket-id">#${t.ticketNumber || t.ticketId}</span>
        </div>
        <div class="ticket-meta">
          <span class="badge badge-category">${t.categoryLabel}</span>
          ${ai ? '<span class="badge badge-ai">AI</span>' : ''}
          ${ai && ai.sentiment ? `<span class="badge badge-sentiment badge-sentiment-${ai.sentiment.level}" title="Urgency: ${ai.sentiment.urgency}/5">${ai.sentiment.level}</span>` : ''}
          ${ai && ai.sentiment && ai.sentiment.businessImpact ? `<span class="badge badge-impact badge-impact-${ai.sentiment.businessImpact}">${ai.sentiment.businessImpact}</span>` : ''}
          ${ai && ai.sentiment && ai.sentiment.needsFollowUp ? '<span class="badge badge-followup">Needs Follow-Up</span>' : ''}
          ${ai && ai.categoryChanged ? `<span class="badge badge-ai-reclassified" title="AI reclassified from ${escHtml(ai.originalCategory)}">Reclassified</span>` : ''}
          ${ai && ai.escalation ? '<span class="badge badge-escalate">Escalate</span>' : ''}
          <span class="badge badge-readiness badge-readiness-${readinessClass}">${t.automationReadinessLabel || 'Manual'}</span>
          ${ai && ai.quickHitter && ai.quickHitter.isQuickWin ? `<span class="badge badge-quick">Quick Win ~${ai.quickHitter.estimatedMinutes || '?'}m</span>` : (t.isQuickHitter ? '<span class="badge badge-quick">Quick Hitter</span>' : '')}
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
        ${ai && ai.suggestedResolution ? `<div class="ticket-ai-resolution">${escHtml(ai.suggestedResolution)}</div>` : ''}
        ${scripts ? `<div class="ticket-scripts">${scripts}</div>` : ''}
      </div>`;
  }).join('');
}

function showEmptyState() {
  const aiContainer = $('#ai-tickets');
  const wrapper = $('#ai-ticket-list');
  if (wrapper) wrapper.style.display = '';
  if (aiContainer) {
    aiContainer.innerHTML = `
      <div class="empty-state">
        <h3>No tickets loaded</h3>
        <p>Click "Fetch Tickets" to pull live data, or "Load Demo Tickets" to see sample data.</p>
      </div>`;
  }
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
  // Always exclude "Needs Review" / uncategorized tickets
  let filtered = allTickets.filter(t => t.category !== 'uncategorized' && t.categoryLabel !== 'Needs Review');

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

  // Always render tickets inside the AI Insights tab (standalone section is hidden)
  $('#ticket-list').style.display = 'none';
  renderAITickets(filtered);
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

  // Sub-tab switching inside AI & Tickets
  const subTabBtns = document.querySelectorAll('.sub-tab-btn');
  subTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subTabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.sub-tab-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const subId = btn.getAttribute('data-subtab');
      document.getElementById(subId).classList.add('active');
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

  const priorityLabel = currentPriorityMap[t.priority] || 'Unknown';
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

      ${t.aiInsights ? `
        <div class="detail-section detail-ai-section">
          <h4>AI Analysis <span class="badge badge-ai">Claude</span> <span class="ai-confidence-label">${t.aiInsights.confidence}% confidence</span></h4>
          ${t.aiInsights.categoryChanged ? `<p class="ai-reclassified-note">AI reclassified this ticket from <strong>${escHtml(t.aiInsights.originalCategory)}</strong> to <strong>${escHtml(t.aiInsights.categoryLabel)}</strong></p>` : ''}
          ${t.aiInsights.suggestedResolution ? `
            <div class="ai-field">
              <div class="ai-field-label">Suggested Resolution</div>
              <p>${escHtml(t.aiInsights.suggestedResolution)}</p>
            </div>
          ` : ''}
          ${t.aiInsights.rootCause ? `
            <div class="ai-field">
              <div class="ai-field-label">Likely Root Cause</div>
              <p>${escHtml(t.aiInsights.rootCause)}</p>
            </div>
          ` : ''}
          ${t.aiInsights.escalation ? `
            <div class="ai-escalation-warning">
              <strong>Escalation Recommended</strong> — AI suggests this ticket needs L2/L3 attention.
            </div>
          ` : ''}
          ${t.aiInsights.recommendedScripts && t.aiInsights.recommendedScripts.length ? `
            <div class="ai-field">
              <div class="ai-field-label">AI-Recommended Scripts</div>
              <p>${t.aiInsights.recommendedScripts.map(s => `<code>${escHtml(s)}</code>`).join(' ')}</p>
              ${t.aiInsights.scriptReasoning ? `<p class="ai-script-reasoning">${escHtml(t.aiInsights.scriptReasoning)}</p>` : ''}
            </div>
          ` : `
            ${t.aiInsights.scriptReasoning ? `
              <div class="ai-field">
                <div class="ai-field-label">Script Assessment</div>
                <p class="ai-script-reasoning">${escHtml(t.aiInsights.scriptReasoning)}</p>
              </div>
            ` : ''}
          `}
          ${t.aiInsights.quickHitter ? `
            <div class="ai-field ai-quickhitter-field">
              <div class="ai-field-label">Quick Win Assessment</div>
              <div class="ai-quickhitter-detail">
                <span class="badge ${t.aiInsights.quickHitter.isQuickWin ? 'badge-quick-win' : 'badge-not-quick'}">${t.aiInsights.quickHitter.isQuickWin ? 'Quick Win (' + (t.aiInsights.quickHitter.estimatedMinutes || '?') + ' min)' : 'Not a Quick Win'}</span>
              </div>
              <p class="ai-quickhitter-justification">${escHtml(t.aiInsights.quickHitter.justification || '')}</p>
              ${t.aiInsights.quickHitter.blockers && t.aiInsights.quickHitter.blockers.length ? `
                <p class="ai-quickhitter-blockers">Potential blockers: ${t.aiInsights.quickHitter.blockers.map(b => `<span class="badge badge-blocker">${escHtml(b)}</span>`).join(' ')}</p>
              ` : ''}
            </div>
          ` : ''}
          ${t.aiInsights.sentiment ? `
            <div class="ai-field ai-sentiment-field">
              <div class="ai-field-label">Client Sentiment</div>
              <div class="ai-sentiment-detail">
                <span class="badge badge-sentiment badge-sentiment-${t.aiInsights.sentiment.level}">${t.aiInsights.sentiment.level}</span>
                ${t.aiInsights.sentiment.businessImpact ? `<span class="badge badge-impact badge-impact-${t.aiInsights.sentiment.businessImpact}">${t.aiInsights.sentiment.businessImpact}</span>` : ''}
                <span class="ai-urgency-bar">
                  Urgency:
                  ${[1,2,3,4,5].map(n => `<span class="ai-urgency-dot ${n <= t.aiInsights.sentiment.urgency ? 'ai-urgency-active' : ''}"></span>`).join('')}
                  <span class="ai-urgency-num">${t.aiInsights.sentiment.urgency}/5</span>
                </span>
              </div>
              ${t.aiInsights.sentiment.needsFollowUp ? `
                <p class="ai-followup-alert">Needs proactive follow-up — client may be frustrated or waiting</p>
              ` : ''}
              ${t.aiInsights.sentiment.cues && t.aiInsights.sentiment.cues.length ? `
                <p class="ai-sentiment-cues">Cues: ${t.aiInsights.sentiment.cues.map(c => `<em>"${escHtml(c)}"</em>`).join(', ')}</p>
              ` : ''}
            </div>
          ` : ''}
          ${t.aiInsights.reasoning ? `
            <div class="ai-field ai-reasoning">
              <div class="ai-field-label">Reasoning</div>
              <p>${escHtml(t.aiInsights.reasoning)}</p>
            </div>
          ` : ''}
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

// (Quick Wins tab removed)

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

function renderReconciliation(allReactiveTickets, allMACTickets, reactiveReceivedList, macReceivedList) {
  const panel = document.getElementById('sde-reconciliation');
  if (!panel) return;

  const totalTickets = allTickets.length;
  const reactiveTotal = allReactiveTickets.length;
  const macTotal = allMACTickets.length;
  const unclassified = totalTickets - reactiveTotal - macTotal;
  const reactiveWithHours = reactiveReceivedList.length;
  const macWithHours = macReceivedList.length;
  const reactiveZeroHours = reactiveTotal - reactiveWithHours;
  const macZeroHours = macTotal - macWithHours;

  // Build server-side queue diagnostics if available
  let serverInfo = '';
  if (lastQueueDiagnostics) {
    const entries = Object.entries(lastQueueDiagnostics);
    serverInfo = entries.map(([qid, data]) => {
      const qName = getQueueName(qid);
      return `<tr><td>${qName} (${qid})</td><td>${data.total}</td><td>${data.withHours}</td><td>${data.total - data.withHours}</td></tr>`;
    }).join('');
  }

  panel.style.display = '';
  panel.innerHTML = `
    <details>
      <summary style="cursor:pointer; font-size: 0.85em; color: var(--text-secondary); margin-top: 8px;">
        Reconciliation: ${totalTickets} total | ${reactiveWithHours} reactive (${reactiveZeroHours} w/o hours) | ${macWithHours} MAC (${macZeroHours} w/o hours)${unclassified > 0 ? ' | ' + unclassified + ' unclassified' : ''}
      </summary>
      <div style="font-size: 0.8em; padding: 8px; background: var(--bg-secondary); border-radius: 6px; margin-top: 4px;">
        <table style="width:100%; border-collapse: collapse; font-size: 0.9em;">
          <thead>
            <tr style="text-align:left; border-bottom: 1px solid var(--border);">
              <th style="padding: 2px 6px;">Queue</th>
              <th style="padding: 2px 6px;">Total</th>
              <th style="padding: 2px 6px;">Hours &gt; 0</th>
              <th style="padding: 2px 6px;">Zero Hours</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding: 2px 6px;">Reactive (client)</td><td style="padding: 2px 6px;">${reactiveTotal}</td><td style="padding: 2px 6px;">${reactiveWithHours}</td><td style="padding: 2px 6px;">${reactiveZeroHours}</td></tr>
            <tr><td style="padding: 2px 6px;">MAC (client)</td><td style="padding: 2px 6px;">${macTotal}</td><td style="padding: 2px 6px;">${macWithHours}</td><td style="padding: 2px 6px;">${macZeroHours}</td></tr>
            ${unclassified > 0 ? '<tr><td style="padding: 2px 6px; color: #e74c3c;">Unclassified</td><td style="padding: 2px 6px;">' + unclassified + '</td><td style="padding: 2px 6px;">-</td><td style="padding: 2px 6px;">-</td></tr>' : ''}
            <tr style="font-weight:bold; border-top: 1px solid var(--border);"><td style="padding: 2px 6px;">Total</td><td style="padding: 2px 6px;">${totalTickets}</td><td style="padding: 2px 6px;">${reactiveWithHours + macWithHours}</td><td style="padding: 2px 6px;">${reactiveZeroHours + macZeroHours}</td></tr>
          </tbody>
        </table>
        ${serverInfo ? '<p style="margin: 6px 0 2px; font-weight: 600;">Server-side queue distribution:</p><table style="width:100%; border-collapse: collapse; font-size: 0.9em;"><thead><tr style="text-align:left; border-bottom: 1px solid var(--border);"><th style="padding: 2px 6px;">Queue</th><th style="padding: 2px 6px;">Total</th><th style="padding: 2px 6px;">Hours > 0</th><th style="padding: 2px 6px;">Zero Hours</th></tr></thead><tbody>' + serverInfo + '</tbody></table>' : ''}
        <p style="margin: 4px 0 0; color: var(--text-secondary); font-style: italic;">
          "Received" counts use Hours &gt; 0 filter to match Autotask widget.
        </p>
      </div>
    </details>
  `;
}

// ── Client Tab ──

function renderClients() {
  const tbody = $('#client-summary-table tbody');
  tbody.innerHTML = '';

  // Aggregate per-client stats from allTickets
  const clientMap = {};
  for (const t of allTickets) {
    const name = t.companyName || 'Unknown';
    if (!clientMap[name]) {
      clientMap[name] = {
        name,
        tickets: [],
        totalAutoScore: 0,
        quickHitters: 0,
        totalMinutes: 0,
        issueTypes: {},
      };
    }
    const c = clientMap[name];
    c.tickets.push(t);
    c.totalAutoScore += t.automationScore || 0;
    if (t.isQuickHitter) c.quickHitters++;
    c.totalMinutes += t.estimatedMinutes || 0;

    const itLabel = t.issueTypeName
      ? (t.subIssueTypeName ? `${t.issueTypeName} / ${t.subIssueTypeName}` : t.issueTypeName)
      : (t.categoryLabel || 'Uncategorized');
    c.issueTypes[itLabel] = (c.issueTypes[itLabel] || 0) + 1;
  }

  const clients = Object.values(clientMap).sort((a, b) => b.tickets.length - a.tickets.length);

  // Search filter
  const searchInput = $('#client-search');
  searchInput.oninput = () => {
    const q = searchInput.value.toLowerCase();
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
      const name = row.dataset.clientName || '';
      row.style.display = name.toLowerCase().includes(q) ? '' : 'none';
    });
  };

  for (const c of clients) {
    const avgScore = c.tickets.length ? Math.round(c.totalAutoScore / c.tickets.length) : 0;
    const topIssue = Object.entries(c.issueTypes).sort((a, b) => b[1] - a[1])[0];
    const topIssueLabel = topIssue ? `${topIssue[0]} (${topIssue[1]})` : '—';

    const tr = document.createElement('tr');
    tr.dataset.clientName = c.name;
    tr.style.cursor = 'pointer';
    tr.innerHTML = `
      <td>${escHtml(c.name)}</td>
      <td>${c.tickets.length}</td>
      <td>${avgScore}%</td>
      <td>${escHtml(topIssueLabel)}</td>
      <td>${c.quickHitters}</td>
      <td>${c.totalMinutes}</td>`;
    tr.addEventListener('click', () => showClientDetail(c));
    tbody.appendChild(tr);
  }
}

function showClientDetail(client) {
  const panel = $('#client-detail-panel');
  panel.style.display = 'block';
  $('#client-detail-name').textContent = client.name;

  // Stats summary
  const avgScore = client.tickets.length ? Math.round(client.totalAutoScore / client.tickets.length) : 0;
  const statsEl = $('#client-detail-stats');
  statsEl.innerHTML = `
    <div class="stat-row">
      <span class="stat-item"><strong>${client.tickets.length}</strong> Tickets</span>
      <span class="stat-item"><strong>${avgScore}%</strong> Avg Auto Score</span>
      <span class="stat-item"><strong>${client.quickHitters}</strong> Quick Hitters</span>
      <span class="stat-item"><strong>${client.totalMinutes}</strong> Min Saveable</span>
    </div>`;

  // Issue type breakdown bars
  const issuesEl = $('#client-detail-issues');
  issuesEl.innerHTML = '';
  const sortedIssues = Object.entries(client.issueTypes).sort((a, b) => b[1] - a[1]);
  const maxIssue = sortedIssues.length ? sortedIssues[0][1] : 1;
  const colors = ['fill-primary', 'fill-green', 'fill-yellow', 'fill-orange', 'fill-purple', 'fill-cyan', 'fill-red'];
  sortedIssues.forEach(([label, count], i) => {
    const pct = maxIssue > 0 ? (count / maxIssue) * 100 : 0;
    const color = colors[i % colors.length];
    issuesEl.innerHTML += `
      <div class="cat-bar-row">
        <span class="cat-bar-label">${escHtml(label)}</span>
        <div class="cat-bar-track">
          <div class="cat-bar-fill ${color}" style="width: ${pct}%"></div>
        </div>
        <span class="cat-bar-count">${count}</span>
      </div>`;
  });

  // Recent tickets table (up to 25)
  const ticketTbody = $('#client-detail-tickets tbody');
  ticketTbody.innerHTML = '';
  const recent = client.tickets.slice(0, 25);
  for (const t of recent) {
    const itLabel = t.issueTypeName
      ? (t.subIssueTypeName ? `${t.issueTypeName} / ${t.subIssueTypeName}` : t.issueTypeName)
      : (t.categoryLabel || '—');
    const pLabel = currentPriorityMap[t.priority] || `P${t.priority || '?'}`;
    ticketTbody.innerHTML += `
      <tr>
        <td>${t.ticketNumber || t.ticketId || '—'}</td>
        <td title="${escHtml(t.title || '')}">${escHtml((t.title || '').slice(0, 60))}${(t.title || '').length > 60 ? '…' : ''}</td>
        <td>${escHtml(itLabel)}</td>
        <td>${escHtml(pLabel)}</td>
        <td>${t.automationScore || 0}%</td>
        <td>${t.workedHours || 0}</td>
      </tr>`;
  }

  // Scroll to detail
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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

  // All queue splits from allTickets (not tech-filtered)
  const allReactiveTickets = allTickets.filter(t => isReactiveQueue(t.queueID));
  const allMACTickets = allTickets.filter(t => isMACQueue(t.queueID));

  // "Received" counts must filter by workedHours > 0 to match Autotask widget
  // (Autotask widget uses: Queue = X AND Worked Hours > 0.00)
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

  // Zero worked hours: completed tickets with 0.00 worked hours
  const allClosedReactive = hasQueueData
    ? allReactiveTickets.filter(t => t.status === 5 || t.status === 'Complete')
    : allTickets.filter(t => t.status === 5 || t.status === 'Complete');
  const allClosedMAC = hasQueueData
    ? allMACTickets.filter(t => t.status === 5 || t.status === 'Complete')
    : [];
  const zeroHoursList = [...allClosedReactive, ...allClosedMAC].filter(t => !t.workedHours || t.workedHours === 0);
  const allClosedTotal = allClosedReactive.length + allClosedMAC.length;
  const zeroHoursPct = allClosedTotal > 0 ? ((zeroHoursList.length / allClosedTotal) * 100).toFixed(1) : 'N/A';

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

  // Avg Response Time - uses firstResponseDateTime only (matches Autotask widget)
  // Matches Autotask widget: Status=Complete, Queue=002 Reactive, Worked Hours > 0
  const completedReactiveWithHours = filteredTickets.filter(t =>
    (t.status === 5 || t.status === 'Complete') && isReactiveQueue(t.queueID) && t.workedHours > 0
  );
  const ticketsWithFirstResponse = completedReactiveWithHours.filter(t =>
    t.createDate && t.firstResponseDateTime
  );

  const avgResponseTime = ticketsWithFirstResponse.length > 0
    ? (ticketsWithFirstResponse.reduce((s, t) => {
        return s + (new Date(t.firstResponseDateTime).getTime() - new Date(t.createDate).getTime());
      }, 0) / ticketsWithFirstResponse.length / 3600000).toFixed(2)
    : 'N/A';
  const avgResponseSource = ticketsWithFirstResponse.length > 0 ? 'auto' : 'needs-data';

  // Avg Resolution Time - from Autotask resolvedDateTime (Resolved Time Met)
  // Avg Resolution Time - from Autotask workedHours field (Average)
  // Matches Autotask widget: Status=Complete, Queue=002 Reactive, Worked Hours > 0
  const ticketsWithResolved = filteredTickets.filter(t =>
    (t.status === 5 || t.status === 'Complete') && isReactiveQueue(t.queueID) && t.workedHours > 0
  );
  const avgResolutionTime = ticketsWithResolved.length > 0
    ? (ticketsWithResolved.reduce((s, t) => s + t.workedHours, 0) / ticketsWithResolved.length).toFixed(2)
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
      zeroHoursCount: zeroHoursList.length,
      zeroHoursPct,
      zeroHoursTotal: allClosedTotal,
      zeroHoursTickets: zeroHoursList,
    },
    'Avg Closed/Day/SDE': hasTechFilter ? techReactiveClosedList : reactiveClosedList,
    'Avg Resolution Time': ticketsWithResolved,
    'Avg Response Time': ticketsWithFirstResponse,
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
      totalReceived > 0 ? 'calc' : 'needs-data',
      zeroHoursPct !== 'N/A' ? zeroHoursList.length + ' of ' + allClosedTotal + ' closed w/ 0 hrs (' + zeroHoursPct + '%)' : '')}
  `;

  // --- Render Reconciliation Panel ---
  renderReconciliation(allReactiveTickets, allMACTickets, reactiveReceivedList, macReceivedList);

  // --- Render Efficiency ---
  $('#sde-efficiency-grid').innerHTML = `
    ${sdeCard('Avg Closed/Day/SDE',
      hasTechFilter && techAvgClosedPerDay
        ? techAvgClosedPerDay + ' tech / ' + avgClosedPerDayPerSDE + ' team'
        : avgClosedPerDayPerSDE,
      hasCompletedData ? 'calc' : 'needs-data')}
    ${sdeCard('Avg Escalation Closed/Day', avgEscPerDay, escalationClosed > 0 ? 'calc' : 'manual')}
    ${sdeCard('Avg Resolution Time', avgResolutionTime !== 'N/A' ? avgResolutionTime + ' hrs' : 'N/A', avgResolutionTime !== 'N/A' ? resTimeSource : 'needs-data')}
    ${sdeCard('Avg Response Time', avgResponseTime !== 'N/A' ? avgResponseTime + ' hrs' : 'N/A', avgResponseSource)}
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

function sdeCard(label, value, source, subtitle) {
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
  const kpiDesc = SDE_KPI_INFO[label] || sourceText;

  return `
    <div class="sde-metric-card ${clickable}" onclick="openSDEDrilldown('${escHtml(label)}')" title="${escHtml(kpiDesc)}">
      <div class="sde-metric-value">${value}</div>
      <div class="sde-metric-label">${label}</div>
      ${sourceText ? `<div class="sde-metric-source sde-source-${sourceClass}">${sourceText}</div>` : ''}
      ${subtitle ? `<div class="sde-metric-subtitle">${subtitle}</div>` : ''}
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
    const zeroHoursSection = data.zeroHoursPct !== 'N/A' ? `
        <div class="drilldown-formula" style="margin-top:0.5rem; border-top:1px solid var(--border); padding-top:0.5rem;">
          <span class="drilldown-formula-label">Completed w/ 0 Worked Hours:</span>
          ${data.zeroHoursCount} of ${data.zeroHoursTotal} completed tickets = <strong>${data.zeroHoursPct}%</strong>
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
        ${zeroHoursSection}
      </div>
    `;
    const zeroTableHtml = data.zeroHoursTickets && data.zeroHoursTickets.length > 0
      ? '<h4 style="margin:1rem 0 0.5rem; font-size:0.85rem; color:var(--yellow, #f59e0b);">Tickets Completed with 0 Worked Hours</h4>' + renderDrilldownTable(data.zeroHoursTickets, metricLabel)
      : '';
    const closedTableHtml = tickets.length > 0
      ? '<h4 style="margin:1rem 0 0.5rem; font-size:0.85rem;">Closed Tickets (with worked hours)</h4>' + renderDrilldownTable(tickets, metricLabel)
      : '';
    $('#drilldown-body').innerHTML = calcHtml + zeroTableHtml + closedTableHtml;
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
$('#btn-ai').addEventListener('click', runAIAnalysis);
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
