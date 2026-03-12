/**
 * SLA Compliance Dashboard Module
 *
 * Renders SLA metrics: compliance rate, MTTR by category/priority,
 * first response time.
 */

function renderSLAMetrics(analytics) {
  if (!analytics || !analytics.slaMetrics) {
    const summary = document.getElementById('sla-compliance-summary');
    if (summary) {
      summary.innerHTML = `
        <div class="empty-state">
          <h3>No SLA Data</h3>
          <p>SLA metrics require completed tickets with SLA and resolution date fields populated in Autotask.</p>
        </div>`;
    }
    return;
  }

  const sla = analytics.slaMetrics;

  // Summary cards
  const summaryEl = document.getElementById('sla-compliance-summary');
  if (summaryEl) {
    const compRate = sla.compliance.rate;
    const compColor = compRate == null ? '' : compRate >= 90 ? 'qh-stat-good' : compRate >= 70 ? 'qh-stat-warn' : 'qh-stat-bad';
    const mttr = sla.overallMTTR;
    const frt = sla.firstResponseTime;

    summaryEl.innerHTML = `
      <div class="qh-stat-grid">
        <div class="qh-stat-card ${compColor}">
          <div class="qh-stat-number">${compRate != null ? compRate + '%' : 'N/A'}</div>
          <div class="qh-stat-label">SLA Compliance Rate</div>
        </div>
        <div class="qh-stat-card">
          <div class="qh-stat-number">${sla.compliance.met}</div>
          <div class="qh-stat-label">SLA Met</div>
        </div>
        <div class="qh-stat-card qh-stat-bad">
          <div class="qh-stat-number">${sla.compliance.missed}</div>
          <div class="qh-stat-label">SLA Missed</div>
        </div>
        <div class="qh-stat-card">
          <div class="qh-stat-number">${sla.compliance.unknown}</div>
          <div class="qh-stat-label">No SLA Data</div>
        </div>
        <div class="qh-stat-card">
          <div class="qh-stat-number">${mttr ? mttr.avgHours + 'h' : 'N/A'}</div>
          <div class="qh-stat-label">Overall MTTR</div>
        </div>
        <div class="qh-stat-card">
          <div class="qh-stat-number">${frt && frt.avgHours != null ? frt.avgHours + 'h' : 'N/A'}</div>
          <div class="qh-stat-label">Avg First Response</div>
        </div>
      </div>
    `;
  }

  // SLA Compliance donut
  const donutEl = document.getElementById('sla-compliance-donut');
  if (donutEl && typeof renderDonut === 'function') {
    renderDonut('sla-compliance-donut', [
      { label: 'SLA Met', value: sla.compliance.met, color: '#328d46' },
      { label: 'SLA Missed', value: sla.compliance.missed, color: '#ef0b3c' },
      { label: 'Unknown', value: sla.compliance.unknown, color: '#64748b' },
    ]);
  }

  // First Response Time summary
  const frtEl = document.getElementById('sla-frt-summary');
  if (frtEl) {
    const frt = sla.firstResponseTime;
    if (frt && frt.avgHours != null) {
      const frtColor = frt.avgHours <= 1 ? 'var(--green)' : frt.avgHours <= 4 ? 'var(--yellow)' : 'var(--red)';
      frtEl.innerHTML = `
        <div style="text-align:center; padding: 2rem;">
          <div style="font-size: 3rem; font-weight: 800; color: ${frtColor};">${frt.avgHours}h</div>
          <div style="font-size: 0.85rem; color: var(--text-dim); margin-top: 0.5rem;">
            Average First Response Time<br>
            <span style="font-size: 0.75rem;">(${frt.avgMinutes} minutes across ${frt.ticketCount} tickets)</span>
          </div>
        </div>`;
    } else {
      frtEl.innerHTML = '<p class="empty-state-text">No first response data available</p>';
    }
  }

  // MTTR by Category bars
  const mttrCatEl = document.getElementById('sla-mttr-category-bars');
  if (mttrCatEl && sla.mttrByCategory && sla.mttrByCategory.length > 0) {
    const data = sla.mttrByCategory.map(m => ({ category: `${m.category} (${m.count})`, hours: m.avgHours }));
    const maxVal = Math.max(...data.map(d => d.hours));
    const colors = ['fill-green', 'fill-primary', 'fill-yellow', 'fill-orange', 'fill-red', 'fill-purple', 'fill-cyan'];

    mttrCatEl.innerHTML = data.map((d, i) => {
      const pct = maxVal > 0 ? (d.hours / maxVal) * 100 : 0;
      const color = colors[i % colors.length];
      return `
        <div class="cat-bar-row">
          <span class="cat-bar-label">${escHtml(d.category)}</span>
          <div class="cat-bar-track">
            <div class="cat-bar-fill ${color}" style="width: ${pct}%"></div>
          </div>
          <span class="cat-bar-count">${d.hours}h</span>
        </div>`;
    }).join('');
  } else if (mttrCatEl) {
    mttrCatEl.innerHTML = '<p class="empty-state-text">No resolution time data available</p>';
  }

  // MTTR by Priority bars
  const mttrPriEl = document.getElementById('sla-mttr-priority-bars');
  if (mttrPriEl && sla.mttrByPriority && sla.mttrByPriority.length > 0) {
    const data = sla.mttrByPriority.map(m => ({ priority: `${m.priority} (${m.count})`, hours: m.avgHours }));
    const maxVal = Math.max(...data.map(d => d.hours));
    const colorMap = { 'Critical': 'fill-red', 'High': 'fill-orange', 'Medium': 'fill-yellow', 'Low': 'fill-green' };

    mttrPriEl.innerHTML = data.map((d) => {
      const pct = maxVal > 0 ? (d.hours / maxVal) * 100 : 0;
      const priName = d.priority.split(' (')[0];
      const color = colorMap[priName] || 'fill-primary';
      return `
        <div class="cat-bar-row">
          <span class="cat-bar-label">${escHtml(d.priority)}</span>
          <div class="cat-bar-track">
            <div class="cat-bar-fill ${color}" style="width: ${pct}%"></div>
          </div>
          <span class="cat-bar-count">${d.hours}h</span>
        </div>`;
    }).join('');
  } else if (mttrPriEl) {
    mttrPriEl.innerHTML = '<p class="empty-state-text">No resolution time data available</p>';
  }
}

// Make globally accessible
window.renderSLAMetrics = renderSLAMetrics;
