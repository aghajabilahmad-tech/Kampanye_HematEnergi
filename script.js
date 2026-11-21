(() => {
      "use strict";

      /* ═══════════════════════════════════════════════════════
         DOM refs
         ═══════════════════════════════════════════════════════ */
      const hero = document.getElementById("hero");
      const container = document.getElementById("treeContainer");
      const canvas = document.getElementById("inkCanvas");
      const ctx = canvas.getContext("2d");
      const deadImg = document.getElementById("deadTreeImg");
      const livingImg = document.getElementById("livingTreeImg");
      const cursorHint = document.getElementById("cursorHint");
      const leavesCanvas = document.getElementById("leavesCanvas");
      const lCtx = leavesCanvas.getContext("2d");
      const campaignSection = document.getElementById("campaignSection");
      const scrollIndicator = document.getElementById("scrollIndicator");

      /* ═══════════════════════════════════════════════════════
         State
         ═══════════════════════════════════════════════════════ */
      let W = 0, H = 0;              // ink canvas dims
      let VW = 0, VH = 0;            // viewport dims (leaves canvas)
      let mouseX = 0.5, mouseY = 0.4;
      let curX = 0.5, curY = 0.4;
      let velX = 0, velY = 0;
      let entered = false;
      let time = 0;
      let dpr = Math.min(window.devicePixelRatio || 1, 2);

      /* ═══════════════════════════════════════════════════════
         1. WIND SWAY – gentle organic breathing on tree layers
         ═══════════════════════════════════════════════════════ */
      function applyWindSway(t) {
        const sway1 = Math.sin(t * 0.7) * 0.35;
        const sway2 = Math.sin(t * 1.3 + 1.0) * 0.20;
        const sway3 = Math.sin(t * 0.4 + 2.5) * 0.10;
        const rot = sway1 + sway2 + sway3;              // ±0.6 deg approx

        const breathe1 = Math.sin(t * 0.5) * 0.003;
        const breathe2 = Math.sin(t * 0.9 + 0.7) * 0.002;
        const sc = 1 + breathe1 + breathe2;              // ~1.0 ± 0.005

        const tx = Math.sin(t * 0.6 + 1.2) * 1.5;

        const transform = `rotate(${rot}deg) scale(${sc}) translateX(${tx}px)`;
        livingImg.style.transform = transform;
        container.style.transform = `rotate(${rot}deg) scale(${sc}) translateX(${tx}px)`;
      }

      /* ═══════════════════════════════════════════════════════
         2. FALLING LEAVES particle system
         ═══════════════════════════════════════════════════════ */
      const leaves = [];
      const MAX_LEAVES = 35;
      const LEAF_COLORS = [
        "#4a8c3f", "#5ca34e", "#3d7a32", "#6db85e",
        "#7ec869", "#3e6b2e", "#8dd17a", "#2f5a24"
      ];

      function spawnLeaf() {
        if (leaves.length >= MAX_LEAVES) return;
        const x = VW * (0.25 + Math.random() * 0.50);
        const y = VH * (0.05 + Math.random() * 0.20);
        leaves.push({
          x, y,
          vx: (Math.random() - 0.5) * 0.6,
          vy: 0.4 + Math.random() * 0.8,
          size: 4 + Math.random() * 7,
          rot: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 3,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleAmp: 0.3 + Math.random() * 0.7,
          wobbleFreq: 1.5 + Math.random() * 2,
          color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
          opacity: 0.5 + Math.random() * 0.4,
          shape: Math.floor(Math.random() * 3)
        });
      }

      function drawLeaf(l) {
        lCtx.save();
        lCtx.translate(l.x, l.y);
        lCtx.rotate(l.rot * Math.PI / 180);
        lCtx.globalAlpha = l.opacity;
        lCtx.fillStyle = l.color;

        const s = l.size;
        lCtx.beginPath();
        if (l.shape === 0) {
          lCtx.moveTo(0, -s);
          lCtx.bezierCurveTo(s * 0.6, -s * 0.5, s * 0.5, s * 0.4, 0, s * 0.8);
          lCtx.bezierCurveTo(-s * 0.5, s * 0.4, -s * 0.6, -s * 0.5, 0, -s);
        } else if (l.shape === 1) {
          lCtx.moveTo(0, -s);
          lCtx.quadraticCurveTo(s * 0.8, -s * 0.2, s * 0.3, s * 0.5);
          lCtx.quadraticCurveTo(0, s * 0.9, -s * 0.3, s * 0.5);
          lCtx.quadraticCurveTo(-s * 0.8, -s * 0.2, 0, -s);
        } else {
          lCtx.ellipse(0, 0, s * 0.35, s * 0.7, 0, 0, Math.PI * 2);
        }
        lCtx.closePath();
        lCtx.fill();

        lCtx.strokeStyle = "rgba(30,60,20,0.25)";
        lCtx.lineWidth = 0.5;
        lCtx.beginPath();
        lCtx.moveTo(0, -s * 0.8);
        lCtx.lineTo(0, s * 0.6);
        lCtx.stroke();

        lCtx.restore();
      }

      function updateLeaves(dt) {
        for (let i = leaves.length - 1; i >= 0; i--) {
          const l = leaves[i];
          const wobble = Math.sin(time * l.wobbleFreq + l.wobblePhase) * l.wobbleAmp;
          l.x += (l.vx + wobble) * 60 * dt;
          l.y += l.vy * 60 * dt;
          l.rot += l.rotSpeed * 60 * dt;

          const windPush = Math.sin(time * 0.7) * 0.15;
          l.x += windPush * 60 * dt;

          if (l.y > VH * 0.85) {
            l.opacity -= 0.8 * dt;
          }

          if (l.y > VH + 20 || l.x < -30 || l.x > VW + 30 || l.opacity <= 0) {
            leaves.splice(i, 1);
          }
        }
      }

      /* ═══════════════════════════════════════════════════════
         Ink droplet trail
         ═══════════════════════════════════════════════════════ */
      const drops = [];
      const MAX_DROPS = 80;

      /* ═══════════════════════════════════════════════════════
         Resize handler
         ═══════════════════════════════════════════════════════ */
      function resize() {
        const rect = container.getBoundingClientRect();
        W = rect.width;
        H = rect.height;
        dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Leaves canvas restricted to hero bounds
        VW = hero.clientWidth || window.innerWidth;
        VH = hero.clientHeight || window.innerHeight;
        leavesCanvas.width = VW * dpr;
        leavesCanvas.height = VH * dpr;
        leavesCanvas.style.width = VW + "px";
        leavesCanvas.style.height = VH + "px";
        lCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      window.addEventListener("resize", resize);

      /* ═══════════════════════════════════════════════════════
         Mouse / touch tracking
         ═══════════════════════════════════════════════════════ */
      hero.addEventListener("mousemove", e => {
        const rect = container.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) / rect.width;
        mouseY = (e.clientY - rect.top) / rect.height;
        if (!entered) {
          entered = true;
          curX = mouseX;
          curY = mouseY;
          cursorHint.classList.add("hidden");
        }
      });

      hero.addEventListener("touchmove", e => {
        e.preventDefault();
        const t = e.touches[0];
        const rect = container.getBoundingClientRect();
        mouseX = (t.clientX - rect.left) / rect.width;
        mouseY = (t.clientY - rect.top) / rect.height;
        if (!entered) {
          entered = true;
          curX = mouseX;
          curY = mouseY;
          cursorHint.classList.add("hidden");
        }
      }, { passive: false });

      /* ═══════════════════════════════════════════════════════
         Noise helpers
         ═══════════════════════════════════════════════════════ */
      function hash(n) {
        let s = Math.sin(n) * 43758.5453123;
        return s - Math.floor(s);
      }

      function noise1D(x) {
        const i = Math.floor(x);
        const f = x - i;
        const u = f * f * (3 - 2 * f);
        return hash(i) * (1 - u) + hash(i + 1) * u;
      }

      /* ═══════════════════════════════════════════════════════
         Ink blob drawing
         ═══════════════════════════════════════════════════════ */
      function drawInkBlob(cx, cy, baseR, seed, breathPhase, detail) {
        const steps = detail || 64;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const n1 = noise1D(seed + angle * 3.0 + time * 0.4) * 0.45;
          const n2 = noise1D(seed * 7.3 + angle * 7.0 + time * 0.7) * 0.22;
          const n3 = noise1D(seed * 13.1 + angle * 13.0 + time * 1.1) * 0.10;
          const breath = Math.sin(breathPhase + time * 1.2) * 0.08;
          const r = baseR * (1 + n1 + n2 + n3 + breath);
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      }

      function drawSatellites(cx, cy, baseR, seed, count) {
        for (let i = 0; i < count; i++) {
          const angle = hash(seed + i * 31.7) * Math.PI * 2;
          const dist = baseR * (1.1 + hash(seed + i * 17.3) * 0.9);
          const r = 1.5 + hash(seed + i * 53.1) * 4;
          const pulse = 1 + Math.sin(time * 1.5 + i) * 0.3;
          const sx = cx + Math.cos(angle + time * 0.15) * dist;
          const sy = cy + Math.sin(angle + time * 0.15) * dist;
          ctx.beginPath();
          const microSteps = 12;
          for (let j = 0; j <= microSteps; j++) {
            const a2 = (j / microSteps) * Math.PI * 2;
            const nr = r * pulse * (1 + noise1D(seed + i * 10 + a2 * 2 + time * 0.8) * 0.5);
            const mx = sx + Math.cos(a2) * nr;
            const my = sy + Math.sin(a2) * nr;
            if (j === 0) ctx.moveTo(mx, my);
            else ctx.lineTo(mx, my);
          }
          ctx.closePath();
          ctx.fill();
        }
      }

      function drawTrailDrops() {
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          d.life -= 0.008;
          if (d.life <= 0) { drops.splice(i, 1); continue; }
          const r = d.r * (0.5 + 0.5 * d.life);
          ctx.globalAlpha = d.life;
          ctx.beginPath();
          const steps = 10;
          for (let j = 0; j <= steps; j++) {
            const a = (j / steps) * Math.PI * 2;
            const nr = r * (1 + noise1D(d.seed + a * 3 + time * 0.5) * 0.4);
            const px = d.x + Math.cos(a) * nr;
            const py = d.y + Math.sin(a) * nr;
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      let lastDropX = 0, lastDropY = 0;
      function maybeSpawnDrop(px, py, speed) {
        const dx = px - lastDropX, dy = py - lastDropY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 8 && speed > 0.002 && drops.length < MAX_DROPS) {
          const count = Math.min(3, Math.floor(speed * 400));
          for (let i = 0; i < count; i++) {
            drops.push({
              x: px + (Math.random() - 0.5) * 20,
              y: py + (Math.random() - 0.5) * 20,
              r: 3 + Math.random() * 8,
              life: 0.6 + Math.random() * 0.4,
              maxLife: 1,
              seed: Math.random() * 999
            });
          }
          lastDropX = px;
          lastDropY = py;
        }
      }

      /* ═══════════════════════════════════════════════════════
         Dead tree offscreen buffer
         ═══════════════════════════════════════════════════════ */
      let deadTreeCanvas = null;
      let deadReady = false;

      function prepareDeadTree() {
        if (!deadImg.naturalWidth) return;
        deadTreeCanvas = document.createElement("canvas");
        deadTreeCanvas.width = W * dpr;
        deadTreeCanvas.height = H * dpr;
        const dtCtx = deadTreeCanvas.getContext("2d");
        dtCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const imgW = deadImg.naturalWidth;
        const imgH = deadImg.naturalHeight;
        const scale = Math.min(W / imgW, H / imgH);
        const dw = imgW * scale;
        const dh = imgH * scale;
        const dx = (W - dw) / 2;
        const dy = (H - dh) / 2;
        dtCtx.drawImage(deadImg, dx, dy, dw, dh);
        deadReady = true;
      }

      deadImg.addEventListener("load", () => {
        deadImg.style.visibility = "hidden";
        resize();
        prepareDeadTree();
      });

      /* ═══════════════════════════════════════════════════════
         Leaf spawn timer
         ═══════════════════════════════════════════════════════ */
      let leafTimer = 0;

      /* ═══════════════════════════════════════════════════════
         Main render loop
         ═══════════════════════════════════════════════════════ */
      let lastTime = 0;

      function render(ts) {
        requestAnimationFrame(render);
        const dt = Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;
        time += dt;

        if (!W || !H) { resize(); return; }
        if (!deadReady) { prepareDeadTree(); return; }

        /* ── Wind sway on tree ── */
        applyWindSway(time);

        /* ── Smooth cursor follow with inertia ── */
        const lerpFactor = 1 - Math.pow(0.001, dt);
        const prevX = curX, prevY = curY;
        curX += (mouseX - curX) * lerpFactor;
        curY += (mouseY - curY) * lerpFactor;
        velX = curX - prevX;
        velY = curY - prevY;
        const speed = Math.sqrt(velX * velX + velY * velY);

        const px = curX * W;
        const py = curY * H;

        maybeSpawnDrop(px, py, speed);

        /* ── Ink mask render ── */
        ctx.clearRect(0, 0, W, H);
        ctx.save();
        ctx.globalCompositeOperation = "source-over";

        const baseRadius = Math.min(W, H) * 0.14;
        const stretch = 1 + speed * 15;
        const mainR = baseRadius * stretch;

        ctx.fillStyle = "#000";

        drawInkBlob(px, py, mainR, 42.0, 0, 72);
        ctx.fill();

        for (let i = 0; i < 5; i++) {
          const aOff = noise1D(i * 7.7 + time * 0.3) * Math.PI * 2;
          const dOff = mainR * 0.3 * noise1D(i * 13.3 + time * 0.2);
          const rr = mainR * (0.3 + noise1D(i * 19.1 + time * 0.25) * 0.3);
          const bx = px + Math.cos(aOff) * dOff;
          const by = py + Math.sin(aOff) * dOff;
          drawInkBlob(bx, by, rr, i * 23.7, i * 1.1, 36);
          ctx.fill();
        }

        drawSatellites(px, py, mainR, 7.77, 14);
        drawTrailDrops();

        ctx.globalCompositeOperation = "source-in";
        ctx.drawImage(deadTreeCanvas, 0, 0, W * dpr, H * dpr, 0, 0, W, H);
        ctx.restore();

        /* ── Falling leaves ── */
        leafTimer += dt;
        if (leafTimer > 0.35) {       // spawn ~3 leaves/sec
          spawnLeaf();
          leafTimer = 0;
        }

        lCtx.clearRect(0, 0, VW, VH);
        updateLeaves(dt);
        for (const l of leaves) drawLeaf(l);
      }

      /* ═══════════════════════════════════════════════════════
         3. IntersectionObserver & Scroll Trigger for Section 2
         ═══════════════════════════════════════════════════════ */
      function triggerSection2Reveal() {
        if (campaignSection && !campaignSection.classList.contains("is-revealed")) {
          campaignSection.classList.add("is-revealed");
        }
      }

      if (campaignSection && "IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              triggerSection2Reveal();
            }
          });
        }, { threshold: [0.05, 0.15] });
        observer.observe(campaignSection);
      } else if (campaignSection) {
        triggerSection2Reveal();
      }

      // Continuous check on scroll to ensure 100% trigger reliability
      window.addEventListener("scroll", () => {
        if (campaignSection && !campaignSection.classList.contains("is-revealed")) {
          const rect = campaignSection.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.88) {
            triggerSection2Reveal();
          }
        }

        if (scrollIndicator) {
          if (window.scrollY > 80) {
            scrollIndicator.style.opacity = "0";
            scrollIndicator.style.pointerEvents = "none";
          } else {
            scrollIndicator.style.opacity = "1";
            scrollIndicator.style.pointerEvents = "auto";
          }
        }
      }, { passive: true });

      // Check on load if already scrolled
      if (campaignSection) {
        const rect = campaignSection.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.88) {
          triggerSection2Reveal();
        }
      }

      /* ═══════════════════════════════════════════════════════
         4. SECTION 3: SMART HOME ENERGY SWITCH LOGIC
         ═══════════════════════════════════════════════════════ */
      const smartSwitchSection = document.getElementById("smartSwitchSection");
      const wallLightSwitch = document.getElementById("wallLightSwitch");
      const statusLabel = document.getElementById("statusLabel");
      const statusDesc = document.getElementById("statusDesc");
      const statusMeterFill = document.getElementById("statusMeterFill");
      const bulbZone = document.getElementById("bulbInteractiveZone");
      const hangingPendant = document.getElementById("hangingPendant");

      let isLightOn = true;
      let audioCtx = null;

      // Web Audio API Synthesized Realistic Tactile Switch Click
      function playMechanicalClick(turningOn) {
        try {
          if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          }
          if (audioCtx.state === "suspended") {
            audioCtx.resume();
          }

          const now = audioCtx.currentTime;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const filter = audioCtx.createBiquadFilter();

          // High snappy click transient
          osc.type = turningOn ? "triangle" : "sine";
          osc.frequency.setValueAtTime(turningOn ? 950 : 720, now);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.038);

          // Lowpass filter for mechanical plastic resonance
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(3200, now);
          filter.Q.setValueAtTime(3, now);

          gain.gain.setValueAtTime(0.28, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(now);
          osc.stop(now + 0.045);
        } catch (e) {
          // Audio fallback gracefully handled
        }
      }

      function updateSmartSwitchUI() {
        if (isLightOn) {
          smartSwitchSection.classList.remove("light-off");
          smartSwitchSection.classList.add("light-on");
          statusLabel.textContent = "60 WATT (PENGGUNAAN AKTIF)";
          statusDesc.textContent = "Lampu menyala menggunakan energi listrik. Membiasakan mematikan 1 lampu saat ruangan kosong selama 5 jam sehari menghemat hingga 110 kWh listrik per tahun dan mengurangi emisi karbon.";
          statusMeterFill.style.width = "85%";
          statusMeterFill.style.background = "linear-gradient(90deg, #ffcf56, #e6a117)";
        } else {
          smartSwitchSection.classList.remove("light-on");
          smartSwitchSection.classList.add("light-off");
          statusLabel.textContent = "0 WATT (MODE HEMAT DAYA)";
          statusDesc.textContent = "Lampu padam. Luar biasa! Anda baru saja menghentikan pemborosan listrik dan memberi bumi kesempatan bernapas lebih segar tanpa polusi karbon.";
          statusMeterFill.style.width = "4%";
          statusMeterFill.style.background = "linear-gradient(90deg, #4a8c3f, #8dd17a)";
        }
      }

      if (wallLightSwitch) {
        wallLightSwitch.addEventListener("click", () => {
          isLightOn = !isLightOn;
          playMechanicalClick(isLightOn);
          updateSmartSwitchUI();
        });

        wallLightSwitch.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            isLightOn = !isLightOn;
            playMechanicalClick(isLightOn);
            updateSmartSwitchUI();
          }
        });
      }

      // Subtle mouse impulse physics on hanging bulb
      if (bulbZone && hangingPendant) {
        bulbZone.addEventListener("mousemove", (e) => {
          const rect = bulbZone.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const deltaX = (e.clientX - centerX) / (rect.width / 2);
          const impulseDeg = Math.max(-5.5, Math.min(5.5, deltaX * 4.5));

          hangingPendant.style.animationPlayState = "paused";
          hangingPendant.style.transform = `rotate(${impulseDeg}deg)`;
          hangingPendant.style.transition = "transform 0.25s cubic-bezier(0.2, 0, 0, 1)";
        });

        bulbZone.addEventListener("mouseleave", () => {
          hangingPendant.style.transition = "transform 1.2s cubic-bezier(0.25, 1, 0.5, 1)";
          hangingPendant.style.transform = "";
          setTimeout(() => {
            hangingPendant.style.animationPlayState = "running";
            hangingPendant.style.transition = "";
          }, 1200);
        });
      }

      /* ═══════════════════════════════════════════════════════
         Boot
         ═══════════════════════════════════════════════════════ */
      function boot() {
        resize();
        if (deadImg.complete && deadImg.naturalWidth) {
          deadImg.style.visibility = "hidden";
          prepareDeadTree();
        }
        for (let i = 0; i < 8; i++) spawnLeaf();
        requestAnimationFrame(render);
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
      } else {
        boot();
      }

      window.addEventListener("resize", () => {
        resize();
        if (deadImg.naturalWidth) prepareDeadTree();
      });
    })();
