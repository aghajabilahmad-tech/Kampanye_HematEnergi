/**
 * tentang.js - Animasi Kinetik & Interaksi Halaman Tentang Kami
 * Menangani kanvas partikel daun/energi interaktif, kontrol jeda animasi (R-39),
 * wipe-reveal hero, counter angka, tilt + spotlight kartu tim (Hannan, Agha, Rafli),
 * dan navigasi mobile.
 */

(() => {
  "use strict";

  const TEAM_DETAILS = {
    hannan: {
      title: "Hannan • Ketua & Full Stack",
      phases: [
        { label: "Fase 1", text: "Menentukan konsep kampanye & struktur folder proyek" },
        { label: "Fase 2", text: "Menyambungkan olah data lintas mapel ke halaman grafik" },
        { label: "Fase 3", text: "Integrasi akhir alur Beranda ke Data hingga Aksi" }
      ]
    },
    agha: {
      title: "Agha • Front End",
      phases: [
        { label: "Fase 1", text: "Membangun tampilan beranda, tipografi, dan tata letak responsif" },
        { label: "Fase 2", text: "Menata visualisasi dashboard grafik agar nyaman dibaca" },
        { label: "Fase 3", text: "Merancang ilustrasi kelas interaktif, animasi, dan UX modern" }
      ]
    },
    rafli: {
      title: "Rafli • Back End",
      phases: [
        { label: "Fase 1", text: "Menyiapkan arsitektur aset & pemisahan logika halaman" },
        { label: "Fase 2", text: "Menyusun skema data survei JSON (120 responden & 5 perangkat)" },
        { label: "Fase 3", text: "Logika kalkulasi kWh/CO2 dan penyimpanan lokal tantangan & ikrar" }
      ]
    }
  };

  let motionPaused = false;

  /* ── 1. Mobile Nav with Keyboard & Escape Support ── */
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

  /* ── 2. Global Kinetic Motion Pause Control (R-39) ── */
  function initMotionToggle() {
    const btn = document.getElementById("motionToggleBtn");
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      motionPaused = true;
      document.body.classList.add("motion-paused");
    }

    if (!btn) return;

    function syncBtn() {
      btn.setAttribute("aria-pressed", String(motionPaused));
      btn.textContent = motionPaused ? "Putar Animasi" : "Jeda Animasi";
      document.body.classList.toggle("motion-paused", motionPaused);
    }

    btn.addEventListener("click", () => {
      motionPaused = !motionPaused;
      syncBtn();
    });

    syncBtn();
  }

  /* ── 3. Interactive Floating Leaves & Sunlight Energy Canvas ── */
  function initHeroParticles() {
    const canvas = document.getElementById("aboutParticlesCanvas");
    const hero = document.getElementById("aboutHero");
    if (!canvas || !hero) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let pointerX = -999;
    let pointerY = -999;

    const COLORS = ["#2f5a24", "#468337", "#5ca34e", "#8dd17a", "#e6a117"];
    const particles = [];
    const COUNT = 26;

    function resize() {
      const rect = hero.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, W * dpr);
      canvas.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(randomY) {
      return {
        x: Math.random() * (W || 1200),
        y: randomY ? Math.random() * (H || 600) : -20,
        vx: (Math.random() - 0.5) * 0.45,
        vy: 0.28 + Math.random() * 0.45,
        size: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.025,
        kind: Math.random() > 0.35 ? "leaf" : "spark",
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 0.25 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2
      };
    }

    resize();
    for (let i = 0; i < COUNT; i++) {
      particles.push(spawn(true));
    }

    hero.addEventListener("mousemove", (e) => {
      const rect = hero.getBoundingClientRect();
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
    });

    hero.addEventListener("mouseleave", () => {
      pointerX = -999;
      pointerY = -999;
    });

    window.addEventListener("resize", resize);

    let tick = 0;
    function frame() {
      requestAnimationFrame(frame);
      if (motionPaused || !W || !H) return;

      tick += 0.018;
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx + Math.sin(tick + p.phase) * 0.32;
        p.y += p.vy;
        p.rot += p.vRot;

        const dx = p.x - pointerX;
        const dy = p.y - pointerY;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < 110) {
          const push = (110 - dist) / 110;
          p.x += (dx / dist) * push * 2.4;
          p.y += (dy / dist) * push * 2.4;
        }

        if (p.y > H + 24 || p.x < -30 || p.x > W + 30) {
          particles[i] = spawn(false);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.kind === "leaf") {
          const s = p.size;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.quadraticCurveTo(s * 0.75, 0, 0, s);
          ctx.quadraticCurveTo(-s * 0.75, 0, 0, -s);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    requestAnimationFrame(frame);
  }

  /* ── 4. Hero Wipe Reveal, Scroll Stagger & Count-Up ── */
  function initRevealAndCounters() {
    const hero = document.getElementById("aboutHero");
    const revealEls = Array.from(document.querySelectorAll(".about-reveal"));
    const countEls = Array.from(document.querySelectorAll(".count-up"));
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (hero) {
      requestAnimationFrame(() => {
        hero.classList.add("is-revealed");
      });
    }

    function animateCount(el) {
      const target = Number(el.dataset.target) || 0;
      if (prefersReduced || motionPaused || target <= 0) {
        el.textContent = String(target);
        return;
      }
      const start = performance.now();
      const duration = 900;
      function step(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.max(1, Math.round(target * eased)));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (prefersReduced || !("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" }
    );

    revealEls.forEach((el) => observer.observe(el));

    if (countEls.length) {
      const countObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              countObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      countEls.forEach((el) => countObserver.observe(el));
    }
  }

  /* ── 5. Team Member Interactive Selector, 3D Tilt & Cursor Spotlight ── */
  function initTeamInteraction() {
    const cards = Array.from(document.querySelectorAll(".team-card[data-member]"));
    const spotlightTitle = document.getElementById("spotlightTitle");
    const spotlightSteps = document.getElementById("spotlightSteps");
    const spotlightBox = document.getElementById("teamSpotlight");
    if (!cards.length) return;

    function selectMember(key) {
      const info = TEAM_DETAILS[key];
      if (!info) return;

      cards.forEach((card) => {
        const active = card.dataset.member === key;
        card.classList.toggle("is-selected", active);
        card.setAttribute("aria-pressed", String(active));
      });

      if (spotlightTitle) spotlightTitle.textContent = info.title;
      if (spotlightSteps) {
        spotlightSteps.innerHTML = "";
        info.phases.forEach((step) => {
          const chip = document.createElement("div");
          chip.className = "spotlight-chip";

          const span = document.createElement("span");
          span.textContent = step.label;

          const p = document.createElement("p");
          p.textContent = step.text;

          chip.appendChild(span);
          chip.appendChild(p);
          spotlightSteps.appendChild(chip);
        });
      }

      if (spotlightBox && !motionPaused) {
        spotlightBox.classList.remove("is-pulsed");
        void spotlightBox.offsetWidth;
        spotlightBox.classList.add("is-pulsed");
      }
    }

    const canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    cards.forEach((card) => {
      card.addEventListener("click", () => selectMember(card.dataset.member));

      if (canHover) {
        card.addEventListener("mousemove", (e) => {
          const rect = card.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * 100;
          const py = ((e.clientY - rect.top) / rect.height) * 100;
          card.style.setProperty("--mx", `${px.toFixed(1)}%`);
          card.style.setProperty("--my", `${py.toFixed(1)}%`);

          if (!motionPaused) {
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = `perspective(850px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg) translateY(-6px)`;
          }
        });

        card.addEventListener("mouseleave", () => {
          card.style.transform = "";
        });
      }
    });
  }

  function boot() {
    initMobileNav();
    initMotionToggle();
    initHeroParticles();
    initRevealAndCounters();
    initTeamInteraction();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
