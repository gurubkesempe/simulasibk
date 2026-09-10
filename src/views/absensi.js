/* ============================================================
   VIEWS / ABSENSI
   ============================================================ */
import { STATE, uniqueClasses, siswaById, populateClassFilters } from '../state/store.js';
import { $, $all, showLoading } from '../utils/dom.js';
import { fmtDate, escapeHtml, formatPhoneWa, buildAbsenWaText, initials, colorFromString } from '../utils/helpers.js';
import { renderAbsensiChart } from './dashboard.js';
import { openForm, openModal, closeModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { getAdapter } from '../api/index.js';
import { createPagination } from '../components/pagination.js';

let refreshCallback = null;
let lastSearchQuery = '';

const pagination = createPagination({
  containerId: '#paginationAbsensi',
  pageSizeOptions: [10, 25, 50, 100],
  initialPageSize: 25,
  onPageChange: () => renderAbsensi(lastSearchQuery, false)
});

export function setAbsensiRefreshCallback(fn) {
  refreshCallback = fn;
}

export function openWaForAbsen(absenId) {
  const absen = STATE.absensi.find(a => String(a.ID) === String(absenId));
  if (!absen) {
    toast('Data absensi tidak ditemukan.', 'error');
    return;
  }
  const siswa = STATE.siswa.find(s => String(s.ID) === String(absen.SiswaID));
  const phone = formatPhoneWa(siswa ? siswa.NoHPOrtu : '');
  if (!phone) {
    toast('Nomor HP orang tua belum diisi untuk siswa ini.', 'error');
    return;
  }
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(buildAbsenWaText(siswa, absen))}`;
  window.open(url, '_blank');
}

export function renderAbsensi(searchQuery = '', resetPagination = true) {
  lastSearchQuery = searchQuery;
  if (resetPagination) {
    pagination.resetPage();
  }

  const tglEl = $('#filterTglAbsensi');
  const kelasEl = $('#filterKelasAbsensi');
  const statusEl = $('#filterStatusAbsensi');

  const tgl = tglEl ? tglEl.value : '';
  const kelas = kelasEl ? kelasEl.value : '';
  const status = statusEl ? statusEl.value : '';

  let rows = STATE.absensi.filter(
    a => (!tgl || a.Tanggal === tgl) && (!kelas || a.Kelas === kelas) && (!status || a.Status === status)
  );

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    rows = rows.filter(
      a => (a.Nama || '').toLowerCase().includes(q) || (a.Keterangan || '').toLowerCase().includes(q)
    );
  }

  rows.sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));
  renderAbsensiChart('chartAbsensiPage', rows);

  const tbody = $('#tableAbsensi tbody');
  const emptyState = $('#page-absensi .empty-state');
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

  const badgeCls = { Hadir: 'success', Sakit: 'info', Izin: 'amber', Alpa: 'danger' };

  tbody.innerHTML = paginatedRows
    .map(
      a => `<tr>
      <td class="tabular-nums font-mono" style="width:130px;color:var(--text-secondary)">${fmtDate(a.Tanggal)}</td>
      <td style="min-width:200px">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="avatar-ring" style="width:28px;height:28px;font-size:10.5px;background:${colorFromString(a.Nama)}">${escapeHtml(initials(a.Nama))}</span>
          <span style="font-weight:600;color:var(--text-primary)">${escapeHtml(a.Nama || '-')}</span>
        </div>
      </td>
      <td style="width:100px"><span class="badge badge--muted">${escapeHtml(a.Kelas || '-')}</span></td>
      <td style="width:120px"><span class="badge badge--${badgeCls[a.Status] || 'muted'}"><span class="badge-dot"></span>${escapeHtml(a.Status || '-')}</span></td>
      <td style="min-width:180px;color:var(--text-muted)">${escapeHtml(a.Keterangan || '-')}</td>
      <td style="width:130px;text-align:right">
        <div class="row-actions">
          <button class="icon-btn-sm wa" data-wa="${escapeHtml(a.ID)}" title="Kirim WA ke orang tua"><i class="fa-brands fa-whatsapp"></i></button>
          <button class="icon-btn-sm" data-edit="absensi" data-id="${escapeHtml(a.ID)}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn-sm danger" data-del="absensi" data-id="${escapeHtml(a.ID)}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`
    )
    .join('');
}

export function openBulkAbsensi() {
  $('#modalTitle').textContent = 'Absen Massal per Kelas';
  const today = new Date().toISOString().slice(0, 10);
  const kelasOpts = uniqueClasses()
    .map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
    .join('');

  $('#modalBody').innerHTML = `
    <form id="bulkAbsensiForm">
      <div class="form-grid">
        <div class="field"><label>Tanggal</label><input type="date" id="bulkTanggal" value="${today}" required /></div>
        <div class="field"><label>Kelas</label>
          <select id="bulkKelas" required><option value="">Pilih kelas...</option>${kelasOpts}</select>
        </div>
        <div class="field"><label>Status untuk siswa yang dicentang</label>
          <select id="bulkStatus" required>
            <option value="">Pilih...</option>
            <option value="Hadir">Hadir</option>
            <option value="Sakit">Sakit</option>
            <option value="Izin">Izin</option>
            <option value="Alpa">Alpa</option>
          </select>
        </div>
        <div class="field"><label>Keterangan (opsional, berlaku untuk semua yang dicentang)</label>
          <input type="text" id="bulkKeterangan" placeholder="Contoh: -" />
        </div>
      </div>
      <div class="bulk-list-head">
        <label class="checkbox-pill"><input type="checkbox" id="bulkCheckAll" /> Pilih Semua</label>
        <span class="muted" id="bulkCount">Pilih kelas dahulu untuk menampilkan daftar siswa.</span>
      </div>
      <div class="bulk-siswa-list" id="bulkSiswaList"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="bulkCancel">Batal</button>
        <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Simpan Semua</button>
      </div>
    </form>`;

  function updateBulkCount() {
    const total = $all('.bulk-siswa-check').length;
    const checked = $all('.bulk-siswa-check:checked').length;
    $('#bulkCount').textContent = total
      ? `${checked} dari ${total} siswa dicentang`
      : 'Pilih kelas dahulu untuk menampilkan daftar siswa.';
  }

  function renderBulkList(kelas) {
    const list = $('#bulkSiswaList');
    const siswaKelas = STATE.siswa
      .filter(s => s.Kelas === kelas)
      .sort((a, b) => (a.Nama || '').localeCompare(b.Nama || ''));
    if (!siswaKelas.length) {
      list.innerHTML = `<p class="muted" style="padding:10px;text-align:center">Tidak ada data siswa untuk kelas ini.</p>`;
      $('#bulkCheckAll').checked = false;
      updateBulkCount();
      return;
    }
    list.innerHTML = siswaKelas
      .map(
        s => `
      <label class="checkbox-pill bulk-item">
        <input type="checkbox" class="bulk-siswa-check" value="${escapeHtml(s.ID)}" checked />
        <span class="avatar-ring" style="width:24px;height:24px;font-size:9.5px;background:${colorFromString(s.Nama)}">${escapeHtml(initials(s.Nama))}</span>
        <span><b>${escapeHtml(s.Nama)}</b> <span class="muted">· NIS ${escapeHtml(s.NIS || '-')}</span></span>
      </label>`
      )
      .join('');
    $('#bulkCheckAll').checked = true;
    updateBulkCount();
  }

  $('#bulkKelas')?.addEventListener('change', e => renderBulkList(e.target.value));
  $('#bulkCheckAll')?.addEventListener('change', e => {
    $all('.bulk-siswa-check').forEach(cb => (cb.checked = e.target.checked));
    updateBulkCount();
  });
  $('#bulkSiswaList')?.addEventListener('change', e => {
    if (e.target.classList.contains('bulk-siswa-check')) updateBulkCount();
  });
  $('#bulkCancel')?.addEventListener('click', closeModal);

  $('#bulkAbsensiForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const tanggal = $('#bulkTanggal').value;
    const kelas = $('#bulkKelas').value;
    const status = $('#bulkStatus').value;
    const keterangan = $('#bulkKeterangan').value || '';
    if (!tanggal || !kelas || !status) {
      toast('Tanggal, kelas, dan status wajib diisi.', 'error');
      return;
    }
    const checkedIds = $all('.bulk-siswa-check:checked').map(cb => cb.value);
    if (!checkedIds.length) {
      toast('Centang minimal satu siswa.', 'error');
      return;
    }

    showLoading(true);
    let saved = 0;
    let skipped = 0;
    try {
      const rowsToInsert = [];
      checkedIds.forEach(id => {
        const already = STATE.absensi.some(
          a => String(a.SiswaID) === String(id) && a.Tanggal === tanggal
        );
        if (already) {
          skipped++;
          return;
        }
        const s = siswaById(id);
        rowsToInsert.push({
          Tanggal: tanggal,
          SiswaID: id,
          Nama: s?.Nama || '',
          Kelas: s?.Kelas || '',
          Status: status,
          Keterangan: keterangan
        });
      });
      if (rowsToInsert.length) {
        const adapter = getAdapter();
        const result = await adapter.bulkInsert('absensi', rowsToInsert);
        const insertedRows = (result && result.rows) || rowsToInsert;
        STATE.absensi.push(...insertedRows);
        saved = insertedRows.length;
      }
      closeModal();
      populateClassFilters();
      if (refreshCallback) refreshCallback();
      toast(
        `${saved} siswa dicatat sebagai ${status}${skipped ? `, ${skipped} dilewati (sudah ada catatan)` : ''}.`,
        'success'
      );
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      showLoading(false);
    }
  });

  openModal();
}

export function initAbsensiListeners() {
  ['#filterTglAbsensi', '#filterKelasAbsensi', '#filterStatusAbsensi'].forEach(sel => {
    $(sel)?.addEventListener('change', () => renderAbsensi(lastSearchQuery, true));
  });
  $('#btnAddAbsensi')?.addEventListener('click', () => openForm('absensi'));
  $('#btnBulkAbsensi')?.addEventListener('click', openBulkAbsensi);
}
