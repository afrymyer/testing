/**
 * Bulk Script Execution Module
 *
 * Enables selecting multiple quick hitter tickets and generating
 * a combined script execution plan.
 */

(function() {
  let bulkTickets = [];
  let bulkScripts = [];

  function openBulkScriptModal() {
    if (!allTickets || allTickets.length === 0) {
      showToast('Load tickets first');
      return;
    }

    // Find quick hitter tickets with scripts
    bulkTickets = allTickets.filter(t =>
      t.isQuickHitter && t.suggestedScripts && t.suggestedScripts.length > 0
    );

    if (bulkTickets.length === 0) {
      showToast('No quick hitters with scripts found');
      return;
    }

    // Collect unique scripts across all quick hitters
    const scriptMap = new Map();
    for (const t of bulkTickets) {
      for (const s of t.suggestedScripts) {
        if (!scriptMap.has(s.name)) {
          scriptMap.set(s.name, { ...s, ticketCount: 0, tickets: [] });
        }
        const entry = scriptMap.get(s.name);
        entry.ticketCount++;
        entry.tickets.push({ id: t.ticketId, number: t.ticketNumber, title: t.title });
      }
    }
    bulkScripts = Array.from(scriptMap.values()).sort((a, b) => b.ticketCount - a.ticketCount);

    renderBulkModal();
    document.getElementById('bulk-modal').classList.remove('hidden');
  }

  function renderBulkModal() {
    const ticketList = document.getElementById('bulk-ticket-list');
    const scriptList = document.getElementById('bulk-script-list');
    const results = document.getElementById('bulk-results');

    ticketList.innerHTML = `
      <h4>${bulkTickets.length} Quick Hitter Tickets with Scripts</h4>
      <div class="bulk-summary-row">
        <span class="badge badge-quick">${bulkTickets.length} tickets</span>
        <span class="badge badge-category">${bulkScripts.length} unique scripts</span>
        <span class="badge badge-time">~${bulkTickets.reduce((s, t) => s + (t.estimatedMinutes || 0), 0)} min total</span>
      </div>
    `;

    scriptList.innerHTML = `
      <h4>Scripts to Execute</h4>
      <div class="bulk-script-cards">
        ${bulkScripts.map(s => `
          <div class="bulk-script-card">
            <div class="bulk-script-header">
              <input type="checkbox" class="bulk-script-check" data-script="${escHtml(s.name)}" data-type="${s.type}" checked />
              <span class="bulk-script-name">${escHtml(s.label)}</span>
              <span class="badge badge-category">${s.ticketCount} tickets</span>
            </div>
            <p class="bulk-script-desc">${escHtml(s.resolves || '')}</p>
            <div class="bulk-script-tickets">
              ${s.tickets.map(t => `<span class="badge" style="font-size:0.7rem;">#${t.number || t.id}</span>`).join(' ')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    results.innerHTML = '';
  }

  function generateScriptBundle() {
    const checked = document.querySelectorAll('.bulk-script-check:checked');
    if (checked.length === 0) {
      showToast('Select at least one script');
      return;
    }

    const selected = Array.from(checked).map(cb => ({
      name: cb.dataset.script,
      type: cb.dataset.type,
    }));

    const results = document.getElementById('bulk-results');
    results.innerHTML = `
      <h4>Execution Plan</h4>
      <div class="bulk-plan">
        <p>The following ${selected.length} script(s) will be prepared for execution:</p>
        <ol>
          ${selected.map(s => `<li><strong>${escHtml(s.name)}</strong> (${s.type})</li>`).join('')}
        </ol>
        <p class="panel-desc">Click "Download All Scripts" to get a ZIP-like bundle, or view each script individually using the Script Library.</p>
      </div>
    `;

    document.getElementById('btn-bulk-download').classList.remove('hidden');
    document.getElementById('btn-bulk-download').onclick = () => downloadBulkScripts(selected);
  }

  async function downloadBulkScripts(scripts) {
    for (const s of scripts) {
      try {
        const res = await fetch(`/api/scripts/${s.type}/${s.name}`);
        if (!res.ok) continue;
        const data = await res.json();
        const blob = new Blob([data.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = s.name;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(`Failed to download ${s.name}:`, err);
      }
    }
    showToast(`Downloaded ${scripts.length} script(s)`);
  }

  // Wire up events
  document.addEventListener('DOMContentLoaded', () => {
    const btnBulk = document.getElementById('btn-bulk-scripts');
    if (btnBulk) btnBulk.addEventListener('click', openBulkScriptModal);

    const btnGenerate = document.getElementById('btn-bulk-generate');
    if (btnGenerate) btnGenerate.addEventListener('click', generateScriptBundle);

    const closeBtn = document.getElementById('bulk-close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      document.getElementById('bulk-modal').classList.add('hidden');
    });

    const modal = document.getElementById('bulk-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    }
  });

  // Make accessible
  window.openBulkScriptModal = openBulkScriptModal;
})();
