/**
 * CSV/PDF Export Module
 *
 * Adds CSV export for analytics tables and a print-friendly view for reports.
 */

// CSV export utility
function exportToCSV(data, filename, headers) {
  if (!data || data.length === 0) {
    showToast('No data to export');
    return;
  }

  const cols = headers || Object.keys(data[0]);
  const rows = [cols.join(',')];

  for (const row of data) {
    const values = cols.map(col => {
      let val = row[col];
      if (val == null) val = '';
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val}"`;
      }
      return val;
    });
    rows.push(values.join(','));
  }

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${data.length} rows to ${a.download}`);
}

// Export all tickets
function exportTicketsCSV() {
  if (!allTickets || allTickets.length === 0) {
    showToast('No tickets loaded');
    return;
  }

  const data = allTickets.map(t => ({
    'Ticket #': t.ticketNumber || t.ticketId,
    'Title': t.title || '',
    'Category': t.categoryLabel || '',
    'Issue Type': t.issueTypeName || '',
    'Sub-Issue Type': t.subIssueTypeName || '',
    'Priority': currentPriorityMap[t.priority] || '',
    'Status': (t.status === 5 || t.status === 'Complete') ? 'Completed' : 'Open',
    'Client': t.companyName || '',
    'Automation Score': t.automationScore || 0,
    'Quick Hitter': t.isQuickHitter ? 'Yes' : 'No',
    'Est. Minutes': t.estimatedMinutes || '',
    'Worked Hours': t.workedHours || 0,
    'Used PIA': t.usedPIA ? 'Yes' : 'No',
    'Created': t.createDate ? new Date(t.createDate).toLocaleDateString() : '',
    'Readiness': t.automationReadinessLabel || '',
  }));

  exportToCSV(data, 'tickets-export');
}

// Export analytics summary
function exportAnalyticsCSV() {
  if (!currentAnalytics) {
    showToast('No analytics data');
    return;
  }

  const sections = [];

  // Category breakdown
  if (currentAnalytics.categoryDeepBreakdown) {
    sections.push({ name: 'Category Breakdown', data: currentAnalytics.categoryDeepBreakdown });
  }

  // Priority breakdown
  if (currentAnalytics.priorityBreakdown) {
    const pData = Object.entries(currentAnalytics.priorityBreakdown).map(([priority, count]) => ({ priority, count }));
    sections.push({ name: 'Priority Distribution', data: pData });
  }

  // Time analysis
  if (currentAnalytics.timeAnalysis && currentAnalytics.timeAnalysis.byCategory) {
    sections.push({ name: 'Time Analysis by Category', data: currentAnalytics.timeAnalysis.byCategory });
  }

  // SLA metrics
  if (currentAnalytics.slaMetrics) {
    const sla = currentAnalytics.slaMetrics;
    if (sla.mttrByCategory) {
      sections.push({ name: 'MTTR by Category', data: sla.mttrByCategory });
    }
    if (sla.mttrByPriority) {
      sections.push({ name: 'MTTR by Priority', data: sla.mttrByPriority });
    }
  }

  // Export all sections as separate CSVs or combined
  if (sections.length === 0) {
    showToast('No analytics to export');
    return;
  }

  // Export tickets (most useful)
  exportTicketsCSV();
}

// Print-friendly view
function openPrintView() {
  document.body.classList.add('print-mode');
  window.print();
  document.body.classList.remove('print-mode');
}

// Wire up export button
document.addEventListener('DOMContentLoaded', () => {
  const btnExport = document.getElementById('btn-export-csv');
  if (btnExport) {
    btnExport.addEventListener('click', exportAnalyticsCSV);
  }

  const btnExportSLA = document.getElementById('btn-export-sla');
  if (btnExportSLA) {
    btnExportSLA.addEventListener('click', () => {
      if (!currentAnalytics || !currentAnalytics.slaMetrics) {
        showToast('No SLA data to export');
        return;
      }
      const sla = currentAnalytics.slaMetrics;
      const data = [];

      // Compliance summary
      data.push({ Metric: 'SLA Met', Value: sla.compliance.met });
      data.push({ Metric: 'SLA Missed', Value: sla.compliance.missed });
      data.push({ Metric: 'SLA Unknown', Value: sla.compliance.unknown });
      data.push({ Metric: 'SLA Rate', Value: sla.compliance.rate != null ? sla.compliance.rate + '%' : 'N/A' });
      data.push({ Metric: '', Value: '' });

      // MTTR by category
      if (sla.mttrByCategory) {
        data.push({ Metric: '--- MTTR by Category ---', Value: '' });
        for (const m of sla.mttrByCategory) {
          data.push({ Metric: m.category, Value: m.avgHours + ' hrs', Count: m.count });
        }
      }

      // MTTR by priority
      if (sla.mttrByPriority) {
        data.push({ Metric: '', Value: '' });
        data.push({ Metric: '--- MTTR by Priority ---', Value: '' });
        for (const m of sla.mttrByPriority) {
          data.push({ Metric: m.priority, Value: m.avgHours + ' hrs', Count: m.count });
        }
      }

      exportToCSV(data, 'sla-report');
    });
  }
});

// Make functions globally accessible
window.exportToCSV = exportToCSV;
window.exportTicketsCSV = exportTicketsCSV;
window.exportAnalyticsCSV = exportAnalyticsCSV;
