/* ============================================================
   COMPONENTS / SISWA PICKER (Autocomplete Combobox in Forms)
   ============================================================ */
import { STATE, siswaById } from '../state/store.js';
import { escapeHtml, initials, colorFromString } from '../utils/helpers.js';
import { $all } from '../utils/dom.js';

export function siswaPickerFilter(wrap, query) {
  const q = (query || '').trim().toLowerCase();
  const kelasSel = wrap.querySelector('.siswa-picker-kelas');
  const kelas = kelasSel ? kelasSel.value : '';
  let list = STATE.siswa;
  if (kelas) list = list.filter(s => s.Kelas === kelas);
  return list
    .filter(
      s =>
        !q ||
        (s.Nama || '').toLowerCase().includes(q) ||
        (s.NIS || '').toString().toLowerCase().includes(q) ||
        (s.Kelas || '').toLowerCase().includes(q)
    )
    .slice(0, 50);
}

export function siswaPickerRenderDropdown(wrap, query) {
  const dd = wrap.querySelector('.siswa-picker-dropdown');
  if (!dd) return;
  const matches = siswaPickerFilter(wrap, query);
  dd.innerHTML = matches.length
    ? matches
        .map(
          s => `
        <button type="button" class="search-dd-item" data-pick-siswa="${escapeHtml(s.ID)}">
          <span class="avatar-ring" style="width:26px;height:26px;font-size:10px;background:${colorFromString(s.Nama)}">${escapeHtml(initials(s.Nama))}</span>
          <span class="search-dd-info"><span class="search-dd-name">${escapeHtml(s.Nama)}</span><span class="search-dd-sub">${escapeHtml(s.Kelas || '-')} · NIS ${escapeHtml(s.NIS || '-')}</span></span>
        </button>`
        )
        .join('')
    : '<div class="search-dd-empty">Siswa tidak ditemukan untuk filter ini.</div>';
  dd.classList.add('open');
}

export function initSiswaPickerListeners() {
  document.addEventListener('input', e => {
    if (!e.target.classList.contains('siswa-picker-input')) return;
    const wrap = e.target.closest('.siswa-picker');
    wrap.querySelector('input[type=hidden]').value = '';
    siswaPickerRenderDropdown(wrap, e.target.value);
  });

  document.addEventListener('focusin', e => {
    if (!e.target.classList.contains('siswa-picker-input')) return;
    const wrap = e.target.closest('.siswa-picker');
    siswaPickerRenderDropdown(wrap, e.target.value);
  });

  document.addEventListener('change', e => {
    if (!e.target.classList.contains('siswa-picker-kelas')) return;
    const wrap = e.target.closest('.siswa-picker');
    const input = wrap.querySelector('.siswa-picker-input');
    wrap.querySelector('input[type=hidden]').value = '';
    input.value = '';
    siswaPickerRenderDropdown(wrap, '');
    input.focus();
  });

  document.addEventListener('click', e => {
    const pickBtn = e.target.closest('[data-pick-siswa]');
    if (pickBtn && pickBtn.closest('.siswa-picker-dropdown')) {
      const wrap = pickBtn.closest('.siswa-picker');
      const s = siswaById(pickBtn.dataset.pickSiswa);
      if (!s) return;
      wrap.querySelector('input[type=hidden]').value = s.ID;
      wrap.querySelector('.siswa-picker-input').value = `${s.Nama} — ${s.Kelas || '-'}`;
      wrap.querySelector('.siswa-picker-dropdown').classList.remove('open');
      return;
    }
    $all('.siswa-picker-dropdown.open').forEach(dd => {
      if (!dd.closest('.siswa-picker').contains(e.target)) dd.classList.remove('open');
    });
  });
}
