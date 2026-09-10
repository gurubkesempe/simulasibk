/* ============================================================
   VIEWS / KONSELING
   ============================================================ */
import { STATE } from '../state/store.js';
import { $ } from '../utils/dom.js';
import { fmtDate, escapeHtml, initials, colorFromString } from '../utils/helpers.js';
import { openForm } from '../components/modal.js';

export function renderKonseling(searchQuery = '') {
  const kelasEl = $('#filterKelasKonseling');
  const kelas = kelasEl ? kelasEl.value : '';

  let rows = STATE.konseling.filter(k => !kelas || k.Kelas === kelas);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    rows = rows.filter(
      k => (k.Nama || '').toLowerCase().includes(q) || (k.Topik || '').toLowerCase().includes(q)
    );
  }

  rows.sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));

  const list = $('#listKonseling');
  const emptyState = $('#emptyKonseling');
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
            <div class="entry-sub"><span class="badge badge--muted">${escapeHtml(k.Kelas || '-')}</span> · <span style="font-weight:600;color:var(--text-primary)">${escapeHtml(k.Topik || 'Konseling')}</span></div>
          </div>
        </div>
        <div class="row-actions">
          <button class="icon-btn-sm" data-edit="konseling" data-id="${escapeHtml(k.ID)}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn-sm danger" data-del="konseling" data-id="${escapeHtml(k.ID)}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="entry-body">
        <p><b>Masalah:</b> ${escapeHtml(k.Masalah || '-')}</p>
        <p style="margin-top:4px"><b>Hasil:</b> ${escapeHtml(k.HasilKonseling || '-')}</p>
        <p style="margin-top:4px"><b>Tindak Lanjut:</b> ${escapeHtml(k.TindakLanjut || '-')}</p>
      </div>
      <div class="entry-foot">
        <span class="entry-date tabular-nums font-mono"><i class="fa-regular fa-calendar" style="margin-right:4px"></i>${fmtDate(k.Tanggal)}</span>
        <span class="entry-sub"><i class="fa-solid fa-user-tie" style="margin-right:4px"></i>${escapeHtml(k.Konselor || '-')}</span>
      </div>
    </div>`
    )
    .join('');
}

export function initKonselingListeners() {
  $('#filterKelasKonseling')?.addEventListener('change', () => renderKonseling());
  $('#btnAddKonseling')?.addEventListener('click', () => openForm('konseling'));
}
