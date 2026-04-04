/* ============================================================
   explainer.js — Enhanced AI Explainer Video
   - Web Speech API (free, built-in browser TTS) as primary voice
   - Sarvam TTS as optional upgrade
   - Improved visuals with smoother animations
============================================================ */

const EV = (() => {
  const FPS = 30;
  const TOTAL_DURATION = 110;

  let SARVAM_KEY = null;
  let audioEnabled = true;
  let currentAudio = null;
  let speechUtterance = null;
  let chunkIndex = 0;
  let useSarvam = false;

  let ctx, canvas, raf;
  let frame = 0;
  let playing = false;
  let W = 640,
    H = 360;

  // ── TTS Script chunks ──
  const SCRIPT_CHUNKS = [
    "Namaskar students! Aaj hum quickly revise karenge Light chapter. Sabse pehle Reflection — jab light kisi mirror se takra kar wapas aati hai. Teen terms yaad karo — Incident Ray, Reflected Ray, aur Normal.",
    "Laws of Reflection. Pehla Law — Angle of Incidence hamesha Angle of Reflection ke barabar hota hai. Doosra Law — teen rays same plane mein hote hain. Ye laws har mirror par apply hote hain!",
    "Mirrors ke types. Concave mirror andar ki taraf hota hai — jaise cave — aur rays ko ek point par converge karta hai. Convex mirror bahar ki taraf hota hai aur rays diverge karta hai.",
    "Important terms. Pole P mirror ka center. Centre of Curvature C — sphere ka center. Radius R matlab P se C tak distance. Focal Length f matlab P se F tak distance.",
    "Basics clear hain to aap next lecture mein image formation bilkul easily samajh paoge. Milte hain next class mein!",
  ];

  // ── Chunk timing map (seconds when each chunk should start speaking) ──
  const CHUNK_START_TIMES = [0, 26, 46, 68, 88];

  // ── Easing & helpers ──
  function easeOut(t) {
    return 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
  }
  function easeIn(t) {
    return Math.pow(Math.min(Math.max(t, 0), 1), 2);
  }

  function getProgress() {
    return Math.min(frame / (TOTAL_DURATION * FPS), 1);
  }

  function show(tStart, tEnd) {
    const t = frame / FPS;
    if (t < tStart) return 0;
    if (t > tEnd) return 1;
    return easeOut((t - tStart) / Math.min(tEnd - tStart, 0.5));
  }

  function alpha(tStart, tEnd) {
    const t = frame / FPS;
    if (t < tStart) return 0;
    if (t >= tEnd) return 0;
    const fadeIn = easeOut(Math.min((t - tStart) / 0.4, 1));
    const fadeOut = easeIn(Math.max(0, 1 - (tEnd - t) / 0.5));
    return fadeIn * (1 - fadeOut);
  }

  // ── Draw primitives ──
  function text(c, str, x, y, size, weight, color, align = "left") {
    c.fillStyle = color;
    c.font = `${weight} ${size}px Nunito, sans-serif`;
    c.textAlign = align;
    c.textBaseline = "middle";
    c.fillText(str, x, y);
  }

  function roundRect(c, x, y, w, h, r, fill, stroke, lw = 1.5) {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, r);
    else {
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.arcTo(x + w, y, x + w, y + r, r);
      c.lineTo(x + w, y + h - r);
      c.arcTo(x + w, y + h, x + w - r, y + h, r);
      c.lineTo(x + r, y + h);
      c.arcTo(x, y + h, x, y + h - r, r);
      c.lineTo(x, y + r);
      c.arcTo(x, y, x + r, y, r);
      c.closePath();
    }
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = lw;
      c.stroke();
    }
  }

  function line(c, x1, y1, x2, y2, color, lw = 2) {
    c.strokeStyle = color;
    c.lineWidth = lw;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }

  function arrowHead(c, x, y, angle, color, sz = 8) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - sz * Math.cos(angle - 0.4), y - sz * Math.sin(angle - 0.4));
    c.lineTo(x - sz * Math.cos(angle + 0.4), y - sz * Math.sin(angle + 0.4));
    c.closePath();
    c.fill();
  }

  function withAlpha(c, a, fn) {
    if (a <= 0) return;
    c.save();
    c.globalAlpha = Math.min(a, 1);
    fn();
    c.restore();
  }

  function glowText(c, str, x, y, size, color, blur = 12) {
    c.save();
    c.shadowColor = color;
    c.shadowBlur = blur;
    text(c, str, x, y, size, "900", color, "center");
    c.restore();
  }

  // ── Background with animated stars ──
  function drawBG(c) {
    const grad = c.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0a0818");
    grad.addColorStop(0.5, "#110d2e");
    grad.addColorStop(1, "#0d1a2e");
    c.fillStyle = grad;
    c.fillRect(0, 0, W, H);

    // Grid
    c.strokeStyle = "rgba(82,70,229,0.08)";
    c.lineWidth = 1;
    for (let x = 0; x < W; x += 48) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, H);
      c.stroke();
    }
    for (let y = 0; y < H; y += 48) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y);
      c.stroke();
    }

    // Animated dots
    const t = frame / FPS;
    for (let i = 0; i < 18; i++) {
      const sx = (i * 137 + 40) % W;
      const sy = ((i * 97 + 30) % (H - 40)) + 35;
      const pulse = 0.3 + 0.3 * Math.sin(t * 1.5 + i * 0.8);
      c.fillStyle = `rgba(167,139,250,${pulse})`;
      c.beginPath();
      c.arc(sx, sy, 1.2, 0, Math.PI * 2);
      c.fill();
    }
  }

  // ── Top bar ──
  function drawTopBar(c) {
    // Bar background with gradient
    const barGrad = c.createLinearGradient(0, 0, W, 0);
    barGrad.addColorStop(0, "rgba(82,70,229,0.5)");
    barGrad.addColorStop(1, "rgba(82,70,229,0.15)");
    roundRect(c, 0, 0, W, 36, 0, barGrad, "none");

    // PW Badge
    roundRect(c, 10, 7, 34, 22, 6, "#5246E5", "none");
    text(c, "PW", 27, 18, 11, "900", "#fff", "center");

    text(
      c,
      "AI Revision · Light Ch. 10",
      52,
      18,
      10,
      "700",
      "rgba(255,255,255,0.9)",
      "left",
    );

    // Live voice indicator
    const t = frame / FPS;
    const livePulse = Math.abs(Math.sin(t * 3));
    c.fillStyle = `rgba(255,${Math.floor(100 + 80 * livePulse)},100,${0.7 + 0.3 * livePulse})`;
    c.beginPath();
    c.arc(W - 58, 18, 5, 0, Math.PI * 2);
    c.fill();
    text(
      c,
      "AI VOICE",
      W - 50,
      18,
      9,
      "800",
      `rgba(255,180,150,${0.8 + 0.2 * livePulse})`,
      "left",
    );
  }

  // ── Progress bar ──
  function drawProgressBar(c) {
    const p = getProgress();
    roundRect(c, 0, H - 6, W, 6, 0, "rgba(255,255,255,0.08)", "none");
    const grad = c.createLinearGradient(0, 0, W * p, 0);
    grad.addColorStop(0, "#5246E5");
    grad.addColorStop(0.6, "#7c6ff5");
    grad.addColorStop(1, "#a78bfa");
    roundRect(c, 0, H - 6, W * p, 6, 0, grad, "none");

    // Glow at tip
    if (p > 0.02) {
      c.save();
      c.shadowColor = "#a78bfa";
      c.shadowBlur = 8;
      c.fillStyle = "#fff";
      c.beginPath();
      c.arc(W * p, H - 3, 4, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    const fill = document.getElementById("expProgressFill");
    if (fill) fill.style.width = p * 100 + "%";
  }

  // ── Section badge ──
  function sectionBadge(c, x, y, label, color, a) {
    withAlpha(c, a, () => {
      const w = label.length * 7 + 28;
      roundRect(c, x, y, w, 24, 12, color + "30", color, 1.5);
      c.save();
      c.shadowColor = color;
      c.shadowBlur = 6;
      text(c, label, x + 14, y + 12, 10, "800", color, "left");
      c.restore();
    });
  }

  // ── Card helper ──
  function card(c, x, y, w, h, accentColor, a, fn) {
    withAlpha(c, a, () => {
      // Shadow
      c.save();
      c.shadowColor = accentColor + "40";
      c.shadowBlur = 20;
      c.shadowOffsetY = 4;
      roundRect(c, x, y, w, h, 12, "rgba(255,255,255,0.05)", "none");
      c.restore();
      roundRect(
        c,
        x,
        y,
        w,
        h,
        12,
        "rgba(255,255,255,0.05)",
        accentColor + "60",
        1.5,
      );
      // Left accent bar
      c.save();
      c.shadowColor = accentColor;
      c.shadowBlur = 8;
      roundRect(c, x, y + 8, 4, h - 16, 2, accentColor, "none");
      c.restore();
      fn();
    });
  }

  // ── INTRO (0–12s) ──
  function drawIntro(c) {
    const a = alpha(0, 12);
    if (a <= 0) return;
    withAlpha(c, a, () => {
      // Big title with glow
      withAlpha(c, show(0, 12), () => {
        c.save();
        c.shadowColor = "#5246E5";
        c.shadowBlur = 30;
        text(
          c,
          "Reflection of Light",
          W / 2,
          H / 2 - 50,
          24,
          "900",
          "#fff",
          "center",
        );
        c.restore();
        text(
          c,
          "Quick AI Revision — Class 10 Physics",
          W / 2,
          H / 2 - 22,
          12,
          "600",
          "rgba(167,139,250,0.9)",
          "center",
        );
      });

      // Topic chips
      withAlpha(c, show(2, 12), () => {
        const topics = [
          "What is Reflection?",
          "Laws (i = r)",
          "Mirror Types",
          "Terms P,C,F,R",
          "Focal Length",
        ];
        const colors = ["#5246E5", "#7c6ff5", "#ef4444", "#f59e0b", "#34d399"];
        const totalW = topics.length * 118 - 8;
        const startX = W / 2 - totalW / 2;
        topics.forEach((t, i) => {
          const bx = startX + i * 118;
          roundRect(
            c,
            bx,
            H / 2 + 10,
            110,
            26,
            13,
            colors[i] + "35",
            colors[i],
            1,
          );
          text(c, t, bx + 55, H / 2 + 23, 8.5, "700", "#fff", "center");
        });
      });

      // Subtitle
      withAlpha(c, show(4, 12), () => {
        text(
          c,
          "Tap play to start · Voice will begin automatically",
          W / 2,
          H / 2 + 60,
          10,
          "600",
          "rgba(255,255,255,0.4)",
          "center",
        );
      });
    });
  }

  // ── REFLECTION (10–28s) ──
  function drawReflection(c) {
    const t = frame / FPS;
    if (t < 10 || t > 28) return;
    const a = alpha(10, 28);
    withAlpha(c, a, () => {
      sectionBadge(c, 16, 40, "🔹 What is Reflection?", "#a78bfa", 1);

      // Definition card
      withAlpha(c, show(10.5, 28), () => {
        card(c, 16, 68, W - 32, 52, "#a78bfa", 1, () => {
          text(
            c,
            "Light ka polished surface se takra kar wapas aa jana",
            30,
            86,
            11,
            "700",
            "#e0d9ff",
            "left",
          );
          text(
            c,
            "Examples: Mirror • Shiny spoon • Calm water surface",
            30,
            104,
            10,
            "500",
            "rgba(255,255,255,0.55)",
            "left",
          );
        });
      });

      // Diagram
      withAlpha(c, show(12.5, 28), () => {
        const mx = W / 2 + 20,
          my = 130,
          mw = 230,
          mh = 115;
        roundRect(
          c,
          mx - 10,
          my - 8,
          mw + 20,
          mh + 20,
          10,
          "rgba(255,255,255,0.04)",
          "rgba(255,255,255,0.12)",
          1,
        );

        // Mirror surface
        c.save();
        c.shadowColor = "#94a3b8";
        c.shadowBlur = 6;
        line(c, mx + 15, my + mh - 8, mx + mw - 10, my + mh - 8, "#94a3b8", 3);
        c.restore();
        // Hatching
        c.strokeStyle = "rgba(148,163,184,0.35)";
        c.lineWidth = 1;
        for (let hx = mx + 25; hx < mx + mw - 10; hx += 14) {
          c.beginPath();
          c.moveTo(hx, my + mh - 8);
          c.lineTo(hx - 10, my + mh + 10);
          c.stroke();
        }

        // Normal (dashed)
        c.setLineDash([5, 4]);
        line(
          c,
          mx + mw / 2 - 10,
          my + 8,
          mx + mw / 2 - 10,
          my + mh - 8,
          "rgba(255,255,255,0.35)",
          1.5,
        );
        c.setLineDash([]);
        text(
          c,
          "Normal",
          mx + mw / 2 + 6,
          my + 16,
          8,
          "700",
          "rgba(255,255,255,0.5)",
          "left",
        );

        const ix = mx + mw / 2 - 10,
          iy = my + mh - 8;

        // Incident ray
        c.save();
        c.shadowColor = "#f59e0b";
        c.shadowBlur = 8;
        line(c, ix - 75, iy - 72, ix, iy, "#f59e0b", 2.5);
        c.restore();
        arrowHead(c, ix, iy, Math.atan2(72, 75), "#f59e0b");
        text(
          c,
          "Incident Ray",
          ix - 85,
          iy - 80,
          9,
          "700",
          "#f59e0b",
          "center",
        );

        // Reflected ray
        c.save();
        c.shadowColor = "#34d399";
        c.shadowBlur = 8;
        line(c, ix, iy, ix + 75, iy - 72, "#34d399", 2.5);
        c.restore();
        arrowHead(c, ix + 75, iy - 72, Math.atan2(-72, 75), "#34d399");
        text(
          c,
          "Reflected Ray",
          ix + 88,
          iy - 80,
          9,
          "700",
          "#34d399",
          "center",
        );

        // Angle arcs
        c.strokeStyle = "#f59e0b";
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(ix, iy, 24, -Math.PI * 0.78, -Math.PI / 2);
        c.stroke();
        text(c, "i", ix - 20, iy - 30, 11, "800", "#f59e0b", "center");

        c.strokeStyle = "#34d399";
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(ix, iy, 24, -Math.PI / 2, -Math.PI * 0.22);
        c.stroke();
        text(c, "r", ix + 20, iy - 30, 11, "800", "#34d399", "center");
      });

      // Term pills (left side)
      withAlpha(c, show(15.5, 28), () => {
        const terms = [
          ["Incident Ray", "Light aati hai", "#f59e0b"],
          ["Reflected Ray", "Light jaati hai", "#34d399"],
          ["Normal", "⊥ to surface", "#a78bfa"],
        ];
        terms.forEach(([t, d, col], i) => {
          roundRect(c, 16, 130 + i * 46, 195, 38, 8, col + "18", col, 1);
          text(c, t, 26, 142 + i * 46, 11, "800", col, "left");
          text(
            c,
            d,
            26,
            158 + i * 46,
            9,
            "600",
            "rgba(255,255,255,0.6)",
            "left",
          );
        });
      });
    });
  }

  // ── LAWS (26–50s) ──
  function drawLaws(c) {
    const t = frame / FPS;
    if (t < 26 || t > 50) return;
    const a = alpha(26, 50);
    withAlpha(c, a, () => {
      sectionBadge(c, 16, 40, "🔹 Laws of Reflection", "#60a5fa", 1);

      // Law 1
      withAlpha(c, show(27.5, 50), () => {
        card(c, 16, 68, W - 32, 72, "#f59e0b", 1, () => {
          text(c, "✅  Law 1:", 28, 86, 12, "800", "#f59e0b", "left");
          text(
            c,
            "Angle of Incidence  =  Angle of Reflection",
            28,
            104,
            11,
            "600",
            "#fff",
            "left",
          );
          text(
            c,
            "Hamesha, koi exception nahi!",
            28,
            122,
            10,
            "500",
            "rgba(255,255,255,0.55)",
            "left",
          );

          // i=r badge
          c.save();
          c.shadowColor = "#f59e0b";
          c.shadowBlur = 16;
          roundRect(c, W - 96, 76, 76, 48, 10, "#f59e0b", "none");
          c.restore();
          text(c, "i = r", W - 58, 100, 17, "900", "#1a1535", "center");
        });
      });

      // Law 2
      withAlpha(c, show(33, 50), () => {
        card(c, 16, 150, W - 32, 72, "#60a5fa", 1, () => {
          text(c, "✅  Law 2:", 28, 168, 12, "800", "#60a5fa", "left");
          text(
            c,
            "Incident ray, Reflected ray & Normal",
            28,
            186,
            11,
            "600",
            "#fff",
            "left",
          );
          text(
            c,
            "→ teeno SAME PLANE mein hote hain",
            28,
            204,
            10,
            "600",
            "rgba(255,255,255,0.6)",
            "left",
          );
        });
      });

      // Key takeaway
      withAlpha(c, show(40, 50), () => {
        c.save();
        c.shadowColor = "#34d399";
        c.shadowBlur = 12;
        roundRect(
          c,
          16,
          232,
          W - 32,
          36,
          10,
          "rgba(52,211,153,0.15)",
          "#34d399",
          1.5,
        );
        c.restore();
        text(
          c,
          "👉  Ye laws haar type ke mirror par apply hote hain!",
          W / 2,
          250,
          11,
          "700",
          "#34d399",
          "center",
        );
      });

      // Visual proof diagram
      withAlpha(c, show(36, 50), () => {
        const cx = W - 80,
          cy = 100;
        c.save();
        c.shadowColor = "#f59e0b";
        c.shadowBlur = 4;
        line(c, cx - 40, cy + 40, cx, cy, "#f59e0b", 1.5);
        line(c, cx, cy, cx + 40, cy + 40, "#34d399", 1.5);
        c.restore();
        c.setLineDash([3, 3]);
        line(c, cx, cy - 25, cx, cy + 45, "rgba(255,255,255,0.3)", 1);
        c.setLineDash([]);
        text(c, "i", cx - 20, cy + 20, 10, "800", "#f59e0b", "center");
        text(c, "r", cx + 20, cy + 20, 10, "800", "#34d399", "center");
      });
    });
  }

  // ── MIRRORS (46–72s) ──
  function drawMirrors(c) {
    const t = frame / FPS;
    if (t < 46 || t > 72) return;
    const a = alpha(46, 72);
    withAlpha(c, a, () => {
      sectionBadge(c, 16, 40, "🔹 Types of Mirrors", "#f472b6", 1);
      const hw = (W - 48) / 2;

      // Concave
      withAlpha(c, show(47.5, 72), () => {
        card(c, 16, 68, hw, 210, "#ef4444", 1, () => {
          text(
            c,
            "🪞 Concave Mirror",
            16 + hw / 2,
            86,
            12,
            "800",
            "#ef4444",
            "center",
          );

          // Draw concave arc
          const dx = 32,
            dy = 100,
            dh = 76;
          c.save();
          c.shadowColor = "#ef4444";
          c.shadowBlur = 8;
          c.strokeStyle = "#ef4444";
          c.lineWidth = 3;
          c.beginPath();
          c.arc(
            dx + dh * 1.0,
            dy + dh / 2,
            dh * 0.58,
            Math.PI * 0.55,
            Math.PI * 1.45,
          );
          c.stroke();
          c.restore();

          // Focal point
          const fx = dx + dh * 0.38;
          c.save();
          c.shadowColor = "#ef4444";
          c.shadowBlur = 12;
          c.fillStyle = "#ef4444";
          c.beginPath();
          c.arc(fx, dy + dh / 2, 5, 0, Math.PI * 2);
          c.fill();
          c.restore();
          text(c, "F", fx, dy + dh / 2 - 14, 11, "800", "#ef4444", "center");

          // Converging rays
          c.strokeStyle = "#f97316";
          c.lineWidth = 1.5;
          [-18, 0, 18].forEach((off) => {
            const ry = dy + dh / 2 + off;
            c.beginPath();
            c.moveTo(dx + dh * 1.7, ry);
            c.lineTo(dx + dh * 0.78, ry);
            c.stroke();
            c.beginPath();
            c.moveTo(dx + dh * 0.78, ry);
            c.lineTo(fx, dy + dh / 2);
            c.stroke();
          });

          text(
            c,
            "CONVERGE at Focus",
            16 + hw / 2,
            196,
            9,
            "700",
            "#34d399",
            "center",
          );
          roundRect(
            c,
            26,
            204,
            hw - 20,
            22,
            6,
            "rgba(52,211,153,0.15)",
            "#34d399",
            1,
          );
          text(
            c,
            "Cave → Concave (andar)",
            16 + hw / 2,
            215,
            8.5,
            "800",
            "#34d399",
            "center",
          );
          text(
            c,
            "Used: Torch • Headlights • Shaving",
            16 + hw / 2,
            248,
            9,
            "600",
            "rgba(255,255,255,0.45)",
            "center",
          );
        });
      });

      // Convex
      withAlpha(c, show(52, 72), () => {
        const cx2 = 32 + hw;
        card(c, cx2, 68, hw, 210, "#60a5fa", 1, () => {
          text(
            c,
            "🪞 Convex Mirror",
            cx2 + hw / 2,
            86,
            12,
            "800",
            "#60a5fa",
            "center",
          );

          const dx = cx2 + 8,
            dy = 100,
            dh = 76;
          c.save();
          c.shadowColor = "#60a5fa";
          c.shadowBlur = 8;
          c.strokeStyle = "#60a5fa";
          c.lineWidth = 3;
          c.beginPath();
          c.arc(
            dx - dh * 0.1,
            dy + dh / 2,
            dh * 0.58,
            -Math.PI * 0.45,
            Math.PI * 0.45,
          );
          c.stroke();
          c.restore();

          // Diverging rays
          c.strokeStyle = "#818cf8";
          c.lineWidth = 1.5;
          [-18, 0, 18].forEach((off, i) => {
            const ry = dy + dh / 2 + off,
              tx = dx + dh * 0.9;
            c.beginPath();
            c.moveTo(dx + dh * 1.6, ry);
            c.lineTo(tx, ry);
            c.stroke();
            const ang = (i - 1) * 0.38;
            c.beginPath();
            c.moveTo(tx, ry);
            c.lineTo(tx - 44, ry - Math.sin(ang) * 44);
            c.stroke();
          });

          text(
            c,
            "DIVERGE (spread out)",
            cx2 + hw / 2,
            196,
            9,
            "700",
            "#ef4444",
            "center",
          );
          roundRect(
            c,
            cx2 + 8,
            204,
            hw - 20,
            22,
            6,
            "rgba(96,165,250,0.15)",
            "#60a5fa",
            1,
          );
          text(
            c,
            "Opposite → Convex (bahar)",
            cx2 + hw / 2,
            215,
            8.5,
            "800",
            "#60a5fa",
            "center",
          );
          text(
            c,
            "Used: Rear-view • Security mirror",
            cx2 + hw / 2,
            248,
            9,
            "600",
            "rgba(255,255,255,0.45)",
            "center",
          );
        });
      });

      // Mnemonic bar
      withAlpha(c, show(58, 72), () => {
        c.save();
        c.shadowColor = "#fbbf24";
        c.shadowBlur = 10;
        roundRect(
          c,
          16,
          286,
          W - 32,
          32,
          8,
          "rgba(251,191,36,0.12)",
          "#fbbf24",
          1.5,
        );
        c.restore();
        text(
          c,
          "💡  Cave → Concave (andar)  ↔  Convex (bahar)",
          W / 2,
          302,
          10.5,
          "700",
          "#fbbf24",
          "center",
        );
      });
    });
  }

  // ── TERMS (68–90s) ──
  function drawTerms(c) {
    const t = frame / FPS;
    if (t < 68 || t > 90) return;
    const a = alpha(68, 90);
    withAlpha(c, a, () => {
      sectionBadge(c, 16, 40, "🔹 Mirror Terms", "#a78bfa", 1);

      // Diagram on right
      withAlpha(c, show(69, 90), () => {
        const dx = W / 2 + 8,
          dy = 56,
          dw = W / 2 - 20,
          dh = 190;
        roundRect(
          c,
          dx,
          dy,
          dw,
          dh,
          10,
          "rgba(255,255,255,0.04)",
          "rgba(255,255,255,0.1)",
          1,
        );

        // Mirror arc
        c.save();
        c.shadowColor = "#ef4444";
        c.shadowBlur = 8;
        c.strokeStyle = "#ef4444";
        c.lineWidth = 3;
        c.beginPath();
        c.arc(dx + dw, dy + dh / 2, dh * 0.52, Math.PI * 0.55, Math.PI * 1.45);
        c.stroke();
        c.restore();

        // Principal axis
        line(
          c,
          dx + 12,
          dy + dh / 2,
          dx + dw - 12,
          dy + dh / 2,
          "rgba(255,255,255,0.2)",
          1.5,
        );

        const px = dx + 18,
          fx = dx + dw * 0.38,
          cx2 = dx + dw * 0.64;
        [
          [px, "P", "#ef4444"],
          [fx, "F", "#34d399"],
          [cx2, "C", "#60a5fa"],
        ].forEach(([ptx, lbl, col]) => {
          c.save();
          c.shadowColor = col;
          c.shadowBlur = 10;
          c.fillStyle = col;
          c.beginPath();
          c.arc(ptx, dy + dh / 2, 6, 0, Math.PI * 2);
          c.fill();
          c.restore();
          text(c, lbl, ptx, dy + dh / 2 - 16, 12, "900", col, "center");
        });

        // f label
        const by1 = dy + dh / 2 + 32;
        line(c, px, by1, fx, by1, "#34d399", 1.5);
        line(c, px, by1 - 5, px, by1 + 5, "#34d399", 1.5);
        line(c, fx, by1 - 5, fx, by1 + 5, "#34d399", 1.5);
        text(c, "f", (px + fx) / 2, by1 + 14, 11, "800", "#34d399", "center");

        // R label
        const by2 = dy + dh / 2 + 52;
        line(c, px, by2, cx2, by2, "#60a5fa", 1.5);
        line(c, px, by2 - 5, px, by2 + 5, "#60a5fa", 1.5);
        line(c, cx2, by2 - 5, cx2, by2 + 5, "#60a5fa", 1.5);
        text(c, "R", (px + cx2) / 2, by2 + 14, 11, "800", "#60a5fa", "center");

        text(
          c,
          "R = 2f   always!",
          dx + dw / 2 + 8,
          dy + dh - 16,
          10,
          "700",
          "#fbbf24",
          "center",
        );
      });

      // Definition list on left
      const defs = [
        ["P — Pole", "Mirror ka center point", "#ef4444", 70],
        ["C — Centre of Curvature", "Sphere ka center", "#60a5fa", 75],
        ["Principal Axis", "Line through P and C", "#94a3b8", 79],
        ["R — Radius", "Distance P to C", "#60a5fa", 83],
        ["f — Focal Length", "Distance P to F  (f = R/2)", "#34d399", 86],
      ];
      defs.forEach(([term, def, col, tStart], i) => {
        withAlpha(c, show(tStart, 90), () => {
          const ty = 60 + i * 44;
          roundRect(c, 16, ty, W / 2 - 24, 36, 8, col + "18", col, 1);
          c.save();
          c.shadowColor = col;
          c.shadowBlur = 4;
          roundRect(c, 16, ty + 6, 4, 24, 2, col, "none");
          c.restore();
          text(c, term, 26, ty + 10, 10.5, "800", col, "left");
          text(c, def, 26, ty + 26, 9, "600", "rgba(255,255,255,0.6)", "left");
        });
      });
    });
  }

  // ── OUTRO (88–110s) ──
  function drawOutro(c) {
    const t = frame / FPS;
    if (t < 88) return;
    const a = alpha(88, 110);
    withAlpha(c, a, () => {
      // Radial glow
      const grd = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 200);
      grd.addColorStop(0, "rgba(82,70,229,0.3)");
      grd.addColorStop(1, "transparent");
      c.fillStyle = grd;
      c.fillRect(0, 0, W, H);

      withAlpha(c, show(88, 110), () => {
        c.save();
        c.shadowColor = "#5246E5";
        c.shadowBlur = 30;
        text(c, "🎯", W / 2, H / 2 - 64, 42, "900", "#fff", "center");
        text(
          c,
          "Basics Clear? ✅",
          W / 2,
          H / 2 - 18,
          22,
          "900",
          "#fff",
          "center",
        );
        c.restore();
      });

      withAlpha(c, show(92, 110), () => {
        c.save();
        c.shadowColor = "#5246E5";
        c.shadowBlur = 16;
        roundRect(
          c,
          W / 2 - 215,
          H / 2 + 12,
          430,
          70,
          14,
          "rgba(82,70,229,0.3)",
          "#5246E5",
          1.5,
        );
        c.restore();
        text(
          c,
          "Agar ye basics clear hain —",
          W / 2,
          H / 2 + 32,
          12,
          "600",
          "rgba(255,255,255,0.85)",
          "center",
        );
        text(
          c,
          "Next: Image Formation & Numericals",
          W / 2,
          H / 2 + 52,
          13,
          "800",
          "#a78bfa",
          "center",
        );
        text(
          c,
          "bilkul easily samajh paoge! 🚀",
          W / 2,
          H / 2 + 70,
          11,
          "600",
          "rgba(255,255,255,0.75)",
          "center",
        );
      });

      withAlpha(c, show(98, 110), () => {
        c.save();
        c.shadowColor = "#5246E5";
        c.shadowBlur = 20;
        roundRect(c, W / 2 - 155, H / 2 + 90, 310, 36, 18, "#5246E5", "none");
        c.restore();
        text(
          c,
          "Milte hain next class mein! 👋",
          W / 2,
          H / 2 + 108,
          12,
          "700",
          "#fff",
          "center",
        );
      });
    });
  }

  // ── Time display ──
  function updateTimeDisplay() {
    const el = document.getElementById("videoTime");
    if (!el) return;
    el.textContent = fmt(frame / FPS) + " / " + fmt(TOTAL_DURATION);
  }
  function fmt(s) {
    return (
      Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0")
    );
  }

  // ── Render ──
  function render() {
    if (!canvas || !ctx) return;
    drawBG(ctx);
    drawTopBar(ctx);
    drawIntro(ctx);
    drawReflection(ctx);
    drawLaws(ctx);
    drawMirrors(ctx);
    drawTerms(ctx);
    drawOutro(ctx);
    drawProgressBar(ctx);
    updateTimeDisplay();
  }

  function loop() {
    frame++;
    if (frame >= TOTAL_DURATION * FPS) {
      frame = TOTAL_DURATION * FPS;
      stop();
      return;
    }
    render();
    // Check if we need to trigger a new speech chunk
    if (audioEnabled && playing) {
      const t = frame / FPS;
      const nextChunkIdx = CHUNK_START_TIMES.findIndex(
        (st, i) => Math.abs(t - st) < 1 / FPS + 0.05 && i === chunkIndex,
      );
      if (nextChunkIdx !== -1) {
        speakChunk(chunkIndex);
      }
    }
    raf = requestAnimationFrame(loop);
  }

  // ── Web Speech API (free, built-in) ──
  function speakChunk(idx) {
    if (!audioEnabled || idx >= SCRIPT_CHUNKS.length) return;
    if (!window.speechSynthesis) return;

    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(SCRIPT_CHUNKS[idx]);
    utterance.lang = "hi-IN";
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    // Try to find a Hindi voice, fallback to default
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(
      (v) => v.lang === "hi-IN" || v.lang.startsWith("hi"),
    );
    const indianEnglish = voices.find((v) => v.lang === "en-IN");
    if (hindiVoice) utterance.voice = hindiVoice;
    else if (indianEnglish) utterance.voice = indianEnglish;

    utterance.onstart = () => {
      const el = document.getElementById("audioStatus");
      if (el) el.textContent = "🔊 Voice ON";
    };
    utterance.onend = () => {
      chunkIndex++;
      // Do NOT manually trigger next — loop() handles timing
    };
    utterance.onerror = (e) => {
      const el = document.getElementById("audioStatus");
      if (el)
        el.textContent =
          e.error === "not-allowed"
            ? "⚠️ Tap screen first to enable voice"
            : "⚠️ Voice unavailable";
    };

    speechUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeech() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speechUtterance = null;
  }

  // ── Sarvam TTS (optional upgrade) ──
  async function fetchSarvamChunk(idx) {
    if (!SARVAM_KEY || !useSarvam || idx >= SCRIPT_CHUNKS.length) return;
    const el = document.getElementById("audioStatus");
    try {
      const res = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": SARVAM_KEY,
        },
        body: JSON.stringify({
          inputs: [SCRIPT_CHUNKS[idx]],
          target_language_code: "hi-IN",
          speaker: "arvind",
          pitch: 0,
          pace: 0.95,
          loudness: 1.4,
          speech_sample_rate: 22050,
          enable_preprocessing: true,
          model: "bulbul:v1",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.audios?.[0]) throw new Error("No audio");
      const audio = new Audio("data:audio/wav;base64," + data.audios[0]);
      currentAudio = audio;
      if (el) el.textContent = "🔊 Sarvam Voice ON";
      audio.onended = () => {
        currentAudio = null;
      };
      audio.play().catch(() => {});
    } catch (e) {
      console.warn("Sarvam TTS failed, using Web Speech:", e.message);
      useSarvam = false;
      speakChunk(idx);
    }
  }

  function syncIcon() {
    const btn = document.getElementById("vidPlayBtn"); // the button
    const ic = btn ? btn.querySelector("svg use") : null;
    if (ic) ic.setAttribute("href", playing ? "#ico-pause" : "#ico-play");
    const overlay = document.getElementById("videoOverlay");
    if (overlay) overlay.style.display = playing ? "none" : "flex";
  }

  // ── Fullscreen ──
  function toggleFullscreen() {
    const wrap = document.querySelector(".explainer-canvas-wrap");
    if (!wrap) return;

    // iOS Safari: use CSS fullscreen (no API support for divs)
    if (wrap.classList.contains("ev-fullscreen")) {
      wrap.classList.remove("ev-fullscreen");
      document.body.classList.remove("ev-fs-active");
      const closeBtn = document.getElementById("evCloseBtn");
      if (closeBtn) closeBtn.remove();
      W = 640;
      H = 360;
      canvas.width = W;
      canvas.height = H;
      canvas.style.width = "";
      canvas.style.height = "";
      render();
      return;
    }

    // Try native fullscreen first (Android Chrome / desktop)
    if (wrap.requestFullscreen || wrap.webkitRequestFullscreen) {
      const req = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
      req
        .call(wrap)
        .then(() => {
          W = window.innerWidth;
          H = window.innerHeight;
          canvas.width = W;
          canvas.height = H;
          render();
        })
        .catch(() => {
          // Fallback: CSS fullscreen for iOS
          cssFullscreen(wrap);
        });
      return;
    }

    // Fallback for iOS
    cssFullscreen(wrap);
  }

  function cssFullscreen(wrap) {
    wrap.classList.add("ev-fullscreen");
    document.body.classList.add("ev-fs-active");
    W = window.innerWidth;
    H = Math.round((W * 9) / 16);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = "100%";
    canvas.style.height = "auto";

    // Add close button for iOS
    if (!document.getElementById("evCloseBtn")) {
      const closeBtn = document.createElement("button");
      closeBtn.id = "evCloseBtn";
      closeBtn.textContent = "✕";
      closeBtn.style.cssText = `
      position: absolute; top: 12px; right: 14px;
      z-index: 10000; background: rgba(0,0,0,0.6);
      color: #fff; border: none; border-radius: 50%;
      width: 32px; height: 32px; font-size: 14px;
      font-weight: 700; cursor: pointer;
    `;
      closeBtn.onclick = () => toggleFullscreen();
      wrap.appendChild(closeBtn);
    }
    render();
  }
  function onFullscreenChange() {
    // Native fullscreen exited (Android/desktop)
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      W = 640;
      H = 360;
      canvas.width = W;
      canvas.height = H;
      canvas.style.width = "";
      canvas.style.height = "";
      render();
    }
  }
  // ── Init ──
  function init() {
    canvas = document.getElementById("explainerCanvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    canvas.width = 640;
    canvas.height = 360;

    // Hide scene pills
    document.querySelectorAll(".scene-pills, .scene-pill").forEach((el) => {
      el.style.display = "none";
    });
    // Close CSS fullscreen on canvas tap
    canvas.addEventListener("click", () => {
      const wrap = document.querySelector(".explainer-canvas-wrap");
      if (wrap && wrap.classList.contains("ev-fullscreen")) {
        toggleFullscreen();
      }
    });

    injectFullscreenBtn();
    injectProgressSeek();

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);

    // Preload voices
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () =>
        window.speechSynthesis.getVoices();
    }

    frame = 0;
    playing = false;
    render();
    syncIcon();
  }

  function injectFullscreenBtn() {
    const row = document.querySelector(".exp-controls-row");
    if (!row || document.getElementById("expFullscreenBtn")) return;
    const btn = document.createElement("button");
    btn.id = "expFullscreenBtn";
    btn.onclick = toggleFullscreen;
    btn.className = "exp-ctrl-side";
    btn.style.cssText =
      "background:var(--surface2);border:1.5px solid var(--border);border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text2);flex-shrink:0;";
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#ico-fullscreen"/></svg>`;
    const timeEl = document.getElementById("videoTime");
    if (timeEl) row.insertBefore(btn, timeEl);
    else row.appendChild(btn);
  }

  function injectProgressSeek() {
    const wrap = document.getElementById("expProgressWrap");
    if (!wrap || wrap.dataset.seekBound) return;
    wrap.dataset.seekBound = "1";
    wrap.style.cursor = "pointer";
    wrap.addEventListener("click", (e) => {
      const rect = wrap.getBoundingClientRect();
      seekTo(((e.clientX - rect.left) / rect.width) * TOTAL_DURATION);
    });
  }

  // ── Public API ──
  function play() {
    if (playing) return;
    if (frame >= TOTAL_DURATION * FPS) {
      frame = 0;
      chunkIndex = 0;
    }
    playing = true;
    syncIcon();
    raf = requestAnimationFrame(loop);
    // Speak first chunk immediately
    chunkIndex = 0;
    if (useSarvam && SARVAM_KEY) fetchSarvamChunk(0);
    else speakChunk(0);
  }

  function stop() {
    if (!playing) return;
    playing = false;
    cancelAnimationFrame(raf);
    raf = null;
    syncIcon();
    stopSpeech();
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    const el = document.getElementById("audioStatus");
    if (el) el.textContent = "";
  }

  function toggle() {
    playing ? stop() : play();
  }

  function seekTo(seconds) {
    const wasPlaying = playing;
    stop();
    frame = Math.max(
      0,
      Math.min(Math.floor(seconds * FPS), TOTAL_DURATION * FPS),
    );
    // Figure out which chunk we're in
    chunkIndex = CHUNK_START_TIMES.filter((t) => t <= seconds).length - 1;
    if (chunkIndex < 0) chunkIndex = 0;
    render();
    if (wasPlaying) play();
  }

  function enableVoice(key) {
    SARVAM_KEY = key;
    audioEnabled = true;
    useSarvam = true;
    const el = document.getElementById("audioStatus");
    if (el) el.textContent = "🔊 Sarvam voice ready";
  }

  const SCENE_TIMES = [0, 10, 26, 46, 68, 88];
  function jumpToScene(i) {
    seekTo(SCENE_TIMES[Math.max(0, Math.min(i, SCENE_TIMES.length - 1))]);
  }
  function prevScene() {
    const t = frame / FPS;
    const idx = SCENE_TIMES.filter((st) => st < t - 1).length - 1;
    jumpToScene(Math.max(0, idx));
  }
  function nextScene() {
    const t = frame / FPS;
    const i = SCENE_TIMES.findIndex((st) => st > t);
    if (i !== -1) jumpToScene(i);
  }

  return {
    init,
    play,
    stop,
    toggle,
    seekTo,
    toggleFullscreen,
    jumpToScene,
    prevScene,
    nextScene,
    enableVoice,
    get playing() {
      return playing;
    },
  };
})();

function toggleExplainer() {
  EV.toggle();
}
function prevScene() {
  EV.prevScene();
}
function nextScene() {
  EV.nextScene();
}
