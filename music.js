(() => {
  const audio = document.getElementById('background-music');
  const toggle = document.getElementById('music-toggle');
  const status = document.getElementById('music-status');
  let wantsPlayback = true;
  let hasStarted = false;
  let pending = false;
  let requestId = 0;
  const gestures = ['pointerup', 'touchend', 'click', 'keydown'];

  function syncButton() {
    const active = !audio.paused || pending;
    toggle.textContent = active ? 'إيقاف الموسيقى' : 'شغّلي أغنيتنا';
    toggle.setAttribute('aria-pressed', String(active));
  }

  function removeGestureStart() {
    gestures.forEach(type => document.removeEventListener(type, firstGesture));
  }

  async function play() {
    wantsPlayback = true;
    const id = ++requestId;
    pending = true;
    status.textContent = 'جارٍ تشغيل أغنيتنا…';
    syncButton();
    try {
      // Call synchronously from a trusted gesture when autoplay is blocked.
      await audio.play();
    } catch (error) {
      if (id !== requestId) return;
      pending = false;
      status.textContent = error.name === 'NotAllowedError'
        ? 'لمسة منكِ، وتبدأ أغنيتنا ♫'
        : 'ما قدرنا نشغّل الأغنية. اضغطي التشغيل للمحاولة.';
      syncButton();
    }
  }

  function pause() {
    wantsPlayback = false;
    ++requestId;
    pending = false;
    removeGestureStart();
    audio.pause();
    status.textContent = 'الموسيقى متوقفة';
    syncButton();
  }

  function firstGesture(event) {
    if (!event.isTrusted || !wantsPlayback || hasStarted || pending || !audio.paused) return;
    if (event.target instanceof Element && event.target.closest('#music-toggle, audio')) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    void play();
  }

  toggle.addEventListener('click', () => {
    if (!audio.paused || pending) pause();
    else void play();
  });
  audio.addEventListener('playing', () => {
    hasStarted = true;
    pending = false;
    removeGestureStart();
    status.textContent = 'أغنيتنا شغّالة · تتكرر معكِ';
    syncButton();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  });
  audio.addEventListener('pause', () => {
    pending = false;
    status.textContent = 'الموسيقى متوقفة';
    syncButton();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  });
  audio.addEventListener('waiting', () => {
    if (wantsPlayback) status.textContent = 'جارٍ تحميل الأغنية…';
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
  // Keep a single player outside every view. Browser/OS background policies
  // still apply; navigation inside the site never stops or restarts the song.
  audio.controls = false;
  toggle.hidden = false;
  gestures.forEach(type => document.addEventListener(type, firstGesture, {passive: true}));
  void play();
})();
