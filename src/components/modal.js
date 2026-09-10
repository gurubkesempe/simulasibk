/* ============================================================
   COMPONENTS / MODAL & FORM BUILDER
   ============================================================ */
import { FORM_CONFIG } from '../config/constants.js';
import { STATE, siswaById, uniqueClasses, populateClassFilters } from '../state/store.js';
import { getAdapter } from '../api/index.js';
import { $, showLoading } from '../utils/dom.js';
import { toast } from './toast.js';
import { escapeHtml, habitDone } from '../utils/helpers.js';

let refreshCallback = null;

export function setModalRefreshCallback(fn) {
  refreshCallback = fn;
}

export function openModal() {
  const mb = $('#modalBackdrop');
  if (mb) mb.classList.add('open');
}

export function closeModal() {
  const mb = $('#modalBackdrop');
  if (mb) mb.classList.remove('open');
}

export function openForm(type, id = null, prefill = null) {
  const cfg = FORM_CONFIG[type];
  if (!cfg) return;

  const existing = id ? STATE[type].find(o => String(o.ID) === String(id)) : null;
  $('#modalTitle').textContent = (existing ? 'Edit ' : 'Tambah ') + cfg.title;

  const fieldsHtml = cfg.fields
    .map(f => {
      let val = existing
        ? existing[f.key] ?? ''
        : prefill && prefill[f.key] !== undefined
        ? prefill[f.key]
        : typeof f.default === 'function'
        ? f.default()
        : '';

      // Legacy fallback for student's birth place & date
      if (type === 'siswa' && existing && !val) {
        if (f.key === 'TempatLahir' && existing.TempatTglLahir) {
          val = existing.TempatTglLahir.split(',')[0]?.trim() || '';
        }
        if (f.key === 'TanggalLahir' && existing.TempatTglLahir) {
          const rawDate = existing.TempatTglLahir.split(',')[1]?.trim() || '';
          if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
            const [d, m, y] = rawDate.split('-');
            val = `${y}-${m}-${d}`;
          } else {
            val = rawDate;
          }
        }
      }

      // Mapping for kebiasaan combined groups
      if (type === 'kebiasaan' && existing) {
        if (f.key === 'IbadahSholat') {
          const list = (existing.IbadahSholat || '').split(',').map(s => s.trim()).filter(Boolean);
          if (habitDone(existing.IbadahDhuha) && !list.includes('Dhuha')) {
            list.push('Dhuha');
          }
          val = list.join(', ');
        }
        if (f.key === 'ParafVerification') {
          const list = [];
          if (habitDone(existing.ParafOrtu)) list.push('Paraf Orang Tua');
          if (habitDone(existing.ParafGuru)) list.push('Paraf Guru');
          val = list.join(', ');
        }
      }

      const wrapClass = 'field' + (f.full ? ' full' : '');

      if (f.type === 'select') {
        return `<div class="${wrapClass}"><label>${f.label}</label>
          <select name="${f.key}" ${f.required ? 'required' : ''}>
            <option value="">Pilih...</option>
            ${f.options
              .map(o => `<option value="${o}" ${o === val ? 'selected' : ''}>${o}</option>`)
              .join('')}
          </select></div>`;
      }

      if (f.type === 'select-siswa') {
        const selSiswa = val ? siswaById(val) : null;
        const displayVal = selSiswa ? `${selSiswa.Nama} — ${selSiswa.Kelas || '-'}` : '';
        const kelasOpts = uniqueClasses()
          .map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
          .join('');
        return `<div class="${wrapClass}"><label>${f.label}</label>
          <div class="siswa-picker">
            <div class="siswa-picker-row">
              <select class="siswa-picker-kelas" title="Filter kelas"><option value="">Semua Kelas</option>${kelasOpts}</select>
              <input type="text" class="siswa-picker-input" autocomplete="off" placeholder="Ketik nama, NIS, atau kelas siswa..." value="${escapeHtml(displayVal)}" />
            </div>
            <input type="hidden" name="${f.key}" value="${escapeHtml(val || '')}" />
            <div class="siswa-picker-dropdown search-dropdown"></div>
          </div></div>`;
      }

      if (f.type === 'textarea') {
        return `<div class="${wrapClass}"><label>${f.label}</label><textarea name="${f.key}">${escapeHtml(val || '')}</textarea></div>`;
      }

      if (f.type === 'checkbox-group') {
        const selected = (val || '').split(',').map(s => s.trim());
        return `<div class="${wrapClass}"><label>${f.label}</label>
          <div class="checkbox-group">
            ${f.options
              .map(
                o =>
                  `<label class="checkbox-pill"><input type="checkbox" name="${f.key}" value="${o}" ${selected.includes(o) ? 'checked' : ''}/> ${o}</label>`
              )
              .join('')}
          </div></div>`;
      }

      if (f.type === 'checkbox') {
        const checked = habitDone(val);
        return `<div class="${wrapClass} field--checkbox">
          <label class="field-label-placeholder">&nbsp;</label>
          <label class="checkbox-pill checkbox-pill--field">
            <input type="checkbox" name="${f.key}" value="Ya" ${checked ? 'checked' : ''}/>
            <span class="checkbox-label">${f.label}</span>
          </label>
        </div>`;
      }

      return `<div class="${wrapClass}"><label>${f.label}</label><input type="${f.type}" name="${f.key}" value="${escapeHtml(val || '')}" ${f.placeholder ? `placeholder="${escapeHtml(f.placeholder)}"` : ''} ${f.required ? 'required' : ''} /></div>`;
    })
    .join('');

  $('#modalBody').innerHTML = `
    <form id="entityForm">
      <div class="form-grid">${fieldsHtml}</div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="formCancel">Batal</button>
        <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Simpan</button>
      </div>
    </form>`;

  $('#formCancel').addEventListener('click', closeModal);
  $('#entityForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {};
    cfg.fields.forEach(f => {
      if (f.type === 'checkbox-group') {
        data[f.key] = fd.getAll(f.key).join(', ');
      } else if (f.type === 'checkbox') {
        data[f.key] = fd.get(f.key) ? 'Ya' : '';
      } else {
        data[f.key] = fd.get(f.key) || '';
      }
    });

    if (data.SiswaID !== undefined) {
      const s = siswaById(data.SiswaID);
      if (s) {
        data.Nama = s.Nama;
        data.Kelas = s.Kelas;
      }
    }

    if (type === 'kebiasaan') {
      const sholatList = (data.IbadahSholat || '').split(',').map(s => s.trim());
      data.IbadahDhuha = sholatList.includes('Dhuha') ? 'Ya' : '';
      const parafList = (data.ParafVerification || '').split(',').map(s => s.trim());
      data.ParafOrtu = parafList.includes('Paraf Orang Tua') ? 'Ya' : '';
      data.ParafGuru = parafList.includes('Paraf Guru') ? 'Ya' : '';
    }

    const missingSiswa = cfg.fields.find(
      f => f.type === 'select-siswa' && f.required && !data[f.key]
    );
    if (missingSiswa) {
      toast(`${missingSiswa.label} wajib dipilih — ketik nama lalu klik salah satu hasil.`, 'error');
      return;
    }

    // Optimistic UI Update: Instant local apply & immediate modal close
    closeModal();
    const tempId = data.ID || (type.substring(0, 3).toUpperCase() + '-' + Date.now().toString(36));
    const oldSnapshot = existing ? { ...existing } : null;

    if (existing) {
      const idx = STATE[type].findIndex(o => String(o.ID) === String(existing.ID));
      if (idx !== -1) {
        STATE[type][idx] = { ...existing, ...data, ID: existing.ID };
      }
      toast('Data berhasil diperbarui.', 'success');
    } else {
      STATE[type].unshift({ ...data, ID: tempId });
      toast('Data berhasil disimpan.', 'success');
    }

    populateClassFilters();
    if (refreshCallback) refreshCallback();

    // Async background sync with rollback resilience
    (async () => {
      try {
        const adapter = getAdapter();
        if (existing) {
          const updated = await adapter.update(type, existing.ID, data);
          const idx = STATE[type].findIndex(o => String(o.ID) === String(existing.ID));
          if (idx !== -1) {
            STATE[type][idx] = { ...STATE[type][idx], ...updated };
          }
        } else {
          const created = await adapter.create(type, data);
          const idx = STATE[type].findIndex(o => String(o.ID) === String(tempId));
          if (idx !== -1) {
            STATE[type][idx] = { ...STATE[type][idx], ...created };
          }
        }
      } catch (err) {
        // Rollback state if server sync fails
        if (existing) {
          const idx = STATE[type].findIndex(o => String(o.ID) === String(existing.ID));
          if (idx !== -1) STATE[type][idx] = oldSnapshot;
        } else {
          STATE[type] = STATE[type].filter(o => String(o.ID) !== String(tempId));
        }
        populateClassFilters();
        if (refreshCallback) refreshCallback();
        toast('Gagal menyinkronkan data ke server: ' + err.message, 'error');
      }
    })();
  });

  openModal();
}

export function initModalListeners() {
  $('#modalClose')?.addEventListener('click', closeModal);
  $('#modalBackdrop')?.addEventListener('click', e => {
    if (e.target === $('#modalBackdrop')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}
