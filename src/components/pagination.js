/* ============================================================
   COMPONENTS / PAGINATION (Reusable Client-Side Table Pagination)
   ============================================================ */
import { $, $all } from '../utils/dom.js';

export function createPagination({
  containerId,
  pageSizeOptions = [10, 25, 50, 100],
  initialPageSize = 25,
  onPageChange
}) {
  let currentPage = 1;
  let pageSize = initialPageSize;
  let totalItems = 0;

  function render(total, activePage = currentPage) {
    totalItems = total;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (activePage > totalPages) currentPage = totalPages;
    else if (activePage < 1) currentPage = 1;
    else currentPage = activePage;

    const container = $(containerId);
    if (!container) return;

    if (totalItems === 0) {
      container.innerHTML = '';
      return;
    }

    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalItems);
    const startDisplay = totalItems > 0 ? startIdx + 1 : 0;

    // Generate page numbers with smart ellipsis (e.g. 1 ... 4 5 6 ... 10)
    let pageNumbers = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      if (currentPage > 3) pageNumbers.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pageNumbers.push(i);
      if (currentPage < totalPages - 2) pageNumbers.push('...');
      pageNumbers.push(totalPages);
    }

    container.innerHTML = `
      <div class="pagination-wrap">
        <div class="pagination-info">
          <span>Menampilkan <b>${startDisplay} - ${endIdx}</b> dari <b>${totalItems}</b> data</span>
          <div class="pagination-size">
            <label>Baris per hal:</label>
            <select class="pagination-select select select-sm">
              ${pageSizeOptions
                .map(
                  s =>
                    `<option value="${s}" ${s === pageSize ? 'selected' : ''}>${s}</option>`
                )
                .join('')}
            </select>
          </div>
        </div>
        <div class="pagination-controls">
          <button class="btn-page btn-prev" ${currentPage <= 1 ? 'disabled' : ''} title="Halaman Sebelumnya">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="pagination-pages">
            ${pageNumbers
              .map(p =>
                p === '...'
                  ? `<span class="page-ellipsis">...</span>`
                  : `<button class="btn-page-num ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`
              )
              .join('')}
          </div>
          <button class="btn-page btn-next" ${currentPage >= totalPages ? 'disabled' : ''} title="Halaman Berikutnya">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    `;

    // Event listeners
    $('.pagination-select', container)?.addEventListener('change', e => {
      pageSize = parseInt(e.target.value, 10);
      currentPage = 1;
      if (onPageChange) onPageChange(currentPage, pageSize);
    });

    $('.btn-prev', container)?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        if (onPageChange) onPageChange(currentPage, pageSize);
      }
    });

    $('.btn-next', container)?.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        if (onPageChange) onPageChange(currentPage, pageSize);
      }
    });

    $all('.btn-page-num', container).forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page, 10);
        if (page !== currentPage) {
          currentPage = page;
          if (onPageChange) onPageChange(currentPage, pageSize);
        }
      });
    });
  }

  function paginate(items) {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }

  function resetPage() {
    currentPage = 1;
  }

  function getCurrentState() {
    return { currentPage, pageSize };
  }

  return { render, paginate, resetPage, getCurrentState };
}
