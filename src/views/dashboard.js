/* ============================================================
   VIEWS / DASHBOARD (Advanced Multi-dimensional Analytics)
   ============================================================ */
import Chart from 'chart.js/auto';
import { STATE, getCurrentPage } from '../state/store.js';
import { $, $all } from '../utils/dom.js';
import { isThisMonth, escapeHtml, fmtDate, initials, colorFromString, formatPhoneWa, habitDone } from '../utils/helpers.js';
import { openForm } from '../components/modal.js';
import { toast } from '../components/toast.js';

const charts = {};
let currentClassFilter = '';

function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
}

function getMonthsWindow() {
  const out = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      y: d.getFullYear(),
      m: d.getMonth()
    });
  }
  return out;
}

/**
 * Filter all state collections by active class if selected
 */
function getFilteredState() {
  if (!currentClassFilter) {
    return {
      siswa: STATE.siswa,
      absensi: STATE.absensi,
      pelanggaran: STATE.pelanggaran,
      konseling: STATE.konseling,
      kolaborasi: STATE.kolaborasi,
      kebiasaan: STATE.kebiasaan
    };
  }

  const siswa = STATE.siswa.filter(s => s.Kelas === currentClassFilter);
  const siswaIds = new Set(siswa.map(s => String(s.ID)));
  const siswaNames = new Set(siswa.map(s => String(s.Nama || '').trim().toLowerCase()));

  const matchFilter = item => {
    if (item.Kelas === currentClassFilter) return true;
    if (item.SiswaID && siswaIds.has(String(item.SiswaID))) return true;
    if (item.Nama && siswaNames.has(String(item.Nama).trim().toLowerCase())) return true;
    return false;
  };

  return {
    siswa,
    absensi: STATE.absensi.filter(matchFilter),
    pelanggaran: STATE.pelanggaran.filter(matchFilter),
    konseling: STATE.konseling.filter(matchFilter),
    kolaborasi: STATE.kolaborasi.filter(matchFilter),
    kebiasaan: STATE.kebiasaan.filter(matchFilter)
  };
}

export function renderDashboard() {
  if (getCurrentPage() !== 'dashboard') return;

  const data = getFilteredState();

  // 1. KPI 1: Total Siswa
  const statSiswa = $('#statSiswa');
  const statSiswaDetail = $('#statSiswaDetail');
  if (statSiswa) statSiswa.textContent = data.siswa.length;
  if (statSiswaDetail) {
    const lCount = data.siswa.filter(s => (s.JenisKelamin || '').toUpperCase() === 'L').length;
    const pCount = data.siswa.filter(s => (s.JenisKelamin || '').toUpperCase() === 'P').length;
    statSiswaDetail.textContent = `${lCount} L · ${pCount} P`;
  }

  // 2. KPI 2: Kehadiran Rate
  const thisMonthAbsensi = data.absensi.filter(a => isThisMonth(a.Tanggal));
  const activeAbsensi = thisMonthAbsensi.length > 0 ? thisMonthAbsensi : data.absensi;
  const hadirCount = activeAbsensi.filter(a => a.Status === 'Hadir').length;
  const totalCount = activeAbsensi.length;
  const kehadiranRate = totalCount > 0 ? ((hadirCount / totalCount) * 100).toFixed(1) : '100';

  const statKehadiranRate = $('#statKehadiranRate');
  const statHadirCount = $('#statHadirCount');
  if (statKehadiranRate) statKehadiranRate.textContent = `${kehadiranRate}%`;
  if (statHadirCount) {
    statHadirCount.textContent = thisMonthAbsensi.length > 0
      ? `${hadirCount} Hadir Bulan Ini`
      : `${hadirCount} Hadir Total`;
  }

  // 3. KPI 3: Siswa Perlu Perhatian & At-Risk Analysis
  const atRiskList = computeAtRiskStudents(data.siswa, data.pelanggaran, data.absensi);
  const statPerluPerhatian = $('#statPerluPerhatian');
  if (statPerluPerhatian) statPerluPerhatian.textContent = atRiskList.length;

  // 4. KPI 4: Pelanggaran & Poin Bulan Ini
  const thisMonthPelanggaran = data.pelanggaran.filter(p => isThisMonth(p.Tanggal));
  const activePelanggaran = thisMonthPelanggaran.length > 0 ? thisMonthPelanggaran : data.pelanggaran;
  const totalPoin = activePelanggaran.reduce((sum, p) => sum + (parseInt(p.Poin, 10) || 0), 0);
  
  const statPelanggaran = $('#statPelanggaran');
  const statPoinPelanggaran = $('#statPoinPelanggaran');
  if (statPelanggaran) statPelanggaran.textContent = activePelanggaran.length;
  if (statPoinPelanggaran) {
    statPoinPelanggaran.textContent = thisMonthPelanggaran.length > 0
      ? `${totalPoin} Poin Bulan Ini`
      : `${totalPoin} Total Poin`;
  }

  // 5. KPI 5: Sesi Konseling Bulan Ini
  const statKonseling = $('#statKonseling');
  const thisMonthKonseling = data.konseling.filter(k => isThisMonth(k.Tanggal));
  if (statKonseling) {
    statKonseling.textContent = thisMonthKonseling.length > 0 ? thisMonthKonseling.length : data.konseling.length;
  }

  // 6. KPI 6: Kolaborasi Ortu Bulan Ini
  const statKolaborasi = $('#statKolaborasi');
  const thisMonthKolaborasi = data.kolaborasi.filter(k => isThisMonth(k.Tanggal));
  if (statKolaborasi) {
    statKolaborasi.textContent = thisMonthKolaborasi.length > 0 ? thisMonthKolaborasi.length : data.kolaborasi.length;
  }

  // Render Visual Analytics
  renderTrendChart(data.pelanggaran, data.absensi, data.konseling);
  renderPelanggaranChart(data.pelanggaran);
  renderAttendanceBreakdown(activeAbsensi);
  renderHabitsChart('chartHabits', data.kebiasaan);

  // Render Actionable Lists
  renderAtRiskWidget(atRiskList);
  renderActivityList(data.pelanggaran, data.konseling, data.kolaborasi, data.absensi);
}

/**
 * Compute students needing special counseling attention based on accumulated risk
 */
function computeAtRiskStudents(siswaList, pelanggaranList, absensiList) {
  const map = new Map();

  siswaList.forEach(s => {
    map.set(String(s.ID), {
      siswa: s,
      violations: [],
      totalPoints: 0,
      alpaCount: 0,
      riskScore: 0
    });
  });

  pelanggaranList.forEach(p => {
    const sId = String(p.SiswaID || '');
    let entry = map.get(sId);
    if (!entry && p.Nama) {
      // Lookup by name if ID missing
      const s = siswaList.find(x => x.Nama === p.Nama);
      if (s) entry = map.get(String(s.ID));
    }
    if (entry) {
      entry.violations.push(p);
      entry.totalPoints += parseInt(p.Poin, 10) || 0;
    }
  });

  absensiList.forEach(a => {
    if (a.Status !== 'Alpa') return;
    const sId = String(a.SiswaID || '');
    let entry = map.get(sId);
    if (!entry && a.Nama) {
      const s = siswaList.find(x => x.Nama === a.Nama);
      if (s) entry = map.get(String(s.ID));
    }
    if (entry) {
      entry.alpaCount++;
    }
  });

  const atRisk = [];
  map.forEach(entry => {
    const vCount = entry.violations.length;
    const alpa = entry.alpaCount;
    const points = entry.totalPoints;

    // Risk threshold rule
    if (points >= 15 || alpa >= 2 || vCount >= 2 || (alpa >= 1 && points >= 10)) {
      entry.riskScore = (alpa * 12) + points + (vCount * 6);
      atRisk.push(entry);
    }
  });

  return atRisk.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Chart 1: 6-Month Multi-Line Trend
 */
function renderTrendChart(pelanggaranList, absensiList, konselingList) {
  const canvas = $('#chartTrend');
  if (!canvas) return;

  const months = getMonthsWindow();
  const pelData = months.map(
    mo =>
      pelanggaranList.filter(p => {
        const d = new Date(p.Tanggal);
        return d.getFullYear() === mo.y && d.getMonth() === mo.m;
      }).length
  );
  const alpaData = months.map(
    mo =>
      absensiList.filter(a => {
        if (a.Status !== 'Alpa') return false;
        const d = new Date(a.Tanggal);
        return d.getFullYear() === mo.y && d.getMonth() === mo.m;
      }).length
  );
  const konsData = months.map(
    mo =>
      konselingList.filter(k => {
        const d = new Date(k.Tanggal);
        return d.getFullYear() === mo.y && d.getMonth() === mo.m;
      }).length
  );

  destroyChart('trend');
  charts.trend = new Chart(canvas, {
    type: 'line',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        {
          label: 'Pelanggaran',
          data: pelData,
          borderColor: '#e11d48',
          backgroundColor: 'rgba(225, 29, 72, 0.08)',
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Alpa (Tanpa Ket.)',
          data: alpaData,
          borderColor: '#d97706',
          backgroundColor: 'rgba(217, 119, 6, 0.08)',
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Sesi Konseling',
          data: konsData,
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.08)',
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: { size: 11, family: 'Inter' },
            padding: 14
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: { precision: 0, font: { family: 'Inter' } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter' } }
        }
      }
    }
  });
}

/**
 * Chart 2: Top Violation Categories Horizontal Bar
 */
function renderPelanggaranChart(pelanggaranList) {
  const canvas = $('#chartPelanggaran');
  if (!canvas) return;

  const counts = {};
  pelanggaranList.forEach(p => {
    const key = p.JenisPelanggaran || 'Lainnya';
    counts[key] = (counts[key] || 0) + 1;
  });
  const entries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const labels = entries.length ? entries.map(e => e[0]) : ['Belum ada pelanggaran'];
  const values = entries.length ? entries.map(e => e[1]) : [0];

  destroyChart('pel');
  charts.pel = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: '#f59e0b',
          borderRadius: 6,
          maxBarThickness: 22
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: { precision: 0, font: { family: 'Inter' } }
        },
        y: {
          grid: { display: false },
          ticks: { font: { family: 'Inter' } }
        }
      }
    }
  });
}

/**
 * Attendance Analytics & Status Breakdown Widget (Multi-metric & Segmented Bar)
 */
function renderAttendanceBreakdown(absensiData) {
  const hadirCount = absensiData.filter(a => a.Status === 'Hadir').length;
  const sakitCount = absensiData.filter(a => a.Status === 'Sakit').length;
  const izinCount = absensiData.filter(a => a.Status === 'Izin').length;
  const alpaCount = absensiData.filter(a => a.Status === 'Alpa').length;
  const total = absensiData.length;

  const pct = count => (total > 0 ? ((count / total) * 100).toFixed(1) : '0');
  const hadirPct = pct(hadirCount);
  const sakitPct = pct(sakitCount);
  const izinPct = pct(izinCount);
  const alpaPct = pct(alpaCount);

  // Health Rate & Status
  const rateVal = $('#attendanceRateVal');
  if (rateVal) rateVal.textContent = total > 0 ? `${hadirPct}%` : '100%';

  const badge = $('#attendanceHealthBadge');
  const title = $('#attendanceStatusTitle');
  const desc = $('#attendanceStatusDesc');

  if (total === 0) {
    if (badge) { badge.className = 'badge badge-subtle'; badge.textContent = 'Belum Ada Data'; }
    if (title) title.textContent = 'Belum Ada Data Absensi';
    if (desc) desc.textContent = 'Silakan lakukan pencatatan absensi harian pada menu Absensi.';
  } else if (parseFloat(alpaPct) === 0 && parseFloat(hadirPct) >= 90) {
    if (badge) { badge.className = 'badge badge-success'; badge.textContent = 'Disiplin Prima'; }
    if (title) title.textContent = 'Tingkat Kehadiran Sangat Tinggi';
    if (desc) desc.textContent = 'Kondisi kedisiplinan prima tanpa catatan ketidakhadiran alpa.';
  } else if (parseFloat(alpaPct) <= 5) {
    if (badge) { badge.className = 'badge badge-success'; badge.textContent = 'Disiplin Baik'; }
    if (title) title.textContent = 'Kondisi Kehadiran Stabil';
    if (desc) desc.textContent = `Tercatat ${alpaCount} alpa (${alpaPct}%), sebagian besar absensi karena izin/sakit resmi.`;
  } else if (parseFloat(alpaPct) <= 15) {
    if (badge) { badge.className = 'badge badge-amber'; badge.textContent = 'Cukup Disiplin'; }
    if (title) title.textContent = 'Perlu Pemantauan Alpa';
    if (desc) desc.textContent = `Terdapat ${alpaCount} alpa (${alpaPct}%) yang membutuhkan penelusuran oleh Guru BK.`;
  } else {
    if (badge) { badge.className = 'badge badge-danger'; badge.textContent = 'Waspada Alpa'; }
    if (title) title.textContent = 'Tingkat Ketidakhadiran Tinggi';
    if (desc) desc.textContent = `Tercatat ${alpaCount} alpa (${alpaPct}%). Disarankan segera koordinasi dengan wali kelas dan orang tua.`;
  }

  // Segmented Bar widths
  const barHadir = $('.bar-seg-hadir');
  const barSakit = $('.bar-seg-sakit');
  const barIzin = $('.bar-seg-izin');
  const barAlpa = $('.bar-seg-alpa');

  if (total === 0) {
    if (barHadir) barHadir.style.width = '100%';
    if (barSakit) barSakit.style.width = '0%';
    if (barIzin) barIzin.style.width = '0%';
    if (barAlpa) barAlpa.style.width = '0%';
  } else {
    if (barHadir) barHadir.style.width = `${hadirPct}%`;
    if (barSakit) barSakit.style.width = `${sakitPct}%`;
    if (barIzin) barIzin.style.width = `${izinPct}%`;
    if (barAlpa) barAlpa.style.width = `${alpaPct}%`;
  }

  // Value and percentage texts
  const elHadir = $('#attCountHadir');
  const elPctHadir = $('#attPctHadir');
  if (elHadir) elHadir.textContent = hadirCount;
  if (elPctHadir) elPctHadir.textContent = `${hadirPct}%`;

  const elSakit = $('#attCountSakit');
  const elPctSakit = $('#attPctSakit');
  if (elSakit) elSakit.textContent = sakitCount;
  if (elPctSakit) elPctSakit.textContent = `${sakitPct}%`;

  const elIzin = $('#attCountIzin');
  const elPctIzin = $('#attPctIzin');
  if (elIzin) elIzin.textContent = izinCount;
  if (elPctIzin) elPctIzin.textContent = `${izinPct}%`;

  const elAlpa = $('#attCountAlpa');
  const elPctAlpa = $('#attPctAlpa');
  if (elAlpa) elAlpa.textContent = alpaCount;
  if (elPctAlpa) elPctAlpa.textContent = `${alpaPct}%`;
}

/**
 * Chart 3: Attendance Proportion (Doughnut / Bar for Absensi Page)
 */
export function renderAbsensiChart(canvasId, absensiData) {
  const canvas = $('#' + canvasId);
  if (!canvas) return;

  const statuses = ['Hadir', 'Sakit', 'Izin', 'Alpa'];
  const colorMap = {
    Hadir: '#059669',
    Sakit: '#0284c7',
    Izin: '#d97706',
    Alpa: '#e11d48'
  };
  const counts = statuses.map(s => absensiData.filter(a => a.Status === s).length);

  destroyChart(canvasId);
  const isDoughnut = canvasId === 'chartAbsensi';

  charts[canvasId] = new Chart(canvas, {
    type: isDoughnut ? 'doughnut' : 'bar',
    data: {
      labels: statuses,
      datasets: [
        {
          data: counts,
          backgroundColor: statuses.map(s => colorMap[s]),
          borderRadius: isDoughnut ? 0 : 6,
          borderWidth: isDoughnut ? 2 : 0,
          borderColor: '#ffffff'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          display: isDoughnut,
          labels: {
            boxWidth: 12,
            font: { size: 11, family: 'Inter' },
            padding: 12
          }
        }
      },
      scales: isDoughnut
        ? {}
        : {
            y: {
              beginAtZero: true,
              grid: { color: '#f1f5f9' },
              ticks: { precision: 0, font: { family: 'Inter' } }
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Inter' } }
            }
          }
    }
  });
}

/**
 * Chart 4: 7 Habits Completion Rates (%)
 */
function renderHabitsChart(canvasId, kebiasaanData) {
  const canvas = $('#' + canvasId);
  if (!canvas) return;

  const habitLabels = [
    'Bangun Pagi',
    'Sholat 5 Wkt',
    'Sholat Dhuha',
    'Olahraga',
    'Gemar Belajar',
    'Makan Sehat',
    'Tidur Cepat'
  ];

  const totalLogs = kebiasaanData.length;
  let rates = [0, 0, 0, 0, 0, 0, 0];

  if (totalLogs > 0) {
    const bangunCount = kebiasaanData.filter(k => habitDone(k.BangunPagi)).length;
    const sholatCount = kebiasaanData.filter(k => {
      let done = 0;
      if (habitDone(k.SholatSubuh)) done++;
      if (habitDone(k.SholatDzuhur)) done++;
      if (habitDone(k.SholatAshar)) done++;
      if (habitDone(k.SholatMaghrib)) done++;
      if (habitDone(k.SholatIsya)) done++;
      return done >= 4; // Consistent >= 4 prayers
    }).length;
    const dhuhaCount = kebiasaanData.filter(k => habitDone(k.SholatDhuha)).length;
    const olahragaCount = kebiasaanData.filter(k => habitDone(k.Olahraga)).length;
    const belajarCount = kebiasaanData.filter(k => habitDone(k.Belajar)).length;
    const makanCount = kebiasaanData.filter(k => habitDone(k.MakanSehat)).length;
    const tidurCount = kebiasaanData.filter(k => habitDone(k.TidurCepat)).length;

    rates = [
      Math.round((bangunCount / totalLogs) * 100),
      Math.round((sholatCount / totalLogs) * 100),
      Math.round((dhuhaCount / totalLogs) * 100),
      Math.round((olahragaCount / totalLogs) * 100),
      Math.round((belajarCount / totalLogs) * 100),
      Math.round((makanCount / totalLogs) * 100),
      Math.round((tidurCount / totalLogs) * 100)
    ];
  }

  destroyChart(canvasId);
  charts[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: habitLabels,
      datasets: [
        {
          label: '% Keterlaksanaan',
          data: rates,
          backgroundColor: '#4f46e5',
          borderRadius: 6,
          maxBarThickness: 24
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `Keterlaksanaan: ${context.parsed.y}%`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: '#f1f5f9' },
          ticks: {
            callback: value => `${value}%`,
            font: { family: 'Inter', size: 11 }
          }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 10 } }
        }
      }
    }
  });
}

/**
 * Widget: Top At-Risk Students with Quick Contact & Counseling Actions
 */
function renderAtRiskWidget(atRiskList) {
  const container = $('#atRiskList');
  if (!container) return;

  if (!atRiskList.length) {
    container.innerHTML = `
      <li class="at-risk-empty">
        <i class="fa-solid fa-circle-check text-emerald" style="font-size:2rem;margin-bottom:8px"></i>
        <div style="font-weight:600;color:var(--text-primary)">Kondisi Kondusif &amp; Terkendali</div>
        <div class="muted" style="font-size:0.8rem">Tidak ada siswa yang terdeteksi butuh pantauan khusus saat ini.</div>
      </li>
    `;
    return;
  }

  container.innerHTML = atRiskList.slice(0, 5).map(item => {
    const s = item.siswa;
    const phone = formatPhoneWa(s.NoHPOrtu);
    const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`Yth. Bapak/Ibu Wali dari ${s.Nama}, kami dari Tim BK Sekolah ingin berdiskusi mengenai perkembangan ananda.`)}` : '';

    return `
      <li class="at-risk-item">
        <div class="at-risk-avatar" style="background:${colorFromString(s.Nama)}">${escapeHtml(initials(s.Nama))}</div>
        <div class="at-risk-info">
          <div class="at-risk-name">${escapeHtml(s.Nama)}</div>
          <div class="at-risk-class"><span class="badge badge-subtle">${escapeHtml(s.Kelas)}</span> · NIS ${escapeHtml(s.NIS || '-')}</div>
        </div>
        <div class="at-risk-badges">
          <span class="badge badge-danger" title="Total Poin Pelanggaran"><i class="fa-solid fa-triangle-exclamation"></i> ${item.totalPoints} Poin</span>
          ${item.alpaCount > 0 ? `<span class="badge badge-amber" title="Jumlah Alpa"><i class="fa-solid fa-calendar-xmark"></i> ${item.alpaCount} Alpa</span>` : ''}
        </div>
        <div class="at-risk-actions">
          ${phone ? `<a href="${waUrl}" target="_blank" rel="noopener" class="btn btn-sm btn-ghost btn-wa-risk" title="Chat WhatsApp Ortu"><i class="fa-brands fa-whatsapp text-emerald"></i></a>` : ''}
          <button class="btn btn-sm btn-primary btn-bimbing-risk" data-id="${s.ID}" data-nama="${escapeHtml(s.Nama)}" data-kelas="${escapeHtml(s.Kelas)}" title="Buat Jadwal / Catat Konseling"><i class="fa-solid fa-hand-holding-heart"></i> Bimbing</button>
        </div>
      </li>
    `;
  }).join('');

  // Bind Quick Action buttons
  $all('.btn-bimbing-risk', container).forEach(btn => {
    btn.addEventListener('click', () => {
      const sId = btn.dataset.id;
      const sNama = btn.dataset.nama;
      const sKelas = btn.dataset.kelas;
      openForm('konseling', null, {
        SiswaID: sId,
        Nama: sNama,
        Kelas: sKelas,
        Tanggal: new Date().toISOString().split('T')[0]
      });
    });
  });
}

/**
 * Widget: Multi-module Live Activity Feed
 */
function renderActivityList(pelanggaranList, konselingList, kolaborasiList, absensiList) {
  const items = [];

  pelanggaranList.forEach(p =>
    items.push({
      t: p.Tanggal,
      html: `<b>${escapeHtml(p.Nama || '-')}</b> — pelanggaran: ${escapeHtml(p.JenisPelanggaran || '-')} <span class="badge badge-danger badge-xs">+${escapeHtml(p.Poin || 0)} Poin</span>`,
      color: '#e11d48'
    })
  );

  konselingList.forEach(k =>
    items.push({
      t: k.Tanggal,
      html: `<b>${escapeHtml(k.Nama || '-')}</b> — konseling: ${escapeHtml(k.Topik || '-')}`,
      color: '#059669'
    })
  );

  kolaborasiList.forEach(k =>
    items.push({
      t: k.Tanggal,
      html: `<b>${escapeHtml(k.Nama || '-')}</b> — ${escapeHtml(k.Jenis || '-')}`,
      color: '#0284c7'
    })
  );

  absensiList
    .filter(a => a.Status === 'Alpa')
    .forEach(a =>
      items.push({
        t: a.Tanggal,
        html: `<b>${escapeHtml(a.Nama || '-')}</b> — tidak hadir tanpa keterangan`,
        color: '#d97706'
      })
    );

  items.sort((a, b) => new Date(b.t) - new Date(a.t));
  const list = $('#activityList');
  if (!list) return;

  if (!items.length) {
    list.innerHTML =
      '<li class="muted" style="border:none;padding:24px 4px;text-align:center">Belum ada aktivitas baru tercatat.</li>';
    return;
  }

  list.innerHTML = items
    .slice(0, 8)
    .map(
      it =>
        `<li><span class="activity-dot" style="background:${it.color}"></span><div><div>${it.html}</div><div class="a-time">${fmtDate(it.t)}</div></div></li>`
    )
    .join('');
}

/**
 * Initialize Dashboard Toolbar Listeners
 */
export function initDashboardListeners() {
  $('#filterDashboardKelas')?.addEventListener('change', e => {
    currentClassFilter = e.target.value;
    renderDashboard();
    toast(currentClassFilter ? `Filter Dashboard: Kelas ${currentClassFilter}` : 'Filter Dashboard: Semua Kelas (Global)', 'info');
  });
}
