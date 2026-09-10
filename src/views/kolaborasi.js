/* ============================================================
   VIEWS / KOLABORASI
   ============================================================ */
import { STATE } from '../state/store.js';
import { $ } from '../utils/dom.js';
import { fmtDate, escapeHtml, initials, colorFromString } from '../utils/helpers.js';
import { openForm } from '../components/modal.js';

export function renderKolaborasi(searchQuery = '') {
  const jenisEl = $('#filterJenisKolaborasi');
  const jenis = jenisEl ? jenisEl.value : '';

  let rows = STATE.kolaborasi.filter(k => !jenis || k.Jenis === jenis);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    rows = rows.filter(
      k => (k.Nama || '').toLowerCase().includes(q) || (k.Jenis || '').toLowerCase().includes(q)
    );
  }

  rows.sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));

  const list = $('#listKolaborasi');
  const emptyState = $('#emptyKolaborasi');
  if (!list) return;

  if (emptyState) emptyState.style.display = rows.length ? 'none' : 'block';

  list.innerHTML = rows
    .map(
      k => `
    <div class="entry-card">
      <div class="entry-card-head">
        <div class="entry-avatar-row">
          <span class="avatar-ring" style="background:${colorFromString(k.Nama)}">${escapeHtml(initials(k.Nama))}</span>
          <div>
            <div class="entry-name">${escapeHtml(k.Nama || '-')}</div>
            <div class="entry-sub"><span class="badge badge--muted">${escapeHtml(k.Kelas || '-')}</span></div>
          </div>
        </div>
        <div class="row-actions">
          <button class="icon-btn-sm" data-edit="kolaborasi" data-id="${escapeHtml(k.ID)}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn-sm danger" data-del="kolaborasi" data-id="${escapeHtml(k.ID)}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="entry-body">
        <p><span class="badge badge--info"><span class="badge-dot"></span>${escapeHtml(k.Jenis || '-')}</span></p>
        <p style="margin-top:8px"><b>Tujuan:</b> ${escapeHtml(k.Tujuan || '-')}</p>
        <p style="margin-top:4px"><b>Hasil / Kesepakatan:</b> ${escapeHtml(k.Hasil || '-')}</p>
      </div>
      <div class="entry-foot">
        <span class="entry-date tabular-nums font-mono"><i class="fa-regular fa-calendar" style="margin-right:4px"></i>${fmtDate(k.Tanggal)}</span>
        <span class="entry-sub"><i class="fa-solid fa-user-shield" style="margin-right:4px"></i>${escapeHtml(k.Petugas || '-')}</span>
      </div>
    </div>`
    )
    .join('');
}

export function initKolaborasiListeners() {
  $('#filterJenisKolaborasi')?.addEventListener('change', () => renderKolaborasi());
  $('#btnAddKolaborasi')?.addEventListener('click', () => openForm('kolaborasi'));
}
