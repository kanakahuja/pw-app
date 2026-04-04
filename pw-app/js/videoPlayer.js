/* ============================================================
   videoPlayer.js — Premium video player controller
   Video URL: https://image2url.com/r2/default/videos/1775157197852-74ed7b65-4bf2-44b9-b505-599ade22fce9.mp4
============================================================ */

const VideoPlayer = (() => {
  const VIDEO_URL = 'https://image2url.com/r2/default/videos/1775157197852-74ed7b65-4bf2-44b9-b505-599ade22fce9.mp4';

  let video, progressFill, timeDisplay, loadingEl, wrapEl;
  let hideControlsTimer = null;
  let initialized = false;

  function init() {
    wrapEl       = document.getElementById('lecturePlayerWrap');
    video        = document.getElementById('lectureVideo');
    progressFill = document.getElementById('vidProgressFill');
    timeDisplay  = document.getElementById('vidTimeDisplay');
    loadingEl    = document.getElementById('vidLoading');
    if (!video) return;

    // Source
    video.src = VIDEO_URL;

    // Events
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('waiting',    () => setLoading(true));
    video.addEventListener('playing',    () => { setLoading(false); updatePlayIcon(true); wrapEl?.classList.remove('paused'); });
    video.addEventListener('pause',      () => { updatePlayIcon(false); wrapEl?.classList.add('paused'); });
    video.addEventListener('ended',      () => { updatePlayIcon(false); wrapEl?.classList.add('paused'); });
    video.addEventListener('loadeddata', () => setLoading(false));
    video.addEventListener('error',      () => setLoading(false));

    // Progress bar click
    const progressWrap = document.getElementById('vidProgressWrap');
    if (progressWrap) {
      progressWrap.addEventListener('click', e => {
        const rect = progressWrap.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        video.currentTime = ratio * (video.duration || 0);
      });
    }

    // Auto-hide controls
    wrapEl?.addEventListener('mousemove', () => {
      clearTimeout(hideControlsTimer);
      wrapEl.classList.add('paused'); // show controls
      hideControlsTimer = setTimeout(() => {
        if (!video.paused) wrapEl.classList.remove('paused');
      }, 3000);
    });

    initialized = true;
  }

  function onTimeUpdate() {
    if (!video || !video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    if (progressFill) progressFill.style.width = pct + '%';
    if (timeDisplay)  timeDisplay.textContent  = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
  }

  function togglePlay() {
    if (!video) return;
    video.paused ? video.play() : video.pause();
  }

  function seek(seconds) {
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
  }

  function toggleFullscreen() {
    const el = wrapEl || video;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  }

  function setLoading(show) {
    if (loadingEl) loadingEl.classList.toggle('hidden', !show);
  }

  function updatePlayIcon(playing) {
    const icon = document.getElementById('vidPlayIcon');
    if (icon) icon.setAttribute('href', playing ? '#ico-pause' : '#ico-play');
  }

  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  }

  return { init, togglePlay, seek, toggleFullscreen };
})();

// Init when DOM is ready
document.addEventListener('DOMContentLoaded', () => VideoPlayer.init());
