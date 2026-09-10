/* ============================================================
   MAIN ENTRY POINT (Vite Bundled)
   ============================================================ */
import './styles/main.css';

import { STATE, loadAll, getCurrentPage, setCurrentPage, onDataLoaded, populateClassFilters } from './state/store.js';
import { getAdapter, setRealMode, setDemoMode, getApiCredentials } from './api/index.js';
import { $, $all, showLoading } from './utils/dom.js';
import { escapeHtml } from './utils/helpers.js';
import { toast } from './components/toast.js';
import { openModal, closeModal, openForm, initModalListeners, setModalRefreshCallback } from './components/modal.js';
import { initSiswaPickerListeners } from './components/siswaPicker.js';
import { initGlobalSearchListeners, setSearchNavigationHandler } from './components/searchDropdown.js';
import { downloadFullBackup } from './utils/excel.js';

import { renderDashboard, initDashboardListeners } from './views/dashboard.js';
import { renderSiswa, initSiswaListeners } from './views/siswa.js';
import { renderAbsensi, openWaForAbsen, initAbsensiListeners, setAbsensiRefreshCallback } from './views/absensi.js';
import { renderPelanggaran, initPelanggaranListeners } from './views/pelanggaran.js';
import { renderKonseling, initKonselingListeners } from './views/konseling.js';
import { renderKolaborasi, initKolaborasiListeners } from './views/kolaborasi.js';
import { renderKebiasaan, printKebiasaanForm, initKebiasaanListeners, setKebiasaanNavHandler } from './views/kebiasaan.js';
import { initLaporanListeners } from './views/laporan.js';

/* ---------- PAGE ROUTING & RENDERING ---------- */
const PAGE_TITLES = {
  dashboard: 'Dashboard',
  siswa: 'Data Siswa',
  absensi: 'Absensi Siswa',
  pelanggaran: 'Pelanggaran Siswa',
  konseling: 'Bimbingan Konseling',
  kolaborasi: 'Kolaborasi Guru & Ortu',
  kebiasaan: '7 Kebiasaan Anak Indonesia Hebat',
  laporan: 'Laporan & Rekapitulasi'
};

export function renderCurrentPage(searchQuery = '') {
  const page = getCurrentPage();
  switch (page) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'siswa':
      renderSiswa(searchQuery);
      break;
    case 'absensi':
      renderAbsensi(searchQuery);
      break;
    case 'pelanggaran':
      renderPelanggaran(searchQuery);
      break;
    case 'konseling':
      renderKonseling(searchQuery);
      break;
    case 'kolaborasi':
      renderKolaborasi(searchQuery);
      break;
    case 'kebiasaan':
      renderKebiasaan(searchQuery);
      break;
  }
}

export function goToPage(page) {
  setCurrentPage(page);
  $all('.page').forEach(p => p.classList.remove('active'));
  $(`#page-${page}`)?.classList.add('active');

  $all('.nav-item[data-page]').forEach(n =>
    n.classList.toggle('active', n.dataset.page === page)
  );
  $all('.bn-item[data-page]').forEach(n =>
    n.classList.toggle('active', n.dataset.page === page)
  );

  const titleEl = $('#pageTitle');
  if (titleEl) titleEl.textContent = PAGE_TITLES[page] || page;

  closeMoreSheet();
  renderCurrentPage();

  // If entering dashboard, redraw charts cleanly
  if (page === 'dashboard') {
    setTimeout(renderDashboard, 50);
  }
}

/* Mobile Drawer */
function openMoreSheet() {
  $('#moreSheet')?.classList.add('open');
  $('#sheetBackdrop')?.classList.add('open');
}

function closeMoreSheet() {
  $('#moreSheet')?.classList.remove('open');
  $('#sheetBackdrop')?.classList.remove('open');
}

/* Setup Screen / Entry */
function showSetupScreen() {
  $('#initialLoader')?.classList.add('hidden');
  $('#setupScreen')?.classList.remove('hidden');
  $('#app')?.classList.add('hidden');
}

function enterApp() {
  $('#initialLoader')?.classList.add('hidden');
  $('#setupScreen')?.classList.add('hidden');
  $('#app')?.classList.remove('hidden');
  loadAll();
}

/* Settings Modal */
function openSettings() {
  const { apiUrl, apiToken } = getApiCredentials();
  $('#modalTitle').textContent = 'Pengaturan Koneksi & Database';
  $('#modalBody').innerHTML = `
    <div class="field full" style="margin-bottom:16px">
      <label>URL Web App Google Apps Script</label>
      <input type="url" id="settingsApiUrl" value="${escapeHtml(apiUrl)}" placeholder="https://script.google.com/macros/s/xxxxx/exec" />
    </div>
    <div class="field full" style="margin-bottom:16px">
      <label>Token / Kata Sandi Akses</label>
      <input type="password" id="settingsApiToken" value="${escapeHtml(apiToken)}" placeholder="Sesuai ACCESS_TOKEN di Script Properties" />
    </div>
    <div class="field full backup-box">
      <label style="font-size:0.9rem;font-weight:700">Cadangkan Database (Backup Excel)</label>
      <p class="muted" style="margin:4px 0 12px">Unduh salinan semua data (Siswa, Absensi, Pelanggaran, Konseling, Kolaborasi, 7 Kebiasaan) menjadi satu file .xlsx lengkap.</p>
      <button class="btn btn-ghost" id="settingsBackupBtn" type="button"><i class="fa-solid fa-file-arrow-down"></i> Unduh Salinan Backup (.xlsx)</button>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="settingsDemoBtn" type="button">Beralih ke Mode Demo Offline</button>
      <button class="btn btn-primary" id="settingsSaveBtn" type="button"><i class="fa-solid fa-check"></i> Simpan &amp; Muat Ulang</button>
    </div>`;

  $('#settingsBackupBtn')?.addEventListener('click', () => downloadFullBackup(STATE));
  $('#settingsSaveBtn')?.addEventListener('click', () => {
    const val = $('#settingsApiUrl')?.value.trim();
    const tokenVal = $('#settingsApiToken')?.value.trim();
    if (!val) {
      toast('URL Web App tidak boleh kosong.', 'error');
      return;
    }
    setRealMode(val, tokenVal);
    closeModal();
    loadAll();
    toast('Pengaturan berhasil disimpan.', 'success');
  });

  $('#settingsDemoBtn')?.addEventListener('click', () => {
    setDemoMode();
    closeModal();
    loadAll();
    toast('Mode Demo Offline diaktifkan.', 'success');
  });

  openModal();
}

/* Global Actions Delegation */
function initGlobalActions() {
  document.addEventListener('click', async e => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn = e.target.closest('[data-del]');
    const printHabitBtn = e.target.closest('[data-print-habit]');
    const waBtn = e.target.closest('[data-wa]');

    if (waBtn) {
      openWaForAbsen(waBtn.dataset.wa);
      return;
    }
    if (printHabitBtn) {
      printKebiasaanForm(printHabitBtn.dataset.printHabit);
      return;
    }
    if (editBtn) {
      openForm(editBtn.dataset.edit, editBtn.dataset.id);
      return;
    }
    if (delBtn) {
      const type = delBtn.dataset.del;
      const id = delBtn.dataset.id;
      if (!confirm('Yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.')) return;

      // Optimistic delete: remove from memory and re-render instantly
      const itemIndex = STATE[type].findIndex(o => String(o.ID) === String(id));
      if (itemIndex === -1) return;
      const [removedItem] = STATE[type].splice(itemIndex, 1);

      renderCurrentPage();
      renderDashboard();
      populateClassFilters();
      toast('Data berhasil dihapus.', 'success');

      // Background async sync with rollback
      (async () => {
        try {
          const adapter = getAdapter();
          await adapter.delete(type, id);
        } catch (err) {
          // Restore item on server failure
          STATE[type].splice(itemIndex, 0, removedItem);
          renderCurrentPage();
          renderDashboard();
          populateClassFilters();
          toast('Gagal menghapus data di server: ' + err.message, 'error');
        }
      })();
    }
  });

  // Navigation link clicks (desktop & mobile)
  $all('.nav-item[data-page], .bn-item[data-page]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      goToPage(page);
    });
  });

  $('#hamburgerBtn')?.addEventListener('click', openMoreSheet);
  $('#bnMore')?.addEventListener('click', e => {
    e.preventDefault();
    openMoreSheet();
  });
  $('#sheetBackdrop')?.addEventListener('click', closeMoreSheet);

  $('#refreshBtn')?.addEventListener('click', () => {
    loadAll();
    toast('Data diperbarui.', 'success');
  });

  $('#settingsBtn')?.addEventListener('click', openSettings);
  $('#settingsBtnMobile')?.addEventListener('click', () => {
    closeMoreSheet();
    openSettings();
  });

  // Setup screen submission
  $('#apiUrlSave')?.addEventListener('click', () => {
    const val = $('#apiUrlInput')?.value.trim();
    const tokenVal = $('#apiTokenInput')?.value.trim();
    if (!val) {
      toast('Masukkan URL Web App terlebih dahulu.', 'error');
      return;
    }
    setRealMode(val, tokenVal);
    enterApp();
  });

  // Add demo link dynamically if not present
  const note = document.querySelector('.setup-note');
  if (note && !note.nextElementSibling?.classList.contains('demo-link')) {
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'demo-link';
    a.innerHTML = 'Coba mode demo tanpa Google Sheets <i class="fa-solid fa-arrow-right"></i>';
    a.style.cssText =
      'display:inline-flex;align-items:center;gap:6px;margin-top:14px;color:var(--brand-700);font-weight:600;font-size:0.88rem;';
    a.addEventListener('click', e => {
      e.preventDefault();
      setDemoMode();
      enterApp();
    });
    note.after(a);
  }
}

/* Initialization */
function init() {
  // Register component listeners
  initModalListeners();
  initSiswaPickerListeners();
  initGlobalSearchListeners();
  initGlobalActions();

  // Register view listeners
  initDashboardListeners();
  initSiswaListeners();
  initAbsensiListeners();
  initPelanggaranListeners();
  initKonselingListeners();
  initKolaborasiListeners();
  initKebiasaanListeners();
  initLaporanListeners();

  // Register cross-module callbacks
  setModalRefreshCallback(() => {
    renderCurrentPage();
    renderDashboard();
  });
  setAbsensiRefreshCallback(() => {
    renderCurrentPage();
    renderDashboard();
  });
  setSearchNavigationHandler(page => goToPage(page));
  setKebiasaanNavHandler(page => goToPage(page));

  onDataLoaded(() => {
    renderCurrentPage();
    renderDashboard();
  });

  // Check login state
  const { apiUrl, isDemo } = getApiCredentials();
  if (isDemo) {
    setDemoMode();
    enterApp();
  } else if (apiUrl) {
    const apiUrlInput = $('#apiUrlInput');
    const apiTokenInput = $('#apiTokenInput');
    if (apiUrlInput) apiUrlInput.value = apiUrl;
    if (apiTokenInput) apiTokenInput.value = getApiCredentials().apiToken;
    enterApp();
  } else {
    showSetupScreen();
  }
}

// Start application
init();
