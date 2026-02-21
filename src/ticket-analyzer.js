/**
 * Ticket Analyzer
 *
 * Categorizes Autotask tickets into automation-friendly buckets,
 * estimates resolution time, and scores automation potential.
 */

// Keyword patterns mapped to categories
const CATEGORY_PATTERNS = [
  {
    category: 'password_reset',
    label: 'Password Reset',
    keywords: ['password', 'reset password', 'locked out', 'account locked', 'unlock account', 'expired password', 'mfa reset', 'credential'],
    avgMinutes: 5,
    automationScore: 95,
  },
  {
    category: 'printer',
    label: 'Printer Issue',
    keywords: ['printer', 'print', 'printing', 'print spooler', 'paper jam', 'add printer', 'install printer', 'map printer'],
    avgMinutes: 10,
    automationScore: 80,
  },
  {
    category: 'disk_space',
    label: 'Disk Space / Cleanup',
    keywords: ['disk space', 'low disk', 'storage full', 'temp files', 'cleanup', 'c: drive', 'disk full', 'recycle bin'],
    avgMinutes: 10,
    automationScore: 90,
  },
  {
    category: 'network',
    label: 'Network / Connectivity',
    keywords: ['network', 'internet', 'wifi', 'dns', 'vpn', 'connectivity', 'cannot connect', 'no internet', 'slow network', 'ip address', 'dhcp'],
    avgMinutes: 10,
    automationScore: 70,
  },
  {
    category: 'email',
    label: 'Email / Outlook',
    keywords: ['outlook', 'email', 'mailbox', 'calendar', 'out of office', 'shared mailbox', 'distribution list', 'mail flow', 'owa', 'exchange'],
    avgMinutes: 10,
    automationScore: 75,
  },
  {
    category: 'teams',
    label: 'Microsoft Teams',
    keywords: ['teams', 'teams cache', 'teams not working', 'teams crash', 'teams audio', 'teams video'],
    avgMinutes: 8,
    automationScore: 85,
  },
  {
    category: 'office_apps',
    label: 'Office App Repair',
    keywords: ['office', 'word', 'excel', 'powerpoint', 'office repair', 'office crash', 'office license', 'activation'],
    avgMinutes: 15,
    automationScore: 80,
  },
  {
    category: 'service_restart',
    label: 'Service Restart',
    keywords: ['service', 'restart service', 'service stopped', 'service not running', 'windows service', 'hung', 'not responding'],
    avgMinutes: 5,
    automationScore: 95,
  },
  {
    category: 'group_policy',
    label: 'Group Policy Update',
    keywords: ['group policy', 'gpupdate', 'gpo', 'policy', 'drive mapping', 'mapped drive', 'network drive'],
    avgMinutes: 8,
    automationScore: 90,
  },
  {
    category: 'user_onboard',
    label: 'User Onboarding',
    keywords: ['new user', 'onboard', 'new hire', 'new employee', 'setup account', 'create user', 'new starter'],
    avgMinutes: 20,
    automationScore: 70,
  },
  {
    category: 'user_offboard',
    label: 'User Offboarding',
    keywords: ['offboard', 'terminate', 'disable account', 'departed', 'leaving', 'disable user', 'remove access'],
    avgMinutes: 15,
    automationScore: 75,
  },
  {
    category: 'disk_health',
    label: 'Disk Health Check',
    keywords: ['disk health', 'smart', 'hard drive', 'ssd health', 'chkdsk', 'bad sectors', 'disk error'],
    avgMinutes: 10,
    automationScore: 85,
  },
  {
    category: 'software_install',
    label: 'Software Install',
    keywords: ['install software', 'install app', 'application install', 'deploy', 'software request', 'need installed'],
    avgMinutes: 15,
    automationScore: 65,
  },
  {
    category: 'reboot',
    label: 'Reboot / Restart',
    keywords: ['reboot', 'restart', 'restart computer', 'slow computer', 'running slow', 'performance'],
    avgMinutes: 5,
    automationScore: 95,
  },
];

/**
 * Analyze a single ticket and return categorization + scoring.
 */
function analyzeTicket(ticket) {
  const title = (ticket.title || '').toLowerCase();
  const description = (ticket.description || '').toLowerCase();
  const combined = `${title} ${description}`;

  let bestMatch = null;
  let bestScore = 0;

  for (const pattern of CATEGORY_PATTERNS) {
    let matchCount = 0;
    for (const keyword of pattern.keywords) {
      if (combined.includes(keyword)) {
        matchCount++;
      }
    }
    if (matchCount > bestScore) {
      bestScore = matchCount;
      bestMatch = pattern;
    }
  }

  // Default for unmatched tickets
  if (!bestMatch || bestScore === 0) {
    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      category: 'uncategorized',
      categoryLabel: 'Uncategorized',
      estimatedMinutes: null,
      automationScore: 0,
      isQuickHitter: false,
      matchConfidence: 0,
      suggestedScripts: [],
    };
  }

  const confidence = Math.min(100, Math.round((bestScore / bestMatch.keywords.length) * 100));
  const isQuickHitter = bestMatch.avgMinutes >= 5 && bestMatch.avgMinutes <= 20;

  return {
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    category: bestMatch.category,
    categoryLabel: bestMatch.label,
    estimatedMinutes: bestMatch.avgMinutes,
    automationScore: bestMatch.automationScore,
    isQuickHitter,
    matchConfidence: confidence,
    suggestedScripts: getSuggestedScripts(bestMatch.category),
  };
}

/**
 * Analyze an array of tickets and return sorted results.
 */
function analyzeTickets(tickets) {
  const results = tickets.map(analyzeTicket);

  // Sort: quick hitters first, then by automation score descending
  results.sort((a, b) => {
    if (a.isQuickHitter && !b.isQuickHitter) return -1;
    if (!a.isQuickHitter && b.isQuickHitter) return 1;
    return b.automationScore - a.automationScore;
  });

  return results;
}

/**
 * Get summary stats for a batch of analyzed tickets.
 */
function getSummary(analyzedTickets) {
  const quickHitters = analyzedTickets.filter(t => t.isQuickHitter);
  const automatable = analyzedTickets.filter(t => t.automationScore >= 70);
  const categories = {};

  for (const t of analyzedTickets) {
    categories[t.categoryLabel] = (categories[t.categoryLabel] || 0) + 1;
  }

  return {
    totalTickets: analyzedTickets.length,
    quickHitterCount: quickHitters.length,
    automatableCount: automatable.length,
    estimatedTimeSaved: quickHitters.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0),
    categoryBreakdown: categories,
    avgAutomationScore: analyzedTickets.length
      ? Math.round(analyzedTickets.reduce((s, t) => s + t.automationScore, 0) / analyzedTickets.length)
      : 0,
  };
}

/**
 * Map a category to its available scripts.
 */
function getSuggestedScripts(category) {
  const scriptMap = {
    password_reset: [
      { name: 'reset-user-password.ps1', type: 'datto', label: 'Reset AD Password' },
    ],
    printer: [
      { name: 'clear-print-spooler.ps1', type: 'datto', label: 'Clear Print Spooler' },
      { name: 'install-printer.ps1', type: 'datto', label: 'Install Network Printer' },
    ],
    disk_space: [
      { name: 'clear-disk-space.ps1', type: 'datto', label: 'Clean Disk Space' },
    ],
    network: [
      { name: 'flush-dns-reset-network.ps1', type: 'datto', label: 'Flush DNS & Reset Network' },
    ],
    email: [
      { name: 'clear-outlook-cache.ps1', type: 'datto', label: 'Clear Outlook Cache' },
      { name: 'set-out-of-office.ps1', type: 'pia', label: 'Set Out of Office' },
      { name: 'export-mailbox-permissions.ps1', type: 'pia', label: 'Export Mailbox Permissions' },
    ],
    teams: [
      { name: 'clear-teams-cache.ps1', type: 'datto', label: 'Clear Teams Cache' },
    ],
    office_apps: [
      { name: 'repair-office-apps.ps1', type: 'datto', label: 'Repair Office Apps' },
    ],
    service_restart: [
      { name: 'restart-service.ps1', type: 'datto', label: 'Restart Windows Service' },
    ],
    group_policy: [
      { name: 'force-group-policy-update.ps1', type: 'datto', label: 'Force GPUpdate' },
      { name: 'map-network-drive.ps1', type: 'datto', label: 'Map Network Drive' },
    ],
    user_onboard: [
      { name: 'bulk-user-onboard.ps1', type: 'pia', label: 'Onboard User (365 + AD)' },
    ],
    user_offboard: [
      { name: 'disable-user-offboard.ps1', type: 'pia', label: 'Offboard User (365 + AD)' },
    ],
    disk_health: [
      { name: 'check-disk-health.ps1', type: 'datto', label: 'Check Disk Health (SMART)' },
    ],
    reboot: [
      { name: 'restart-service.ps1', type: 'datto', label: 'Restart Service / Reboot' },
    ],
  };
  return scriptMap[category] || [];
}

/**
 * Get deep analytics for a batch of analyzed tickets.
 * Includes trend data, priority breakdown, ROI projections, and top opportunities.
 */
function getDeepAnalytics(analyzedTickets, rawTickets = []) {
  // Priority breakdown
  const priorityMap = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' };
  const priorityBreakdown = {};
  for (const t of analyzedTickets) {
    const pLabel = priorityMap[t.priority] || `Priority ${t.priority || 'None'}`;
    priorityBreakdown[pLabel] = (priorityBreakdown[pLabel] || 0) + 1;
  }

  // Category deep stats (count, avg automation score, total time saveable)
  const categoryStats = {};
  for (const t of analyzedTickets) {
    if (!categoryStats[t.categoryLabel]) {
      categoryStats[t.categoryLabel] = {
        count: 0,
        totalAutomationScore: 0,
        totalMinutes: 0,
        quickHitters: 0,
      };
    }
    const cs = categoryStats[t.categoryLabel];
    cs.count++;
    cs.totalAutomationScore += t.automationScore;
    cs.totalMinutes += t.estimatedMinutes || 0;
    if (t.isQuickHitter) cs.quickHitters++;
  }

  const categoryDeepBreakdown = Object.entries(categoryStats)
    .map(([label, stats]) => ({
      category: label,
      count: stats.count,
      avgAutomationScore: stats.count ? Math.round(stats.totalAutomationScore / stats.count) : 0,
      totalMinutesSaveable: stats.totalMinutes,
      quickHitters: stats.quickHitters,
      pctOfTotal: analyzedTickets.length ? Math.round((stats.count / analyzedTickets.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Tickets by creation date (trend) using raw ticket createDate if available
  const ticketsByDay = {};
  for (const t of rawTickets) {
    const dateStr = t.createDate
      ? new Date(t.createDate).toISOString().slice(0, 10)
      : null;
    if (dateStr) {
      ticketsByDay[dateStr] = (ticketsByDay[dateStr] || 0) + 1;
    }
  }
  const trendData = Object.entries(ticketsByDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  // Top automation opportunities: highest score + highest volume combos
  const topOpportunities = categoryDeepBreakdown
    .filter(c => c.category !== 'Uncategorized')
    .map(c => ({
      category: c.category,
      count: c.count,
      avgAutomationScore: c.avgAutomationScore,
      totalMinutesSaveable: c.totalMinutesSaveable,
      impactScore: Math.round((c.avgAutomationScore * c.count * (c.totalMinutesSaveable || 1)) / 100),
    }))
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 5);

  // ROI projection (annualized from current batch)
  const totalMinutes = analyzedTickets.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
  const automatableMinutes = analyzedTickets
    .filter(t => t.automationScore >= 70)
    .reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
  const avgHourlyRate = 150; // default tech hourly rate
  const monthlySavingsHours = automatableMinutes / 60;
  const annualSavingsHours = monthlySavingsHours * 12;

  const roiProjection = {
    totalMinutesInBatch: totalMinutes,
    automatableMinutes,
    monthlySavingsHours: Math.round(monthlySavingsHours * 10) / 10,
    annualSavingsHours: Math.round(annualSavingsHours * 10) / 10,
    annualCostSavings: Math.round(annualSavingsHours * avgHourlyRate),
    hourlyRateUsed: avgHourlyRate,
  };

  return {
    priorityBreakdown,
    categoryDeepBreakdown,
    trendData,
    topOpportunities,
    roiProjection,
  };
}

module.exports = { analyzeTicket, analyzeTickets, getSummary, getDeepAnalytics, CATEGORY_PATTERNS };
