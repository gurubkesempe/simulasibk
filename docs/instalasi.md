# Panduan Instalasi & Deployment: BK Digital

Dokumen ini berisi panduan langkah demi langkah untuk memasang (*deploy*) dan menjalankan aplikasi **BK Digital** dari awal hingga siap digunakan oleh Guru BK / Sekolah.

---

## 📋 Prasyarat Sistem

Sebelum memulai, pastikan Anda memiliki:
1. **Akun Google** (Gmail biasa atau akun Google Workspace for Education milik sekolah seperti `@sekolah.sch.id`).
2. **Web Browser Modern** (Google Chrome, Mozilla Firefox, Microsoft Edge, atau Safari).
3. Salah satu opsi hosting frontend:
   - **GitHub Pages** (Gratis & Direkomendasikan)
   - **Web Hosting Sekolah / cPanel**
   - **Vercel / Netlify**
   - Atau dijalankan secara **Lokal (Offline)** di laptop/PC.

---

## 🚀 Langkah 1: Persiapan Database (Google Spreadsheet)

1. Buka [Google Sheets](https://sheets.new) di browser Anda.
2. Buat spreadsheet baru dan beri nama, misalnya: **`Database BK Digital - SMPN 1 Contoh`**.
3. *(Opsional)* Anda tidak perlu membuat tab/sheet secara manual, karena script backend akan otomatis membuat tab dan kolom header default saat pertama kali data disimpan. Namun jika ingin memeriksa, tabel yang akan digunakan adalah:
   - `Siswa`
   - `Absensi`
   - `Pelanggaran`
   - `Konseling`
   - `Kolaborasi`
   - `Kebiasaan`

---

## ⚙️ Langkah 2: Pemasangan Backend (Google Apps Script)

1. Di Google Spreadsheet yang baru dibuat, klik menu **Extensions (Ekstensi)** > **Apps Script**.
2. Hapus semua kode bawaan yang ada di editor file `Code.gs`.
3. Salin dan tempel (*copy-paste*) seluruh kode backend di bawah ini ke dalam `Code.gs`:

```javascript
/* ============================================================
   BK DIGITAL — BACKEND (Google Apps Script)
   ============================================================ */

var TYPE_SHEET = {
  siswa: 'Siswa',
  absensi: 'Absensi',
  pelanggaran: 'Pelanggaran',
  konseling: 'Konseling',
  kolaborasi: 'Kolaborasi',
  kebiasaan: 'Kebiasaan'
};

var DEFAULT_HEADERS = {
  Siswa: ['ID','NIS','Nama','Kelas','JenisKelamin','TempatTglLahir','Alamat','NamaOrtu','NoHPOrtu','Catatan'],
  Absensi: ['ID','Tanggal','SiswaID','Nama','Kelas','Status','Keterangan'],
  Pelanggaran: ['ID','Tanggal','SiswaID','Nama','Kelas','JenisPelanggaran','Poin','Keterangan','Penanganan'],
  Konseling: ['ID','Tanggal','SiswaID','Nama','Kelas','Topik','Konselor','Masalah','HasilKonseling','TindakLanjut'],
  Kolaborasi: ['ID','Tanggal','SiswaID','Nama','Kelas','Jenis','Petugas','Tujuan','Hasil'],
  Kebiasaan: ['ID','Tanggal','SiswaID','Nama','Kelas','BangunPagiPukul','IbadahSholat','IbadahDhuha','IbadahTadarus',
    'IbadahLainnya','OlahragaJenis','OlahragaDurasi','BelajarMapel','MakanMenu','BermasyarakatKegiatan',
    'IstirahatPukul','ParafOrtu','ParafGuru','CatatanGuru']
};

var ID_PREFIX = { siswa:'SIS', absensi:'ABS', pelanggaran:'PEL', konseling:'KON', kolaborasi:'KOL', kebiasaan:'HAB' };

/* ---------------- ENTRY POINTS ---------------- */
function doGet(e){
  try{
    var params = e.parameter || {};
    checkToken(params.token);
    var action = params.action;
    if (action === 'getAll'){
      var type = params.type;
      return jsonOut({ ok:true, data: readSheet(type) });
    }
    if (action === 'getAllBatch'){
      var out = {};
      Object.keys(TYPE_SHEET).forEach(function(t){ out[t] = readSheet(t); });
      return jsonOut({ ok:true, data: out });
    }
    return jsonOut({ ok:false, error:'Aksi GET tidak dikenal.' });
  }catch(err){
    return jsonOut({ ok:false, error: err.message });
  }
}

function doPost(e){
  try{
    var body = JSON.parse(e.postData.contents || '{}');
    checkToken(body.token);
    var action = body.action;
    var type = body.type;

    if (action === 'getAllBatch'){
      var out = {};
      Object.keys(TYPE_SHEET).forEach(function(t){ out[t] = readSheet(t); });
      return jsonOut({ ok:true, data: out });
    }
    if (action === 'getAll'){
      return jsonOut({ ok:true, data: readSheet(type) });
    }
    if (action === 'create'){
      var row = createRow(type, body.data || {});
      return jsonOut({ ok:true, data: row });
    }
    if (action === 'update'){
      var updated = updateRow(type, body.id, body.data || {});
      return jsonOut({ ok:true, data: updated });
    }
    if (action === 'delete'){
      deleteRow(type, body.id);
      return jsonOut({ ok:true });
    }
    if (action === 'importBulk'){
      var result = importBulk(type, body.rows || [], body.matchField || 'NIS');
      return jsonOut({ ok:true, data: result });
    }
    if (action === 'bulkInsert'){
      var bulkResult = bulkInsert(type, body.rows || []);
      return jsonOut({ ok:true, data: bulkResult });
    }
    return jsonOut({ ok:false, error:'Aksi POST tidak dikenal.' });
  }catch(err){
    return jsonOut({ ok:false, error: err.message });
  }
}

/* ---------------- AUTH & SECURITY ---------------- */
function checkToken(token){
  var expected = PropertiesService.getScriptProperties().getProperty('ACCESS_TOKEN');
  if (!expected) return; // Supaya tidak mengunci saat setup awal
  if (!token || String(token) !== String(expected)){
    throw new Error('Token akses salah atau kosong. Periksa pengaturan koneksi di aplikasi.');
  }
}

/* ---------------- SHEET HELPERS ---------------- */
function getSheet(type){
  var name = TYPE_SHEET[type];
  if (!name) throw new Error('Tipe data tidak dikenal: ' + type);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet){
    sheet = ss.insertSheet(name);
    var headers = DEFAULT_HEADERS[name] || ['ID'];
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getHeaders(sheet){
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1,1,1,lastCol).getValues()[0].map(function(h){ return String(h).trim(); });
}

function readSheet(type){
  var sheet = getSheet(type);
  var headers = getHeaders(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2,1,lastRow-1, headers.length).getValues();
  var out = [];
  for (var i=0;i<values.length;i++){
    var row = values[i];
    var isEmpty = row.every(function(c){ return c === '' || c === null; });
    if (isEmpty) continue;
    var obj = {};
    for (var c=0;c<headers.length;c++){
      if (!headers[c]) continue;
      var val = row[c];
      if (val instanceof Date){
        val = Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
      }
      obj[headers[c]] = val;
    }
    obj._row = i + 2;
    out.push(obj);
  }
  return out;
}

function findRowIndexById(sheet, headers, id){
  var idCol = headers.indexOf('ID');
  if (idCol === -1) throw new Error('Kolom ID tidak ditemukan di sheet.');
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, idCol+1, lastRow-1, 1).getValues();
  for (var i=0;i<ids.length;i++){
    if (String(ids[i][0]) === String(id)) return i+2;
  }
  return -1;
}

function createRow(type, data){
  var sheet = getSheet(type);
  var headers = getHeaders(sheet);
  if (!data.ID){
    data.ID = (ID_PREFIX[type] || 'ID') + '-' + Date.now().toString(36).toUpperCase();
  }
  var rowValues = headers.map(function(h){ return (data[h] !== undefined && data[h] !== null) ? data[h] : ''; });
  sheet.appendRow(rowValues);
  return data;
}

function updateRow(type, id, data){
  var sheet = getSheet(type);
  var headers = getHeaders(sheet);
  var rowIdx = findRowIndexById(sheet, headers, id);
  if (rowIdx === -1) throw new Error('Data dengan ID ' + id + ' tidak ditemukan.');
  Object.keys(data).forEach(function(key){
    var col = headers.indexOf(key);
    if (col === -1) return;
    sheet.getRange(rowIdx, col+1).setValue(data[key]);
  });
  var current = {};
  var rowValues = sheet.getRange(rowIdx,1,1,headers.length).getValues()[0];
  headers.forEach(function(h,i){ current[h] = rowValues[i]; });
  return current;
}

function deleteRow(type, id){
  var sheet = getSheet(type);
  var headers = getHeaders(sheet);
  var rowIdx = findRowIndexById(sheet, headers, id);
  if (rowIdx === -1) throw new Error('Data dengan ID ' + id + ' tidak ditemukan.');
  sheet.deleteRow(rowIdx);
}

function importBulk(type, rows, matchField){
  var sheet = getSheet(type);
  var headers = getHeaders(sheet);
  var matchCol = headers.indexOf(matchField);
  var existingKeys = {};
  if (matchCol !== -1){
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2){
      var vals = sheet.getRange(2, matchCol+1, lastRow-1, 1).getValues();
      vals.forEach(function(v){
        var k = String(v[0]).trim().toLowerCase();
        if (k) existingKeys[k] = true;
      });
    }
  }
  var added = 0, skipped = 0, skippedRows = [];
  var matrix = [];
  rows.forEach(function(r){
    var keyVal = matchCol !== -1 ? String(r[matchField] || '').trim().toLowerCase() : '';
    if (matchCol !== -1 && keyVal && existingKeys[keyVal]){
      skipped++; skippedRows.push(r[matchField]);
      return;
    }
    if (!r.ID){ r.ID = (ID_PREFIX[type] || 'ID') + '-' + Date.now().toString(36).toUpperCase() + '-' + added; }
    matrix.push(headers.map(function(h){ return (r[h] !== undefined && r[h] !== null) ? r[h] : ''; }));
    if (matchCol !== -1 && keyVal) existingKeys[keyVal] = true;
    added++;
  });
  if (matrix.length){
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, matrix.length, headers.length).setValues(matrix);
  }
  return { added: added, skipped: skipped, skippedKeys: skippedRows };
}

function bulkInsert(type, rows){
  var sheet = getSheet(type);
  var headers = getHeaders(sheet);
  var matrix = rows.map(function(r, i){
    if (!r.ID){ r.ID = (ID_PREFIX[type] || 'ID') + '-' + Date.now().toString(36).toUpperCase() + '-' + i; }
    return headers.map(function(h){ return (r[h] !== undefined && r[h] !== null) ? r[h] : ''; });
  });
  if (matrix.length){
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, matrix.length, headers.length).setValues(matrix);
  }
  return { inserted: matrix.length, rows: rows };
}

function jsonOut(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
```

4. **Atur Token Keamanan (Script Properties):**
   - Klik ikon gerigi ⚙️ **Project Settings (Setelan Proyek)** di sidebar kiri.
   - Gulir ke bawah ke bagian **Script Properties (Properti Skrip)**.
   - Klik **Add script property (Tambahkan properti skrip)**:
     - **Property:** `ACCESS_TOKEN`
     - **Value:** Buat kata sandi acak yang aman (contoh: `bk-smpn1-rahasia-2026`).
   - Klik **Save script properties (Simpan properti skrip)**.

5. **Deploy Web App:**
   - Klik tombol biru **Deploy** di kanan atas > **New deployment (Penerapan baru)**.
   - Klik ikon gerigi di sebelah *Select type* > Pilih **Web app**.
   - Isi konfigurasi:
     - **Description:** `BK Digital API v1`
     - **Execute as:** **Me (email Anda)**
     - **Who has access:** 
       - Pilih **Anyone** (jika akun Gmail biasa).
       - Atau pilih **Anyone within [Nama Sekolah]** (jika sekolah menggunakan Google Workspace for Education — opsi ini paling aman).
   - Klik **Deploy**.
   - Berikan izin (*Authorize Access*) jika Google meminta konfirmasi perizinan Spreadsheet.
   - **Salin URL Web App** yang berakhiran `/exec` (misal: `https://script.google.com/macros/s/AKfycbx.../exec`).

---

## 🌐 Langkah 3: Menjalankan Frontend

Pilih salah satu cara berikut untuk membuka aplikasi:

### Opsi A: Menggunakan GitHub Pages (Gratis & Online)
1. Buat repository baru di GitHub (misal: `bk-digital`).
2. Unggah berkas proyek:
   - `index.html`
   - `script.js`
   - `style.css`
3. Masuk ke **Settings** repository > **Pages**.
4. Di bagian *Branch*, pilih `main` dan folder `/ (root)`, lalu klik **Save**.
5. Tunggu 1–2 menit, Anda akan mendapatkan URL publik (misal: `https://username.github.io/bk-digital/`).

### Opsi B: Web Hosting / cPanel Sekolah
1. Buka File Manager di cPanel hosting sekolah Anda.
2. Buat subdomain/folder khusus, misal `bk.sekolah.sch.id`.
3. Upload ketiga file (`index.html`, `script.js`, `style.css`) ke folder tersebut.

### Opsi C: Dijalankan Lokal (Komputer / Laptop)
1. Cukup buka file `index.html` langsung dengan klik dua kali di browser Anda (atau gunakan ekstensi *Live Server* di VS Code).

---

## 🔑 Langkah 4: Login & Menghubungkan Aplikasi

1. Buka aplikasi di browser Anda. Anda akan disambut oleh layar setup:
   - **URL Web App Google Apps Script:** Tempel URL `/exec` yang Anda salin pada **Langkah 2 (Poin 5)**.
   - **Token / Kata Sandi Akses:** Masukkan nilai `ACCESS_TOKEN` yang Anda buat pada **Langkah 2 (Poin 4)**.
2. Klik tombol **Masuk ke Dashboard**.
3. Sistem akan memuat data awal dan membuka dashboard aplikasi.

---

## 💡 Langkah 5: Mode Demo (Uji Coba Cepat)

Jika Anda ingin mencoba fitur aplikasi terlebih dahulu tanpa menyambungkan ke Google Spreadsheet:
1. Di layar setup awal, klik teks: **"Coba mode demo tanpa Google Sheets →"**.
2. Aplikasi akan langsung masuk dengan contoh data siswa, absensi, pelanggaran, konseling, dan 7 kebiasaan yang tersimpan di `localStorage` peramban Anda.
3. Anda dapat beralih kembali ke mode Live kapan saja melalui menu **Pengaturan** di sidebar.

---

## 🛡️ Tips Pemeliharaan & Keamanan

1. **Backup Data Rutin:**
   - Di menu **Pengaturan** (ikon gerigi), klik tombol **Unduh Backup (Excel)** untuk mengunduh seluruh data dalam satu file `.xlsx`.
2. **Memperbarui Kode di Masa Depan:**
   - Jika ada pembaruan frontend di GitHub, data di Google Spreadsheet **tidak akan pernah terhapus**, karena kode frontend dan database terpisah secara total.
   - Jika ada pembaruan kode backend `Code.gs`, cukup salin kode baru ke Apps Script editor > **Deploy** > **Manage deployments** > Edit > Pilih versi baru (*New version*) > Deploy.
3. **Pemberitahuan WhatsApp:**
   - Fitur kirim WA di menu Absensi menggunakan protokol `wa.me` langsung ke WhatsApp Web / Desktop / HP, sehingga tidak membutuhkan integrasi server pihak ketiga atau biaya langganan bulanan.

---
*Selamat menggunakan BK Digital untuk mempermudah layanan Bimbingan dan Konseling di sekolah Anda!*
