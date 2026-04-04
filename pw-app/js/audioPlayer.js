/* ============================================================
   audioPlayer.js — Simulated audio overview player
============================================================ */

let ap = false, prog = 25, audioIv;

function toggleAudio() {
  ap = !ap;
  const icon = document.getElementById('audioPlayIcon');
  if (icon) icon.setAttribute('href', ap ? '#ico-pause' : '#ico-play');
  const wf = document.getElementById('waveform');
  if (wf) wf.classList.toggle('audio-paused', !ap);
  if (ap) audioIv = setInterval(tickAudio, 300);
  else clearInterval(audioIv);
}

function tickAudio() {
  prog = Math.min(100, prog + 0.4);
  const fill = document.getElementById('audioFill');
  if (fill) fill.style.width = prog + '%';
  const s = Math.round(prog * 720 / 100);
  const timeEl = document.getElementById('audioTime');
  if (timeEl) timeEl.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  // Highlight transcript
  if (prog < 20) hlTranscript('tr0');
  else if (prog < 40) hlTranscript('tr1');
  else if (prog < 60) hlTranscript('tr2');
  else if (prog < 80) hlTranscript('tr3');
  else hlTranscript('tr4');
}

function hlTranscript(id) {
  document.querySelectorAll('.transcript-item').forEach(t => t.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) { el.classList.add('active'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}

function seekAudio(s) {
  prog = Math.max(0, Math.min(100, prog + (s / 720 * 100)));
  const fill = document.getElementById('audioFill');
  if (fill) fill.style.width = prog + '%';
}
