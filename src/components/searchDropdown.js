/* ============================================================
   COMPONENTS / SEARCH DROPDOWN (Global Quick Search)
   ============================================================ */
import { STATE } from '../state/store.js';
import { $ } from '../utils/dom.js';
import { escapeHtml, initials, colorFromString } from '../utils/helpers.js';
import { openForm } from './modal.js';

let navHandler = null;

export function setSearchNavigationHandler(fn) {
  navHandler = fn;
}

export function hideSearchDropdown() {
  const el = $('#searchDropdown');
  if (el) el.classList.remove('open');
}

export function renderSearchDropdown(q) {
  const dd = $('#searchDropdown');
  if (!dd) return;

  const matchSiswa = STATE.siswa
    .filter(
      s =>
        (s.Nama || '').toLowerCase().includes(q) ||
        (s.NIS || '').toString().toLowerCase().includes(q) ||
        (s.Kelas || '').toLowerCase().includes(q)
    )
    .slice(0, 6);

  const countsFor = id => ({
    absensiAlpa: STATE.absensi.filter(a => String(a.SiswaID) === String(id) && a.Status === 'Alpa')
      .length,
    pelanggaran: STATE.pelanggaran.filter(p => String(p.SiswaID) === String(id)).length,
    konseling: STATE.konseling.filter(k => String(k.SiswaID) === String(id)).length
  });

  if (!matchSiswa.length) {
    dd.innerHTML = `<div class="search-dd-empty">Tidak ada siswa yang cocok dengan "${escapeHtml(q)}".</div>`;
  } else {
    dd.innerHTML = matchSiswa
      .map(s => {
        const c = countsFor(s.ID);
        return `<div class="search-dd-item">
          <span class="avatar-ring" style="width:28px;height:28px;font-size:10.5px;background:${colorFromString(s.Nama)}">${escapeHtml(initials(s.Nama))}</span>
          <span class="search-dd-info">
            <span class="search-dd-name">${escapeHtml(s.Nama)}</span>
            <span class="search-dd-sub">${escapeHtml(s.Kelas || '-')} · NIS ${escapeHtml(s.NIS || '-')} ${c.pelanggaran ? `· ${c.pelanggaran} pelanggaran` : ''} ${c.absensiAlpa ? `· ${c.absensiAlpa}x alpa` : ''}</span>
          </span>
          <span class="search-dd-actions">
            <button type="button" class="icon-btn-sm" data-quick-absensi="${escapeHtml(s.ID)}" title="Catat Absensi"><i class="fa-solid fa-calendar-check"></i></button>
            <button type="button" class="icon-btn-sm" data-goto-siswa="${escapeHtml(s.ID)}" title="Lihat Laporan"><i class="fa-solid fa-file-lines"></i></button>
          </span>
        </div>`;
      })
      .join('');
  }
  dd.classList.add('open');
}

export function initGlobalSearchListeners() {
  const searchInput = $('#globalSearch');
  if (!searchInput) return;

  searchInput.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    if (!q || q.length < 2) {
      hideSearchDropdown();
      return;
    }
    renderSearchDropdown(q);
  });

  searchInput.addEventListener('focus', e => {
    const q = e.target.value.trim().toLowerCase();
    if (q.length >= 2) renderSearchDropdown(q);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-box') && !e.target.closest('#searchDropdown')) {
      hideSearchDropdown();
    }
  });

  // Shortcut key: ⌘K or Ctrl+K
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-goto-siswa]');
    if (btn) {
      const id = btn.dataset.gotoSiswa;
      hideSearchDropdown();
      searchInput.value = '';
      if (navHandler) navHandler('laporan');
      const reportType = $('#reportType');
      if (reportType) {
        reportType.value = 'individu';
        reportType.dispatchEvent(new Event('change'));
      }
      const reportSiswa = $('#reportSiswa');
      if (reportSiswa) reportSiswa.value = id;
      $('#btnGenerateReport')?.click();
      return;
    }

    const absBtn = e.target.closest('[data-quick-absensi]');
    if (absBtn) {
      const id = absBtn.dataset.quickAbsensi;
      hideSearchDropdown();
      searchInput.value = '';
      if (navHandler) navHandler('absensi');
      openForm('absensi', null, { SiswaID: id });
    }
  });
}
