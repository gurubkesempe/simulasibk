/* ============================================================
   VIEWS / PELANGGARAN
   ============================================================ */
import { STATE } from '../state/store.js';
import { $ } from '../utils/dom.js';
import { fmtDate, escapeHtml, initials, colorFromString } from '../utils/helpers.js';
import { openForm } from '../components/modal.js';
import { createPagination } from '../components/pagination.js';

let lastSearchQuery = '';

const pagination = createPagination({
  containerId: '#paginationPelanggaran',
  pageSizeOptions: [10, 25, 50, 100],
  initialPageSize: 25,
  onPageChange: () => renderPelanggaran(lastSearchQuery, false)
});

export function renderPelanggaran(searchQuery = '', resetPagination = true) {
  lastSearchQuery = searchQuery;
  if (resetPagination) {
    pagination.resetPage();
  }

  const kelasEl = $('#filterKelasPelanggaran');
  const bulanEl = $('#filterBulanPelanggaran');

  const kelas = kelasEl ? kelasEl.value : '';
  const bulan = bulanEl ? bulanEl.value : '';

  let rows = STATE.pelanggaran.filter(
    p => (!kelas || p.Kelas === kelas) && (!bulan || (p.Tanggal || '').startsWith(bulan))
  );

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    rows = rows.filter(
      p =>
        (p.Nama || '').toLowerCase().includes(q) ||
        (p.JenisPelanggaran || '').toLowerCase().includes(q)
    );
  }

  rows.sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));

  const tbody = $('#tablePelanggaran tbody');
  const emptyState = $('#page-pelanggaran .empty-state');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    pagination.render(0);
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  pagination.render(rows.length);
  const paginatedRows = pagination.paginate(rows);

  tbody.innerHTML = paginatedRows
    .map(
      p => `<tr>
      <td class="tabular-nums font-mono" style="width:130px;color:var(--text-secondary)">${fmtDate(p.Tanggal)}</td>
      <td style="min-width:200px">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="avatar-ring" style="width:28px;height:28px;font-size:10.5px;background:${colorFromString(p.Nama)}">${escapeHtml(initials(p.Nama))}</span>
          <span style="font-weight:600;color:var(--text-primary)">${escapeHtml(p.Nama || '-')}</span>
        </div>
      </td>
      <td style="width:100px"><span class="badge badge--muted">${escapeHtml(p.Kelas || '-')}</span></td>
      <td style="min-width:200px;font-weight:500">${escapeHtml(p.JenisPelanggaran || '-')}</td>
      <td style="width:110px;text-align:right" class="tabular-nums">
        <span class="badge badge--danger"><span class="badge-dot"></span>${escapeHtml(p.Poin || 0)} Poin</span>
      </td>
      <td style="min-width:180px;color:var(--text-secondary)">${escapeHtml(p.Penanganan || '-')}</td>
      <td style="width:100px;text-align:right">
        <div class="row-actions">
          <button class="icon-btn-sm" data-edit="pelanggaran" data-id="${escapeHtml(p.ID)}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn-sm danger" data-del="pelanggaran" data-id="${escapeHtml(p.ID)}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`
    )
    .join('');
}

export function initPelanggaranListeners() {
  ['#filterKelasPelanggaran', '#filterBulanPelanggaran'].forEach(sel => {
    $(sel)?.addEventListener('change', () => renderPelanggaran(lastSearchQuery, true));
  });
  $('#btnAddPelanggaran')?.addEventListener('click', () => openForm('pelanggaran'));
}
