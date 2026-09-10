/* ============================================================
   CONFIG / CONSTANTS
   ============================================================ */

export const TYPES = ['siswa', 'absensi', 'pelanggaran', 'konseling', 'kolaborasi', 'kebiasaan'];

export const SISWA_TEMPLATE_COLUMNS = [
  'NIS',
  'Nama',
  'Kelas',
  'JenisKelamin',
  'TempatLahir',
  'TanggalLahir',
  'NamaOrtu',
  'NoHPOrtu',
  'Alamat',
  'Catatan'
];

export const KEBIASAAN_TEMPLATE_COLUMNS = [
  'Tanggal',
  'NIS',
  'Nama',
  'Kelas',
  'BangunPagiPukul',
  'IbadahSholat',
  'IbadahDhuha',
  'IbadahTadarus',
  'IbadahLainnya',
  'OlahragaJenis',
  'OlahragaDurasi',
  'BelajarMapel',
  'MakanMenu',
  'BermasyarakatKegiatan',
  'IstirahatPukul',
  'ParafOrtu',
  'ParafGuru',
  'CatatanGuru'
];

export const BACKUP_SHEET_NAMES = {
  siswa: 'Siswa',
  absensi: 'Absensi',
  pelanggaran: 'Pelanggaran',
  konseling: 'Konseling',
  kolaborasi: 'Kolaborasi',
  kebiasaan: 'Kebiasaan'
};

export const FORM_CONFIG = {
  siswa: {
    title: 'Data Siswa',
    fields: [
      { key: 'NIS', label: 'NIS', type: 'text', required: true },
      { key: 'Nama', label: 'Nama Lengkap', type: 'text', required: true },
      { key: 'Kelas', label: 'Kelas', type: 'text', required: true, placeholder: 'contoh: VIII-A' },
      { key: 'JenisKelamin', label: 'Jenis Kelamin', type: 'select', options: ['L', 'P'] },
      { key: 'TempatLahir', label: 'Tempat Lahir', type: 'text', placeholder: 'contoh: Semarang' },
      { key: 'TanggalLahir', label: 'Tanggal Lahir', type: 'date' },
      { key: 'NamaOrtu', label: 'Nama Orang Tua / Wali', type: 'text' },
      { key: 'NoHPOrtu', label: 'No. HP Orang Tua', type: 'text' },
      { key: 'Alamat', label: 'Alamat', type: 'textarea', full: true },
      { key: 'Catatan', label: 'Catatan Khusus', type: 'textarea', full: true }
    ]
  },
  absensi: {
    title: 'Absensi Siswa',
    fields: [
      { key: 'Tanggal', label: 'Tanggal', type: 'date', required: true, default: () => new Date().toISOString().slice(0, 10) },
      { key: 'SiswaID', label: 'Siswa', type: 'select-siswa', required: true, full: true },
      { key: 'Status', label: 'Status', type: 'select', options: ['Hadir', 'Sakit', 'Izin', 'Alpa'], required: true },
      { key: 'Keterangan', label: 'Keterangan', type: 'textarea', full: true }
    ]
  },
  pelanggaran: {
    title: 'Pelanggaran Siswa',
    fields: [
      { key: 'Tanggal', label: 'Tanggal', type: 'date', required: true, default: () => new Date().toISOString().slice(0, 10) },
      { key: 'SiswaID', label: 'Siswa', type: 'select-siswa', required: true, full: true },
      { key: 'JenisPelanggaran', label: 'Jenis Pelanggaran', type: 'text', required: true },
      { key: 'Poin', label: 'Poin Pelanggaran', type: 'number' },
      { key: 'Keterangan', label: 'Keterangan', type: 'textarea', full: true },
      { key: 'Penanganan', label: 'Penanganan', type: 'textarea', full: true }
    ]
  },
  konseling: {
    title: 'Sesi Konseling',
    fields: [
      { key: 'Tanggal', label: 'Tanggal', type: 'date', required: true, default: () => new Date().toISOString().slice(0, 10) },
      { key: 'SiswaID', label: 'Siswa', type: 'select-siswa', required: true, full: true },
      { key: 'Topik', label: 'Topik', type: 'text', required: true },
      { key: 'Konselor', label: 'Konselor / Guru BK', type: 'text' },
      { key: 'Masalah', label: 'Uraian Masalah', type: 'textarea', full: true },
      { key: 'HasilKonseling', label: 'Hasil Konseling', type: 'textarea', full: true },
      { key: 'TindakLanjut', label: 'Rencana Tindak Lanjut', type: 'textarea', full: true }
    ]
  },
  kolaborasi: {
    title: 'Kolaborasi (Panggilan Ortu / Home Visit)',
    fields: [
      { key: 'Tanggal', label: 'Tanggal', type: 'date', required: true, default: () => new Date().toISOString().slice(0, 10) },
      { key: 'SiswaID', label: 'Siswa', type: 'select-siswa', required: true, full: true },
      { key: 'Jenis', label: 'Jenis Kegiatan', type: 'select', options: ['Pemanggilan Orang Tua', 'Home Visit'], required: true },
      { key: 'Petugas', label: 'Petugas BK', type: 'text' },
      { key: 'Tujuan', label: 'Tujuan Kegiatan', type: 'textarea', full: true },
      { key: 'Hasil', label: 'Hasil / Kesepakatan', type: 'textarea', full: true }
    ]
  },
  kebiasaan: {
    title: '7 Kebiasaan Anak Indonesia Hebat',
    fields: [
      { key: 'Tanggal', label: 'Hari, Tanggal', type: 'date', required: true, default: () => new Date().toISOString().slice(0, 10) },
      { key: 'SiswaID', label: 'Pilih Siswa', type: 'select-siswa', required: true, full: true },
      { key: 'BangunPagiPukul', label: '1. Bangun Pagi (Pukul)', type: 'text', placeholder: 'contoh: 05.00' },
      { key: 'IstirahatPukul', label: '7. Istirahat Cukup (Pukul)', type: 'text', placeholder: 'contoh: 21.00' },
      { key: 'IbadahSholat', label: '2. Beribadah — Sholat', type: 'checkbox-group', options: ['Subuh', 'Duhur', 'Ashar', 'Maghrib', "Isya'", 'Dhuha'], full: true },
      { key: 'IbadahTadarus', label: 'Tadarus / Murajaah', type: 'text', placeholder: 'contoh: Juz 5 / Surah Al-Kahfi' },
      { key: 'IbadahLainnya', label: 'Ibadah Lainnya (opsional)', type: 'text', placeholder: 'contoh: Puasa Sunnah, Sedekah' },
      { key: 'OlahragaJenis', label: '3. Berolahraga — Jenis', type: 'text', placeholder: 'contoh: Lari pagi / Senam' },
      { key: 'OlahragaDurasi', label: 'Durasi Olahraga (menit)', type: 'text', placeholder: 'contoh: 20' },
      { key: 'BelajarMapel', label: '4. Gemar Belajar — Mapel', type: 'text', placeholder: 'contoh: Matematika, IPA' },
      { key: 'MakanMenu', label: '5. Makan Sehat & Bergizi — Menu', type: 'text', placeholder: 'contoh: Nasi, sayur bayam, telur, buah' },
      { key: 'BermasyarakatKegiatan', label: '6. Bermasyarakat — Kegiatan', type: 'textarea', full: true, placeholder: 'contoh: Kerja bakti lingkungan / membantu tetangga' },
      { key: 'ParafVerification', label: 'Pemeriksaan / Paraf', type: 'checkbox-group', options: ['Paraf Orang Tua', 'Paraf Guru'], full: true },
      { key: 'CatatanGuru', label: 'Catatan Guru (opsional)', type: 'textarea', full: true, placeholder: 'Tulis catatan atau catatan evaluasi guru di sini...' }
    ]
  }
};
