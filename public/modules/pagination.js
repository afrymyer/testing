/**
 * Table Pagination Module
 *
 * Adds pagination to large data tables (50-100 rows per page).
 */

class TablePaginator {
  constructor(tableId, { rowsPerPage = 50, onPageChange } = {}) {
    this.tableId = tableId;
    this.rowsPerPage = rowsPerPage;
    this.currentPage = 1;
    this.totalRows = 0;
    this.onPageChange = onPageChange;
  }

  /**
   * Paginate a tbody element. Hides rows beyond the current page.
   */
  apply(tbody) {
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    this.totalRows = rows.length;
    const totalPages = Math.ceil(this.totalRows / this.rowsPerPage);

    if (this.currentPage > totalPages) this.currentPage = totalPages || 1;

    const start = (this.currentPage - 1) * this.rowsPerPage;
    const end = start + this.rowsPerPage;

    rows.forEach((row, i) => {
      row.style.display = (i >= start && i < end) ? '' : 'none';
    });

    this._renderControls(totalPages);
  }

  _renderControls(totalPages) {
    const table = document.getElementById(this.tableId);
    if (!table) return;

    // Remove existing pagination controls
    const existing = table.parentElement.querySelector('.pagination-controls');
    if (existing) existing.remove();

    if (totalPages <= 1) return;

    const controls = document.createElement('div');
    controls.className = 'pagination-controls';

    const start = (this.currentPage - 1) * this.rowsPerPage + 1;
    const end = Math.min(this.currentPage * this.rowsPerPage, this.totalRows);

    controls.innerHTML = `
      <span class="pagination-info">Showing ${start}-${end} of ${this.totalRows}</span>
      <div class="pagination-buttons">
        <button class="btn btn-sm btn-ghost" ${this.currentPage <= 1 ? 'disabled' : ''} data-page="prev">&laquo; Prev</button>
        ${this._getPageButtons(totalPages)}
        <button class="btn btn-sm btn-ghost" ${this.currentPage >= totalPages ? 'disabled' : ''} data-page="next">Next &raquo;</button>
      </div>
    `;

    controls.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page === 'prev') this.currentPage--;
        else if (page === 'next') this.currentPage++;
        else this.currentPage = parseInt(page);

        const tbody = document.querySelector(`#${this.tableId} tbody`);
        this.apply(tbody);
        if (this.onPageChange) this.onPageChange(this.currentPage);
      });
    });

    table.parentElement.appendChild(controls);
  }

  _getPageButtons(totalPages) {
    const buttons = [];
    const maxVisible = 5;

    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      const active = p === this.currentPage ? 'btn-primary' : 'btn-ghost';
      buttons.push(`<button class="btn btn-sm ${active}" data-page="${p}">${p}</button>`);
    }

    return buttons.join('');
  }

  reset() {
    this.currentPage = 1;
  }
}

// Create paginators for key tables
window.clientTablePaginator = new TablePaginator('client-summary-table', { rowsPerPage: 50 });
window.qhTablePaginator = new TablePaginator('qh-ticket-table', { rowsPerPage: 50 });
window.dinTablePaginator = new TablePaginator('din-predictions-table', { rowsPerPage: 50 });

// Hook into rendering - apply pagination after table renders
const _origRenderClients = window.renderClients;
if (typeof renderClients === 'function') {
  const origRenderClients = renderClients;
  window.renderClients = function() {
    origRenderClients.apply(this, arguments);
    const tbody = document.querySelector('#client-summary-table tbody');
    if (tbody && tbody.children.length > 50) {
      window.clientTablePaginator.reset();
      window.clientTablePaginator.apply(tbody);
    }
  };
}
