(() => {
  const audio = document.getElementById('background-music');
  const toggle = document.getElementById('music-toggle');
  const status = document.getElementById('music-status');
  let wantsPlayback = true;
  let pending = false;
  let requestId = 0;
  const gestures = ['pointerup', 'touchend', 'click', 'keydown'];

  function syncButton() {
    const active = !audio.paused || pending;
    document.getElementById('music-icon').textContent = active ? 'Ⅱ' : '▶';
    toggle.setAttribute('aria-label', active ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى');
    toggle.setAttribute('aria-pressed', String(active));
  }

  async function play() {
    wantsPlayback = true;
    const id = ++requestId;
    pending = true;
    status.textContent = '';
    syncButton();
    try {
      // Call synchronously from a trusted gesture when autoplay is blocked.
      await Promise.all([audio.play(), window.StarAudio?.resume()]);
      if (id !== requestId) return;
      pending = false;
      syncButton();
    } catch (error) {
      if (id !== requestId) return;
      pending = false;
      status.textContent = error.name === 'NotAllowedError'
        ? ''
        : 'تعذّر تشغيل الموسيقى. يمكنكِ المحاولة من زر التشغيل.';
      syncButton();
    }
  }

  function pause() {
    wantsPlayback = false;
    ++requestId;
    pending = false;
    audio.pause();
    status.textContent = '';
    syncButton();
  }

  function firstGesture(event) {
    if (!event.isTrusted || !wantsPlayback || pending) return;
    if (event.target instanceof Element && event.target.closest('#music-toggle, #voice-note, audio')) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    resumePreferred();
  }

  function resumePreferred() {
    if (!wantsPlayback || pending || document.hidden) return;
    if (audio.paused) void play();
    else void window.StarAudio?.resume().catch(() => {});
  }

  toggle.addEventListener('click', () => {
    if (!audio.paused || pending) pause();
    else void play();
  });
  audio.addEventListener('playing', () => {
    pending = false;
    status.textContent = '';
    syncButton();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  });
  audio.addEventListener('pause', () => {
    pending = false;
    status.textContent = '';
    syncButton();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  });
  audio.addEventListener('waiting', () => {
    if (wantsPlayback) status.textContent = '';
  });
  audio.addEventListener('error', () => {
    pending = false;
    status.textContent = 'تعذّر تحميل الأغنية. تأكدي من الاتصال واضغطي التشغيل.';
    syncButton();
  });

  if ('mediaSession' in navigator) {
    if ('MediaMetadata' in window) navigator.mediaSession.metadata = new MediaMetadata({title: 'her', artist: 'JVKE'});
    navigator.mediaSession.setActionHandler('play', () => { void play(); });
    navigator.mediaSession.setActionHandler('pause', pause);
  }
  document.addEventListener('star:audio-duck', event => {
    if (!audio.paused) status.textContent = '';
  });
  window.StarMusic = {startForVoice() { if (wantsPlayback && audio.paused) void play(); }};
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resumePreferred(); });
  window.addEventListener('pageshow', resumePreferred);
  audio.addEventListener('ended', () => { if (wantsPlayback) void play(); });
  // Keep a single player outside every view. Browser/OS background policies
  // still apply; navigation inside the site never stops or restarts the song.
  audio.controls = false;
  audio.loop = true;
  toggle.hidden = false;
  gestures.forEach(type => document.addEventListener(type, firstGesture, {passive: true}));
  void play();
})();
