/* ============================================================
   BK DIGITAL — BACKEND (Google Apps Script)
   ------------------------------------------------------------
   Cara pasang:
   1. Buka Google Sheet yang jadi database BK Digital kamu.
   2. Extensions > Apps Script.
   3. Ganti/isi file Code.gs dengan seluruh isi file ini.
   4. Buka Project Settings (ikon gerigi) > Script Properties >
      tambahkan property bernama  ACCESS_TOKEN  dengan nilai bebas
      (contoh: kata sandi acak yang cuma kamu & guru BK tahu).
      Token ini TIDAK ikut ter-commit ke GitHub, jadi lebih aman.
   5. Deploy > New deployment > Web app.
        - Execute as: Me
        - Who has access: Anyone
      (Kalau sekolah pakai Google Workspace, pilih "Anyone within
       [nama organisasi]" supaya hanya akun sekolah yang bisa akses —
       ini jauh lebih aman daripada "Anyone".)
   6. Salin URL Web App yang dihasilkan, tempel di layar login
      BK Digital bersama ACCESS_TOKEN yang kamu buat di langkah 4.

   Catatan keamanan:
   - Kode di GitHub bersifat publik dan TIDAK menyimpan data siswa
     sama sekali — data selalu hidup di Google Sheet ini.
   - ACCESS_TOKEN membuat siapapun yang tidak tahu token tidak bisa
     memanggil API ini walau tahu URL-nya.
   - Update kode di GitHub (frontend) tidak pernah menyentuh Sheet
     ini, jadi tidak akan pernah menghapus/mengubah data yang sudah
     tersimpan.

   Update terbaru:
   - Menambahkan sheet "Pengaturan" (key-value) untuk menyimpan
     Profil Sekolah (Nama Sekolah, Tahun Pelajaran Aktif, Logo)
     supaya tersimpan permanen di Google Sheet dan otomatis muncul
     lagi di perangkat/browser manapun yang login ke Web App yang
     sama — bukan cuma di localStorage satu browser.
   - Menambahkan tabel referensi "MasterPelanggaran" (Jenis Pelanggaran
     & Poin) sehingga saat mencatat pelanggaran, Jenis Pelanggaran &
     Poin dipilih lewat dropdown dari daftar baku, bukan diketik bebas.
   - Menambahkan akun Guru Mapel (sheet "Guru"): tiap guru punya
     Username + Password sendiri (diatur admin lewat menu "Kelola Akun
     Guru Mapel" di aplikasi), login TANPA perlu tahu URL Web App atau
     ACCESS_TOKEN. Setelah login, guru hanya bisa melihat & mencatat
     data Pelanggaran, dan HANYA untuk kelas yang jadi tanggung jawabnya
     JIKA kolom Kelas diisi. Kalau kolom Kelas dikosongkan saat akun
     dibuat, guru itu diberi akses ke SEMUA kelas (lihat kelasListIncludes()
     di bawah) — cocok untuk guru yang memang bertugas lintas kelas.
   ============================================================ */

var TYPE_SHEET = {
  siswa: 'Siswa',
  absensi: 'Absensi',
  pelanggaran: 'Pelanggaran',
  konseling: 'Konseling',
  kolaborasi: 'Kolaborasi',
  kebiasaan: 'Kebiasaan',
  masterPelanggaran: 'MasterPelanggaran',
  guru: 'Guru'
};

/* Header default per sheet — dipakai HANYA saat sheet belum ada / masih kosong,
   supaya sheet baru otomatis dibuat dengan kolom yang benar tanpa mengganggu
   sheet yang sudah berisi data (yang sudah ada headernya dipakai apa adanya). */
var DEFAULT_HEADERS = {
  Siswa: ['ID','NIS','Nama','Kelas','JenisKelamin','TempatTglLahir','Alamat','NamaOrtu','NoHPOrtu','Catatan'],
  Absensi: ['ID','Tanggal','SiswaID','Nama','Kelas','Status','Keterangan'],
  Pelanggaran: ['ID','Tanggal','SiswaID','Nama','Kelas','JenisPelanggaran','Poin','Keterangan','Penanganan'],
  Konseling: ['ID','Tanggal','SiswaID','Nama','Kelas','Topik','Konselor','Masalah','HasilKonseling','TindakLanjut'],
  Kolaborasi: ['ID','Tanggal','SiswaID','Nama','Kelas','Jenis','Petugas','Tujuan','Hasil'],
  Kebiasaan: ['ID','Tanggal','SiswaID','Nama','Kelas','BangunPagiPukul','IbadahSholat','IbadahDhuha','IbadahTadarus',
    'IbadahLainnya','OlahragaJenis','OlahragaDurasi','BelajarMapel','MakanMenu','BermasyarakatKegiatan',
    'IstirahatPukul','ParafOrtu','ParafGuru','CatatanGuru'],
  MasterPelanggaran: ['ID','JenisPelanggaran','Poin','Kategori'],
  /* Kelas diisi daftar kelas tanggung jawab guru ini, dipisah koma (contoh:
     "VII-A, VII-B"). KOSONGKAN kolom ini supaya guru bisa mencatat pelanggaran
     untuk SEMUA kelas (lihat kelasListIncludes()). Status "Aktif"/"Nonaktif"
     dipakai admin BK untuk menonaktifkan akun tanpa perlu menghapus barisnya. */
  Guru: ['ID','Username','Password','Nama','Kelas','Status']
};

var ID_PREFIX = { siswa:'SIS', absensi:'ABS', pelanggaran:'PEL', konseling:'KON', kolaborasi:'KOL', kebiasaan:'HAB', masterPelanggaran:'MPL', guru:'GRU' };

/* ---------------- AKUN GURU MAPEL ----------------
   Guru mapel TIDAK memakai ACCESS_TOKEN utama (itu tetap rahasia, hanya
   dipegang Guru BK/admin). Mereka login pakai Username + Password yang
   diatur admin lewat menu "Kelola Akun Guru Mapel". Setelah login sukses,
   server menerbitkan "sessionToken" sementara (ditandatangani pakai
   ACCESS_TOKEN sebagai kunci rahasia, lewat HMAC) yang isinya cuma peran
   (guru) + daftar kelas tanggung jawabnya (kosong = semua kelas) + waktu
   kadaluarsa. Token ini:
   - Tidak pernah membuka akses ke data di luar Pelanggaran & kelas yang
     diizinkan (server yang menegakkan ini di setiap request, bukan cuma
     disembunyikan di tampilan).
   - Otomatis kadaluarsa (lihat GURU_SESSION_TTL_MS) sehingga tidak perlu
     disimpan di database mana pun, cukup diverifikasi ulang tiap request. */
var GURU_SESSION_TTL_MS = 16 * 60 * 60 * 1000; // 16 jam
var GURU_READABLE_TYPES = ['siswa', 'pelanggaran', 'masterPelanggaran'];
var GURU_WRITABLE_TYPE = 'pelanggaran';

/* Daftar bawaan yang otomatis diisi HANYA saat sheet MasterPelanggaran baru
   dibuat (pertama kali dipakai) dan masih kosong — supaya langsung ada opsi
   dropdown tanpa perlu isi manual dulu. Sekolah bisa ubah/tambah/hapus lewat
   menu Pengaturan di aplikasi kapan saja setelahnya, tanpa memengaruhi data
   pelanggaran siswa yang sudah tercatat. */
var DEFAULT_MASTER_PELANGGARAN = [
  ['Terlambat masuk sekolah', 5, 'Ringan'],
  ['Tidak memakai atribut lengkap', 5, 'Ringan'],
  ['Tidak mengerjakan tugas/PR', 5, 'Ringan'],
  ['Makan/minum di kelas saat KBM', 5, 'Ringan'],
  ['Membuang sampah sembarangan', 5, 'Ringan'],
  ['Tidak mengikuti upacara', 10, 'Ringan'],
  ['Rambut/seragam tidak sesuai aturan', 10, 'Ringan'],
  ['Membawa HP tanpa izin', 15, 'Sedang'],
  ['Bolos jam pelajaran', 15, 'Sedang'],
  ['Keluar kelas tanpa izin', 15, 'Sedang'],
  ['Berkata tidak sopan kepada teman', 20, 'Sedang'],
  ['Mencontek saat ujian', 25, 'Sedang'],
  ['Merokok di lingkungan sekolah', 50, 'Berat'],
  ['Berkelahi dengan teman', 50, 'Berat'],
  ['Membawa/menggunakan barang terlarang', 75, 'Berat'],
  ['Melawan/tidak sopan kepada guru', 75, 'Berat'],
  ['Merusak fasilitas sekolah', 50, 'Berat'],
  ['Bullying/perundungan', 75, 'Berat'],
  ['Lainnya', 5, 'Lainnya']
];

/* ---------------- PENGATURAN (key-value, mis. Profil Sekolah) ---------------- */
var SETTINGS_SHEET_NAME = 'Pengaturan';
var SETTINGS_HEADERS = ['Key','Value'];

/* ---------------- ENTRY POINTS ---------------- */
function doGet(e){
  try{
    var params = e.parameter || {};
    var auth = resolveAuth(params.token);
    var action = params.action;
    if (action === 'getAll'){
      var type = params.type;
      assertCanAccessType(auth, type, 'read');
      return jsonOut({ ok:true, data: filterForRole(auth, type, readSheet(type)) });
    }
    if (action === 'getAllBatch'){
      return jsonOut({ ok:true, data: buildGetAllBatch(auth) });
    }
    if (action === 'getSettings'){
      return jsonOut({ ok:true, data: readSettingsMap() });
    }
    return jsonOut({ ok:false, error:'Aksi GET tidak dikenal.' });
  }catch(err){
    return jsonOut({ ok:false, error: err.message });
  }
}

function doPost(e){
  try{
    var body = JSON.parse(e.postData.contents || '{}');
    var action = body.action;
    var type = body.type;

    // loginGuru dipanggil SEBELUM punya token apapun, jadi ditangani
    // terpisah dari alur resolveAuth di bawah. Tetap butuh ACCESS_TOKEN
    // sudah diset di Script Properties (dipakai sebagai kunci tanda tangan
    // sessionToken), makanya tetap memanggil ensureAccessTokenConfigured().
    if (action === 'loginGuru'){
      ensureAccessTokenConfigured();
      var session = loginGuru(body.username, body.password);
      return jsonOut({ ok:true, data: session });
    }

    var auth = resolveAuth(body.token);

    if (action === 'getAll'){
      assertCanAccessType(auth, type, 'read');
      return jsonOut({ ok:true, data: filterForRole(auth, type, readSheet(type)) });
    }
    if (action === 'getAllBatch'){
      return jsonOut({ ok:true, data: buildGetAllBatch(auth) });
    }
    if (action === 'getSettings'){
      return jsonOut({ ok:true, data: readSettingsMap() });
    }
    if (action === 'saveSettings'){
      assertIsAdmin(auth, 'mengubah Pengaturan');
      var savedSettings = saveSettingsMap(body.data || {});
      return jsonOut({ ok:true, data: savedSettings });
    }
    if (action === 'create'){
      assertCanAccessType(auth, type, 'write');
      assertGuruDataInOwnKelas(auth, type, body.data || {});
      var row = createRow(type, body.data || {});
      return jsonOut({ ok:true, data: row });
    }
    if (action === 'update'){
      assertCanAccessType(auth, type, 'write');
      assertGuruOwnsExistingRow(auth, type, body.id);
      assertGuruDataInOwnKelas(auth, type, body.data || {});
      var updated = updateRow(type, body.id, body.data || {});
      return jsonOut({ ok:true, data: updated });
    }
    if (action === 'delete'){
      assertCanAccessType(auth, type, 'write');
      assertGuruOwnsExistingRow(auth, type, body.id);
      deleteRow(type, body.id);
      return jsonOut({ ok:true });
    }
    if (action === 'importBulk'){
      assertIsAdmin(auth, 'mengimpor data massal');
      var result = importBulk(type, body.rows || [], body.matchField || 'NIS');
      return jsonOut({ ok:true, data: result });
    }
    if (action === 'bulkInsert'){
      assertIsAdmin(auth, 'menyimpan data massal');
      var bulkResult = bulkInsert(type, body.rows || []);
      return jsonOut({ ok:true, data: bulkResult });
    }
    return jsonOut({ ok:false, error:'Aksi POST tidak dikenal.' });
  }catch(err){
    return jsonOut({ ok:false, error: err.message });
  }
}

/* ---------------- AUTH ---------------- */
function ensureAccessTokenConfigured(){
  var expected = PropertiesService.getScriptProperties().getProperty('ACCESS_TOKEN');
  if (!expected){
    // ACCESS_TOKEN belum diset di Script Properties -> TOLAK semua permintaan.
    // (Sebelumnya versi ini malah membiarkan API terbuka tanpa token sama sekali
    // selama belum diset, yang berbahaya karena siapapun yang tahu URL Web App
    // bisa membaca/mengubah/menghapus seluruh data siswa. Sekarang defaultnya
    // aman: API terkunci total sampai ACCESS_TOKEN diisi.)
    throw new Error('ACCESS_TOKEN belum diset di Script Properties. Buka Project Settings > Script Properties, tambahkan ACCESS_TOKEN, lalu deploy ulang sebelum menggunakan aplikasi.');
  }
  return expected;
}

/* Menentukan siapa yang memanggil API dari token yang dikirim:
   - Cocok dengan ACCESS_TOKEN master -> role 'admin' (Guru BK), akses penuh.
   - Selain itu dicoba sebagai sessionToken hasil loginGuru() -> role 'guru',
     akses dibatasi lewat assertCanAccessType()/filterForRole() di bawah.
   Melempar Error kalau token kosong/salah/kadaluarsa. */
function resolveAuth(token){
  var expected = ensureAccessTokenConfigured();
  if (token && String(token) === String(expected)){
    return { role:'admin', kelas:null, nama:'Admin BK', username:'admin' };
  }
  var payload = verifyGuruSession(token);
  return { role:'guru', kelas: payload.k || [], nama: payload.n || '', username: payload.u || '' };
}

function assertIsAdmin(auth, actionLabel){
  if (auth.role !== 'admin') throw new Error('Hanya akun Admin/Guru BK yang bisa ' + actionLabel + '.');
}

/* Guru mapel hanya boleh MEMBACA Siswa/Pelanggaran/Template Pelanggaran, dan
   hanya boleh MENULIS (tambah/ubah/hapus) ke data Pelanggaran. Semua tipe
   data lain (Absensi, Konseling, Kolaborasi, Kebiasaan, Pengaturan, akun
   Guru sendiri) tertutup total untuk role guru, ditegakkan di server -
   bukan cuma disembunyikan di tampilan, supaya tidak bisa dilewati lewat
   DevTools/panggilan API langsung. */
function assertCanAccessType(auth, type, mode){
  if (auth.role === 'admin') return;
  if (mode === 'read'){
    if (GURU_READABLE_TYPES.indexOf(type) === -1){
      throw new Error('Akun Guru Mapel tidak memiliki akses ke data ini.');
    }
    return;
  }
  if (type !== GURU_WRITABLE_TYPE){
    throw new Error('Akun Guru Mapel hanya bisa mencatat data Pelanggaran.');
  }
}

/* Saat guru CREATE/UPDATE data Pelanggaran, pastikan kolom Kelas yang
   dikirim memang salah satu kelas tanggung jawabnya — KECUALI guru itu
   tidak dibatasi kelas sama sekali (auth.kelas kosong = akses semua kelas),
   dalam hal itu kelasListIncludes() selalu mengembalikan true. (Kolom Kelas
   ini otomatis terisi di frontend dari siswa yang dipilih, tapi tetap dicek
   ulang di server sebagai lapisan pertahanan kedua.) */
function assertGuruDataInOwnKelas(auth, type, data){
  if (auth.role !== 'guru' || type !== GURU_WRITABLE_TYPE) return;
  var kelas = String(data.Kelas || '').trim();
  if (!kelas || !kelasListIncludes(auth.kelas, kelas)){
    throw new Error('Anda hanya bisa mencatat pelanggaran untuk siswa di kelas yang menjadi tanggung jawab Anda.');
  }
}

/* Saat guru UPDATE/DELETE data Pelanggaran yang SUDAH ADA, pastikan baris
   itu memang milik salah satu kelas tanggung jawabnya (atau guru itu tidak
   dibatasi kelas sama sekali) - supaya guru mapel satu tidak bisa
   mengubah/menghapus catatan pelanggaran kelas guru lain yang memang
   dibatasi kelasnya. */
function assertGuruOwnsExistingRow(auth, type, id){
  if (auth.role !== 'guru' || type !== GURU_WRITABLE_TYPE) return;
  var sheet = getSheet(type);
  var headers = getHeaders(sheet);
  var rowIdx = findRowIndexById(sheet, headers, id);
  if (rowIdx === -1) throw new Error('Data dengan ID ' + id + ' tidak ditemukan.');
  var kelasCol = headers.indexOf('Kelas');
  var rowKelas = kelasCol === -1 ? '' : String(sheet.getRange(rowIdx, kelasCol+1).getValue() || '').trim();
  if (!kelasListIncludes(auth.kelas, rowKelas)){
    throw new Error('Anda tidak memiliki akses untuk mengubah/menghapus data pelanggaran kelas ini.');
  }
}

/* Kalau kelasList KOSONG (guru tidak dibatasi kelas tertentu saat akunnya
   dibuat), guru itu dianggap punya akses ke SEMUA kelas -> selalu true.
   Kalau kelasList terisi, hanya kelas yang ada di daftar itu yang diizinkan,
   sama seperti sebelumnya. */
function kelasListIncludes(kelasList, kelas){
  if (!kelasList || !kelasList.length) return true; // tidak dibatasi -> semua kelas diizinkan
  var target = String(kelas || '').trim().toLowerCase();
  return kelasList.some(function(k){ return String(k).trim().toLowerCase() === target; });
}

/* Menyaring hasil readSheet() sesuai role. Admin selalu dapat semua baris.
   Guru cuma dapat baris Siswa/Pelanggaran yang Kelas-nya ada di daftar
   tanggung jawabnya (atau SEMUA baris kalau guru itu tidak dibatasi kelas
   sama sekali — auth.kelas kosong); Template Pelanggaran (tidak berkolom
   Kelas) tetap ditampilkan utuh karena memang cuma daftar referensi umum. */
function filterForRole(auth, type, rows){
  if (auth.role === 'admin') return rows;
  if (type === 'masterPelanggaran') return rows;
  if (type === 'siswa' || type === 'pelanggaran'){
    return rows.filter(function(r){ return kelasListIncludes(auth.kelas, r.Kelas); });
  }
  return []; // tipe lain (absensi, konseling, kolaborasi, kebiasaan, guru) tertutup untuk guru
}

function buildGetAllBatch(auth){
  var out = {};
  Object.keys(TYPE_SHEET).forEach(function(t){
    out[t] = (auth.role === 'admin' || GURU_READABLE_TYPES.indexOf(t) !== -1)
      ? filterForRole(auth, t, readSheet(t))
      : [];
  });
  out.pengaturan = readSettingsMap();
  return out;
}

/* ---------------- LOGIN GURU MAPEL ---------------- */
function loginGuru(username, password){
  username = String(username || '').trim();
  password = String(password || '');
  if (!username || !password) throw new Error('Username dan password wajib diisi.');

  var rows = readSheet('guru');
  var match = null;
  for (var i=0;i<rows.length;i++){
    if (String(rows[i].Username || '').trim().toLowerCase() === username.toLowerCase()){
      match = rows[i];
      break;
    }
  }
  if (!match) throw new Error('Username tidak ditemukan.');
  if (String(match.Status || 'Aktif').trim().toLowerCase() === 'nonaktif'){
    throw new Error('Akun ini sudah dinonaktifkan. Hubungi Guru BK/admin.');
  }
  if (String(match.Password || '') !== password){
    throw new Error('Password salah.');
  }
  // Kolom Kelas boleh KOSONG -> kelasList jadi [] -> guru ini diberi akses
  // ke SEMUA kelas (lihat kelasListIncludes()). Kalau diisi, hanya kelas
  // yang disebutkan yang bisa diakses, seperti sebelumnya.
  var kelasList = String(match.Kelas || '').split(',').map(function(k){ return k.trim(); }).filter(function(k){ return !!k; });

  var token = makeGuruSession({ username: match.Username, nama: match.Nama, kelas: kelasList });
  return { sessionToken: token, nama: match.Nama, kelas: kelasList, username: match.Username };
}

/* sessionToken = <payload base64>.<tanda tangan HMAC base64>. Payload berisi
   username, nama, daftar kelas (kosong = semua kelas), dan waktu kadaluarsa.
   Ditandatangani pakai ACCESS_TOKEN sebagai kunci rahasia supaya server bisa
   memverifikasi ulang tiap request TANPA perlu menyimpan sesi di mana pun
   (stateless), dan guru tidak pernah melihat/memegang ACCESS_TOKEN aslinya. */
function makeGuruSession(obj){
  var secret = ensureAccessTokenConfigured();
  var payload = { u: obj.username, n: obj.nama, k: obj.kelas, exp: Date.now() + GURU_SESSION_TTL_MS };
  var payloadB64 = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  var sigB64 = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payloadB64, secret));
  return payloadB64 + '.' + sigB64;
}

function verifyGuruSession(token){
  var secret = ensureAccessTokenConfigured();
  var parts = String(token || '').split('.');
  if (parts.length !== 2){
    throw new Error('Sesi login tidak valid. Silakan login ulang.');
  }
  var payloadB64 = parts[0], sigB64 = parts[1];
  var expectedSigB64 = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payloadB64, secret));
  if (sigB64 !== expectedSigB64){
    throw new Error('Sesi login tidak valid. Silakan login ulang.');
  }
  var payload;
  try{
    payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(payloadB64)).getDataAsString());
  }catch(parseErr){
    throw new Error('Sesi login tidak valid. Silakan login ulang.');
  }
  if (!payload.exp || Date.now() > payload.exp){
    throw new Error('Sesi login sudah kadaluarsa. Silakan login ulang.');
  }
  return payload;
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
    if (type === 'masterPelanggaran'){
      var seedRows = DEFAULT_MASTER_PELANGGARAN.map(function(r, i){
        return ['MPL-' + (i+1), r[0], r[1], r[2]];
      });
      sheet.getRange(2,1,seedRows.length, headers.length).setValues(seedRows);
    }
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
    obj._row = i + 2; // internal, not required by frontend but harmless if ignored
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

/* Update HANYA mengubah kolom yang dikirim; kolom lain & baris lain tidak tersentuh sama sekali. */
function updateRow(type, id, data){
  var sheet = getSheet(type);
  var headers = getHeaders(sheet);
  var rowIdx = findRowIndexById(sheet, headers, id);
  if (rowIdx === -1) throw new Error('Data dengan ID ' + id + ' tidak ditemukan.');
  Object.keys(data).forEach(function(key){
    var col = headers.indexOf(key);
    if (col === -1) return; // kolom tidak dikenal, lewati (tidak menambah kolom liar)
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

/* Import massal dari Excel/CSV: HANYA menambahkan baris baru.
   Baris yang matchField-nya (misal NIS/Username) sudah ada di sheet akan
   DILEWATI, bukan ditimpa — data lama dijamin tidak berubah (password akun
   guru yang sudah ada tidak akan tertimpa lewat import).
   Semua baris baru ditulis dalam SATU kali panggilan setValues (bukan appendRow
   berulang) supaya cepat walau jumlah barisnya banyak. */
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

/* Simpan banyak baris baru sekaligus dalam SATU kali panggilan setValues
   (dipakai fitur Absen Massal). Jauh lebih cepat dibanding memanggil
   createRow() berulang, karena hanya ada satu kali komunikasi ke Google Sheets
   untuk menulis semua baris, bukan satu per siswa. */
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

/* ---------------- PENGATURAN (Profil Sekolah, dll) ----------------
   Disimpan sebagai sheet key-value sederhana (Key | Value) di tab "Pengaturan",
   supaya:
   - Bisa dibaca/ditulis lewat aksi generik getSettings/saveSettings tanpa
     perlu tahu ID baris seperti data siswa/absensi.
   - Mudah ditambah key baru di masa depan (mis. alamat sekolah, nama kepala
     sekolah) tanpa perlu ubah struktur/migrasi kolom.
   Sel di Google Sheets punya batas ±50.000 karakter, jadi logo dikompres &
   diperkecil dulu di sisi frontend sebelum dikirim ke sini. */
function getSettingsSheet(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet){
    sheet = ss.insertSheet(SETTINGS_SHEET_NAME);
    sheet.getRange(1,1,1,SETTINGS_HEADERS.length).setValues([SETTINGS_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readSettingsMap(){
  var sheet = getSettingsSheet();
  var lastRow = sheet.getLastRow();
  var out = {};
  if (lastRow < 2) return out;
  var values = sheet.getRange(2,1,lastRow-1,2).getValues();
  values.forEach(function(row){
    var key = String(row[0] || '').trim();
    if (key) out[key] = row[1];
  });
  return out;
}

/* Update HANYA key yang dikirim (mis. cuma NamaSekolah), key lain di sheet
   Pengaturan tidak tersentuh — sama seperti prinsip updateRow() di atas. */
function saveSettingsMap(dataObj){
  var sheet = getSettingsSheet();
  var lastRow = sheet.getLastRow();
  var rowIndexByKey = {};
  if (lastRow >= 2){
    var keys = sheet.getRange(2,1,lastRow-1,1).getValues();
    keys.forEach(function(k, i){
      var key = String(k[0] || '').trim();
      if (key) rowIndexByKey[key] = i + 2;
    });
  }
  Object.keys(dataObj).forEach(function(key){
    var value = dataObj[key];
    if (rowIndexByKey[key]){
      sheet.getRange(rowIndexByKey[key], 2).setValue(value);
    } else {
      sheet.appendRow([key, value]);
      rowIndexByKey[key] = sheet.getLastRow();
    }
  });
  return readSettingsMap();
}

/* ---------------- OUTPUT ---------------- */
function jsonOut(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
