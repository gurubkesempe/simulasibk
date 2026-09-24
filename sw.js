/* ============================================================
   BK DIGITAL — Service Worker
   ------------------------------------------------------------
   Tujuan file ini HANYA dua:
   1. Membuat aplikasi "installable" (muncul opsi "Install" / "Add to
      Home Screen" di HP & Laptop/PC), karena syarat wajib PWA installable
      di Chrome/Edge/Android adalah ada service worker dengan fetch handler.
   2. Menyimpan file tampilan (HTML/CSS/JS/ikon) di cache browser supaya
      ikon yang sudah di-install tetap bisa DIBUKA walau internet lambat/
      putus-putus (langsung tampil shell aplikasinya).

   PENTING — ini TIDAK menyimpan/meng-cache data siswa sama sekali:
   - Semua request ke Google Apps Script (script.google.com) SENGAJA
     dilewatkan apa adanya ke jaringan (tidak pernah disimpan di cache),
     supaya data yang tampil selalu yang terbaru dari Google Sheet, dan
     tidak ada data siswa yang "nyangkut" di cache browser.
   - Kalau internet benar-benar putus, aplikasi tetap terbuka (shell-nya),
     tapi tetap butuh internet untuk login & memuat data seperti biasa.

   Kalau kamu update index.html/script.js/style.css di GitHub, browser
   akan otomatis mendeteksi sw.js berubah (kalau kamu naikkan APP_VERSION
   di bawah) dan mengganti cache lama dengan yang baru pada kunjungan
   berikutnya. Naikkan APP_VERSION setiap kali deploy versi baru supaya
   pengguna tidak "terjebak" di versi lama karena cache. */
const APP_VERSION = 'v1';
const CACHE_NAME = 'bk-digital-' + APP_VERSION;

// File "app shell" yang di-cache saat pertama kali install. Cukup file
// statis yang jarang berubah struktur besarnya; ini bukan daftar lengkap
// semua aset, karena browser tetap boleh mengambil aset lain langsung dari
// jaringan seperti biasa (lihat fetch handler di bawah).
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Cuma tangani request GET yang SATU ORIGIN dengan aplikasi ini (file
  // statis: html/css/js/ikon). Semua request lain — termasuk SEMUA
  // panggilan ke script.google.com (data siswa, login, dst) dan request
  // POST — SENGAJA dibiarkan lewat apa adanya ke jaringan, tidak pernah
  // disentuh/di-cache oleh service worker ini.
  if (req.method !== 'GET' || url.origin !== self.location.origin){
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        // Simpan salinan terbaru ke cache di background supaya kunjungan
        // berikutnya dapat versi terbaru (cache-first untuk kecepatan,
        // tetap diperbarui diam-diam di belakang layar).
        if (res && res.ok){
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached); // offline & tidak ada di cache -> biarkan gagal wajar
      return cached || network;
    })
  );
});
