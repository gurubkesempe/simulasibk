/* ============================================================
   VIEWS / 7 KEBIASAAN ANAK INDONESIA HEBAT
   ============================================================ */
import { STATE } from '../state/store.js';
import { $ } from '../utils/dom.js';
import { fmtDate, escapeHtml, initials, colorFromString, habitDone } from '../utils/helpers.js';
import { openForm } from '../components/modal.js';
import { downloadKebiasaanTemplate, importKebiasaanFromExcel } from '../utils/excel.js';
import { getAdapter } from '../api/index.js';
import { loadAll } from '../state/store.js';

let navHandler = null;

export function setKebiasaanNavHandler(fn) {
  navHandler = fn;
}

export function printKebiasaanForm(id) {
  const k = STATE.kebiasaan.find(o => String(o.ID) === String(id));
  if (!k) return;

  const row = (label, value) =>
    `<tr><td class="hb-k">${escapeHtml(label)}</td><td class="hb-v">${escapeHtml(value) || '-'}</td></tr>`;

  const html = `
    <h2>7 Kebiasaan Anak Indonesia Hebat</h2>
    <div class="report-head-line"><span>Nama: ${escapeHtml(k.Nama || '-')} &nbsp;|&nbsp; Kelas: ${escapeHtml(k.Kelas || '-')}</span><span>Hari, tanggal: ${fmtDate(k.Tanggal)}</span></div>
    <table class="hb-table">
      <tbody>
        ${row('1. Bangun Pagi', 'Pukul: ' + (k.BangunPagiPukul || '-'))}
        ${row(
          '2. Beribadah',
          (k.IbadahSholat || '-') +
            (habitDone(k.IbadahDhuha) ? ', Dhuha' : '') +
            (k.IbadahTadarus ? ', Tadarus/Murajaah: ' + k.IbadahTadarus : '') +
            (k.IbadahLainnya ? ', Lainnya: ' + k.IbadahLainnya : '')
        )}
        ${row('3. Berolahraga', 'Jenis: ' + (k.OlahragaJenis || '-') + ' — Durasi: ' + (k.OlahragaDurasi ? k.OlahragaDurasi + ' menit' : '-'))}
        ${row('4. Gemar Belajar', 'Mapel: ' + (k.BelajarMapel || '-'))}
        ${row('5. Makan Sehat dan Bergizi', 'Menu: ' + (k.MakanMenu || '-'))}
        ${row('6. Bermasyarakat', 'Kegiatan: ' + (k.BermasyarakatKegiatan || '-'))}
        ${row('7. Istirahat Cukup', 'Pukul: ' + (k.IstirahatPukul || '-'))}
      </tbody>
    </table>
    <table class="hb-table" style="margin-top:14px">
      <tbody>
        <tr>
          <td class="hb-k" style="width:20%">Paraf Ortu</td>
          <td class="hb-k" style="width:20%">Paraf Guru</td>
          <td class="hb-k">Catatan Guru</td>
        </tr>
        <tr style="height:70px">
          <td style="text-align:center;font-size:20px">${habitDone(k.ParafOrtu) ? '✓' : ''}</td>
          <td style="text-align:center;font-size:20px">${habitDone(k.ParafGuru) ? '✓' : ''}</td>
          <td>${escapeHtml(k.CatatanGuru || '')}</td>
        </tr>
      </tbody>
    </table>`;

  const reportPreview = $('#reportPreview');
  const reportPreviewCard = $('#reportPreviewCard');
  if (reportPreview && reportPreviewCard) {
    reportPreview.innerHTML = html;
    reportPreviewCard.style.display = 'block';
    if (navHandler) navHandler('laporan');
    reportPreviewCard.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => window.print(), 400);
  }
}

export function renderKebiasaan(searchQuery = '') {
  const kelasEl = $('#filterKelasKebiasaan');
  const tglEl = $('#filterTglKebiasaan');

  const kelas = kelasEl ? kelasEl.value : '';
  const tgl = tglEl ? tglEl.value : '';

  let rows = STATE.kebiasaan.filter(
    k => (!kelas || k.Kelas === kelas) && (!tgl || k.Tanggal === tgl)
  );

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    rows = rows.filter(k => (k.Nama || '').toLowerCase().includes(q));
  }

  rows.sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));

  const list = $('#listKebiasaan');
  const emptyState = $('#emptyKebiasaan');
  if (!list) return;

  if (emptyState) emptyState.style.display = rows.length ? 'none' : 'block';

  const habitDefs = [
    { key: 'BangunPagiPukul', label: 'Bangun Pagi', icon: 'fa-sun', display: v => v || '-' },
    {
      key: 'IbadahSholat',
      label: 'Beribadah',
      icon: 'fa-mosque',
      display: (v, k) =>
        [
          v,
          habitDone(k.IbadahDhuha) ? 'Dhuha' : '',
          k.IbadahTadarus ? 'Tadarus: ' + k.IbadahTadarus : ''
        ]
          .filter(Boolean)
          .join(', ') || '-'
    },
    {
      key: 'OlahragaJenis',
      label: 'Berolahraga',
      icon: 'fa-person-running',
      display: (v, k) => (v ? `${v}${k.OlahragaDurasi ? ` (${k.OlahragaDurasi} menit)` : ''}` : '-')
    },
    { key: 'BelajarMapel', label: 'Gemar Belajar', icon: 'fa-book', display: v => v || '-' },
    {
      key: 'MakanMenu',
      label: 'Makan Sehat & Bergizi',
      icon: 'fa-utensils',
      display: v => v || '-'
    },
    {
      key: 'BermasyarakatKegiatan',
      label: 'Bermasyarakat',
      icon: 'fa-people-group',
      display: v => v || '-'
    },
    { key: 'IstirahatPukul', label: 'Istirahat Cukup', icon: 'fa-bed', display: v => v || '-' }
  ];

  list.innerHTML = rows
    .map(
      k => `
    <div class="entry-card habit-card">
      <div class="entry-card-head">
        <div class="entry-avatar-row">
          <span class="avatar-ring" style="background:${colorFromString(k.Nama)}">${escapeHtml(initials(k.Nama))}</span>
          <div>
            <div class="entry-name">${escapeHtml(k.Nama || '-')}</div>
            <div class="entry-sub"><span class="badge badge--muted">${escapeHtml(k.Kelas || '-')}</span> · <span class="tabular-nums font-mono">${fmtDate(k.Tanggal)}</span></div>
          </div>
        </div>
        <div class="row-actions">
          <button class="icon-btn-sm" data-print-habit="${escapeHtml(k.ID)}" title="Cetak Formulir"><i class="fa-solid fa-print"></i></button>
          <button class="icon-btn-sm" data-edit="kebiasaan" data-id="${escapeHtml(k.ID)}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn-sm danger" data-del="kebiasaan" data-id="${escapeHtml(k.ID)}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="habit-grid">
        ${habitDefs
          .map(
            h => `<div class="habit-item">
              <i class="fa-solid ${h.icon}"></i>
              <div>
                <span class="habit-label">${h.label}</span>
                <span class="habit-value">${escapeHtml(h.display(k[h.key], k))}</span>
              </div>
            </div>`
          )
          .join('')}
      </div>
      <div class="entry-foot">
        <span class="entry-sub">
          ${
            habitDone(k.ParafOrtu)
              ? '<span class="badge badge--success"><span class="badge-dot"></span>Paraf Ortu: Ya</span>'
              : '<span class="badge badge--muted"><span class="badge-dot"></span>Paraf Ortu: Belum</span>'
          } &nbsp;
          ${
            habitDone(k.ParafGuru)
              ? '<span class="badge badge--success"><span class="badge-dot"></span>Paraf Guru: Ya</span>'
              : '<span class="badge badge--muted"><span class="badge-dot"></span>Paraf Guru: Belum</span>'
          }
        </span>
      </div>
      ${k.CatatanGuru ? `<div class="habit-note"><b>Catatan Guru:</b> ${escapeHtml(k.CatatanGuru)}</div>` : ''}
    </div>`
    )
    .join('');
}

export function initKebiasaanListeners() {
  $('#filterKelasKebiasaan')?.addEventListener('change', () => renderKebiasaan());
  $('#filterTglKebiasaan')?.addEventListener('change', () => renderKebiasaan());
  $('#btnAddKebiasaan')?.addEventListener('click', () => openForm('kebiasaan'));

  $('#btnDownloadTemplateKebiasaan')?.addEventListener('click', downloadKebiasaanTemplate);

  const importBtn = $('#btnImportKebiasaan');
  const importFileInput = $('#importKebiasaanFile');

  if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      await importKebiasaanFromExcel(file, getAdapter(), loadAll);
      e.target.value = '';
    });
  }
}
