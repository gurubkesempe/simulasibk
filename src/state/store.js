/* ============================================================
   STATE / STORE
   ============================================================ */
import { TYPES } from '../config/constants.js';
import { getAdapter } from '../api/index.js';
import { showLoading, $ } from '../utils/dom.js';
import { toast } from '../components/toast.js';
import { escapeHtml } from '../utils/helpers.js';

export const STATE = {
  siswa: [],
  absensi: [],
  pelanggaran: [],
  konseling: [],
  kolaborasi: [],
  kebiasaan: []
};

let currentPage = 'dashboard';
let renderListeners = [];

export function getCurrentPage() {
  return currentPage;
}

export function setCurrentPage(page) {
  currentPage = page;
}

export function onDataLoaded(cb) {
  renderListeners.push(cb);
}

export function uniqueClasses() {
  const set = new Set(STATE.siswa.map(s => s.Kelas).filter(Boolean));
  return Array.from(set).sort();
}

export function siswaById(id) {
  return STATE.siswa.find(s => String(s.ID) === String(id));
}

export function populateClassFilters() {
  const classes = uniqueClasses();
  const selectors = [
    '#filterDashboardKelas',
    '#filterKelasSiswa',
    '#filterKelasAbsensi',
    '#filterKelasPelanggaran',
    '#filterKelasKonseling',
    '#filterKelasKebiasaan',
    '#reportKelas'
  ];

  selectors.forEach(sel => {
    const el = $(sel);
    if (!el) return;
    const current = el.value;
    el.innerHTML =
      '<option value="">Semua Kelas</option>' +
      classes.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    el.value = current;
  });

  populateReportSiswaSelect();
}

export function populateReportSiswaSelect() {
  const el = $('#reportSiswa');
  if (!el) return;
  const current = el.value;
  const sorted = STATE.siswa.slice().sort((a, b) => (a.Nama || '').localeCompare(b.Nama || ''));
  el.innerHTML =
    '<option value="">Pilih siswa...</option>' +
    sorted
      .map(
        s =>
          `<option value="${escapeHtml(s.ID)}">${escapeHtml(s.Nama)} — ${escapeHtml(s.Kelas)}</option>`
      )
      .join('');
  el.value = current;
}

export async function loadAll() {
  showLoading(true);
  try {
    const adapter = getAdapter();
    const data = await adapter.getAllBatch();
    TYPES.forEach(t => {
      STATE[t] = data[t] || [];
    });
    populateClassFilters();
    renderListeners.forEach(fn => fn());
  } catch (err) {
    toast('Gagal memuat data: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}
