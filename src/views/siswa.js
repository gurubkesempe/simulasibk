/* ============================================================
   VIEWS / SISWA
   ============================================================ */
import { STATE } from '../state/store.js';
import { $ } from '../utils/dom.js';
import { escapeHtml, initials, colorFromString } from '../utils/helpers.js';
import { openForm } from '../components/modal.js';
import { downloadSiswaTemplate, importSiswaFromExcel } from '../utils/excel.js';
import { getAdapter } from '../api/index.js';
import { loadAll } from '../state/store.js';
import { createPagination } from '../components/pagination.js';

let lastSearchQuery = '';

const pagination = createPagination({
  containerId: '#paginationSiswa',
  pageSizeOptions: [10, 25, 50, 100],
  initialPageSize: 25,
  onPageChange: () => renderSiswa(lastSearchQuery, false)
});

export function renderSiswa(searchQuery = '', resetPagination = true) {
  lastSearchQuery = searchQuery;
  if (resetPagination) {
    pagination.resetPage();
  }

  const filterEl = $('#filterKelasSiswa');
  const kelas = filterEl ? filterEl.value : '';

  let rows = STATE.siswa.filter(s => !kelas || s.Kelas === kelas);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    rows = rows.filter(
      s =>
        (s.Nama || '').toLowerCase().includes(q) ||
        (s.NIS || '').toString().toLowerCase().includes(q) ||
        (s.NamaOrtu || '').toLowerCase().includes(q)
    );
  }

  const tbody = $('#tableSiswa tbody');
  const emptyState = $('#page-siswa .empty-state');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    pagination.render(0);
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // Render pagination controls and get current page slice
  pagination.render(rows.length);
  const paginatedRows = pagination.paginate(rows);

  tbody.innerHTML = paginatedRows
    .map(s => {
      const pelanggaranCount = STATE.pelanggaran.filter(
        p => String(p.SiswaID) === String(s.ID)
      ).length;
      const status =
        pelanggaranCount >= 3
          ? { txt: 'Perlu Perhatian', cls: 'danger' }
          : pelanggaranCount >= 1
          ? { txt: 'Pemantauan', cls: 'amber' }
          : { txt: 'Baik', cls: 'success' };

      return `<tr>
      <td class="tabular-nums font-mono" style="width:110px;font-weight:600;color:var(--text-secondary)">${escapeHtml(s.NIS || '-')}</td>
      <td style="min-width:200px">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="avatar-ring" style="width:30px;height:30px;font-size:11px;background:${colorFromString(s.Nama)}">${escapeHtml(initials(s.Nama))}</span>
          <span style="font-weight:600;color:var(--text-primary)">${escapeHtml(s.Nama || '-')}</span>
        </div>
      </td>
      <td style="width:100px"><span class="badge badge--muted">${escapeHtml(s.Kelas || '-')}</span></td>
      <td style="width:70px;text-align:center">${escapeHtml(s.JenisKelamin || '-')}</td>
      <td style="min-width:160px">${escapeHtml(s.NamaOrtu || '-')}</td>
      <td class="tabular-nums" style="width:140px">${escapeHtml(s.NoHPOrtu || '-')}</td>
      <td style="width:140px"><span class="badge badge--${status.cls}"><span class="badge-dot"></span>${status.txt}</span></td>
      <td style="width:100px;text-align:right">
        <div class="row-actions">
          <button class="icon-btn-sm" data-edit="siswa" data-id="${escapeHtml(s.ID)}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn-sm danger" data-del="siswa" data-id="${escapeHtml(s.ID)}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
    })
    .join('');
}

export function initSiswaListeners() {
  $('#filterKelasSiswa')?.addEventListener('change', () => renderSiswa(lastSearchQuery, true));
  $('#btnAddSiswa')?.addEventListener('click', () => openForm('siswa'));
  $('#btnDownloadTemplate')?.addEventListener('click', downloadSiswaTemplate);

  const importBtn = $('#btnImportSiswa');
  const importFileInput = $('#importSiswaFile');

  if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      await importSiswaFromExcel(file, getAdapter(), loadAll);
      e.target.value = '';
    });
  }
}
