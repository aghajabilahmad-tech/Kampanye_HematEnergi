/**
 * aksi.js - Visual-First Interactive Logic untuk Fase 3 (Aksi & Rekomendasi)
 * Mengendalikan ilustrasi ruang kelas interaktif (5 perangkat dari data.json),
 * filter rekomendasi ringkas, stempel tantangan 7 hari dengan progress ring SVG,
 * dan pembuat kartu ikrar digital dengan pratinjau live.
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
    pemborosan_perangkat: {
      labels: ["Lampu Ruang Kelas", "Kipas Angin / AC", "Proyektor LCD", "Dispenser Air", "PC Lab Komputer"],
      jam_per_hari: [3.8, 4.5, 2.1, 7.5, 3.2],
      estimasi_kwh_bulan: [114, 270, 63, 180, 154]
    }
  };

  const STORAGE_KEYS = {
    devices: "hematEnergi_classroom_v2",
    days: "hematEnergi_7day_v2",
    pledges: "hematEnergi_pledges_v2"
  };

  const DEVICE_NAMES = {
    ac: "AC atau Kipas Angin",
    dispenser: "Dispenser Air",
    pc: "PC Lab Komputer",
    lampu: "Lampu Ruang Kelas",
    proyektor: "Proyektor LCD"
  };

  // true = turned OFF (energy saved), false = ON (wasting energy)
  const deviceOffState = {
    ac: false,
    dispenser: false,
    pc: false,
    lampu: false,
    proyektor: false
  };

  let deviceKwh = {
    lampu: 114,
    ac: 270,
    proyektor: 63,
    dispenser: 180,
    pc: 154
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

  function formatNum(num) {
    return Number(num).toLocaleString("id-ID");
  }

  /* ── 1. Mobile Navigation (Keyboard + Escape) ── */
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

  /* ── 2. Interactive Classroom Visual & Live Savings HUD ── */
  function persistDevices() {
    try {
      localStorage.setItem(STORAGE_KEYS.devices, JSON.stringify(deviceOffState));
    } catch (_) {
      // Ignore storage error
    }
  }

  function renderClassroomUI() {
    const keys = Object.keys(deviceOffState);
    let savedKwh = 0;
    let offCount = 0;

    keys.forEach((key) => {
      const isOff = Boolean(deviceOffState[key]);
      if (isOff) {
        savedKwh += deviceKwh[key] || 0;
        offCount += 1;
      }

      const svgEl = document.querySelector(`.svg-device[data-device="${key}"]`);
      if (svgEl) {
        svgEl.classList.toggle("is-on", !isOff);
        svgEl.classList.toggle("is-off", isOff);
        svgEl.setAttribute(
          "aria-label",
          `${DEVICE_NAMES[key]}, ${isOff ? "sudah dimatikan. Klik untuk menyalakan kembali." : "sedang menyala. Klik untuk mematikan."}`
        );
      }

      const effectEl = document.querySelector(`.svg-device-effect[data-effect="${key}"]`);
      if (effectEl) {
        effectEl.classList.toggle("is-hidden", isOff);
      }

      const btn = document.querySelector(`.v3-dev-btn[data-device="${key}"]`);
      if (btn) {
        btn.classList.toggle("is-on", !isOff);
        btn.classList.toggle("is-off", isOff);
        btn.setAttribute("aria-pressed", String(isOff));
        const kwhSpan = btn.querySelector(".v3-dev-kwh");
        if (kwhSpan) {
          kwhSpan.textContent = isOff ? "Mati" : `${deviceKwh[key]} kWh`;
        }
      }
    });

    const ratio = activeTotals.totalKwh > 0 ? Math.min(1, savedKwh / activeTotals.totalKwh) : 0;
    const pct = Math.round(ratio * 100);
    const savedRupiah = activeTotals.totalRupiah * ratio;
    const savedCo2 = Math.round(activeTotals.totalCo2 * ratio);
    const onCount = keys.length - offCount;

    const hudKwh = document.getElementById("hudKwh");
    const hudKwhSub = document.getElementById("hudKwhSub");
    const hudPct = document.getElementById("hudPct");
    const hudMeterFill = document.getElementById("hudMeterFill");
    const hudRupiah = document.getElementById("hudRupiah");
    const hudCo2 = document.getElementById("hudCo2");
    const stageLabel = document.getElementById("stageStateLabel");
    const stageCard = document.getElementById("classroomStage");

    if (hudKwh) hudKwh.textContent = `${formatNum(savedKwh)} kWh`;
    if (hudKwhSub) hudKwhSub.textContent = `dari ${formatNum(activeTotals.totalKwh)} kWh/bulan terbuang`;
    if (hudPct) hudPct.textContent = `${pct}%`;
    if (hudMeterFill) hudMeterFill.style.width = `${pct}%`;
    if (hudRupiah) hudRupiah.textContent = formatRupiah(savedRupiah);
    if (hudCo2) hudCo2.textContent = `${formatNum(savedCo2)} kg CO2`;

    if (stageLabel) {
      stageLabel.textContent =
        onCount === 0
          ? "Kelas hemat energi aktif (0 perangkat boros)"
          : `${onCount} perangkat menyala sia-sia`;
    }

    if (stageCard) {
      stageCard.dataset.savedState = onCount === 0 ? "saved" : "wasting";
    }
  }

  function toggleDevice(key) {
    if (!(key in deviceOffState)) return;
    deviceOffState[key] = !deviceOffState[key];
    persistDevices();
    renderClassroomUI();
  }

  function initClassroomStage() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.devices) || "null");
      if (saved && typeof saved === "object") {
        Object.keys(deviceOffState).forEach((k) => {
          if (k in saved) deviceOffState[k] = Boolean(saved[k]);
        });
      }
    } catch (_) {
      // Ignore storage error
    }

    document.querySelectorAll(".svg-device[data-device]").forEach((el) => {
      const key = el.dataset.device;
      el.addEventListener("click", () => toggleDevice(key));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleDevice(key);
        }
      });
    });

    document.querySelectorAll(".v3-dev-btn[data-device]").forEach((btn) => {
      btn.addEventListener("click", () => toggleDevice(btn.dataset.device));
    });

    const turnOffAllBtn = document.getElementById("turnOffAllBtn");
    const turnOnAllBtn = document.getElementById("turnOnAllBtn");

    if (turnOffAllBtn) {
      turnOffAllBtn.addEventListener("click", () => {
        Object.keys(deviceOffState).forEach((k) => {
          deviceOffState[k] = true;
        });
        persistDevices();
        renderClassroomUI();
      });
    }

    if (turnOnAllBtn) {
      turnOnAllBtn.addEventListener("click", () => {
        Object.keys(deviceOffState).forEach((k) => {
          deviceOffState[k] = false;
        });
        persistDevices();
        renderClassroomUI();
      });
    }

    document.querySelectorAll("[data-demo-devices]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targets = String(btn.dataset.demoDevices || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        targets.forEach((key) => {
          if (key in deviceOffState) deviceOffState[key] = true;
        });
        persistDevices();
        renderClassroomUI();
        const stage = document.getElementById("classroomStage");
        if (stage) stage.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    renderClassroomUI();
  }

  /* ── 3. Load Empirical Survey Data from data/data.json ── */
  function applySurveyData(data) {
    const ringkasan = data.ringkasan_angka || FALLBACK_DATA.ringkasan_angka;
    const totalKwh = Number(ringkasan.rata_rata_pemborosan_kwh) || 781;
    const totalRupiah = parseRupiahNumber(ringkasan.potensi_penghematan_rupiah);
    const totalCo2 = Number(ringkasan.emisi_karbon_tercegah_kg) || 625;

    activeTotals = { totalKwh, totalRupiah, totalCo2 };

    if (data.pemborosan_perangkat && Array.isArray(data.pemborosan_perangkat.estimasi_kwh_bulan)) {
      const arr = data.pemborosan_perangkat.estimasi_kwh_bulan;
      deviceKwh = {
        lampu: arr[0] || 114,
        ac: arr[1] || 270,
        proyektor: arr[2] || 63,
        dispenser: arr[3] || 180,
        pc: arr[4] || 154
      };
      const topSum = deviceKwh.ac + deviceKwh.dispenser;
      const tileMetric1 = document.getElementById("tileMetric1");
      if (tileMetric1) {
        tileMetric1.innerHTML = `${formatNum(topSum)} kWh<small>/bln</small>`;
      }
    }

    renderClassroomUI();
  }

  async function loadSurveyData() {
    const statusEl = document.getElementById("aksiDataStatus");
    const loadingEl = document.getElementById("aksiDataLoading");
    const errorEl = document.getElementById("aksiDataError");
    const retryBtn = document.getElementById("retryDataBtn");

    if (loadingEl) loadingEl.hidden = false;
    if (errorEl) errorEl.hidden = true;
    if (retryBtn) retryBtn.hidden = true;
    if (statusEl) statusEl.textContent = "Memuat data Fase 2...";

    try {
      const response = await fetch("data/data.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      applySurveyData(json);
      if (statusEl) statusEl.textContent = "Data sinkron • 120 responden Fase 2";
    } catch (_) {
      applySurveyData(FALLBACK_DATA);
      if (statusEl) statusEl.textContent = "Mode cadangan lokal";
      if (errorEl) errorEl.hidden = false;
      if (retryBtn) retryBtn.hidden = false;
    } finally {
      if (loadingEl) loadingEl.hidden = true;
    }
  }

  /* ── 4. Recommendation Filter ── */
  function initRecommendationFilter() {
    const filterButtons = Array.from(document.querySelectorAll(".filter-btn"));
    const cards = Array.from(document.querySelectorAll("#rekomendasiList [data-category]"));
    const emptyState = document.getElementById("rekomendasiEmpty");
    const resetBtn = document.getElementById("resetFilterBtn");

    if (!filterButtons.length || !cards.length) return;

    function applyFilter(category) {
      let visibleCount = 0;
      cards.forEach((card) => {
        const match = category === "semua" || card.dataset.category === category;
        card.hidden = !match;
        if (match) visibleCount += 1;
      });

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

  /* ── 5. 7-Day Visual Streak Board + SVG Ring ── */
  function initSevenDayChallenge() {
    const boxes = Array.from(document.querySelectorAll("#sevenDayList input[type='checkbox']"));
    const counterEl = document.getElementById("challengeCounter");
    const statusTextEl = document.getElementById("challengeStatusText");
    const resetBtn = document.getElementById("resetChallengeBtn");
    const ringFg = document.getElementById("challengeRingFg");
    if (!boxes.length) return;

    const CIRCUMFERENCE = 2 * Math.PI * 56;
    if (ringFg) {
      ringFg.style.strokeDasharray = String(CIRCUMFERENCE);
      ringFg.style.strokeDashoffset = String(CIRCUMFERENCE);
    }

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.days) || "[]");
      if (Array.isArray(saved)) {
        boxes.forEach((box) => {
          box.checked = saved.includes(box.dataset.day);
        });
      }
    } catch (_) {
      // Ignore storage error
    }

    function updateDaysUI() {
      const completed = [];
      boxes.forEach((box) => {
        const parent = box.closest(".v3-stamp");
        if (parent) parent.classList.toggle("is-done", box.checked);
        if (box.checked) completed.push(box.dataset.day);
      });

      const count = completed.length;
      const total = boxes.length;
      if (counterEl) counterEl.textContent = `${count}/${total}`;

      if (ringFg) {
        const offset = CIRCUMFERENCE * (1 - count / total);
        ringFg.style.strokeDashoffset = String(offset);
      }

      if (statusTextEl) {
        if (count === 0) {
          statusTextEl.textContent = "Ketuk kartu misi harian di samping setiap kali kamu menuntaskannya.";
        } else if (count < total) {
          statusTextEl.textContent = `${count} dari ${total} stempel terisi. Lanjutkan besok!`;
        } else {
          statusTextEl.textContent = "7/7 Tuntas! Kamu sudah jadi penggerak hemat energi di kelas.";
        }
      }

      if (resetBtn) resetBtn.hidden = count === 0;

      try {
        localStorage.setItem(STORAGE_KEYS.days, JSON.stringify(completed));
      } catch (_) {
        // Ignore storage error
      }
    }

    boxes.forEach((box) => box.addEventListener("change", updateDaysUI));

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

  /* ── 6. Live Visual Eco-Pledge Pass Builder ── */
  function initPledgeBuilder() {
    const form = document.getElementById("pledgeForm");
    const nameInput = document.getElementById("pledgeName");
    const roleSelect = document.getElementById("pledgeRole");
    const actionSelect = document.getElementById("pledgeAction");

    const nameError = document.getElementById("pledgeNameError");
    const roleError = document.getElementById("pledgeRoleError");
    const actionError = document.getElementById("pledgeActionError");
    const feedbackEl = document.getElementById("pledgeFormFeedback");

    const previewName = document.getElementById("previewName");
    const previewRole = document.getElementById("previewRole");
    const previewAction = document.getElementById("previewAction");

    const listEl = document.getElementById("pledgeList");
    const emptyEl = document.getElementById("pledgeEmptyState");
    const countEl = document.getElementById("pledgeCount");
    const clearBtn = document.getElementById("clearPledgesBtn");

    if (!form || !listEl) return;

    function updatePreview() {
      if (previewName) previewName.textContent = nameInput.value.trim() || "Namamu di sini";
      if (previewRole) previewRole.textContent = roleSelect.value.trim() || "Warga Sekolah";
      if (previewAction) {
        previewAction.textContent =
          actionSelect.value.trim() || "Pilih satu aksi untuk mulai mengurangi pemborosan listrik sekolah.";
      }
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
      const evt = field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(evt, () => {
        if (field === nameInput) setFieldError(nameInput, nameError, "");
        if (field === roleSelect) setFieldError(roleSelect, roleError, "");
        if (field === actionSelect) setFieldError(actionSelect, actionError, "");
        updatePreview();
      });
    });

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
        // Ignore storage error
      }
    }

    function renderPledges() {
      const items = loadPledges();
      listEl.innerHTML = "";
      if (countEl) countEl.textContent = String(items.length);
      if (emptyEl) emptyEl.hidden = items.length > 0;
      if (clearBtn) clearBtn.hidden = items.length === 0;

      items.forEach((item) => {
        const li = document.createElement("li");
        li.className = "pledge-card-item";

        const top = document.createElement("div");
        top.className = "pledge-item-top";

        const idWrap = document.createElement("div");
        idWrap.className = "pledge-item-id";

        const nameStrong = document.createElement("strong");
        nameStrong.textContent = item.name;

        const roleChip = document.createElement("span");
        roleChip.className = "pledge-role-chip";
        roleChip.textContent = item.role;

        idWrap.appendChild(nameStrong);
        idWrap.appendChild(roleChip);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "pledge-remove-btn";
        removeBtn.textContent = "Hapus";
        removeBtn.setAttribute("aria-label", `Hapus ikrar ${item.name}`);
        removeBtn.addEventListener("click", () => {
          savePledges(loadPledges().filter((entry) => entry.id !== item.id));
          renderPledges();
        });

        top.appendChild(idWrap);
        top.appendChild(removeBtn);

        const actionP = document.createElement("p");
        actionP.className = "pledge-item-action";
        actionP.textContent = item.action;

        const timeEl = document.createElement("span");
        timeEl.className = "pledge-item-time";
        timeEl.textContent = item.dateLabel;

        li.appendChild(top);
        li.appendChild(actionP);
        li.appendChild(timeEl);
        listEl.appendChild(li);
      });
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nameVal = nameInput.value.trim();
      const roleVal = roleSelect.value.trim();
      const actionVal = actionSelect.value.trim();

      let firstInvalid = null;

      if (nameVal.length < 2) {
        setFieldError(nameInput, nameError, "Masukkan nama atau inisial minimal 2 huruf.");
        firstInvalid = firstInvalid || nameInput;
      } else {
        setFieldError(nameInput, nameError, "");
      }

      if (!roleVal) {
        setFieldError(roleSelect, roleError, "Pilih peranmu terlebih dahulu.");
        firstInvalid = firstInvalid || roleSelect;
      } else {
        setFieldError(roleSelect, roleError, "");
      }

      if (!actionVal) {
        setFieldError(actionSelect, actionError, "Pilih satu aksi utama.");
        firstInvalid = firstInvalid || actionSelect;
      } else {
        setFieldError(actionSelect, actionError, "");
      }

      if (firstInvalid) {
        if (feedbackEl) {
          feedbackEl.textContent = "Lengkapi kolom yang ditandai sebelum menyimpan.";
          feedbackEl.className = "form-feedback is-error";
          feedbackEl.hidden = false;
        }
        firstInvalid.focus();
        return;
      }

      const dateLabel = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });

      const items = loadPledges();
      items.unshift({
        id: String(Date.now()),
        name: nameVal,
        role: roleVal,
        action: actionVal,
        dateLabel
      });
      savePledges(items.slice(0, 10));
      renderPledges();
      form.reset();
      updatePreview();

      if (feedbackEl) {
        feedbackEl.textContent = `Kartu ikrar ${nameVal} berhasil disimpan.`;
        feedbackEl.className = "form-feedback is-success";
        feedbackEl.hidden = false;
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        savePledges([]);
        renderPledges();
        if (feedbackEl) {
          feedbackEl.textContent = "Semua kartu ikrar dihapus.";
          feedbackEl.className = "form-feedback is-info";
          feedbackEl.hidden = false;
        }
      });
    }

    updatePreview();
    renderPledges();
  }

  function boot() {
    initMobileNav();
    initClassroomStage();
    initRecommendationFilter();
    initSevenDayChallenge();
    initPledgeBuilder();
    loadSurveyData();

    const retryBtn = document.getElementById("retryDataBtn");
    if (retryBtn) retryBtn.addEventListener("click", loadSurveyData);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
