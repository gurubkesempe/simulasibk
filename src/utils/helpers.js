/* ============================================================
   UTILS / HELPERS
   ============================================================ */

/**
 * Escape string to prevent XSS injection in HTML output
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format date to standard Indonesian format (e.g., "10 Sep 2026")
 */
export function fmtDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Get 2-letter uppercase initials from person's name
 */
export function initials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(s => s[0])
    .join('')
    .toUpperCase();
}

/**
 * Format Indonesian phone number into standard international format for WhatsApp (62xxxxxxxx)
 */
export function formatPhoneWa(raw) {
  let d = String(raw || '').replace(/[^0-9]/g, '');
  if (!d) return '';
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (!d.startsWith('62')) d = '62' + d;
  return d;
}

/**
 * Build pre-filled attendance WhatsApp message template
 */
export function buildAbsenWaText(siswa, absen) {
  const namaOrtu = (siswa && siswa.NamaOrtu) ? `Bpk/Ibu ${siswa.NamaOrtu}` : 'Bapak/Ibu Orang Tua/Wali';
  const tgl = fmtDate(absen.Tanggal);
  const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const ket = absen.Keterangan ? `\nKeterangan: ${absen.Keterangan}` : '';
  return `Yth. ${namaOrtu},\n\nKami informasikan bahwa ananda *${(siswa && siswa.Nama) || absen.Nama || '-'}* (Kelas ${(siswa && siswa.Kelas) || absen.Kelas || '-'}) tercatat *${absen.Status}* di sekolah pada ${tgl} pukul ${jam}.${ket}\n\nTerima kasih atas perhatiannya.\n— Pesan dari BK Digital`;
}

/**
 * Generate a consistent avatar background color based on string hash
 */
export function colorFromString(str) {
  const colors = ['#047857', '#d97706', '#0284c7', '#e11d48', '#7c3aed', '#059669', '#475569'];
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
  }
  return colors[Math.abs(h) % colors.length];
}

/**
 * Check if a date string falls in current month and year
 */
export function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/**
 * Check if a habit value is completed (truthy and not "tidak")
 */
export function habitDone(v) {
  return Boolean(v && String(v).trim() && String(v).trim().toLowerCase() !== 'tidak');
}

/**
 * Generate list of keys and labels for the last 6 months
 */
export function last6Months() {
  const out = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('id-ID', { month: 'short' });
    out.push({ key, label });
  }
  return out;
}
