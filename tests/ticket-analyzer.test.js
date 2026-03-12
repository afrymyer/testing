const assert = require('assert');
const { analyzeTicket, analyzeTickets, getSummary, getDeepAnalytics, CATEGORY_PATTERNS, RESOLUTION_SCRIPTS } = require('../src/ticket-analyzer');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  \u2713 ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message });
    console.log(`  \u2717 ${name}: ${err.message}`);
  }
}

// ─── Helper: build a minimal ticket object ───
function makeTicket(overrides = {}) {
  return {
    id: overrides.id || 1,
    ticketNumber: overrides.ticketNumber || 'T0001',
    title: overrides.title || '',
    description: overrides.description || '',
    resolution: overrides.resolution || '',
    status: overrides.status || 1,
    priority: overrides.priority || 3,
    queueID: overrides.queueID || null,
    createDate: overrides.createDate || null,
    assignedResourceID: overrides.assignedResourceID || null,
    companyID: overrides.companyID || null,
    companyName: overrides.companyName || null,
    issueType: overrides.issueType || null,
    subIssueType: overrides.subIssueType || null,
    issueTypeName: overrides.issueTypeName || null,
    subIssueTypeName: overrides.subIssueTypeName || null,
    workedHours: overrides.workedHours || 0,
    firstResponseDateTime: overrides.firstResponseDateTime || null,
    resolutionPlanDateTime: overrides.resolutionPlanDateTime || null,
    resolutionPlanHours: overrides.resolutionPlanHours ?? null,
    resolvedDateTime: overrides.resolvedDateTime || null,
    serviceLevelAgreementHasBeenMet: overrides.serviceLevelAgreementHasBeenMet ?? null,
    piaDetectedInNotes: overrides.piaDetectedInNotes || false,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 1. Category matching tests
// ═══════════════════════════════════════════════════════════════════════
console.log('\n--- Category Matching ---\n');

test('Password reset ticket categorized as password_reset', () => {
  const result = analyzeTicket(makeTicket({ title: 'User forgot password and is locked out' }));
  assert.strictEqual(result.category, 'password_reset');
});

test('Printer issue ticket categorized as printer', () => {
  const result = analyzeTicket(makeTicket({ title: 'Printer not working, print spooler stuck' }));
  assert.strictEqual(result.category, 'printer');
});

test('Disk space ticket categorized as disk_space', () => {
  const result = analyzeTicket(makeTicket({ title: 'Low disk space on C: drive' }));
  assert.strictEqual(result.category, 'disk_space');
});

test('Network ticket categorized as network', () => {
  const result = analyzeTicket(makeTicket({ title: 'Cannot connect to internet, VPN not working' }));
  assert.strictEqual(result.category, 'network');
});

test('Email/Outlook ticket categorized as email', () => {
  const result = analyzeTicket(makeTicket({ title: 'Outlook keeps crashing, shared mailbox not syncing' }));
  assert.strictEqual(result.category, 'email');
});

test('Teams ticket categorized as teams', () => {
  const result = analyzeTicket(makeTicket({ title: 'Teams not working, teams cache issues' }));
  assert.strictEqual(result.category, 'teams');
});

test('Unknown ticket categorized as uncategorized', () => {
  const result = analyzeTicket(makeTicket({ title: 'Completely unrelated topic about lunch orders' }));
  assert.strictEqual(result.category, 'uncategorized');
});

test('Office app ticket categorized as office_apps', () => {
  const result = analyzeTicket(makeTicket({ title: 'Excel keeps crashing, need office repair' }));
  assert.strictEqual(result.category, 'office_apps');
});

test('Service restart ticket categorized as service_restart', () => {
  const result = analyzeTicket(makeTicket({ title: 'Restart service - agent service stopped running' }));
  assert.strictEqual(result.category, 'service_restart');
});

test('Group policy ticket categorized as group_policy', () => {
  const result = analyzeTicket(makeTicket({ title: 'Need gpupdate, group policy not applying' }));
  assert.strictEqual(result.category, 'group_policy');
});

test('User onboarding ticket categorized as user_onboard', () => {
  const result = analyzeTicket(makeTicket({ title: 'New hire starting Monday, need to onboard new employee' }));
  assert.strictEqual(result.category, 'user_onboard');
});

test('User offboarding ticket categorized as user_offboard', () => {
  const result = analyzeTicket(makeTicket({ title: 'Employee leaving, need to offboard and disable account' }));
  assert.strictEqual(result.category, 'user_offboard');
});

test('Reboot ticket categorized as reboot', () => {
  const result = analyzeTicket(makeTicket({ title: 'Computer running slow, needs reboot, high uptime' }));
  assert.strictEqual(result.category, 'reboot');
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Automation scoring tests
// ═══════════════════════════════════════════════════════════════════════
console.log('\n--- Automation Scoring ---\n');

test('Password reset has high automation score (>= 80)', () => {
  const result = analyzeTicket(makeTicket({ title: 'Reset password for user jsmith' }));
  assert.ok(result.automationScore >= 80,
    `Expected automation score >= 80, got ${result.automationScore}`);
});

test('Resolution text "reset password" boosts automation score', () => {
  const baseResult = analyzeTicket(makeTicket({ title: 'Account issue for user' , description: 'User locked out' }));
  const boostedResult = analyzeTicket(makeTicket({
    title: 'Account issue for user',
    description: 'User locked out',
    resolution: 'Reset password and unlocked account',
  }));
  assert.ok(boostedResult.automationScore >= baseResult.automationScore,
    `Expected boosted score (${boostedResult.automationScore}) >= base score (${baseResult.automationScore})`);
});

test('Resolution "escalated to vendor" lowers automation score', () => {
  const baseResult = analyzeTicket(makeTicket({
    title: 'Printer not working',
    description: 'Print spooler stuck',
  }));
  const loweredResult = analyzeTicket(makeTicket({
    title: 'Printer not working',
    description: 'Print spooler stuck',
    resolution: 'Escalated to vendor for hardware repair',
  }));
  assert.ok(loweredResult.automationScore < baseResult.automationScore,
    `Expected lowered score (${loweredResult.automationScore}) < base score (${baseResult.automationScore})`);
});

test('Resolution "ran script" boosts automation score', () => {
  const baseResult = analyzeTicket(makeTicket({ title: 'Disk space full on C: drive' }));
  const boostedResult = analyzeTicket(makeTicket({
    title: 'Disk space full on C: drive',
    resolution: 'Ran script to clear temp files and disk cleanup completed',
  }));
  assert.ok(boostedResult.automationScore >= baseResult.automationScore,
    `Expected boosted score (${boostedResult.automationScore}) >= base score (${baseResult.automationScore})`);
});

test('Multiple manual resolution keywords stack penalties', () => {
  const result = analyzeTicket(makeTicket({
    title: 'Network connectivity issues',
    resolution: 'Escalated to vendor, required on-site visit and hardware replacement',
  }));
  // Network base is 70, with three penalties it should drop significantly
  assert.ok(result.automationScore < 70,
    `Expected score < 70 after multiple penalties, got ${result.automationScore}`);
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Quick hitter detection
// ═══════════════════════════════════════════════════════════════════════
console.log('\n--- Quick Hitter Detection ---\n');

test('5-minute category (password_reset) is flagged as quick hitter', () => {
  const result = analyzeTicket(makeTicket({ title: 'Reset password for locked out user' }));
  assert.strictEqual(result.isQuickHitter, true);
});

test('10-minute category (printer) is flagged as quick hitter', () => {
  const result = analyzeTicket(makeTicket({ title: 'Printer not printing, print spooler issue' }));
  assert.strictEqual(result.isQuickHitter, true);
});

test('20-minute category (user_onboard) is flagged as quick hitter', () => {
  const result = analyzeTicket(makeTicket({ title: 'Onboard new employee new hire' }));
  assert.strictEqual(result.isQuickHitter, true);
});

test('Uncategorized ticket (0 min) is NOT flagged as quick hitter', () => {
  const result = analyzeTicket(makeTicket({ title: 'Random gibberish about nothing relevant' }));
  assert.strictEqual(result.isQuickHitter, false);
});

test('All defined categories with avgMinutes 5-20 are quick hitters', () => {
  for (const pattern of CATEGORY_PATTERNS) {
    if (pattern.avgMinutes >= 5 && pattern.avgMinutes <= 20) {
      // Use enough keywords to get a strong match
      const result = analyzeTicket(makeTicket({
        title: pattern.keywords.slice(0, 3).join(' '),
      }));
      assert.strictEqual(result.isQuickHitter, true,
        `${pattern.category} (${pattern.avgMinutes} min) should be a quick hitter`);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Script matching tests
// ═══════════════════════════════════════════════════════════════════════
console.log('\n--- Script Matching ---\n');

test('"locked out" symptom matches reset-user-password.ps1', () => {
  const result = analyzeTicket(makeTicket({ title: 'User locked out of account' }));
  const scriptNames = result.suggestedScripts.map(s => s.name);
  assert.ok(scriptNames.includes('reset-user-password.ps1'),
    `Expected reset-user-password.ps1 in [${scriptNames.join(', ')}]`);
});

test('"print spooler" symptom matches clear-print-spooler.ps1', () => {
  const result = analyzeTicket(makeTicket({ title: 'Print spooler is stuck' }));
  const scriptNames = result.suggestedScripts.map(s => s.name);
  assert.ok(scriptNames.includes('clear-print-spooler.ps1'),
    `Expected clear-print-spooler.ps1 in [${scriptNames.join(', ')}]`);
});

test('"disk space" symptom matches clear-disk-space.ps1', () => {
  const result = analyzeTicket(makeTicket({ title: 'Running out of disk space' }));
  const scriptNames = result.suggestedScripts.map(s => s.name);
  assert.ok(scriptNames.includes('clear-disk-space.ps1'),
    `Expected clear-disk-space.ps1 in [${scriptNames.join(', ')}]`);
});

test('Unknown symptoms return empty scripts array', () => {
  const result = analyzeTicket(makeTicket({ title: 'My chair squeaks when I sit down' }));
  assert.strictEqual(result.suggestedScripts.length, 0,
    `Expected empty scripts, got ${result.suggestedScripts.map(s => s.name).join(', ')}`);
});

test('"dns" and "no internet" symptoms match flush-dns-reset-network.ps1', () => {
  const result = analyzeTicket(makeTicket({ title: 'No internet, DNS not resolving' }));
  const scriptNames = result.suggestedScripts.map(s => s.name);
  assert.ok(scriptNames.includes('flush-dns-reset-network.ps1'),
    `Expected flush-dns-reset-network.ps1 in [${scriptNames.join(', ')}]`);
});

test('"teams cache" symptom matches clear-teams-cache.ps1', () => {
  const result = analyzeTicket(makeTicket({ title: 'Teams cache needs clearing, teams not working' }));
  const scriptNames = result.suggestedScripts.map(s => s.name);
  assert.ok(scriptNames.includes('clear-teams-cache.ps1'),
    `Expected clear-teams-cache.ps1 in [${scriptNames.join(', ')}]`);
});

test('"out of office" symptom matches set-out-of-office.ps1', () => {
  const result = analyzeTicket(makeTicket({ title: 'Set out of office auto reply for vacation' }));
  const scriptNames = result.suggestedScripts.map(s => s.name);
  assert.ok(scriptNames.includes('set-out-of-office.ps1'),
    `Expected set-out-of-office.ps1 in [${scriptNames.join(', ')}]`);
});

test('Multiple symptom hits increase script relevance score', () => {
  const singleHit = analyzeTicket(makeTicket({ title: 'password reset' }));
  const multiHit = analyzeTicket(makeTicket({
    title: 'User locked out, password reset needed',
    description: 'Account locked, expired password, forgot password, cannot login',
  }));
  const singleScript = singleHit.suggestedScripts.find(s => s.name === 'reset-user-password.ps1');
  const multiScript = multiHit.suggestedScripts.find(s => s.name === 'reset-user-password.ps1');
  assert.ok(singleScript, 'Single hit should find the script');
  assert.ok(multiScript, 'Multi hit should find the script');
  assert.ok(multiScript.relevance >= singleScript.relevance,
    `Multi-hit relevance (${multiScript.relevance}) should be >= single-hit (${singleScript.relevance})`);
});

test('Scripts are sorted by relevance (best match first)', () => {
  const result = analyzeTicket(makeTicket({
    title: 'Printer offline and print spooler stuck in queue',
    description: 'Not printing at all, print job stuck',
  }));
  const scripts = result.suggestedScripts;
  for (let i = 1; i < scripts.length; i++) {
    assert.ok(scripts[i - 1].relevance >= scripts[i].relevance,
      `Scripts not sorted: ${scripts[i - 1].name} (${scripts[i - 1].relevance}) should be >= ${scripts[i].name} (${scripts[i].relevance})`);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 5. PIA detection tests
// ═══════════════════════════════════════════════════════════════════════
console.log('\n--- PIA Detection ---\n');

test('Ticket with piaDetectedInNotes=true returns usedPIA=true', () => {
  const result = analyzeTicket(makeTicket({
    title: 'Password reset',
    piaDetectedInNotes: true,
  }));
  assert.strictEqual(result.usedPIA, true);
  assert.strictEqual(result.piaSource, 'notes');
});

test('Resolution containing "pia" returns usedPIA=true', () => {
  const result = analyzeTicket(makeTicket({
    title: 'Password reset',
    resolution: 'Resolved via PIA automation portal',
  }));
  assert.strictEqual(result.usedPIA, true);
});

test('Resolution containing "datto rmm" returns usedPIA=true', () => {
  const result = analyzeTicket(makeTicket({
    title: 'Service restart needed',
    resolution: 'Ran datto rmm script to restart service',
  }));
  assert.strictEqual(result.usedPIA, true);
});

test('Normal ticket without automation indicators returns usedPIA=false', () => {
  const result = analyzeTicket(makeTicket({
    title: 'Printer not printing',
    resolution: 'Manually cleared the paper jam',
  }));
  assert.strictEqual(result.usedPIA, false);
  assert.strictEqual(result.piaIndicator, null);
  assert.strictEqual(result.piaSource, null);
});

test('piaDetectedInNotes takes priority over keyword scan', () => {
  const result = analyzeTicket(makeTicket({
    title: 'Password reset',
    resolution: 'Some resolution without pia keywords',
    piaDetectedInNotes: true,
  }));
  assert.strictEqual(result.usedPIA, true);
  assert.strictEqual(result.piaSource, 'notes');
  assert.ok(result.piaIndicator.includes('PIA API account'),
    `Expected piaIndicator to reference PIA API account, got "${result.piaIndicator}"`);
});

test('Description containing "ran script" returns usedPIA=true via keyword', () => {
  const result = analyzeTicket(makeTicket({
    title: 'Disk cleanup',
    description: 'Ran script to clear temp files',
  }));
  assert.strictEqual(result.usedPIA, true);
  assert.strictEqual(result.piaSource, 'keyword');
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Summary / analytics tests
// ═══════════════════════════════════════════════════════════════════════
console.log('\n--- getSummary ---\n');

test('getSummary returns correct total ticket count', () => {
  const tickets = [
    makeTicket({ title: 'Password reset for user', id: 1 }),
    makeTicket({ title: 'Printer issue print spooler', id: 2 }),
    makeTicket({ title: 'Random unknown thing', id: 3 }),
  ];
  const analyzed = analyzeTickets(tickets);
  const summary = getSummary(analyzed);
  assert.strictEqual(summary.totalTickets, 3);
});

test('getSummary returns correct quick hitter count', () => {
  const tickets = [
    makeTicket({ title: 'Password reset for locked out user', id: 1 }),
    makeTicket({ title: 'Print spooler stuck printing issue', id: 2 }),
    makeTicket({ title: 'Random unknown thing', id: 3 }),
  ];
  const analyzed = analyzeTickets(tickets);
  const summary = getSummary(analyzed);
  // password_reset and printer are quick hitters; unknown is not
  assert.strictEqual(summary.quickHitterCount, 2);
});

test('getSummary returns correct automatable count (score >= 70)', () => {
  const tickets = [
    makeTicket({ title: 'Password reset locked out account', id: 1 }),  // score 95
    makeTicket({ title: 'Random gibberish nothing relevant', id: 2 }),  // score 0
  ];
  const analyzed = analyzeTickets(tickets);
  const summary = getSummary(analyzed);
  assert.ok(summary.automatableCount >= 1,
    `Expected at least 1 automatable ticket, got ${summary.automatableCount}`);
});

test('getSummary returns estimated time saved from quick hitters', () => {
  const tickets = [
    makeTicket({ title: 'Password reset locked out user', id: 1 }),  // 5 min
    makeTicket({ title: 'Print spooler stuck printing issue', id: 2 }),  // 10 min
  ];
  const analyzed = analyzeTickets(tickets);
  const summary = getSummary(analyzed);
  assert.ok(summary.estimatedTimeSaved > 0,
    `Expected estimatedTimeSaved > 0, got ${summary.estimatedTimeSaved}`);
});

test('getSummary returns category breakdown', () => {
  const tickets = [
    makeTicket({ title: 'Password reset locked out user', id: 1 }),
    makeTicket({ title: 'Printer not printing print spooler', id: 2 }),
    makeTicket({ title: 'Another printer stuck in print queue', id: 3 }),
  ];
  const analyzed = analyzeTickets(tickets);
  const summary = getSummary(analyzed);
  assert.ok(summary.categoryBreakdown['Password Reset'] >= 1,
    'Expected Password Reset in category breakdown');
  assert.ok(summary.categoryBreakdown['Printer Issue'] >= 1,
    'Expected Printer Issue in category breakdown');
});

test('getSummary computes average automation score', () => {
  const tickets = [
    makeTicket({ title: 'Password reset locked out user', id: 1 }),
    makeTicket({ title: 'Disk space low disk full', id: 2 }),
  ];
  const analyzed = analyzeTickets(tickets);
  const summary = getSummary(analyzed);
  assert.ok(typeof summary.avgAutomationScore === 'number');
  assert.ok(summary.avgAutomationScore > 0, 'Average automation score should be > 0');
});

// ── getDeepAnalytics ──
console.log('\n--- getDeepAnalytics ---\n');

test('getDeepAnalytics includes slaMetrics', () => {
  const tickets = [
    makeTicket({
      id: 1, title: 'Password reset locked out user',
      status: 5,
      createDate: '2025-01-01T08:00:00Z',
      resolvedDateTime: '2025-01-01T09:00:00Z',
      serviceLevelAgreementHasBeenMet: true,
    }),
    makeTicket({
      id: 2, title: 'Printer not printing print spooler',
      status: 5,
      createDate: '2025-01-02T08:00:00Z',
      resolvedDateTime: '2025-01-02T12:00:00Z',
      serviceLevelAgreementHasBeenMet: false,
    }),
  ];
  const analyzed = analyzeTickets(tickets);
  const deep = getDeepAnalytics(analyzed, tickets);
  assert.ok(deep.slaMetrics, 'Expected slaMetrics in deep analytics');
  assert.ok(deep.slaMetrics.compliance, 'Expected slaMetrics.compliance');
  assert.strictEqual(deep.slaMetrics.compliance.met, 1);
  assert.strictEqual(deep.slaMetrics.compliance.missed, 1);
  assert.strictEqual(deep.slaMetrics.compliance.total, 2);
  assert.strictEqual(deep.slaMetrics.compliance.rate, 50);
});

test('getDeepAnalytics slaMetrics includes MTTR by category', () => {
  const tickets = [
    makeTicket({
      id: 1, title: 'Password reset locked out user',
      status: 5,
      createDate: '2025-01-01T08:00:00Z',
      resolvedDateTime: '2025-01-01T09:00:00Z',
    }),
  ];
  const analyzed = analyzeTickets(tickets);
  const deep = getDeepAnalytics(analyzed, tickets);
  assert.ok(Array.isArray(deep.slaMetrics.mttrByCategory), 'Expected mttrByCategory array');
  if (deep.slaMetrics.mttrByCategory.length > 0) {
    const entry = deep.slaMetrics.mttrByCategory[0];
    assert.ok('avgHours' in entry, 'Expected avgHours in mttrByCategory entry');
    assert.ok('avgMinutes' in entry, 'Expected avgMinutes in mttrByCategory entry');
  }
});

test('getDeepAnalytics slaMetrics includes first response time', () => {
  const tickets = [
    makeTicket({
      id: 1, title: 'Password reset locked out user',
      status: 5,
      createDate: '2025-01-01T08:00:00Z',
      firstResponseDateTime: '2025-01-01T08:30:00Z',
      resolvedDateTime: '2025-01-01T09:00:00Z',
    }),
  ];
  const analyzed = analyzeTickets(tickets);
  const deep = getDeepAnalytics(analyzed, tickets);
  assert.ok(deep.slaMetrics.firstResponseTime, 'Expected firstResponseTime');
  assert.strictEqual(deep.slaMetrics.firstResponseTime.ticketCount, 1);
  assert.ok(deep.slaMetrics.firstResponseTime.avgMinutes > 0,
    'Expected avgMinutes > 0 for first response');
});

test('getDeepAnalytics slaMetrics includes overallMTTR', () => {
  const tickets = [
    makeTicket({
      id: 1, title: 'Password reset locked out user',
      status: 5,
      createDate: '2025-01-01T08:00:00Z',
      resolvedDateTime: '2025-01-01T10:00:00Z',
    }),
  ];
  const analyzed = analyzeTickets(tickets);
  const deep = getDeepAnalytics(analyzed, tickets);
  assert.ok(deep.slaMetrics.overallMTTR, 'Expected overallMTTR');
  assert.strictEqual(deep.slaMetrics.overallMTTR.avgHours, 2);
  assert.strictEqual(deep.slaMetrics.overallMTTR.ticketCount, 1);
});

test('getDeepAnalytics includes priorityBreakdown', () => {
  const tickets = [
    makeTicket({ id: 1, title: 'Password reset locked out user', priority: 1 }),
    makeTicket({ id: 2, title: 'Printer not printing', priority: 3 }),
  ];
  const analyzed = analyzeTickets(tickets);
  const deep = getDeepAnalytics(analyzed, tickets);
  assert.ok(deep.priorityBreakdown, 'Expected priorityBreakdown');
  assert.strictEqual(deep.priorityBreakdown['Critical'], 1);
  assert.strictEqual(deep.priorityBreakdown['Medium'], 1);
});

test('getDeepAnalytics includes categoryDeepBreakdown with avgAutomationScore', () => {
  const tickets = [
    makeTicket({ id: 1, title: 'Password reset locked out user' }),
    makeTicket({ id: 2, title: 'Another password reset account locked' }),
  ];
  const analyzed = analyzeTickets(tickets);
  const deep = getDeepAnalytics(analyzed, tickets);
  assert.ok(Array.isArray(deep.categoryDeepBreakdown), 'Expected categoryDeepBreakdown array');
  const pwCategory = deep.categoryDeepBreakdown.find(c => c.category === 'Password Reset');
  assert.ok(pwCategory, 'Expected Password Reset in category deep breakdown');
  assert.strictEqual(pwCategory.count, 2);
  assert.ok(pwCategory.avgAutomationScore > 0, 'Expected avgAutomationScore > 0');
});

test('getDeepAnalytics includes roiProjection', () => {
  const tickets = [
    makeTicket({ id: 1, title: 'Password reset locked out user' }),
  ];
  const analyzed = analyzeTickets(tickets);
  const deep = getDeepAnalytics(analyzed, tickets);
  assert.ok(deep.roiProjection, 'Expected roiProjection');
  assert.ok('totalMinutesInBatch' in deep.roiProjection);
  assert.ok('automatableMinutes' in deep.roiProjection);
  assert.ok('annualCostSavings' in deep.roiProjection);
});

test('getDeepAnalytics includes timeAnalysis', () => {
  const tickets = [
    makeTicket({
      id: 1, title: 'Password reset locked out user',
      workedHours: 0.5,
    }),
  ];
  const analyzed = analyzeTickets(tickets);
  const deep = getDeepAnalytics(analyzed, tickets);
  assert.ok(deep.timeAnalysis, 'Expected timeAnalysis');
  assert.ok(deep.timeAnalysis.summary, 'Expected timeAnalysis.summary');
  assert.ok(deep.timeAnalysis.summary.ticketsWithTime >= 1);
});

test('getDeepAnalytics includes quickHitterValidation', () => {
  const tickets = [
    makeTicket({ id: 1, title: 'Password reset locked out user', workedHours: 0.1 }),
  ];
  const analyzed = analyzeTickets(tickets);
  const deep = getDeepAnalytics(analyzed, tickets);
  assert.ok(deep.quickHitterValidation, 'Expected quickHitterValidation');
  assert.ok(deep.quickHitterValidation.totalPredicted >= 1);
});

test('getDeepAnalytics includes overviewCharts', () => {
  const tickets = [
    makeTicket({ id: 1, title: 'Password reset locked out user' }),
  ];
  const analyzed = analyzeTickets(tickets);
  const deep = getDeepAnalytics(analyzed, tickets);
  assert.ok(deep.overviewCharts, 'Expected overviewCharts');
  assert.ok(Array.isArray(deep.overviewCharts.automationScoreDistribution));
  assert.ok(deep.overviewCharts.quickHitterSplit, 'Expected quickHitterSplit');
  assert.ok(deep.overviewCharts.piaCoverage, 'Expected piaCoverage');
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Edge cases & integration
// ═══════════════════════════════════════════════════════════════════════
console.log('\n--- Edge Cases & Integration ---\n');

test('analyzeTicket handles empty ticket gracefully', () => {
  const result = analyzeTicket(makeTicket({}));
  assert.ok(result.category, 'Should have a category');
  assert.ok(typeof result.automationScore === 'number');
  assert.ok(typeof result.isQuickHitter === 'boolean');
});

test('analyzeTickets sorts quick hitters first', () => {
  const tickets = [
    makeTicket({ id: 1, title: 'Random gibberish nothing here' }),
    makeTicket({ id: 2, title: 'Password reset locked out user' }),
  ];
  const results = analyzeTickets(tickets);
  assert.strictEqual(results[0].isQuickHitter, true,
    'First result should be a quick hitter');
});

test('analyzeTickets sorts by automation score within same quick-hitter status', () => {
  const tickets = [
    makeTicket({ id: 1, title: 'Network connectivity issues vpn' }),     // score 70
    makeTicket({ id: 2, title: 'Password reset locked out user' }),       // score 95
  ];
  const results = analyzeTickets(tickets);
  // Both are quick hitters; password_reset (95) should come before network (70)
  assert.ok(results[0].automationScore >= results[1].automationScore,
    `Expected first result score (${results[0].automationScore}) >= second (${results[1].automationScore})`);
});

test('CATEGORY_PATTERNS is an array with expected entries', () => {
  assert.ok(Array.isArray(CATEGORY_PATTERNS), 'CATEGORY_PATTERNS should be an array');
  assert.ok(CATEGORY_PATTERNS.length >= 10, `Expected at least 10 categories, got ${CATEGORY_PATTERNS.length}`);
  const categories = CATEGORY_PATTERNS.map(p => p.category);
  assert.ok(categories.includes('password_reset'));
  assert.ok(categories.includes('printer'));
  assert.ok(categories.includes('disk_space'));
  assert.ok(categories.includes('network'));
  assert.ok(categories.includes('email'));
  assert.ok(categories.includes('teams'));
});

test('RESOLUTION_SCRIPTS is an array with expected entries', () => {
  assert.ok(Array.isArray(RESOLUTION_SCRIPTS), 'RESOLUTION_SCRIPTS should be an array');
  assert.ok(RESOLUTION_SCRIPTS.length >= 10, `Expected at least 10 scripts, got ${RESOLUTION_SCRIPTS.length}`);
  const names = RESOLUTION_SCRIPTS.map(s => s.name);
  assert.ok(names.includes('reset-user-password.ps1'));
  assert.ok(names.includes('clear-print-spooler.ps1'));
  assert.ok(names.includes('clear-disk-space.ps1'));
});

test('analyzeTicket returns all expected fields', () => {
  const result = analyzeTicket(makeTicket({ title: 'Password reset locked out' }));
  const expectedFields = [
    'ticketId', 'ticketNumber', 'title', 'description', 'resolution',
    'status', 'priority', 'category', 'categoryLabel', 'estimatedMinutes',
    'automationScore', 'isQuickHitter', 'matchConfidence', 'suggestedScripts',
    'automationReadiness', 'automationPath', 'resolutionAnalysis',
    'usedPIA', 'piaIndicator', 'piaSource',
  ];
  for (const field of expectedFields) {
    assert.ok(field in result, `Expected field "${field}" in analyzeTicket result`);
  }
});

test('Automation score is always 0-100', () => {
  const extremeTickets = [
    makeTicket({ title: 'Password reset', resolution: 'Reset password, ran script, cleared cache, flushed dns, rebooted' }),
    makeTicket({ title: 'Something', resolution: 'Escalated, hardware replacement, on-site, custom script, reimaged, data recovery' }),
  ];
  for (const ticket of extremeTickets) {
    const result = analyzeTicket(ticket);
    assert.ok(result.automationScore >= 0, `Score should be >= 0, got ${result.automationScore}`);
    assert.ok(result.automationScore <= 100, `Score should be <= 100, got ${result.automationScore}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// Results
// ═══════════════════════════════════════════════════════════════════════

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
}
process.exit(failed > 0 ? 1 : 0);
