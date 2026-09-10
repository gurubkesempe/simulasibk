/* ============================================================
   CONFIG / REPORT CONFIG
   ============================================================ */

export const REPORT_COLUMNS = {
  siswa: ['NIS', 'Nama', 'Kelas', 'JenisKelamin', 'NamaOrtu', 'NoHPOrtu'],
  absensi: ['Tanggal', 'Nama', 'Kelas', 'Status', 'Keterangan'],
  pelanggaran: ['Tanggal', 'Nama', 'Kelas', 'JenisPelanggaran', 'Poin', 'Penanganan'],
  konseling: ['Tanggal', 'Nama', 'Kelas', 'Topik', 'HasilKonseling', 'TindakLanjut'],
  kolaborasi: ['Tanggal', 'Nama', 'Kelas', 'Jenis', 'Tujuan', 'Hasil'],
  kebiasaan: ['Tanggal', 'Nama', 'Kelas', 'BangunPagiPukul', 'IbadahSholat', 'OlahragaJenis', 'BelajarMapel', 'IstirahatPukul']
};

export const REPORT_TITLES = {
  siswa: 'Data Siswa',
  absensi: 'Rekap Absensi Siswa',
  pelanggaran: 'Rekap Pelanggaran Siswa',
  konseling: 'Rekap Sesi Konseling',
  kolaborasi: 'Rekap Kolaborasi (Panggilan Ortu / Home Visit)',
  kebiasaan: 'Rekap 7 Kebiasaan Anak Indonesia Hebat'
};
