/* ============================================================
   VIEWS / LAPORAN & CETAK PDF (With 7 Habits Radar Chart)
   ============================================================ */
import Chart from 'chart.js/auto';
import { STATE, siswaById } from '../state/store.js';
import { REPORT_COLUMNS, REPORT_TITLES } from '../config/reportConfig.js';
import { $ } from '../utils/dom.js';
import { fmtDate, escapeHtml, habitDone } from '../utils/helpers.js';
import { toast } from '../components/toast.js';

let radarChartInstance = null;

function destroyRadarChart() {
  if (radarChartInstance) {
    radarChartInstance.destroy();
    radarChartInstance = null;
  }
}

function filterByPeriode(rows, type) {
  const periode = $('#reportPeriode')?.value;
  if (!periode) return rows;
  if (!('Tanggal' in (rows[0] || {})) && !REPORT_COLUMNS[type]?.includes('Tanggal')) return rows;

  if (periode === 'harian') {
    const tgl = $('#reportTanggal')?.value;
    if (!tgl) return rows;
    return rows.filter(r => (r.Tanggal || '').slice(0, 10) === tgl);
  }
  if (periode === 'bulanan') {
    const bln = $('#reportBulan')?.value;
    if (!bln) return rows;
    return rows.filter(r => (r.Tanggal || '').slice(0, 7) === bln);
  }
  return rows;
}

function periodeLabel() {
  const periode = $('#reportPeriode')?.value;
  if (periode === 'harian') {
    const tgl = $('#reportTanggal')?.value;
    return tgl ? `Harian — ${fmtDate(tgl)}` : 'Harian';
  }
  if (periode === 'bulanan') {
    const bln = $('#reportBulan')?.value;
    if (!bln) return 'Bulanan';
    const [y, m] = bln.split('-');
    return `Bulanan — ${new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
  }
  return 'Semua Tanggal';
}

function calculateStudentHabitScores(kebiasaanList) {
  const total = kebiasaanList.length;
  if (total === 0) return [0, 0, 0, 0, 0, 0, 0];

  const bangunCount = kebiasaanList.filter(k => habitDone(k.BangunPagi)).length;
  const sholatCount = kebiasaanList.filter(k => {
    let done = 0;
    if (habitDone(k.SholatSubuh)) done++;
    if (habitDone(k.SholatDzuhur)) done++;
    if (habitDone(k.SholatAshar)) done++;
    if (habitDone(k.SholatMaghrib)) done++;
    if (habitDone(k.SholatIsya)) done++;
    return done >= 4;
  }).length;
  const dhuhaCount = kebiasaanList.filter(k => habitDone(k.SholatDhuha)).length;
  const olahragaCount = kebiasaanList.filter(k => habitDone(k.Olahraga)).length;
  const belajarCount = kebiasaanList.filter(k => habitDone(k.Belajar)).length;
  const makanCount = kebiasaanList.filter(k => habitDone(k.MakanSehat)).length;
  const tidurCount = kebiasaanList.filter(k => habitDone(k.TidurCepat)).length;

  return [
    Math.round((bangunCount / total) * 100),
    Math.round((sholatCount / total) * 100),
    Math.round((dhuhaCount / total) * 100),
    Math.round((olahragaCount / total) * 100),
    Math.round((belajarCount / total) * 100),
    Math.round((makanCount / total) * 100),
    Math.round((tidurCount / total) * 100)
  ];
}

function renderRadarChart(scores) {
  const canvas = $('#radarChartKarakter');
  if (!canvas) return;

  destroyRadarChart();

  radarChartInstance = new Chart(canvas, {
    type: 'radar',
    data: {
      labels: [
        'Bangun Pagi',
        'Sholat 5 Wkt',
        'Sholat Dhuha',
        'Berolahraga',
        'Gemar Belajar',
        'Makan Sehat',
        'Tidur Cepat'
      ],
      datasets: [
        {
          label: 'Capaian Karakter (%)',
          data: scores,
          backgroundColor: 'rgba(5, 150, 105, 0.22)',
          borderColor: '#059669',
          pointBackgroundColor: '#047857',
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: '#047857',
          borderWidth: 2.5,
          pointRadius: 4.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: '#e2e8f0' },
          grid: { color: '#e2e8f0' },
          pointLabels: {
            font: { size: 11, family: 'Inter', weight: '600' },
            color: '#1e293b'
          },
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: {
            stepSize: 20,
            backdropColor: 'transparent',
            font: { size: 9 },
            callback: v => `${v}%`
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `Keterlaksanaan: ${ctx.parsed.r}%`
          }
        }
      }
    }
  });
}

function buildReportSummaryHtml(type, rows) {
  if (type === 'absensi') {
    const count = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
    rows.forEach(r => {
      if (count[r.Status] !== undefined) count[r.Status]++;
    });
    return `
      <div class="report-summary">
        <div class="report-summary-item"><span class="label">Total Hadir</span><span class="value">${count.Hadir}</span></div>
        <div class="report-summary-item"><span class="label">Total Sakit</span><span class="value">${count.Sakit}</span></div>
        <div class="report-summary-item"><span class="label">Total Izin</span><span class="value">${count.Izin}</span></div>
        <div class="report-summary-item"><span class="label">Total Alpa</span><span class="value">${count.Alpa}</span></div>
        <div class="report-summary-item"><span class="label">Total Keseluruhan</span><span class="value">${rows.length}</span></div>
      </div>`;
  }
  if (type === 'pelanggaran') {
    const totalPoin = rows.reduce((sum, r) => sum + (Number(r.Poin) || 0), 0);
    return `
      <div class="report-summary">
        <div class="report-summary-item"><span class="label">Total Kasus Pelanggaran</span><span class="value">${rows.length}</span></div>
        <div class="report-summary-item"><span class="label">Total Poin Pelanggaran</span><span class="value">${totalPoin}</span></div>
      </div>`;
  }
  return '';
}

export function generateReport() {
  const type = $('#reportType')?.value;
  if (!type) return;

  if (type === 'individu') {
    const siswaId = $('#reportSiswa')?.value;
    if (!siswaId) {
      toast('Pilih siswa terlebih dahulu.', 'error');
      return;
    }
    const s = siswaById(siswaId);
    if (!s) {
      toast('Data siswa tidak ditemukan.', 'error');
      return;
    }

    const mine = t =>
      filterByPeriode(
        (STATE[t] || []).filter(r => String(r.SiswaID) === String(siswaId)),
        t
      )
        .slice()
        .sort((a, b) => new Date(a.Tanggal) - new Date(b.Tanggal));

    const absensi = mine('absensi');
    const pelanggaran = mine('pelanggaran');
    const konseling = mine('konseling');
    const kolaborasi = mine('kolaborasi');
    const kebiasaan = mine('kebiasaan');
    const today = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const habitScores = calculateStudentHabitScores(kebiasaan);

    const section = (title, cols, rows, emptyMsg) => `
      <h3 style="margin-top:22px;font-size:1.05rem;font-weight:700">${title}</h3>
      <table class="report-table">
        <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>
          ${
            rows.length
              ? rows
                  .map(
                    r =>
                      `<tr>${cols
                        .map(
                          c =>
                            `<td>${c === 'Tanggal' ? fmtDate(r[c]) : escapeHtml(r[c] ?? '-')}</td>`
                        )
                        .join('')}</tr>`
                  )
                  .join('')
              : `<tr><td colspan="${cols.length}" style="text-align:center;color:#94a3b8">${emptyMsg}</td></tr>`
          }
        </tbody>
      </table>`;

    const html = `
      <h2>Laporan Perkembangan Individu Siswa</h2>
      <div class="report-head-line"><span>Periode: ${periodeLabel()}</span><span>Dicetak: ${today}</span></div>
      <div class="report-summary">
        <div class="report-summary-item"><span class="label">Nama Lengkap</span><span class="value" style="font-size:14px">${escapeHtml(s.Nama)}</span></div>
        <div class="report-summary-item"><span class="label">NIS</span><span class="value" style="font-size:14px">${escapeHtml(s.NIS || '-')}</span></div>
        <div class="report-summary-item"><span class="label">Kelas</span><span class="value" style="font-size:14px">${escapeHtml(s.Kelas || '-')}</span></div>
        <div class="report-summary-item"><span class="label">Jenis Kelamin</span><span class="value" style="font-size:14px">${escapeHtml(s.JenisKelamin || '-')}</span></div>
        <div class="report-summary-item"><span class="label">Orang Tua / Wali</span><span class="value" style="font-size:14px">${escapeHtml(s.NamaOrtu || '-')}</span></div>
        <div class="report-summary-item"><span class="label">No. HP Orang Tua</span><span class="value" style="font-size:14px">${escapeHtml(s.NoHPOrtu || '-')}</span></div>
      </div>

      <!-- Visualisasi Radar Chart Karakter 7 Kebiasaan -->
      <div class="report-radar-section">
        <h3 style="font-size:1.05rem;font-weight:700;margin:0 0 4px 0">Visualisasi Capaian 7 Kebiasaan Anak Indonesia Hebat</h3>
        <p style="font-size:12px;color:#64748b;margin:0">Pemetaan dimensi pembiasaan karakter berdasarkan ${kebiasaan.length} catatan harian siswa.</p>
        <div class="report-radar-wrapper">
          <canvas id="radarChartKarakter"></canvas>
        </div>
      </div>

      ${buildReportSummaryHtml('absensi', absensi)}
      ${section('Rekap Kehadiran (Absensi)', ['Tanggal', 'Status', 'Keterangan'], absensi, 'Tidak ada catatan absensi')}
      ${buildReportSummaryHtml('pelanggaran', pelanggaran)}
      ${section('Rekap Pelanggaran Disiplin', ['Tanggal', 'JenisPelanggaran', 'Poin', 'Penanganan'], pelanggaran, 'Tidak ada catatan pelanggaran')}
      ${section('Rekap Sesi Konseling', ['Tanggal', 'Topik', 'HasilKonseling', 'TindakLanjut'], konseling, 'Tidak ada catatan konseling')}
      ${section('Rekap Kolaborasi (Panggilan Ortu / Home Visit)', ['Tanggal', 'Jenis', 'Tujuan', 'Hasil'], kolaborasi, 'Tidak ada catatan kolaborasi')}
      ${section('Rekap 7 Kebiasaan Anak Indonesia Hebat', ['Tanggal', 'BangunPagiPukul', 'IbadahSholat', 'OlahragaJenis', 'BelajarMapel', 'IstirahatPukul'], kebiasaan, 'Belum ada catatan kebiasaan harian')}
      ${s.Catatan ? `<h3 style="margin-top:22px;font-size:1.05rem;font-weight:700">Catatan Khusus</h3><p style="margin-top:6px;line-height:1.6">${escapeHtml(s.Catatan)}</p>` : ''}
    `;

    const reportPreview = $('#reportPreview');
    const reportPreviewCard = $('#reportPreviewCard');
    if (reportPreview && reportPreviewCard) {
      reportPreview.innerHTML = html;
      reportPreviewCard.style.display = 'block';
      renderRadarChart(habitScores);
      reportPreviewCard.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => window.print(), 500);
    }
    return;
  }

  const kelas = $('#reportKelas')?.value;
  let rows = STATE[type] || [];
  if (kelas) rows = rows.filter(r => r.Kelas === kelas);
  rows = filterByPeriode(rows, type);

  if ('Tanggal' in (rows[0] || {}) || REPORT_COLUMNS[type]?.includes('Tanggal')) {
    rows = rows.slice().sort((a, b) => new Date(a.Tanggal) - new Date(b.Tanggal));
  }

  const cols = REPORT_COLUMNS[type] || [];
  const today = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const html = `
    <h2>${REPORT_TITLES[type] || 'Laporan'}</h2>
    <div class="report-head-line"><span>Kelas: ${escapeHtml(kelas || 'Semua Kelas')} &nbsp;|&nbsp; Periode: ${periodeLabel()}</span><span>Dicetak: ${today}</span></div>
    ${buildReportSummaryHtml(type, rows)}
    <table class="report-table">
      <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>
        ${
          rows.length
            ? rows
                .map(
                  r =>
                    `<tr>${cols
                      .map(
                        c =>
                          `<td>${c === 'Tanggal' ? fmtDate(r[c]) : escapeHtml(r[c] ?? '-')}</td>`
                      )
                      .join('')}</tr>`
                )
                .join('')
            : `<tr><td colspan="${cols.length}" style="text-align:center;color:#94a3b8">Tidak ada data untuk periode dan filter yang dipilih.</td></tr>`
        }
      </tbody>
    </table>
    <p style="margin-top:20px;font-size:12px;color:#64748b">Total baris data: ${rows.length}</p>
  `;

  const reportPreview = $('#reportPreview');
  const reportPreviewCard = $('#reportPreviewCard');
  if (reportPreview && reportPreviewCard) {
    destroyRadarChart();
    reportPreview.innerHTML = html;
    reportPreviewCard.style.display = 'block';
    reportPreviewCard.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => window.print(), 400);
  }
}

export function initLaporanListeners() {
  $('#reportPeriode')?.addEventListener('change', () => {
    const val = $('#reportPeriode').value;
    $('#reportTanggalField')?.classList.toggle('hidden', val !== 'harian');
    $('#reportBulanField')?.classList.toggle('hidden', val !== 'bulanan');
  });

  $('#reportType')?.addEventListener('change', () => {
    const isIndividu = $('#reportType').value === 'individu';
    $('#reportKelasField')?.classList.toggle('hidden', isIndividu);
    $('#reportSiswaField')?.classList.toggle('hidden', !isIndividu);
  });

  const today = new Date();
  const reportTanggal = $('#reportTanggal');
  const reportBulan = $('#reportBulan');
  if (reportTanggal) reportTanggal.value = today.toISOString().slice(0, 10);
  if (reportBulan) reportBulan.value = today.toISOString().slice(0, 7);

  $('#btnGenerateReport')?.addEventListener('click', generateReport);
}
