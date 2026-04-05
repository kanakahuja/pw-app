<div align="center">

<img src="https://img.shields.io/badge/Status-Live-00C853?style=for-the-badge" />
<img src="https://img.shields.io/badge/Built%20With-Vanilla%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
<img src="https://img.shields.io/badge/Deployed-Vercel-000000?style=for-the-badge&logo=vercel" />

<br /><br />

# 🎓 PW AI Catch-Up

### Turn a missed 3.5-hour lecture into a 15-minute AI catch-up.

**Built for Physics Wallah students · Class 10 CBSE · Udaan Batch**

<br />

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-pw--app--orcin.vercel.app-5246E5?style=for-the-badge)](https://pw-app-orcin.vercel.app)

<br />

</div>

---

## 📌 The Problem

> 67% of PW students have active backlogs. A missed lecture = 3.5 hours of content to rewatch — almost nobody does it. Backlogs pile up, confidence drops, students disengage.

**We fix that in 15 minutes.**

---

## ✨ What's Inside

| Feature | Description |
|---|---|
| 🎬 **AI Explainer Video** | Animated Canvas 2D revision video with Hindi voice narration — runs entirely in the browser |
| 📄 **Smart Notes** | 3-page structured notes with formulas, diagrams, teacher quotes & board exam tips |
| ✅ **Mark as Caught Up** | One tap clears the backlog and keeps the streak alive |
| 🔥 **Streak System** | 12-day streak tracker with calendar heatmap to build daily habits |
| 📱 **Full Mobile App** | Login → Home → Batch → Chapters → Lectures → Video Player → AI Catch-Up → Profile |

---

## 🚀 Quick Start

No build step. No dependencies. Just open and run.

```bash
# 1. Clone
git clone https://github.com/your-username/pw-ai-catchup.git
cd pw-ai-catchup

# 2. Serve (pick any)
npx serve .
# or
python3 -m http.server 5500
# or just open index.html directly in Chrome
```

**To log in on the demo:**
- Enter any 10-digit number
- Enter any 5-digit OTP
- Select a batch → you're in

---

## 📁 Project Structure

```
pw-ai-catchup/
│
├── index.html                 ← All screens live here
│
├── css/
│   ├── variables.css          ← Design tokens (colors, spacing, shadows)
│   ├── layout.css             ← Screen system, app container, transitions
│   ├── login.css              ← Login & OTP screen
│   ├── course-setup.css       ← Batch selection screen
│   ├── home.css               ← Home dashboard
│   ├── lectures.css           ← Chapters, lectures, AI tool cards
│   ├── player.css             ← Video player
│   └── profile.css            ← Profile & streak calendar
│
└── js/
    ├── navigation.js          ← Screen router (goTo, goBack, animations)
    ├── setup.js               ← Batch selection logic
    ├── login.js               ← OTP input, phone validation, auto-advance
    ├── explainer.js           ← 🤖 AI canvas video engine + TTS voice
    ├── videoPlayer.js         ← HTML5 video controls, seek, fullscreen
    └── audioPlayer.js         ← Audio utilities
```

---

## 🤖 AI Video Engine

The explainer video is a **Canvas 2D animation running at 30fps in the browser** — no video file, no external service needed.

### How it works

```
Play button pressed
      │
      ▼
Frame loop (30fps via requestAnimationFrame)
      │
      ├── Scene 1 (0–12s)   → Intro title card + topic chips
      ├── Scene 2 (10–28s)  → Reflection diagram (incident/reflected ray)
      ├── Scene 3 (26–50s)  → Laws of Reflection cards (i = r)
      ├── Scene 4 (46–72s)  → Mirror types: Concave vs Convex
      ├── Scene 5 (68–90s)  → Mirror terms: P, C, F, R with diagram
      └── Scene 6 (88–110s) → Outro + next lecture preview
            │
            ▼
      Voice chunks play in sync with scene transitions
      (Web Speech API → Hindi TTS, free & built-in)
```

### Voice Options

| Option | Quality | Cost | Setup |
|--------|---------|------|-------|
| **Web Speech API** | Good | Free | Zero — works out of the box |
| **Sarvam AI `bulbul:v1`** | Premium Hindi | Paid API | Add key in console (see below) |

**To enable Sarvam premium voice:**

```javascript
// Run in browser console on the AI Catch-Up screen:
setSarvamApiKey("your_sarvam_api_key_here");

// Or call directly:
EV.enableVoice("your_sarvam_api_key_here");
```

Get a key at [sarvam.ai](https://sarvam.ai) · Key is saved in `localStorage`

---

## 🧭 Navigation API

All screens are `div.screen` elements in `index.html`. The router handles transitions:

```javascript
goTo('screen-id')        // Navigate to a screen with stagger animation
goBack('screen-id')      // Go back
setTab('notes')          // Switch AI Catch-Up tab → 'summary' | 'notes'
markDone('lec4')         // Mark lecture caught up, update progress UI
showToast('message')     // Show bottom toast notification
```

**Screen flow:**

```
login
  └── course-setup
        └── home
              ├── batch
              │     └── chapters
              │           └── lectures
              │                 ├── video-player
              │                 └── ai-catchup (AI Video + Smart Notes)
              └── profile
```

---

## 🎨 Design System

All tokens in `css/variables.css`:

```css
/* Brand Colors */
--accent:        #5246E5;   /* PW Purple */
--orange:        #F47C20;   /* Streaks & highlights */
--green:         #0A8754;   /* Completed states */
--red:           #E53935;   /* Backlogs & warnings */

/* Gradients */
--grad-accent:   linear-gradient(135deg, #5246E5, #7B6EF0);
--grad-dark:     linear-gradient(135deg, #1A1535, #0d0b1e);

/* Surfaces */
--radius:        16px;
--shadow-card:   0 2px 12px rgba(82, 70, 229, 0.10);
```

---

## 📱 All Screens

<details>
<summary><b>Click to expand full feature list</b></summary>

### 🔐 Login Screen
- Mobile number input with +91 prefix
- 5-box OTP input with auto-advance and backspace handling
- Google Sign-In button
- Animated PW logo and social proof stats

### 🎯 Course Setup
- Batch selection grid: Udaan (Class 10), Neev (Class 9), Arjuna (JEE), Yakeen (NEET)
- Animated batch chips with custom SVG icons per batch
- Progress bar (Step 2 of 3)

### 🏠 Home Dashboard
- Personalized greeting + streak pill (12-day)
- Batch progress bar (62% complete)
- Live class banner with Join button
- Backlog alert CTA → 2 Backlogs in Physics!
- Quick grid: My Batches, Recent, Downloads, Doubts
- Today's schedule horizontal scroll
- Motivation quote card

### 📚 Batch Screen
- Overview stats: Progress 62% / Backlogs 2 / Done 38
- Subject cards: Physics, Chemistry, Mathematics, Biology
- Individual progress bars and backlog count warnings
- Batch switcher card

### 📋 Chapters Screen
- Chapter list with status tags
- ✅ Completed &nbsp; ⚠️ Backlog (with AI badge) &nbsp; 🔒 Not Started

### 🎥 Lectures Screen
- Per-lecture status pills
- AI Video and Smart Notes buttons on every lecture card
- "Catch Up in 15 mins with AI" CTA on backlog lectures
- Missed N days ago indicator

### ▶️ Video Player
- Custom HTML5 controls (no browser default UI)
- Seek bar, play/pause, ±10s skip, fullscreen
- Aria labels on all buttons
- AI Video & Smart Notes quick-access below player

### 🤖 AI Catch-Up Screen
- **AI Video tab:** Canvas animation, scene navigation, progress bar with seek, timestamps list
- **Smart Notes tab:** PDF download bar, 3 inline scrollable pages with formula boxes, SVG diagrams, quote callouts, board tips, solved numericals

### 👤 Profile Screen
- Avatar with initial, name, email, batch pill
- Stats: Classes Done 38, Streak 12, Rank #234
- 14-day streak calendar heatmap (green = active, gray = missed)
- Menu: Dark Mode, My Purchases, Test Series, About, Contact, Logout

</details>

---

## 🛠️ Tech Stack

```
Frontend     → Vanilla HTML5 + CSS3 + JavaScript (zero frameworks)
Styling      → CSS Custom Properties, mobile-first flexbox/grid
Icons        → Inline SVG symbol system (no icon library needed)
AI Video     → Canvas 2D API (browser-native, 30fps)
Voice        → Web Speech API (free) / Sarvam AI bulbul:v1 (premium)
Video Host   → Cloudflare R2 / CDN
Deployment   → Vercel
Font         → Nunito via Google Fonts
```

---

## 🗺️ Roadmap

- [x] Full mobile app UI — all screens navigable
- [x] AI canvas explainer video with Hindi voice
- [x] Smart Notes inline + PDF download
- [x] Backlog detection and catch-up flow
- [x] Streak system + progress tracking
- [ ] Real lecture transcription via Whisper ASR
- [ ] Personalized catch-up depth based on quiz history
- [ ] AI Doubt Solver — ask questions about the video in context
- [ ] Multi-language voice: Bengali, Tamil, Telugu
- [ ] Parent dashboard — backlog visibility for parents
- [ ] Adaptive 5-question mini-quiz after each catch-up

---

## 💡 The Bigger Vision

This prototype is one slice of what AI can do inside PW:

- **Exam Season Revision Mode** — 40% of students study hard only in the last 2–3 weeks. A paid AI Rapid Revision product for the whole syllabus = clear monetization.
- **AI Tutor** — Answer student doubts in context of what they just watched, in Hindi.
- **Teacher Amplification** — Teachers record once, AI generates summaries, notes, and revision videos automatically across formats.
- **Personalised Depth** — Different video length and difficulty based on each student's quiz performance.

---

## 👨‍💻 Developer

**Kanak Ahuja**
Tech · Product · Machine Learning · AI
📧 [kanakahuja@pw.live](mailto:kanakahuja@pw.live)

Built solo as a hackathon prototype for Physics Wallah.
*Would be happy to work on improving these features — and a lot more.*

---

<div align="center">

Built with ❤️ for PW students &nbsp;·&nbsp; April 2026

</div>
