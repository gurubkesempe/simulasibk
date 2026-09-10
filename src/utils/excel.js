/* ============================================================
   UTILS / EXCEL (Lazy-loaded Dynamic Module)
   ============================================================ */
import { SISWA_TEMPLATE_COLUMNS, KEBIASAAN_TEMPLATE_COLUMNS, BACKUP_SHEET_NAMES, TYPES } from '../config/constants.js';
import { toast } from '../components/toast.js';
import { showLoading } from './dom.js';
import { STATE } from '../state/store.js';

let xlsxModule = null;

async function getXLSX() {
  if (!xlsxModule) {
    xlsxModule = await import('xlsx');
  }
  return xlsxModule;
}

/**
 * Download sample template Excel for student import
 */
export async function downloadSiswaTemplate() {
  showLoading(true);
  try {
    const XLSX = await getXLSX();
    const contoh = {
      NIS: '2201099',
      Nama: 'Contoh Nama Siswa',
      Kelas: 'VII-A',
      JenisKelamin: 'L',
      TempatLahir: 'Semarang',
      TanggalLahir: '2012-01-01',
      NamaOrtu: 'Nama Orang Tua',
      NoHPOrtu: '0812xxxxxxx',
      Alamat: 'Alamat lengkap',
      Catatan: ''
    };

    const ws = XLSX.utils.json_to_sheet([contoh], { header: SISWA_TEMPLATE_COLUMNS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Siswa');
    XLSX.writeFile(wb, 'Template_Import_Siswa_BKDigital.xlsx');
  } catch (err) {
    toast('Gagal mengunduh template: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Process Excel file uploaded by user and import students via adapter
 */
export async function importSiswaFromExcel(file, adapter, reloadCallback) {
  if (!file) return;
  showLoading(true);
  try {
    const XLSX = await getXLSX();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const cleaned = rows
      .map(r => {
        const o = {};
        SISWA_TEMPLATE_COLUMNS.forEach(c => {
          o[c] = r[c] !== undefined ? String(r[c]).trim() : '';
        });
        // Fallback for legacy TempatTglLahir
        if (!o.TempatLahir && !o.TanggalLahir && r.TempatTglLahir) {
          const parts = String(r.TempatTglLahir).split(',');
          if (parts.length > 1) {
            o.TempatLahir = parts[0].trim();
            o.TanggalLahir = parts.slice(1).join(',').trim();
          } else {
            o.TempatLahir = String(r.TempatTglLahir).trim();
          }
        }
        return o;
      })
      .filter(r => r.NIS && r.Nama);

    if (!cleaned.length) {
      toast('Tidak ada baris valid (butuh minimal kolom NIS & Nama).', 'error');
      return;
    }

    const result = await adapter.importBulk('siswa', cleaned, 'NIS');
    if (reloadCallback) await reloadCallback();
    toast(`Import selesai: ${result.added} siswa baru ditambahkan, ${result.skipped} dilewati (NIS sudah ada).`, 'success');
  } catch (err) {
    toast('Gagal mengimpor file: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Download sample template Excel for 7 Habits import
 */
export async function downloadKebiasaanTemplate() {
  showLoading(true);
  try {
    const XLSX = await getXLSX();
    const today = new Date().toISOString().slice(0, 10);
    const contoh = {
      Tanggal: today,
      NIS: '2201001',
      Nama: 'Ahmad Fadillah',
      Kelas: 'IX-A',
      BangunPagiPukul: '05.00',
      IbadahSholat: 'Subuh, Duhur, Ashar, Maghrib, Isya',
      IbadahDhuha: 'Ya',
      IbadahTadarus: 'Juz 5 / Surah Al-Kahfi',
      IbadahLainnya: '',
      OlahragaJenis: 'Lari Pagi',
      OlahragaDurasi: '20',
      BelajarMapel: 'Matematika, IPA',
      MakanMenu: 'Nasi, sayur bayam, telur, buah',
      BermasyarakatKegiatan: 'Kerja bakti lingkungan',
      IstirahatPukul: '21.00',
      ParafOrtu: 'Ya',
      ParafGuru: 'Ya',
      CatatanGuru: 'Sangat baik dan konsisten'
    };

    const ws = XLSX.utils.json_to_sheet([contoh], { header: KEBIASAAN_TEMPLATE_COLUMNS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '7_Kebiasaan');
    XLSX.writeFile(wb, 'Template_Import_7Kebiasaan_BKDigital.xlsx');
  } catch (err) {
    toast('Gagal mengunduh template 7 Kebiasaan: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Process Excel file uploaded by user and import 7 Habits via adapter
 */
export async function importKebiasaanFromExcel(file, adapter, reloadCallback) {
  if (!file) return;
  showLoading(true);
  try {
    const XLSX = await getXLSX();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const today = new Date().toISOString().slice(0, 10);

    const cleaned = rows
      .map(r => {
        const o = {};
        KEBIASAAN_TEMPLATE_COLUMNS.forEach(c => {
          o[c] = r[c] !== undefined ? String(r[c]).trim() : '';
        });

        // Match with student in STATE
        const nis = String(r.NIS || '').trim();
        const nama = String(r.Nama || '').trim().toLowerCase();
        const s =
          (nis && STATE.siswa.find(x => String(x.NIS).trim() === nis)) ||
          (nama && STATE.siswa.find(x => String(x.Nama).trim().toLowerCase() === nama));

        if (s) {
          o.SiswaID = s.ID;
          o.Nama = s.Nama;
          o.Kelas = s.Kelas;
        }

        if (!o.Tanggal) o.Tanggal = today;
        return o;
      })
      .filter(r => r.SiswaID || r.Nama);

    if (!cleaned.length) {
      toast('Tidak ada baris valid (butuh minimal kolom Nama / NIS siswa).', 'error');
      return;
    }

    const result = await adapter.bulkInsert('kebiasaan', cleaned);
    const insertedCount = (result && result.inserted) || cleaned.length;
    if (reloadCallback) await reloadCallback();
    toast(`Import selesai: ${insertedCount} catatan 7 Kebiasaan berhasil ditambahkan.`, 'success');
  } catch (err) {
    toast('Gagal mengimpor file 7 Kebiasaan: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Create full backup of all tables into single Excel workbook
 */
export async function downloadFullBackup(state) {
  if (!TYPES.some(t => state[t] && state[t].length)) {
    toast('Belum ada data yang bisa di-backup. Muat ulang data terlebih dahulu.', 'error');
    return;
  }

  showLoading(true);
  try {
    const XLSX = await getXLSX();
    const wb = XLSX.utils.book_new();
    TYPES.forEach(type => {
      const rows = (state[type] || []).map(r => {
        const { _row, ...clean } = r;
        return clean;
      });
      const ws = rows.length
        ? XLSX.utils.json_to_sheet(rows)
        : XLSX.utils.aoa_to_sheet([['(Belum ada data)']]);
      XLSX.utils.book_append_sheet(wb, ws, BACKUP_SHEET_NAMES[type] || type);
    });

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    XLSX.writeFile(wb, `Backup_BKDigital_${stamp}.xlsx`);
    toast('Backup database berhasil diunduh.', 'success');
  } catch (err) {
    toast('Gagal membuat backup: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}
