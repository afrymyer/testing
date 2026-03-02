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
    keywords: ['restart service', 'service stopped', 'service not running', 'windows service', 'service failed', 'service hung', 'service crashed', 'agent stopped', 'agent service'],
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
    keywords: ['reboot', 'restart computer', 'needs reboot', 'slow computer', 'running slow', 'not been rebooted', 'needs restart', 'uptime'],
    avgMinutes: 5,
    automationScore: 95,
  },
];

/**
 * Determine automation readiness level and recommended path.
 */
function getAutomationReadiness(pattern, scripts, confidence) {
  const hasScripts = scripts.length > 0;
  const highScore = pattern.automationScore >= 80;
  const goodConfidence = confidence >= 40;
  // Factor in script relevance - high relevance means symptom match, not just category
  const topScriptRelevance = hasScripts ? (scripts[0].relevance || 0) : 0;
  const strongScriptMatch = topScriptRelevance >= 60;

  if (hasScripts && highScore && goodConfidence && strongScriptMatch) {
    return {
      level: 'auto_ready',
      label: 'Auto-Ready',
      path: `Run ${scripts[0].label} via ${scripts[0].type === 'datto' ? 'Datto RMM' : 'PIA/M365 Admin'}. ` +
            `This ${pattern.label.toLowerCase()} task is highly automatable (~${pattern.avgMinutes} min manual). ` +
            `${scripts[0].resolves ? scripts[0].resolves + '. ' : ''}` +
            `${scripts[0].requires ? 'Requires: ' + scripts[0].requires + '.' : ''}`,
    };
  }

  if (hasScripts && (highScore || goodConfidence) && topScriptRelevance >= 25) {
    return {
      level: 'semi_auto',
      label: 'Semi-Auto',
      path: `Script available (${scripts[0].label}) but may require manual verification or follow-up steps. ` +
            `${scripts[0].resolves ? scripts[0].resolves + '. ' : ''}` +
            `Automate the initial ${pattern.avgMinutes}-min task, then confirm resolution with the end user.`,
    };
  }

  if (hasScripts) {
    return {
      level: 'script_assist',
      label: 'Script-Assisted',
      path: `Scripts available but low match confidence (${topScriptRelevance}%). Review ticket details, then use ${scripts[0].label} if applicable. ` +
            `${scripts[0].resolves ? 'Script does: ' + scripts[0].resolves : ''}`,
    };
  }

  return {
    level: 'manual',
    label: 'Manual',
    path: 'No automation scripts mapped for this category yet. Consider building a script if this ticket type recurs frequently.',
  };
}

/**
 * Resolution patterns: what the tech actually did.
 * If the resolution matches a known automatable action, score goes UP.
 * If it matches a manual/escalation action, score goes DOWN.
 */
const RESOLUTION_INDICATORS = {
  // Resolutions that prove automation is viable (boost score)
  automatable: [
    { keywords: ['reset password', 'password reset', 'unlocked account', 'account unlocked', 'reset credentials'], boost: 20 },
    { keywords: ['cleared print spooler', 'restarted print spooler', 'cleared print queue', 'print spooler restart'], boost: 20 },
    { keywords: ['cleared cache', 'cache cleared', 'cleared teams cache', 'cleared outlook cache', 'cleared browser cache'], boost: 20 },
    { keywords: ['disk cleanup', 'cleared temp files', 'freed up space', 'cleaned disk', 'removed temp files', 'emptied recycle bin'], boost: 20 },
    { keywords: ['flushed dns', 'dns flush', 'ipconfig /flushdns', 'renewed dhcp', 'reset winsock', 'reset network stack'], boost: 20 },
    { keywords: ['restarted service', 'service restarted', 'started service', 'service started'], boost: 20 },
    { keywords: ['gpupdate', 'group policy update', 'policy refreshed'], boost: 15 },
    { keywords: ['rebooted', 'restarted computer', 'restarted workstation', 'restarted pc', 'restarted machine', 'reboot resolved'], boost: 15 },
    { keywords: ['ran script', 'executed script', 'deployed script', 'ran powershell', 'script completed'], boost: 25 },
    { keywords: ['repaired office', 'office repair', 'click to run repair', 'online repair'], boost: 15 },
    { keywords: ['mapped drive', 'drive mapped', 'created drive mapping', 'mapped network drive'], boost: 15 },
    { keywords: ['installed printer', 'added printer', 'printer installed', 'printer added'], boost: 15 },
    { keywords: ['installed software', 'software installed', 'deployed application', 'app installed'], boost: 10 },
    { keywords: ['set out of office', 'configured auto reply', 'enabled out of office'], boost: 20 },
    { keywords: ['disabled account', 'account disabled', 'removed from groups', 'moved to disabled ou'], boost: 15 },
    { keywords: ['created account', 'account created', 'new user setup', 'assigned license'], boost: 15 },
  ],
  // Resolutions that indicate manual/complex work (reduce score)
  manual: [
    { keywords: ['escalated', 'escalated to', 'referred to vendor', 'engaged vendor', 'vendor ticket'], penalty: 30 },
    { keywords: ['hardware replacement', 'replaced hardware', 'rma', 'sent for repair', 'physical repair', 'replaced drive', 'replaced device'], penalty: 40 },
    { keywords: ['on-site', 'onsite', 'visited desk', 'went to user', 'in-person', 'walked to', 'hands on'], penalty: 25 },
    { keywords: ['custom script', 'custom fix', 'unique issue', 'one-off', 'edge case', 'unusual'], penalty: 20 },
    { keywords: ['training', 'showed user', 'educated user', 'walked through', 'user training', 'end user education'], penalty: 15 },
    { keywords: ['configuration change', 'registry edit', 'manual config', 'custom configuration', 'complex setup'], penalty: 15 },
    { keywords: ['data recovery', 'restored from backup', 'backup restore', 'file recovery'], penalty: 20 },
    { keywords: ['reimaged', 'rebuilt machine', 'fresh install', 'os reinstall', 'wiped and reinstalled'], penalty: 35 },
    { keywords: ['troubleshot extensively', 'multiple attempts', 'root cause analysis', 'deep dive', 'investigated'], penalty: 10 },
    { keywords: ['coordinated with', 'worked with client', 'client meeting', 'project work'], penalty: 20 },
  ],
};

/**
 * Score the resolution text to adjust the base automation score.
 * Returns { adjustment, reasons } where adjustment is positive (automatable)
 * or negative (manual) and reasons explains what was detected.
 */
function scoreResolution(resolutionText) {
  if (!resolutionText) return { adjustment: 0, reasons: [] };

  const text = resolutionText.toLowerCase();
  let adjustment = 0;
  const reasons = [];

  for (const indicator of RESOLUTION_INDICATORS.automatable) {
    for (const kw of indicator.keywords) {
      if (text.includes(kw)) {
        adjustment += indicator.boost;
        reasons.push(`Resolution indicates automatable action: "${kw}"`);
        break; // only count each indicator group once
      }
    }
  }

  for (const indicator of RESOLUTION_INDICATORS.manual) {
    for (const kw of indicator.keywords) {
      if (text.includes(kw)) {
        adjustment -= indicator.penalty;
        reasons.push(`Resolution indicates manual work: "${kw}"`);
        break;
      }
    }
  }

  return { adjustment, reasons };
}

/**
 * Detect whether PIA (Process Intelligent Automation) or Datto RMM
 * automation was used to resolve a ticket by scanning resolution and
 * description text for automation platform indicators.
 */
const PIA_INDICATORS = [
  'pia', 'process intelligent automation', 'automated via',
  'ran script', 'executed script', 'automation script', 'auto-remediated',
  'auto remediated', 'script ran', 'script executed', 'powershell script',
  'datto rmm', 'rmm script', 'rmm job', 'component ran', 'datto job',
  'automated fix', 'automated resolution', 'self-heal', 'auto-resolved',
  'bulk action', 'm365 admin', 'pia portal',
];

function detectPIA(ticket) {
  const text = [
    ticket.resolution || '',
    ticket.description || '',
  ].join(' ').toLowerCase();

  for (const kw of PIA_INDICATORS) {
    if (text.includes(kw)) {
      return { usedPIA: true, piaIndicator: kw };
    }
  }
  return { usedPIA: false, piaIndicator: null };
}

/**
 * Score the client description for specificity — more detail about a
 * known problem pattern means higher confidence the category is right.
 * Returns a confidence bonus (0-20).
 */
function scoreDescription(descriptionText, pattern) {
  if (!descriptionText || !pattern) return 0;

  const text = descriptionText.toLowerCase();
  let bonus = 0;

  // Count how many distinct keywords from the matched pattern appear in description alone
  let descHits = 0;
  for (const kw of pattern.keywords) {
    if (text.includes(kw)) descHits++;
  }

  // If the description itself (not just title) matches multiple keywords, confidence is higher
  if (descHits >= 3) bonus += 15;
  else if (descHits >= 2) bonus += 10;
  else if (descHits >= 1) bonus += 5;

  // Check if description has actionable detail (longer descriptions with relevant context)
  if (text.length > 100 && descHits > 0) bonus += 5;

  return Math.min(bonus, 20);
}

/**
 * Analyze a single ticket and return categorization + scoring.
 */
function analyzeTicket(ticket) {
  const title = (ticket.title || '').toLowerCase();
  const description = (ticket.description || '').toLowerCase();
  const resolution = (ticket.resolution || '').toLowerCase();
  const combined = `${title} ${description} ${resolution}`;

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

  // Resolution-focused script matching: scan title, description, AND resolution
  const symptomScripts = getMatchedScripts(ticket.title, ticket.description, ticket.resolution);

  // Score the resolution text for automation indicators
  const resolutionScore = scoreResolution(ticket.resolution);

  // Detect PIA / automation platform usage
  const piaResult = detectPIA(ticket);

  // No category match at all
  if (!bestMatch || bestScore === 0) {
    const hasScriptMatch = symptomScripts.length > 0 && symptomScripts[0].relevance >= 25;
    // Even with no category, resolution data can tell us about automation potential
    const baseScore = hasScriptMatch ? Math.min(symptomScripts[0].relevance, 50) : 0;
    const adjustedScore = Math.max(0, Math.min(100, baseScore + resolutionScore.adjustment));

    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description || '',
      resolution: ticket.resolution || '',
      status: ticket.status,
      priority: ticket.priority,
      queueID: ticket.queueID || null,
      createDate: ticket.createDate || null,
      assignedResourceID: ticket.assignedResourceID || null,
      companyID: ticket.companyID || null,
      companyName: ticket.companyName || null,
      issueType: ticket.issueType || null,
      subIssueType: ticket.subIssueType || null,
      issueTypeName: ticket.issueTypeName || null,
      subIssueTypeName: ticket.subIssueTypeName || null,
      workedHours: ticket.workedHours || 0,
      firstResponseDateTime: ticket.firstResponseDateTime || null,
      resolutionPlanDateTime: ticket.resolutionPlanDateTime || null,
      resolutionPlanHours: ticket.resolutionPlanHours ?? null,
      resolvedDateTime: ticket.resolvedDateTime || null,
      serviceLevelAgreementHasBeenMet: ticket.serviceLevelAgreementHasBeenMet ?? null,
      category: 'uncategorized',
      categoryLabel: 'Needs Review',
      estimatedMinutes: hasScriptMatch ? symptomScripts[0].manualMinutes : null,
      automationScore: adjustedScore,
      isQuickHitter: false,
      matchConfidence: 0,
      suggestedScripts: hasScriptMatch ? symptomScripts : [],
      scriptMatchType: hasScriptMatch ? 'symptom' : 'none',
      automationReadiness: hasScriptMatch ? 'script_assist' : 'needs_review',
      automationReadinessLabel: hasScriptMatch ? 'Script-Assisted' : 'Needs Review',
      automationPath: hasScriptMatch
        ? `No strong category match, but symptom analysis found a potential script: ${symptomScripts[0].label}. Review ticket details before running.`
        : 'This ticket does not match any known automation patterns. Manual review required to determine resolution path.',
      resolutionAnalysis: resolutionScore.reasons,
      quickWinValue: 0,
    };
  }

  const confidence = Math.min(100, Math.round((bestScore / bestMatch.keywords.length) * 100));

  // CONFIDENCE FLOOR: If category match is very weak (only 1 generic keyword hit
  // with low confidence), downgrade to "Needs Review" instead of force-categorizing
  if (bestScore === 1 && confidence < 15) {
    const hasScriptMatch = symptomScripts.length > 0 && symptomScripts[0].relevance >= 25;

    const baseScore = hasScriptMatch ? Math.min(symptomScripts[0].relevance, 40) : 0;
    const adjustedScore = Math.max(0, Math.min(100, baseScore + resolutionScore.adjustment));

    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description || '',
      resolution: ticket.resolution || '',
      status: ticket.status,
      priority: ticket.priority,
      queueID: ticket.queueID || null,
      createDate: ticket.createDate || null,
      assignedResourceID: ticket.assignedResourceID || null,
      workedHours: ticket.workedHours || 0,
      firstResponseDateTime: ticket.firstResponseDateTime || null,
      resolutionPlanDateTime: ticket.resolutionPlanDateTime || null,
      resolutionPlanHours: ticket.resolutionPlanHours ?? null,
      resolvedDateTime: ticket.resolvedDateTime || null,
      serviceLevelAgreementHasBeenMet: ticket.serviceLevelAgreementHasBeenMet ?? null,
      category: 'low_confidence',
      categoryLabel: 'Needs Review',
      estimatedMinutes: hasScriptMatch ? symptomScripts[0].manualMinutes : null,
      automationScore: adjustedScore,
      isQuickHitter: false,
      matchConfidence: confidence,
      suggestedScripts: hasScriptMatch ? symptomScripts : [],
      scriptMatchType: hasScriptMatch ? 'symptom_weak' : 'none',
      automationReadiness: hasScriptMatch ? 'script_assist' : 'needs_review',
      automationReadinessLabel: hasScriptMatch ? 'Script-Assisted' : 'Needs Review',
      automationPath: hasScriptMatch
        ? `Weak category match (${bestMatch.label} at ${confidence}% confidence). Symptom analysis suggests ${symptomScripts[0].label} may help. Review before running.`
        : `Weak match to "${bestMatch.label}" (${confidence}% confidence). Not enough signal to recommend automation. Manual review needed.`,
      resolutionAnalysis: resolutionScore.reasons,
      quickWinValue: 0,
      usedPIA: piaResult.usedPIA,
      piaIndicator: piaResult.piaIndicator,
    };
  }

  const isQuickHitter = bestMatch.avgMinutes >= 5 && bestMatch.avgMinutes <= 20;

  // Only use scripts that actually match symptoms in the ticket text.
  // NO category fallback - if symptom matching found nothing, show empty scripts.
  // This prevents force-fitting scripts to tickets they can't actually resolve.
  const finalScripts = symptomScripts.length > 0 ? symptomScripts : [];

  // Adjust automation score based on resolution + description analysis
  const descriptionBonus = scoreDescription(ticket.description, bestMatch);
  const adjustedConfidence = Math.min(100, confidence + descriptionBonus);
  const adjustedAutoScore = Math.max(0, Math.min(100,
    bestMatch.automationScore + resolutionScore.adjustment
  ));

  // Automation readiness tagging (use adjusted score context)
  const readiness = getAutomationReadiness(
    { ...bestMatch, automationScore: adjustedAutoScore },
    finalScripts,
    adjustedConfidence
  );

  return {
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    description: ticket.description || '',
    resolution: ticket.resolution || '',
    status: ticket.status,
    priority: ticket.priority,
    queueID: ticket.queueID || null,
    createDate: ticket.createDate || null,
    assignedResourceID: ticket.assignedResourceID || null,
    companyID: ticket.companyID || null,
    companyName: ticket.companyName || null,
    issueType: ticket.issueType || null,
    subIssueType: ticket.subIssueType || null,
    issueTypeName: ticket.issueTypeName || null,
    subIssueTypeName: ticket.subIssueTypeName || null,
    workedHours: ticket.workedHours || 0,
    firstResponseDateTime: ticket.firstResponseDateTime || null,
    resolutionPlanDateTime: ticket.resolutionPlanDateTime || null,
    resolutionPlanHours: ticket.resolutionPlanHours ?? null,
    resolvedDateTime: ticket.resolvedDateTime || null,
    serviceLevelAgreementHasBeenMet: ticket.serviceLevelAgreementHasBeenMet ?? null,
    category: bestMatch.category,
    categoryLabel: bestMatch.label,
    estimatedMinutes: bestMatch.avgMinutes,
    automationScore: adjustedAutoScore,
    isQuickHitter,
    matchConfidence: adjustedConfidence,
    suggestedScripts: finalScripts,
    scriptMatchType: finalScripts.length > 0 ? 'symptom' : 'none',
    automationReadiness: readiness.level,
    automationReadinessLabel: readiness.label,
    automationPath: readiness.path,
    resolutionAnalysis: resolutionScore.reasons,
    quickWinValue: isQuickHitter ? Math.round((adjustedAutoScore * (20 - bestMatch.avgMinutes + 1) * adjustedConfidence) / 100) : 0,
    usedPIA: piaResult.usedPIA,
    piaIndicator: piaResult.piaIndicator,
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
  const issueTypeBreakdown = {};

  for (const t of analyzedTickets) {
    if (t.categoryLabel !== 'Needs Review' && t.categoryLabel !== 'Uncategorized') {
      categories[t.categoryLabel] = (categories[t.categoryLabel] || 0) + 1;
    }

    // Build issue type / sub-issue type breakdown
    const issueName = t.issueTypeName || null;
    const subIssueName = t.subIssueTypeName || null;
    if (issueName) {
      const label = subIssueName ? `${issueName} / ${subIssueName}` : issueName;
      issueTypeBreakdown[label] = (issueTypeBreakdown[label] || 0) + 1;
    }
  }

  return {
    totalTickets: analyzedTickets.length,
    quickHitterCount: quickHitters.length,
    automatableCount: automatable.length,
    estimatedTimeSaved: quickHitters.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0),
    categoryBreakdown: categories,
    issueTypeBreakdown,
    avgAutomationScore: analyzedTickets.length
      ? Math.round(analyzedTickets.reduce((s, t) => s + t.automationScore, 0) / analyzedTickets.length)
      : 0,
  };
}

/**
 * Resolution-focused script matching.
 * Instead of mapping category → scripts, we match the actual problem
 * described in the ticket to scripts that specifically resolve that problem.
 */
const RESOLUTION_SCRIPTS = [
  {
    name: 'reset-user-password.ps1',
    type: 'datto',
    label: 'Reset AD Password & Unlock',
    resolves: 'Resets AD password, unlocks locked accounts, forces password change at next logon',
    requires: 'Username, new password, Domain Admin credentials',
    // Symptoms this script actually fixes
    symptoms: ['locked out', 'account locked', 'password reset', 'expired password', 'forgot password', 'cannot login', 'login failed', 'credential', 'unlock account'],
    manualMinutes: 5,
  },
  {
    name: 'clear-print-spooler.ps1',
    type: 'datto',
    label: 'Clear Print Spooler',
    resolves: 'Stops Print Spooler service, clears stuck print jobs from spool directory, restarts service',
    requires: 'Admin access to workstation',
    symptoms: ['print spooler', 'stuck in queue', 'print job stuck', 'not printing', 'printer not working', 'print queue', 'printer offline', 'paper jam'],
    manualMinutes: 5,
  },
  {
    name: 'install-printer.ps1',
    type: 'datto',
    label: 'Install Network Printer',
    resolves: 'Creates TCP/IP port, installs printer driver, optionally sets as default. Tests connectivity first',
    requires: 'Printer name, printer IP, driver name (optional)',
    symptoms: ['add printer', 'install printer', 'new printer', 'map printer', 'setup printer', 'printer at ip'],
    manualMinutes: 10,
  },
  {
    name: 'clear-disk-space.ps1',
    type: 'datto',
    label: 'Clean Disk Space',
    resolves: 'Clears temp files, browser caches (Chrome/Edge), user temp folders. Optionally clears Windows Update cache and Recycle Bin',
    requires: 'Admin access to workstation',
    symptoms: ['disk space', 'low disk', 'storage full', 'c: drive', 'disk full', 'temp files', 'cleanup', 'low space', 'drive full', 'recycle bin'],
    manualMinutes: 10,
  },
  {
    name: 'flush-dns-reset-network.ps1',
    type: 'datto',
    label: 'Flush DNS & Reset Network',
    resolves: 'Flushes DNS cache, releases/renews DHCP lease. Full reset includes Winsock and TCP/IP stack reset',
    requires: 'Admin access; full reset requires reboot',
    symptoms: ['dns', 'cannot connect', 'no internet', 'vpn', 'connectivity', 'slow network', 'network issue', 'ip address', 'dhcp', 'timeout', 'name resolution'],
    manualMinutes: 5,
  },
  {
    name: 'clear-outlook-cache.ps1',
    type: 'datto',
    label: 'Clear Outlook Cache & Rebuild OST',
    resolves: 'Closes Outlook, clears RoamCache. Optionally renames OST files to force full re-sync from Exchange',
    requires: 'Admin access; Outlook will be closed',
    symptoms: ['outlook crash', 'outlook slow', 'outlook not opening', 'outlook sync', 'ost', 'outlook cache', 'outlook keeps crashing', 'outlook hang', 'outlook freeze'],
    manualMinutes: 10,
  },
  {
    name: 'set-out-of-office.ps1',
    type: 'pia',
    label: 'Set Out of Office Reply',
    resolves: 'Enables/disables/schedules automatic reply in Exchange Online with separate internal and external messages',
    requires: 'User email, Exchange Online access',
    symptoms: ['out of office', 'auto reply', 'vacation', 'ooo', 'automatic reply', 'away message'],
    manualMinutes: 5,
  },
  {
    name: 'export-mailbox-permissions.ps1',
    type: 'pia',
    label: 'Export Mailbox Permissions Report',
    resolves: 'Exports CSV of Full Access, Send As, Send on Behalf permissions for one or all mailboxes',
    requires: 'Exchange Online access; optionally specific user email',
    symptoms: ['mailbox permission', 'shared mailbox', 'send as', 'full access', 'permission report', 'audit', 'mailbox access', 'delegation'],
    manualMinutes: 15,
  },
  {
    name: 'clear-teams-cache.ps1',
    type: 'datto',
    label: 'Clear Teams Cache',
    resolves: 'Stops Teams, clears cache for both Teams 2.0 and classic Teams, clears DNS cache and storage DBs',
    requires: 'Admin access; Teams will be closed',
    symptoms: ['teams cache', 'teams not working', 'teams crash', 'teams blank', 'teams white screen', 'teams slow', 'teams audio', 'teams video', 'teams not loading'],
    manualMinutes: 5,
  },
  {
    name: 'repair-office-apps.ps1',
    type: 'datto',
    label: 'Repair Office Installation',
    resolves: 'Runs Click-to-Run Quick or Online repair. Closes all Office apps before repair',
    requires: 'Admin access; all Office apps will be closed',
    symptoms: ['office repair', 'office crash', 'excel crash', 'word crash', 'powerpoint crash', 'office license', 'activation', 'office not working', 'office error'],
    manualMinutes: 15,
  },
  {
    name: 'restart-service.ps1',
    type: 'datto',
    label: 'Restart Windows Service',
    resolves: 'Gracefully stops and restarts any Windows service with timeout handling and optional force-kill',
    requires: 'Service name, admin access',
    symptoms: ['service stopped', 'service not running', 'restart service', 'service hung', 'service failed', 'service crashed', 'backup agent stopped', 'windows service stopped', 'agent stopped'],
    manualMinutes: 5,
  },
  {
    name: 'force-group-policy-update.ps1',
    type: 'datto',
    label: 'Force Group Policy Update',
    resolves: 'Runs gpupdate /force and displays applied Computer and User GPOs',
    requires: 'Admin access to workstation',
    symptoms: ['group policy', 'gpupdate', 'gpo', 'policy not applying', 'drive mapping not working', 'ou move'],
    manualMinutes: 5,
  },
  {
    name: 'map-network-drive.ps1',
    type: 'datto',
    label: 'Map Network Drive',
    resolves: 'Maps UNC path to drive letter with optional credentials and persistence. Tests connectivity first',
    requires: 'Drive letter, UNC path, optional credentials',
    symptoms: ['map drive', 'network drive', 'shared drive', 'map network', 'unc path', 'file share', 'mapped drive'],
    manualMinutes: 5,
  },
  {
    name: 'bulk-user-onboard.ps1',
    type: 'pia',
    label: 'Onboard User (AD + M365)',
    resolves: 'Creates AD account, generates username/UPN, assigns OU, adds to security groups, sets temp password, assigns M365 license',
    requires: 'First name, last name, department, Domain Admin + M365 admin access',
    symptoms: ['new user', 'onboard', 'new hire', 'new employee', 'setup account', 'create user', 'new starter', 'starting monday'],
    manualMinutes: 20,
  },
  {
    name: 'disable-user-offboard.ps1',
    type: 'pia',
    label: 'Offboard User (AD + M365)',
    resolves: 'Disables AD account, removes from all groups, moves to disabled OU, randomizes password, provides Exchange commands for mailbox conversion/forwarding',
    requires: 'Username, Domain Admin + M365 admin access',
    symptoms: ['offboard', 'terminate', 'disable account', 'departed', 'leaving', 'last day', 'remove access', 'employee departure'],
    manualMinutes: 15,
  },
  {
    name: 'check-disk-health.ps1',
    type: 'datto',
    label: 'Check Disk Health (SMART)',
    resolves: 'Checks physical disk SMART status, volume health, free space warnings, and recent disk errors from Event Log',
    requires: 'Admin access to workstation',
    symptoms: ['smart', 'disk health', 'hard drive', 'ssd health', 'chkdsk', 'bad sectors', 'disk error', 'disk warning', 'drive failing', 'smart failure'],
    manualMinutes: 5,
  },
];

/**
 * Match scripts to a ticket based on actual symptoms described,
 * not just the category. Returns only scripts that can actually
 * resolve the described problem, with a relevance score.
 */
function getMatchedScripts(title, description, resolution) {
  const combined = `${(title || '').toLowerCase()} ${(description || '').toLowerCase()} ${(resolution || '').toLowerCase()}`;
  const matched = [];

  for (const script of RESOLUTION_SCRIPTS) {
    let hitCount = 0;
    const matchedSymptoms = [];

    for (const symptom of script.symptoms) {
      if (combined.includes(symptom)) {
        hitCount++;
        matchedSymptoms.push(symptom);
      }
    }

    if (hitCount > 0) {
      const relevance = Math.min(100, Math.round((hitCount / Math.min(script.symptoms.length, 4)) * 100));
      matched.push({
        name: script.name,
        type: script.type,
        label: script.label,
        resolves: script.resolves,
        requires: script.requires,
        relevance,
        matchedSymptoms,
        manualMinutes: script.manualMinutes,
      });
    }
  }

  // Sort by relevance so the best match is first
  matched.sort((a, b) => b.relevance - a.relevance);
  return matched;
}

/**
 * Legacy category-based script lookup (fallback).
 */
function getSuggestedScripts(category) {
  const scriptMap = {
    password_reset: [RESOLUTION_SCRIPTS[0]],
    printer: [RESOLUTION_SCRIPTS[1], RESOLUTION_SCRIPTS[2]],
    disk_space: [RESOLUTION_SCRIPTS[3]],
    network: [RESOLUTION_SCRIPTS[4]],
    email: [RESOLUTION_SCRIPTS[5], RESOLUTION_SCRIPTS[6], RESOLUTION_SCRIPTS[7]],
    teams: [RESOLUTION_SCRIPTS[8]],
    office_apps: [RESOLUTION_SCRIPTS[9]],
    service_restart: [RESOLUTION_SCRIPTS[10]],
    group_policy: [RESOLUTION_SCRIPTS[11], RESOLUTION_SCRIPTS[12]],
    user_onboard: [RESOLUTION_SCRIPTS[13]],
    user_offboard: [RESOLUTION_SCRIPTS[14]],
    disk_health: [RESOLUTION_SCRIPTS[15]],
    reboot: [RESOLUTION_SCRIPTS[10]],
  };
  return (scriptMap[category] || []).map(s => ({
    name: s.name, type: s.type, label: s.label,
    resolves: s.resolves, requires: s.requires,
    relevance: 50, matchedSymptoms: [], manualMinutes: s.manualMinutes,
  }));
}

/**
 * Get deep analytics for a batch of analyzed tickets.
 * Includes trend data, priority breakdown, ROI projections, and top opportunities.
 */
function getDeepAnalytics(analyzedTickets, rawTickets = [], options = {}) {
  // Priority breakdown — use dynamic map from Autotask picklist if provided, else fallback for demo
  const priorityMap = options.priorityMap || { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' };
  const priorityBreakdown = {};
  for (const t of analyzedTickets) {
    const pLabel = priorityMap[t.priority] || `Priority ${t.priority || 'None'}`;
    priorityBreakdown[pLabel] = (priorityBreakdown[pLabel] || 0) + 1;
  }

  // Category deep stats (count, avg automation score, total time saveable)
  const categoryStats = {};
  const issueTypeStats = {};
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

    // Issue type / sub-issue type stats
    const issueName = t.issueTypeName || null;
    const subIssueName = t.subIssueTypeName || null;
    if (issueName) {
      const label = subIssueName ? `${issueName} / ${subIssueName}` : issueName;
      if (!issueTypeStats[label]) {
        issueTypeStats[label] = { count: 0, totalAutomationScore: 0, totalMinutes: 0, quickHitters: 0 };
      }
      const its = issueTypeStats[label];
      its.count++;
      its.totalAutomationScore += t.automationScore;
      its.totalMinutes += t.estimatedMinutes || 0;
      if (t.isQuickHitter) its.quickHitters++;
    }
  }

  const categoryDeepBreakdown = Object.entries(categoryStats)
    .filter(([label]) => label !== 'Needs Review' && label !== 'Uncategorized')
    .map(([label, stats]) => ({
      category: label,
      count: stats.count,
      avgAutomationScore: stats.count ? Math.round(stats.totalAutomationScore / stats.count) : 0,
      totalMinutesSaveable: stats.totalMinutes,
      quickHitters: stats.quickHitters,
      pctOfTotal: analyzedTickets.length ? Math.round((stats.count / analyzedTickets.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const issueTypeDeepBreakdown = Object.entries(issueTypeStats)
    .map(([label, stats]) => ({
      issueType: label,
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
    .filter(c => c.category !== 'Uncategorized' && c.category !== 'Needs Review')
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

  // ── Time Analysis: actual vs expected vs budgeted ──
  const timeByCategory = {};
  const timeLeaks = [];

  for (const t of analyzedTickets) {
    if (t.categoryLabel === 'Needs Review' || t.categoryLabel === 'Uncategorized') continue;
    const actualMin = (t.workedHours || 0) * 60;
    const expectedMin = t.estimatedMinutes || 0;
    const budgetedMin = (t.resolutionPlanHours != null ? t.resolutionPlanHours : 0) * 60;

    if (!timeByCategory[t.categoryLabel]) {
      timeByCategory[t.categoryLabel] = {
        count: 0,
        totalActual: 0,
        totalExpected: 0,
        totalBudgeted: 0,
        ticketsWithTime: 0,
        ticketsWithBudget: 0,
      };
    }
    const tc = timeByCategory[t.categoryLabel];
    tc.count++;
    if (actualMin > 0) { tc.totalActual += actualMin; tc.ticketsWithTime++; }
    tc.totalExpected += expectedMin;
    if (budgetedMin > 0) { tc.totalBudgeted += budgetedMin; tc.ticketsWithBudget++; }

    // Flag time leaks: actual time significantly exceeds expected time
    if (actualMin > 0 && expectedMin > 0) {
      const overageMin = actualMin - expectedMin;
      const overagePct = Math.round((overageMin / expectedMin) * 100);
      if (overagePct > 50 && overageMin > 10) {
        timeLeaks.push({
          ticketId: t.ticketId,
          ticketNumber: t.ticketNumber,
          title: t.title,
          category: t.categoryLabel,
          actualMinutes: Math.round(actualMin),
          expectedMinutes: expectedMin,
          budgetedMinutes: budgetedMin > 0 ? Math.round(budgetedMin) : null,
          overageMinutes: Math.round(overageMin),
          overagePct,
          assignedResourceID: t.assignedResourceID,
          resolution: t.resolution || '',
          resolutionAnalysis: t.resolutionAnalysis || [],
        });
      }
    }
  }

  const timeCategoryBreakdown = Object.entries(timeByCategory)
    .map(([label, tc]) => ({
      category: label,
      count: tc.count,
      avgActualMin: tc.ticketsWithTime ? Math.round(tc.totalActual / tc.ticketsWithTime) : 0,
      avgExpectedMin: tc.count ? Math.round(tc.totalExpected / tc.count) : 0,
      avgBudgetedMin: tc.ticketsWithBudget ? Math.round(tc.totalBudgeted / tc.ticketsWithBudget) : 0,
      totalActualMin: Math.round(tc.totalActual),
      totalExpectedMin: Math.round(tc.totalExpected),
      totalBudgetedMin: Math.round(tc.totalBudgeted),
      ticketsWithTime: tc.ticketsWithTime,
      ticketsWithBudget: tc.ticketsWithBudget,
      efficiencyPct: tc.ticketsWithTime && tc.totalExpected > 0
        ? Math.round((tc.totalExpected / tc.totalActual) * 100)
        : null,
    }))
    .sort((a, b) => b.totalActualMin - a.totalActualMin);

  // Summary stats
  const ticketsWithTime = analyzedTickets.filter(t => (t.workedHours || 0) > 0 && t.categoryLabel !== 'Needs Review' && t.categoryLabel !== 'Uncategorized');
  const totalActualMin = ticketsWithTime.reduce((s, t) => s + (t.workedHours || 0) * 60, 0);
  const totalExpectedMin = ticketsWithTime.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
  const totalOverageMin = totalActualMin - totalExpectedMin;

  const timeAnalysis = {
    summary: {
      ticketsWithTime: ticketsWithTime.length,
      totalActualHours: Math.round(totalActualMin / 60 * 10) / 10,
      totalExpectedHours: Math.round(totalExpectedMin / 60 * 10) / 10,
      totalOverageHours: Math.round(totalOverageMin / 60 * 10) / 10,
      overallEfficiencyPct: totalExpectedMin > 0 ? Math.round((totalExpectedMin / totalActualMin) * 100) : null,
    },
    byCategory: timeCategoryBreakdown,
    timeLeaks: timeLeaks.sort((a, b) => b.overageMinutes - a.overageMinutes),
    totalTimeLostMinutes: timeLeaks.reduce((s, t) => s + t.overageMinutes, 0),
  };

  // ── Quick Hitter Validation ──
  // Compare predicted 5-20 min tickets against actual worked time.
  const quickHitterTickets = analyzedTickets.filter(t => t.isQuickHitter);
  const qhWithTime = quickHitterTickets.filter(t => (t.workedHours || 0) > 0);

  const qhValidation = {
    totalPredicted: quickHitterTickets.length,
    withActualTime: qhWithTime.length,
    withoutTime: quickHitterTickets.length - qhWithTime.length,
    // A prediction is "accurate" if actual time is <= 25 min (allowing 5 min buffer over 20)
    accurateCount: 0,
    underestimatedCount: 0,
    // PIA usage among quick hitters
    usedPIACount: quickHitterTickets.filter(t => t.usedPIA).length,
    // Detail rows for the UI table
    tickets: [],
    // Issue type breakdown of quick hitters
    byIssueType: {},
  };

  for (const t of quickHitterTickets) {
    const actualMin = (t.workedHours || 0) * 60;
    const estimatedMin = t.estimatedMinutes || 0;
    const hasTime = actualMin > 0;
    const isAccurate = hasTime && actualMin <= 25;
    const isUnderestimated = hasTime && actualMin > 25;

    if (isAccurate) qhValidation.accurateCount++;
    if (isUnderestimated) qhValidation.underestimatedCount++;

    // Issue type grouping
    const itLabel = t.issueTypeName
      ? (t.subIssueTypeName ? `${t.issueTypeName} / ${t.subIssueTypeName}` : t.issueTypeName)
      : (t.categoryLabel || 'Uncategorized');
    if (!qhValidation.byIssueType[itLabel]) {
      qhValidation.byIssueType[itLabel] = { count: 0, accurate: 0, underestimated: 0, noTime: 0, usedPIA: 0 };
    }
    const ig = qhValidation.byIssueType[itLabel];
    ig.count++;
    if (isAccurate) ig.accurate++;
    if (isUnderestimated) ig.underestimated++;
    if (!hasTime) ig.noTime++;
    if (t.usedPIA) ig.usedPIA++;

    qhValidation.tickets.push({
      ticketId: t.ticketId,
      ticketNumber: t.ticketNumber,
      title: t.title,
      companyName: t.companyName || 'Unknown',
      issueType: itLabel,
      estimatedMinutes: estimatedMin,
      actualMinutes: hasTime ? Math.round(actualMin) : null,
      variance: hasTime ? Math.round(actualMin - estimatedMin) : null,
      status: !hasTime ? 'no_data' : (isAccurate ? 'accurate' : 'underestimated'),
      usedPIA: t.usedPIA,
      piaIndicator: t.piaIndicator,
      automationScore: t.automationScore,
    });
  }

  qhValidation.accuracyRate = qhWithTime.length > 0
    ? Math.round((qhValidation.accurateCount / qhWithTime.length) * 100)
    : null;

  return {
    priorityBreakdown,
    categoryDeepBreakdown,
    issueTypeDeepBreakdown,
    trendData,
    topOpportunities,
    roiProjection,
    timeAnalysis,
    quickHitterValidation: qhValidation,
  };
}

module.exports = { analyzeTicket, analyzeTickets, getSummary, getDeepAnalytics, CATEGORY_PATTERNS, RESOLUTION_SCRIPTS };
