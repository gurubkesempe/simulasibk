/* ============================================================
   API / DEMO ADAPTER (Offline LocalStorage Mock & Seeder)
   ============================================================ */
import { TYPES } from '../config/constants.js';

export const DemoAdapter = {
  key(type) {
    return `bk_demo_${type}`;
  },
  read(type) {
    return JSON.parse(localStorage.getItem(this.key(type)) || '[]');
  },
  write(type, arr) {
    localStorage.setItem(this.key(type), JSON.stringify(arr));
  },
  async getAll(type) {
    return this.read(type);
  },
  async getAllBatch() {
    const out = {};
    TYPES.forEach(t => {
      out[t] = this.read(t);
    });
    return out;
  },
  async create(type, data) {
    const arr = this.read(type);
    data.ID = data.ID || (type.substring(0, 3).toUpperCase() + '-' + Date.now().toString(36));
    arr.push(data);
    this.write(type, arr);
    return data;
  },
  async update(type, id, data) {
    const arr = this.read(type);
    const idx = arr.findIndex(o => String(o.ID) === String(id));
    if (idx === -1) throw new Error('Data tidak ditemukan');
    arr[idx] = { ...arr[idx], ...data };
    this.write(type, arr);
    return arr[idx];
  },
  async delete(type, id) {
    const arr = this.read(type).filter(o => String(o.ID) !== String(id));
    this.write(type, arr);
    return true;
  },
  async importBulk(type, rows, matchField) {
    const arr = this.read(type);
    const existingKeys = new Set(
      arr.map(o => String(o[matchField] || '').trim().toLowerCase()).filter(Boolean)
    );
    let added = 0;
    let skipped = 0;
    const skippedKeys = [];
    rows.forEach((r, i) => {
      const key = String(r[matchField] || '').trim().toLowerCase();
      if (key && existingKeys.has(key)) {
        skipped++;
        skippedKeys.push(r[matchField]);
        return;
      }
      const row = {
        ...r,
        ID: r.ID || (type.substring(0, 3).toUpperCase() + '-' + Date.now().toString(36) + '-' + i)
      };
      arr.push(row);
      if (key) existingKeys.add(key);
      added++;
    });
    this.write(type, arr);
    return { added, skipped, skippedKeys };
  },
  async bulkInsert(type, rows) {
    const arr = this.read(type);
    const inserted = rows.map((r, i) => ({
      ...r,
      ID: r.ID || (type.substring(0, 3).toUpperCase() + '-' + Date.now().toString(36) + '-' + i)
    }));
    inserted.forEach(row => arr.push(row));
    this.write(type, arr);
    return { inserted: inserted.length, rows: inserted };
  },
  seedIfEmpty() {
    if (this.read('siswa').length) return;
    const siswa = [
      {
        ID: 'SIS-1',
        NIS: '2201001',
        Nama: 'Ahmad Fadillah',
        Kelas: 'IX-A',
        JenisKelamin: 'L',
        TempatLahir: 'Semarang',
        TanggalLahir: '2011-04-12',
        Alamat: 'Jl. Merdeka No. 12',
        NamaOrtu: 'Budi Santoso',
        NoHPOrtu: '081234567801',
        Catatan: ''
      },
      {
        ID: 'SIS-2',
        NIS: '2201002',
        Nama: 'Siti Nurhaliza',
        Kelas: 'IX-A',
        JenisKelamin: 'P',
        TempatLahir: 'Purwodadi',
        TanggalLahir: '2011-08-03',
        Alamat: 'Jl. Anggrek No. 5',
        NamaOrtu: 'Sri Wahyuni',
        NoHPOrtu: '081234567802',
        Catatan: ''
      },
      {
        ID: 'SIS-3',
        NIS: '2201003',
        Nama: 'Rizky Maulana',
        Kelas: 'VIII-B',
        JenisKelamin: 'L',
        TempatLahir: 'Grobogan',
        TanggalLahir: '2012-01-21',
        Alamat: 'Jl. Melati No. 9',
        NamaOrtu: 'Agus Wibowo',
        NoHPOrtu: '081234567803',
        Catatan: 'Perlu pemantauan kedisiplinan'
      },
      {
        ID: 'SIS-4',
        NIS: '2201004',
        Nama: 'Dewi Lestari',
        Kelas: 'VIII-B',
        JenisKelamin: 'P',
        TempatLahir: 'Purwodadi',
        TanggalLahir: '2011-11-15',
        Alamat: 'Jl. Kenanga No. 2',
        NamaOrtu: 'Hendra Kusuma',
        NoHPOrtu: '081234567804',
        Catatan: ''
      },
      {
        ID: 'SIS-5',
        NIS: '2201005',
        Nama: 'Muhammad Iqbal',
        Kelas: 'VII-C',
        JenisKelamin: 'L',
        TempatLahir: 'Semarang',
        TanggalLahir: '2012-06-30',
        Alamat: 'Jl. Mawar No. 18',
        NamaOrtu: 'Joko Prasetyo',
        NoHPOrtu: '081234567805',
        Catatan: ''
      }
    ];
    this.write('siswa', siswa);

    const today = new Date();
    const ymd = d => d.toISOString().slice(0, 10);

    const absensi = [
      { ID: 'ABS-1', Tanggal: ymd(today), SiswaID: 'SIS-1', Nama: 'Ahmad Fadillah', Kelas: 'IX-A', Status: 'Hadir', Keterangan: '' },
      { ID: 'ABS-2', Tanggal: ymd(today), SiswaID: 'SIS-3', Nama: 'Rizky Maulana', Kelas: 'VIII-B', Status: 'Alpa', Keterangan: 'Tanpa keterangan' },
      { ID: 'ABS-3', Tanggal: ymd(today), SiswaID: 'SIS-4', Nama: 'Dewi Lestari', Kelas: 'VIII-B', Status: 'Sakit', Keterangan: 'Demam' }
    ];
    this.write('absensi', absensi);

    const pelanggaran = [
      { ID: 'PEL-1', Tanggal: ymd(today), SiswaID: 'SIS-3', Nama: 'Rizky Maulana', Kelas: 'VIII-B', JenisPelanggaran: 'Terlambat masuk sekolah', Poin: 5, Keterangan: 'Terlambat 20 menit', Penanganan: 'Teguran lisan' },
      { ID: 'PEL-2', Tanggal: ymd(today), SiswaID: 'SIS-3', Nama: 'Rizky Maulana', Kelas: 'VIII-B', JenisPelanggaran: 'Tidak mengerjakan tugas', Poin: 5, Keterangan: '3x berturut-turut', Penanganan: 'Pemanggilan siswa' }
    ];
    this.write('pelanggaran', pelanggaran);

    const konseling = [
      { ID: 'KON-1', Tanggal: ymd(today), SiswaID: 'SIS-3', Nama: 'Rizky Maulana', Kelas: 'VIII-B', Topik: 'Kedisiplinan', Masalah: 'Sering terlambat dan menunda tugas', HasilKonseling: 'Siswa berjanji memperbaiki manajemen waktu', TindakLanjut: 'Pemantauan 2 minggu', Konselor: 'Bu Ratna, S.Pd' }
    ];
    this.write('konseling', konseling);

    const kolaborasi = [
      { ID: 'KOL-1', Tanggal: ymd(today), SiswaID: 'SIS-3', Nama: 'Rizky Maulana', Kelas: 'VIII-B', Jenis: 'Pemanggilan Orang Tua', Tujuan: 'Membahas kedisiplinan anak', Hasil: 'Orang tua berkomitmen mendampingi di rumah', Petugas: 'Bu Ratna, S.Pd' }
    ];
    this.write('kolaborasi', kolaborasi);

    const kebiasaan = [
      {
        ID: 'HAB-1',
        Tanggal: ymd(today),
        SiswaID: 'SIS-1',
        Nama: 'Ahmad Fadillah',
        Kelas: 'IX-A',
        BangunPagiPukul: '05.00',
        IbadahSholat: 'Subuh, Duhur, Ashar, Maghrib, Isya',
        IbadahDhuha: 'Ya',
        IbadahTadarus: 'Juz 5',
        IbadahLainnya: '',
        OlahragaJenis: 'Lari pagi',
        OlahragaDurasi: '20',
        BelajarMapel: 'Matematika',
        MakanMenu: 'Nasi, sayur bayam, telur, buah',
        BermasyarakatKegiatan: 'Kerja bakti lingkungan',
        IstirahatPukul: '21.00',
        ParafOrtu: 'Ya',
        ParafGuru: '',
        CatatanGuru: ''
      }
    ];
    this.write('kebiasaan', kebiasaan);
  }
};
