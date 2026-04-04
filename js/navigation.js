/* ============================================================
   navigation.js — Screen routing & stagger animations
   + Persistent login: stays logged in across refreshes
     until explicit logout
============================================================ */

const AUTH_KEY = "pw_logged_in";
const BATCH_KEY = "pw_batch";

let _prevScreen = "home";

/* ── BOOTSTRAP ────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Init explainer
  if (typeof EV !== "undefined") EV.init();

  // ── Persistent login check ──
  // If user was already logged in, skip login screen entirely
  const isLoggedIn = localStorage.getItem(AUTH_KEY) === "true";
  const savedBatch = localStorage.getItem(BATCH_KEY);

  if (isLoggedIn) {
    // Restore saved batch label in topnav
    if (savedBatch) {
      const batchSelector = document.querySelector(".batch-selector");
      if (batchSelector) {
        batchSelector.innerHTML =
          savedBatch +
          ' <svg width="12" height="12"><use href="#ico-chevdown"/></svg>';
      }
    }
    // Remove .active from login, activate home directly
    document
      .querySelectorAll(".screen")
      .forEach((s) => s.classList.remove("active", "slide-back"));
    const home = document.getElementById("home");
    if (home) {
      home.classList.add("active");
      setTimeout(() => runStagger(home), 30);
    }
  } else {
    // Normal flow — login is already .active in HTML
    runStagger(document.getElementById("login"));
  }

  // Counter animation when batch screen becomes visible
  const batchScreen = document.getElementById("batch");
  if (batchScreen) {
    batchScreen.addEventListener("animationstart", () => {
      animateCounters(batchScreen);
    });
  }
});

// Fallback EV init in case DOMContentLoaded already fired
setTimeout(() => {
  if (typeof EV !== "undefined") EV.init();
}, 150);

/* ── goTo ─────────────────────────────────────────────── */
function goTo(id) {
  const current = document.querySelector(".screen.active");
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active", "slide-back"));
  const next = document.getElementById(id);
  if (!next) return;
  next.classList.add("active");
  window.scrollTo(0, 0);

  // Stop canvas explainer if leaving ai-catchup
  if (typeof EV !== "undefined" && id !== "ai-catchup") {
    if (typeof EV.stop === "function") EV.stop();
  }

  // Reset course-setup state when entering
  if (id === "course-setup") {
    document
      .querySelectorAll("#course-setup .batch-chip")
      .forEach((c) => c.classList.remove("selected", "active"));
    const btn = document.getElementById("loginBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Select your batch first";
    }
  }

  // Stagger items
  setTimeout(() => runStagger(next), 30);
  playSystemSound("page");
  updatePlayBtnIcon(false);
  _prevScreen = current ? current.id : "home";
}

/* ── goBack ───────────────────────────────────────────── */
function goBack(id) {
  const current = document.querySelector(".screen.active");
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active", "slide-back"));
  const next = document.getElementById(id);
  if (!next) return;
  next.classList.add("active", "slide-back");
  window.scrollTo(0, 0);

  if (typeof EV !== "undefined" && id !== "ai-catchup") {
    if (typeof EV.stop === "function") EV.stop();
  }
  setTimeout(() => runStagger(next), 30);
  _prevScreen = current ? current.id : "home";
}

/* ── COURSE SETUP ─────────────────────────────────────────
   setBatchAndStart — selects chip + enables button only.
   Navigation happens only in confirmBatch().
─────────────────────────────────────────────────────────── */
function setBatchAndStart(batchLabel, element) {
  document
    .querySelectorAll("#course-setup .batch-chip")
    .forEach((c) => c.classList.remove("active", "selected"));

  if (element) {
    element.classList.add("selected");
    batchLabel = element.dataset.value || batchLabel;
  }

  const btn = document.getElementById("loginBtn");
  if (btn && batchLabel) {
    btn.disabled = false;
    btn.textContent = "Start with " + batchLabel + "  →";
  }

  playSystemSound("pickup");
}

/* ── confirmBatch — saves auth + batch, navigates to home ── */
function confirmBatch() {
  const selected = document.querySelector("#course-setup .batch-chip.selected");
  if (!selected) return;

  const batchLabel = selected.dataset.value;

  // ── Persist login state ──
  localStorage.setItem(AUTH_KEY, "true");
  if (batchLabel) localStorage.setItem(BATCH_KEY, batchLabel);

  // Update the home screen batch selector label
  const batchSelector = document.querySelector(".batch-selector");
  if (batchSelector && batchLabel) {
    batchSelector.innerHTML =
      batchLabel +
      ' <svg width="12" height="12"><use href="#ico-chevdown"/></svg>';
  }

  playSystemSound("pickup");
  setTimeout(() => goTo("home"), 180);
}

/* ── LOGOUT ───────────────────────────────────────────────
   Call logOut() from the profile screen logout button.
   In index.html change:
     onclick="goTo('login')"
   to:
     onclick="logOut()"
─────────────────────────────────────────────────────────── */
function logOut() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(BATCH_KEY);
  localStorage.removeItem("userPhone");

  // Stop any playing media
  if (typeof EV !== "undefined") {
    if (typeof EV.stop === "function") EV.stop();
  }

  // Clear OTP boxes if present
  document.querySelectorAll(".otp-box").forEach((b) => {
    b.value = "";
    b.classList.remove("filled");
  });
  const phoneInput = document.getElementById("phoneInput");
  if (phoneInput) phoneInput.value = "";
  const continueBtn = document.getElementById("continueBtn");
  if (continueBtn) {
    continueBtn.disabled = true;
    continueBtn.style.opacity = "0.55";
  }

  goTo("login");
}

/* ── SOUND ────────────────────────────────────────────── */
function playSystemSound(type) {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type === "pickup" ? "triangle" : "sine";
    osc.frequency.value = type === "pickup" ? 560 : 420;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch (e) {
    // AudioContext blocked — silently ignore
  }
}

/* ── STAGGER ANIMATIONS ───────────────────────────────── */
function runStagger(container) {
  if (!container) return;
  const items = container.querySelectorAll(".stagger-item");
  items.forEach((el, i) => {
    el.classList.remove("visible");
    setTimeout(() => el.classList.add("visible"), 40 + i * 55);
  });
}

/* ── AI TABS ──────────────────────────────────────────── */
function setTab(name) {
  setTimeout(() => {
    document
      .querySelectorAll(".ai-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".ai-tab-content")
      .forEach((c) => c.classList.remove("active"));
    const tab = document.getElementById("tab-" + name);
    const content = document.getElementById("content-" + name);
    if (tab) tab.classList.add("active");
    if (content) content.classList.add("active");
  }, 50);
}

/* ── COUNTER ANIMATION ────────────────────────────────── */
function animateCounters(container) {
  if (!container) return;
  container.querySelectorAll("[data-target]").forEach((el) => {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || "";
    const duration = 900;
    const start = performance.now();
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * ease) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

/* ── TOAST ────────────────────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById("toast");
  const msgEl = document.getElementById("toastMsg");
  if (!t || !msgEl) return;
  msgEl.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}

/* ── MARK LECTURE DONE ────────────────────────────────── */
function markDone(id) {
  const c = document.getElementById(id);
  if (!c) return;
  c.classList.remove("backlog");
  c.classList.add("completed");
  const p = c.querySelector(".lec-status-pill");
  if (p) {
    p.className = "lec-status-pill completed";
    p.innerHTML =
      '<svg width="9" height="9"><use href="#ico-check"/></svg>Completed';
  }
  const th = c.querySelector(".lec-thumb");
  if (th) {
    th.className = "lec-thumb done-t";
    th.innerHTML = '<svg><use href="#ico-check-circle"/></svg>';
  }
  c.querySelectorAll(".catchup-cta, .backlog-days").forEach((el) =>
    el.remove(),
  );
  c.querySelectorAll(".ai-tool-btn.hi").forEach((b) =>
    b.classList.remove("hi"),
  );
  showToast("🎉 Backlog cleared! Streak saved");
  goBack("lectures");
}

/* ── PLAY BUTTON ICON SYNC ────────────────────────────── */
function updatePlayBtnIcon(playing) {
  const btn = document.getElementById("playBtn");
  if (!btn) return;
  const use = btn.querySelector("use");
  if (use) use.setAttribute("href", playing ? "#ico-pause" : "#ico-play");
}
