/**
 * charts.js - Logika Render Grafik Chart.js untuk Halaman Data & Fakta
 * Kampanye Hemat Energi - Fase 2 Lintas Mapel
 */

(() => {
  "use strict";

  // Fallback data jika dibuka langsung via protocol file:// (CORS safe)
  const FALLBACK_DATA = {
    "survei_info": {
      "judul": "Survei & Observasi Kebiasaan Penggunaan Energi Listrik di Lingkungan Sekolah",
      "total_responden": 120
    },
    "ringkasan_angka": {
      "total_responden": 120,
      "rata_rata_pemborosan_kwh": 781,
      "potensi_penghematan_rupiah": "Rp 1.130.000",
      "emisi_karbon_tercegah_kg": 625,
      "persentase_komitmen_siswa": 87.5
    },
    "kebiasaan_lampu": {
      "labels": ["Selalu Mematikan", "Sering Mematikan", "Kadang-kadang", "Jarang / Menunggu Petugas", "Tidak Pernah"],
      "data": [42, 38, 22, 13, 5],
      "persentase": [35.0, 31.7, 18.3, 10.8, 4.2],
      "kesimpulan": "Sebanyak 35% siswa sudah memiliki inisiatif baik selalu mematikan lampu, namun 33,3% lainnya masih bersikap pasif dan membiarkan lampu menyala tanpa pengawasan saat ruang kelas kosong."
    },
    "pemborosan_perangkat": {
      "labels": ["Lampu Kelas", "Kipas / AC", "Proyektor LCD", "Dispenser Air", "PC Lab Komputer"],
      "jam_per_hari": [3.8, 4.5, 2.1, 7.5, 3.2],
      "estimasi_kwh_bulan": [114, 270, 63, 180, 154],
      "kesimpulan": "Pendingin udara (AC/kipas) dan dispenser air merupakan beban pemborosan terbesar dengan durasi menyala sia-sia antara 4,5 hingga 7,5 jam per hari, menyedot lebih dari 450 kWh energi per bulan."
    },
    "kebiasaan_charger": {
      "labels": ["Langsung Dicabut Usai Cas", "Dibiarkan Tercolok di Stopkontak", "Hanya Dicabut Jika Ingat"],
      "data": [34, 58, 28],
      "persentase": [28.3, 48.3, 23.4],
      "kesimpulan": "Sebanyak 48,3% siswa masih membiarkan charger menancap di stopkontak meski perangkat sudah penuh, menyumbang beban listrik vampir (vampire power) yang terus menyedot daya secara tersembunyi."
    },
    "tingkat_komitmen": {
      "labels": ["Sangat Berkomitmen", "Cukup Berkomitmen", "Ragu-Ragu / Netral", "Kurang Peduli"],
      "data": [68, 37, 11, 4],
      "persentase": [56.7, 30.8, 9.2, 3.3],
      "kesimpulan": "Sebesar 87,5% siswa menyatakan komitmen positif dan siap berpartisipasi dalam aksi hemat energi, membuktikan tingginya peluang keberhasilan kampanye jika didukung sarana sakelar yang memadai dan edukasi terarah."
    }
  };

  // Palet Warna Kampanye (Konsisten dengan Fase 1: Alam, Hijau Hutan, Emas Terang)
  const PALETTE = {
    forestDark: "#142118",
    greenDeep: "#2f5a24",
    greenMedium: "#468337",
    greenLeaf: "#5ca34e",
    greenLight: "#8dd17a",
    yellowWarm: "#ffcf56",
    orangeWarning: "#f59e0b",
    redAlert: "#e57373",
    slateMuted: "#6b786e",
    bgCard: "#fbfaf8",
    borderColor: "rgba(20, 33, 24, 0.08)"
  };

  // Set global Chart.js defaults
  if (typeof Chart !== "undefined") {
    Chart.defaults.font.family = "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif";
    Chart.defaults.color = "#4a554c";
    Chart.defaults.plugins.tooltip.backgroundColor = "rgba(20, 33, 24, 0.94)";
    Chart.defaults.plugins.tooltip.titleColor = "#f4f2ee";
    Chart.defaults.plugins.tooltip.bodyColor = "#e6ede7";
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.boxPadding = 6;
    Chart.defaults.plugins.legend.labels.boxWidth = 14;
    Chart.defaults.plugins.legend.labels.boxHeight = 14;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding = 16;
  }

  /**
   * Render Chart 1: Kebiasaan Mematikan Lampu Kelas (Doughnut Chart)
   */
  function renderLampuChart(data) {
    const ctx = document.getElementById("chartLampu");
    if (!ctx) return;

    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: data.labels,
        datasets: [{
          data: data.data,
          backgroundColor: [
            PALETTE.greenDeep,
            PALETTE.greenMedium,
            PALETTE.greenLight,
            PALETTE.yellowWarm,
            PALETTE.redAlert
          ],
          borderColor: "#fbfaf8",
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: {
            position: "bottom"
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.raw || 0;
                const pct = data.persentase[context.dataIndex] || 0;
                return ` ${context.label}: ${val} siswa (${pct}%)`;
              }
            }
          }
        },
        animation: {
          animateScale: true,
          animateRotate: true,
          duration: 1200
        }
      }
    });

    // Pasang penjelasan di bawah grafik
    const captionEl = document.getElementById("descLampu");
    if (captionEl && data.kesimpulan) {
      captionEl.textContent = data.kesimpulan;
    }
  }

  /**
   * Render Chart 2: Durasi Pemborosan per Perangkat (Bar Chart)
   */
  function renderDurasiChart(data) {
    const ctx = document.getElementById("chartDurasi");
    if (!ctx) return;

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Jam Menyala Tanpa Guna (Jam/Hari)",
            data: data.jam_per_hari,
            backgroundColor: [
              "rgba(47, 90, 36, 0.85)",
              "rgba(229, 115, 115, 0.88)",
              "rgba(92, 163, 78, 0.85)",
              "rgba(245, 158, 11, 0.88)",
              "rgba(70, 131, 55, 0.85)"
            ],
            borderColor: [
              PALETTE.greenDeep,
              PALETTE.redAlert,
              PALETTE.greenLeaf,
              PALETTE.orangeWarning,
              PALETTE.greenMedium
            ],
            borderWidth: 1.5,
            borderRadius: 6,
            yAxisID: "y"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              afterLabel: (context) => {
                const kwh = data.estimasi_kwh_bulan[context.dataIndex];
                return `Estimasi Terbuang: ~${kwh} kWh / bulan`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Rata-Rata Jam / Hari",
              color: PALETTE.slateMuted,
              font: { weight: "600", size: 12 }
            },
            grid: {
              color: "rgba(20, 33, 24, 0.06)"
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        animation: {
          duration: 1200,
          easing: "easeOutQuart"
        }
      }
    });

    const captionEl = document.getElementById("descDurasi");
    if (captionEl && data.kesimpulan) {
      captionEl.textContent = data.kesimpulan;
    }
  }

  /**
   * Render Chart 3: Kebiasaan Charger HP / Vampire Power (Pie Chart)
   */
  function renderChargerChart(data) {
    const ctx = document.getElementById("chartCharger");
    if (!ctx) return;

    new Chart(ctx, {
      type: "pie",
      data: {
        labels: data.labels,
        datasets: [{
          data: data.data,
          backgroundColor: [
            PALETTE.greenDeep,
            PALETTE.redAlert,
            PALETTE.yellowWarm
          ],
          borderColor: "#fbfaf8",
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom"
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.raw || 0;
                const pct = data.persentase[context.dataIndex] || 0;
                return ` ${context.label}: ${val} siswa (${pct}%)`;
              }
            }
          }
        },
        animation: {
          duration: 1200
        }
      }
    });

    const captionEl = document.getElementById("descCharger");
    if (captionEl && data.kesimpulan) {
      captionEl.textContent = data.kesimpulan;
    }
  }

  /**
   * Render Chart 4: Tingkat Kesadaran & Komitmen Siswa (Horizontal Bar Chart)
   */
  function renderKomitmenChart(data) {
    const ctx = document.getElementById("chartKomitmen");
    if (!ctx) return;

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: [{
          label: "Jumlah Responden (Siswa)",
          data: data.data,
          backgroundColor: [
            PALETTE.greenDeep,
            PALETTE.greenLeaf,
            PALETTE.yellowWarm,
            PALETTE.slateMuted
          ],
          borderRadius: 6,
          borderWidth: 1.2,
          borderColor: "rgba(20, 33, 24, 0.15)"
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.raw || 0;
                const pct = data.persentase[context.dataIndex] || 0;
                return ` ${val} Siswa (${pct}%)`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Jumlah Siswa",
              color: PALETTE.slateMuted,
              font: { weight: "600", size: 12 }
            },
            grid: {
              color: "rgba(20, 33, 24, 0.06)"
            }
          },
          y: {
            grid: {
              display: false
            }
          }
        },
        animation: {
          duration: 1300,
          easing: "easeOutCubic"
        }
      }
    });

    const captionEl = document.getElementById("descKomitmen");
    if (captionEl && data.kesimpulan) {
      captionEl.textContent = data.kesimpulan;
    }
  }

  /**
   * Update Quick Stat Counters di Header Dashboard
   */
  function updateQuickStats(stats) {
    if (!stats) return;
    const elResponden = document.getElementById("statResponden");
    const elKwh = document.getElementById("statKwh");
    const elHemat = document.getElementById("statHemat");
    const elKomitmen = document.getElementById("statKomitmen");

    if (elResponden) elResponden.textContent = stats.total_responden + " Siswa";
    if (elKwh) elKwh.textContent = stats.rata_rata_pemborosan_kwh + " kWh/Bln";
    if (elHemat) elHemat.textContent = stats.potensi_penghematan_rupiah + "/Bln";
    if (elKomitmen) elKomitmen.textContent = stats.persentase_komitmen_siswa + "%";
  }

  /**
   * Main Init: Fetch data.json dan jalankan render
   */
  async function initCharts() {
    let sourceData = FALLBACK_DATA;

    try {
      const response = await fetch("data/data.json");
      if (response.ok) {
        sourceData = await response.json();
      }
    } catch (err) {
      console.warn("fetch('data/data.json') menggunakan fallback data lokal:", err.message);
    }

    if (sourceData.ringkasan_angka) {
      updateQuickStats(sourceData.ringkasan_angka);
    }
    if (sourceData.kebiasaan_lampu) {
      renderLampuChart(sourceData.kebiasaan_lampu);
    }
    if (sourceData.pemborosan_perangkat) {
      renderDurasiChart(sourceData.pemborosan_perangkat);
    }
    if (sourceData.kebiasaan_charger) {
      renderChargerChart(sourceData.kebiasaan_charger);
    }
    if (sourceData.tingkat_komitmen) {
      renderKomitmenChart(sourceData.tingkat_komitmen);
    }
  }

  // Jalankan saat DOM siap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCharts);
  } else {
    initCharts();
  }
})();
