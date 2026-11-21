/**
 * aksi.js - Interaksi Halaman Aksi & Rekomendasi (Fase 3)
 * Memuat data empiris dari data/data.json (dengan fallback CORS-safe),
 * filter rekomendasi, simulasi dampak kWh/Rupiah/CO2, tantangan 7 hari,
 * dan formulir ikrar komitmen lokal.
 */

(() => {
  "use strict";

  const FALLBACK_DATA = {
    ringkasan_angka: {
      total_responden: 120,
      rata_rata_pemborosan_kwh: 781,
      potensi_penghematan_rupiah: "Rp 1.130.000",
      emisi_karbon_tercegah_kg: 625,
      persentase_komitmen_siswa: 87.5
    },
    kebiasaan_lampu: {
      data: [42, 38, 22, 13, 5],
      persentase: [35.0, 31.7, 18.3, 10.8, 4.2]
    },
    pemborosan_perangkat: {
      labels: ["Lampu Ruang Kelas", "Kipas Angin / AC", "Proyektor LCD", "Dispenser Air", "PC Lab Komputer"],
      jam_per_hari: [3.8, 4.5, 2.1, 7.5, 3.2],
      estimasi_kwh_bulan: [114, 270, 63, 180, 154]
    },
    kebiasaan_charger: {
      data: [34, 58, 28],
      persentase: [28.3, 48.3, 23.4]
    },
    tingkat_komitmen: {
      data: [68, 37, 11, 4],
      persentase: [56.7, 30.8, 9.2, 3.3]
    }
  };

  const STORAGE_KEYS = {
    sim: "hematEnergi_sim_v1",
    days: "hematEnergi_7day_v1",
    pledges: "hematEnergi_pledges_v1"
  };

  let activeTotals = {
    totalKwh: 781,
    totalRupiah: 1130000,
    totalCo2: 625
  };

  function parseRupiahNumber(str) {
    if (typeof str === "number") return str;
    const digits = String(str || "").replace(/[^\d]/g, "");
    return digits ? parseInt(digits, 10) : 1130000;
  }

  function formatRupiah(amount) {
    return "Rp " + Math.round(amount).toLocaleString("id-ID");
  }

  function formatNumberID(num) {
    return Number(num).toLocaleString("id-ID");
  }

  /* ── 1. Mobile Navigation with Keyboard & Escape Support ── */
  function initMobileNav() {
    const mobileToggle = document.getElementById("mobileToggle");
    const navMenu = document.getElementById("navMenu");
    if (!mobileToggle || !navMenu) return;

    function closeMenu(returnFocus) {
      navMenu.classList.remove("open");
      mobileToggle.setAttribute("aria-expanded", "false");
      mobileToggle.setAttribute("aria-label", "Buka menu navigasi");
      if (returnFocus) mobileToggle.focus();
    }

    mobileToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("open");
      mobileToggle.setAttribute("aria-expanded", String(isOpen));
      mobileToggle.setAttribute("aria-label", isOpen ? "Tutup menu navigasi" : "Buka menu navigasi");
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navMenu.classList.contains("open")) {
        closeMenu(true);
      }
    });

    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (navMenu.classList.contains("open")) closeMenu(false);
      });
    });
  }

  /* ── 2. Load Survey Data from data/data.json (Loading / Error / Ready States) ── */
  function applySurveyData(data) {
    const ringkasan = data.ringkasan_angka || FALLBACK_DATA.ringkasan_angka;
    const totalKwh = Number(ringkasan.rata_rata_pemborosan_kwh) || 781;
    const totalRupiah = parseRupiahNumber(ringkasan.potensi_penghematan_rupiah);
    const totalCo2 = Number(ringkasan.emisi_karbon_tercegah_kg) || 625;
    const totalResp = Number(ringkasan.total_responden) || 120;
    const komitmenPct = Number(ringkasan.persentase_komitmen_siswa) || 87.5;
    const komitmenCount = Math.round((komitmenPct / 100) * totalResp);

    activeTotals = { totalKwh, totalRupiah, totalCo2 };

    const elKwh = document.getElementById("heroMetricKwh");
    const elRupiah = document.getElementById("heroMetricRupiah");
    const elCo2 = document.getElementById("heroMetricCo2");
    const elKomitmen = document.getElementById("heroMetricKomitmen");

    if (elKwh) elKwh.textContent = `${formatNumberID(totalKwh)} kWh/bln`;
    if (elRupiah) elRupiah.textContent = `${formatRupiah(totalRupiah)}/bln`;
    if (elCo2) elCo2.textContent = `${formatNumberID(totalCo2)} kg CO2/bln`;
    if (elKomitmen) {
      elKomitmen.textContent = `${String(komitmenPct).replace(".", ",")}% (${komitmenCount} siswa)`;
    }

    if (data.pemborosan_perangkat && Array.isArray(data.pemborosan_perangkat.estimasi_kwh_bulan)) {
      const kwhArr = data.pemborosan_perangkat.estimasi_kwh_bulan;
      const jamArr = data.pemborosan_perangkat.jam_per_hari || [3.8, 4.5, 2.1, 7.5, 3.2];
      const acKwh = kwhArr[1] || 270;
      const dispKwh = kwhArr[3] || 180;
      const combinedTop = acKwh + dispKwh;
      const topShare = ((combinedTop / totalKwh) * 100).toFixed(1).replace(".", ",");

      const recStat1 = document.getElementById("recStat1");
      if (recStat1) {
        recStat1.textContent = `${combinedTop} kWh/bulan terbuang (${topShare}% dari total pemborosan sekolah)`;
      }

      const recDetail1 = document.getElementById("recDetail1");
      if (recDetail1) {
        recDetail1.textContent =
          `Data observasi mencatat pendingin udara menyala sia-sia rata-rata ${String(jamArr[1]).replace(".", ",")} jam/hari (${acKwh} kWh/bulan) dan dispenser air ${String(jamArr[3]).replace(".", ",")} jam/hari (${dispKwh} kWh/bulan) tanpa kegiatan belajar.`;
      }

      const mapIds = [
        { id: "simLampu", val: kwhArr[0] || 114 },
        { id: "simAc", val: acKwh },
        { id: "simProyektor", val: kwhArr[2] || 63 },
        { id: "simDispenser", val: dispKwh },
        { id: "simPc", val: kwhArr[4] || 154 }
      ];
      mapIds.forEach(({ id, val }) => {
        const input = document.getElementById(id);
        if (input) input.dataset.kwh = String(val);
      });
    }

    updateSimulatorUI();
  }

  async function loadSurveyData() {
    const statusEl = document.getElementById("aksiDataStatus");
    const loadingEl = document.getElementById("aksiDataLoading");
    const errorEl = document.getElementById("aksiDataError");
    const metricsEl = document.getElementById("aksiMetricsList");

    if (loadingEl) loadingEl.hidden = false;
    if (errorEl) errorEl.hidden = true;
    if (metricsEl) metricsEl.classList.add("is-loading");
    if (statusEl) statusEl.textContent = "Memuat data survei...";

    try {
      const response = await fetch("data/data.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      applySurveyData(json);
      if (statusEl) statusEl.textContent = "Tersinkron dengan data Fase 2";
    } catch (err) {
      applySurveyData(FALLBACK_DATA);
      if (statusEl) statusEl.textContent = "Menggunakan data cadangan lokal";
      if (errorEl) errorEl.hidden = false;
    } finally {
      if (loadingEl) loadingEl.hidden = true;
      if (metricsEl) metricsEl.classList.remove("is-loading");
    }
  }

  /* ── 3. Filter Rekomendasi ── */
  function initRecommendationFilter() {
    const filterButtons = Array.from(document.querySelectorAll(".filter-btn"));
    const cards = Array.from(document.querySelectorAll("#rekomendasiList [data-category]"));
    const emptyState = document.getElementById("rekomendasiEmpty");
    const resetBtn = document.getElementById("resetFilterBtn");
    const pairGrid = document.querySelector(".rec-pair-grid");
    const ledgerStack = document.querySelector(".rec-ledger-stack");

    if (!filterButtons.length || !cards.length) return;

    function applyFilter(category) {
      let visibleCount = 0;

      cards.forEach((card) => {
        const match = category === "semua" || card.dataset.category === category;
        card.hidden = !match;
        if (match) visibleCount += 1;
      });

      if (pairGrid) {
        const hasVisiblePair = Array.from(pairGrid.children).some((el) => !el.hidden);
        pairGrid.hidden = !hasVisiblePair;
      }

      if (ledgerStack) {
        const hasVisibleLedger = Array.from(ledgerStack.children).some((el) => !el.hidden);
        ledgerStack.hidden = !hasVisibleLedger;
      }

      if (emptyState) emptyState.hidden = visibleCount > 0;

      filterButtons.forEach((btn) => {
        const active = btn.dataset.filter === category;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", String(active));
      });
    }

    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => applyFilter(btn.dataset.filter || "semua"));
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => applyFilter("semua"));
    }
  }

  /* ── 4. Interactive Savings Simulator ── */
  function getSimCheckboxes() {
    return Array.from(document.querySelectorAll("#simChecklist input[type='checkbox']"));
  }

  function updateSimulatorUI() {
    const boxes = getSimCheckboxes();
    if (!boxes.length) return;

    let selectedKwh = 0;
    let selectedCount = 0;

    boxes.forEach((box) => {
      const parent = box.closest(".sim-item");
      if (parent) parent.classList.toggle("is-checked", box.checked);
      if (box.checked) {
        selectedCount += 1;
        selectedKwh += Number(box.dataset.kwh) || 0;
      }
    });

    const ratio = activeTotals.totalKwh > 0 ? Math.min(1, selectedKwh / activeTotals.totalKwh) : 0;
    const pct = Math.round(ratio * 100);
    const rupiahSaved = activeTotals.totalRupiah * ratio;
    const co2Saved = Math.round(activeTotals.totalCo2 * ratio);

    const progressLabel = document.getElementById("simProgressLabel");
    const progressPct = document.getElementById("simProgressPct");
    const progressFill = document.getElementById("simProgressFill");
    const kwhVal = document.getElementById("simKwhValue");
    const rupiahVal = document.getElementById("simRupiahValue");
    const co2Val = document.getElementById("simCo2Value");

    if (progressLabel) {
      progressLabel.textContent =
        selectedCount === 0
          ? "Belum ada aksi yang dipilih. Centang satu kebiasaan di atas."
          : `${selectedCount} dari ${boxes.length} aksi dipilih (${pct}% pemborosan ditekan)`;
    }
    if (progressPct) progressPct.textContent = `${pct}%`;
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (kwhVal) kwhVal.textContent = `${formatNumberID(selectedKwh)} kWh`;
    if (rupiahVal) rupiahVal.textContent = formatRupiah(rupiahSaved);
    if (co2Val) co2Val.textContent = `${formatNumberID(co2Saved)} kg`;
  }

  function initSimulator() {
    const boxes = getSimCheckboxes();
    const resetBtn = document.getElementById("resetSimBtn");
    if (!boxes.length) return;

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.sim) || "null");
      if (saved && typeof saved === "object") {
        boxes.forEach((box) => {
          if (box.id in saved) box.checked = Boolean(saved[box.id]);
        });
      }
    } catch (_) {
      // Ignore storage errors in restricted environments
    }

    function persistSim() {
      const state = {};
      boxes.forEach((box) => {
        state[box.id] = box.checked;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.sim, JSON.stringify(state));
      } catch (_) {
        // Ignore storage errors
      }
    }

    boxes.forEach((box) => {
      box.addEventListener("change", () => {
        persistSim();
        updateSimulatorUI();
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        boxes.forEach((box) => {
          box.checked = false;
        });
        persistSim();
        updateSimulatorUI();
      });
    }

    updateSimulatorUI();
  }

  /* ── 5. 7-Day Energy Challenge Tracker ── */
  function initSevenDayChallenge() {
    const boxes = Array.from(document.querySelectorAll("#sevenDayList input[type='checkbox']"));
    const counterEl = document.getElementById("challengeCounter");
    const statusTextEl = document.getElementById("challengeStatusText");
    const resetBtn = document.getElementById("resetChallengeBtn");
    if (!boxes.length) return;

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.days) || "[]");
      if (Array.isArray(saved)) {
        boxes.forEach((box) => {
          box.checked = saved.includes(box.dataset.day);
        });
      }
    } catch (_) {
      // Ignore storage errors
    }

    function updateDaysUI() {
      const completed = [];
      boxes.forEach((box) => {
        const parent = box.closest(".day-item");
        if (parent) parent.classList.toggle("is-done", box.checked);
        if (box.checked) completed.push(box.dataset.day);
      });

      const count = completed.length;
      if (counterEl) counterEl.textContent = `${count} / ${boxes.length} hari`;

      if (statusTextEl) {
        if (count === 0) {
          statusTextEl.textContent =
            "Pilih hari pertama untuk mulai mencatat progres tantanganmu. Progres tersimpan otomatis di perangkat ini.";
        } else if (count < boxes.length) {
          statusTextEl.textContent =
            `Bagus! Kamu sudah menuntaskan ${count} dari ${boxes.length} hari misi hemat energi. Lanjutkan ke hari berikutnya.`;
        } else {
          statusTextEl.textContent =
            "Tantangan 7 hari tuntas. Pertahankan ritme ini bersama teman sekelas agar pemborosan listrik terus turun.";
        }
      }

      if (resetBtn) resetBtn.hidden = count === 0;

      try {
        localStorage.setItem(STORAGE_KEYS.days, JSON.stringify(completed));
      } catch (_) {
        // Ignore storage errors
      }
    }

    boxes.forEach((box) => {
      box.addEventListener("change", updateDaysUI);
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        boxes.forEach((box) => {
          box.checked = false;
        });
        updateDaysUI();
      });
    }

    updateDaysUI();
  }

  /* ── 6. Personal Pledge Form & Local Pledge List ── */
  function initPledgeForm() {
    const form = document.getElementById("pledgeForm");
    const nameInput = document.getElementById("pledgeName");
    const roleSelect = document.getElementById("pledgeRole");
    const actionSelect = document.getElementById("pledgeAction");
    const noteInput = document.getElementById("pledgeNote");

    const nameError = document.getElementById("pledgeNameError");
    const roleError = document.getElementById("pledgeRoleError");
    const actionError = document.getElementById("pledgeActionError");
    const feedbackEl = document.getElementById("pledgeFormFeedback");

    const listEl = document.getElementById("pledgeList");
    const emptyEl = document.getElementById("pledgeEmptyState");
    const clearBtn = document.getElementById("clearPledgesBtn");

    if (!form || !listEl) return;

    function loadPledges() {
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.pledges) || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }

    function savePledges(items) {
      try {
        localStorage.setItem(STORAGE_KEYS.pledges, JSON.stringify(items));
      } catch (_) {
        // Ignore storage errors
      }
    }

    function renderPledges() {
      const items = loadPledges();
      listEl.innerHTML = "";

      if (emptyEl) emptyEl.hidden = items.length > 0;
      if (clearBtn) clearBtn.hidden = items.length === 0;

      items.forEach((item) => {
        const li = document.createElement("li");
        li.className = "pledge-card-item";

        const top = document.createElement("div");
        top.className = "pledge-item-top";

        const identity = document.createElement("div");
        identity.className = "pledge-item-id";

        const nameStrong = document.createElement("strong");
        nameStrong.textContent = item.name;

        const roleSpan = document.createElement("span");
        roleSpan.className = "pledge-role-chip";
        roleSpan.textContent = item.role;

        identity.appendChild(nameStrong);
        identity.appendChild(roleSpan);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "pledge-remove-btn";
        removeBtn.textContent = "Hapus";
        removeBtn.setAttribute("aria-label", `Hapus komitmen milik ${item.name}`);
        removeBtn.addEventListener("click", () => {
          const updated = loadPledges().filter((entry) => entry.id !== item.id);
          savePledges(updated);
          renderPledges();
        });

        top.appendChild(identity);
        top.appendChild(removeBtn);

        const actionP = document.createElement("p");
        actionP.className = "pledge-item-action";
        actionP.textContent = item.action;

        li.appendChild(top);
        li.appendChild(actionP);

        if (item.note) {
          const noteP = document.createElement("p");
          noteP.className = "pledge-item-note";
          noteP.textContent = item.note;
          li.appendChild(noteP);
        }

        const timeEl = document.createElement("span");
        timeEl.className = "pledge-item-time";
        timeEl.textContent = `Dicatat pada ${item.dateLabel}`;
        li.appendChild(timeEl);

        listEl.appendChild(li);
      });
    }

    function setFieldError(input, errorEl, message) {
      if (!input || !errorEl) return;
      if (message) {
        errorEl.textContent = message;
        errorEl.hidden = false;
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", errorEl.id);
      } else {
        errorEl.textContent = "";
        errorEl.hidden = true;
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      }
    }

    [nameInput, roleSelect, actionSelect].forEach((field) => {
      if (!field) return;
      field.addEventListener("input", () => {
        if (field === nameInput) setFieldError(nameInput, nameError, "");
        if (field === roleSelect) setFieldError(roleSelect, roleError, "");
        if (field === actionSelect) setFieldError(actionSelect, actionError, "");
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const nameVal = nameInput.value.trim();
      const roleVal = roleSelect.value.trim();
      const actionVal = actionSelect.value.trim();
      const noteVal = noteInput.value.trim();

      let firstInvalid = null;

      if (nameVal.length < 2) {
        setFieldError(nameInput, nameError, "Masukkan nama atau inisial minimal 2 karakter.");
        firstInvalid = firstInvalid || nameInput;
      } else {
        setFieldError(nameInput, nameError, "");
      }

      if (!roleVal) {
        setFieldError(roleSelect, roleError, "Pilih peranmu di sekolah terlebih dahulu.");
        firstInvalid = firstInvalid || roleSelect;
      } else {
        setFieldError(roleSelect, roleError, "");
      }

      if (!actionVal) {
        setFieldError(actionSelect, actionError, "Pilih satu aksi utama yang akan kamu lakukan.");
        firstInvalid = firstInvalid || actionSelect;
      } else {
        setFieldError(actionSelect, actionError, "");
      }

      if (firstInvalid) {
        if (feedbackEl) {
          feedbackEl.textContent = "Periksa kembali kolom yang masih kosong sebelum menyimpan komitmen.";
          feedbackEl.className = "form-feedback is-error";
          feedbackEl.hidden = false;
        }
        firstInvalid.focus();
        return;
      }

      const now = new Date();
      const dateLabel = now.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });

      const nextEntry = {
        id: String(Date.now()),
        name: nameVal,
        role: roleVal,
        action: actionVal,
        note: noteVal,
        dateLabel
      };

      const existing = loadPledges();
      existing.unshift(nextEntry);
      savePledges(existing.slice(0, 12));
      renderPledges();

      form.reset();

      if (feedbackEl) {
        feedbackEl.textContent = `Komitmen atas nama ${nameVal} berhasil dicatat.`;
        feedbackEl.className = "form-feedback is-success";
        feedbackEl.hidden = false;
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        savePledges([]);
        renderPledges();
        if (feedbackEl) {
          feedbackEl.textContent = "Semua catatan komitmen lokal telah dihapus.";
          feedbackEl.className = "form-feedback is-info";
          feedbackEl.hidden = false;
        }
      });
    }

    renderPledges();
  }

  /* ── Boot ── */
  function boot() {
    initMobileNav();
    initRecommendationFilter();
    initSimulator();
    initSevenDayChallenge();
    initPledgeForm();
    loadSurveyData();

    const retryBtn = document.getElementById("retryDataBtn");
    if (retryBtn) {
      retryBtn.addEventListener("click", loadSurveyData);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
