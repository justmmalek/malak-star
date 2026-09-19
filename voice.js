(() => {
  const button = document.getElementById('voice-toggle');
  const icon = document.getElementById('voice-icon');
  const progress = document.getElementById('voice-progress');
  const time = document.getElementById('voice-time');
  const status = document.getElementById('voice-status');
  const mixer = window.StarAudio;
  let context = null, buffer = null, source = null, bytesPromise = null, voiceGain = null;
  let offset = 0, startedAt = 0, generation = 0, frame = null;
  let playing = false, loading = false, seeking = false;
  const format = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const position = () => Math.min(buffer?.duration || 26, offset + (playing ? context.currentTime - startedAt : 0));
  function announce(text, error = false) {
    status.textContent = text;
    status.classList.toggle('sr-only', !error);
  }
  function render() {
    const seconds = position(), duration = buffer?.duration || 26;
    if (!seeking) progress.value = seconds;
    time.textContent = `${format(seconds >= duration - 0.02 ? Math.round(duration) : seconds)} / ${format(Math.round(duration))}`;
    progress.setAttribute('aria-valuetext', `${format(seconds)} من ${format(duration)}`);
    if (playing) frame = requestAnimationFrame(render);
  }
  function syncButton() {
    button.disabled = loading;
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? 'إيقاف الرسالة الصوتية مؤقتًا' : 'تشغيل الرسالة الصوتية');
    icon.textContent = loading ? '…' : playing ? 'Ⅱ' : '▶';
  }
  function stopSource() {
    if (!source) return;
    source.onended = null;
    source.stop();
    source.disconnect();
    source = null;
  }
  function pauseVoice() {
    ++generation;
    if (playing) offset = position();
    playing = false;
    loading = false;
    stopSource();
    cancelAnimationFrame(frame);
    mixer.setDucked(false);
    syncButton();
    render();
    announce('الرسالة متوقفة مؤقتًا');
  }
  function loadBytes() {
    if (!bytesPromise) bytesPromise = fetch('assets/voice-from-malek.m4a')
      .then(response => { if (!response.ok) throw new Error('Voice file unavailable'); return response.arrayBuffer(); })
      .catch(error => { bytesPromise = null; throw error; });
    return bytesPromise;
  }
  async function playVoice() {
    const request = ++generation;
    loading = true;
    syncButton();
    announce('جارٍ تحميل الرسالة');
    try {
      // Buffer playback mixes with the music without starting a second HTML
      // media player. GainNode controls volume even on iOS Safari.
      const ready = mixer.unlock();
      mixer.setDucked(true);
      window.StarMusic?.startForVoice();
      const [audioContext, bytes] = await Promise.all([ready, loadBytes()]);
      context = audioContext;
      if (!buffer) buffer = await context.decodeAudioData(bytes.slice(0));
      if (request !== generation) return;
      if (offset >= buffer.duration - 0.02) offset = 0;
      source = context.createBufferSource();
      source.buffer = buffer;
      if (!voiceGain) {
        voiceGain = context.createGain();
        voiceGain.gain.value = 3.2;
        voiceGain.connect(context.destination);
      }
      source.connect(voiceGain);
      const currentSource = source;
      source.onended = () => {
        if (source !== currentSource || !playing) return;
        playing = false;
        offset = buffer.duration;
        source.disconnect();
        source = null;
        cancelAnimationFrame(frame);
        mixer.setDucked(false);
        syncButton();
        render();
        announce('انتهت الرسالة');
      };
      progress.max = buffer.duration;
      progress.disabled = false;
      startedAt = context.currentTime;
      playing = true;
      loading = false;
      source.start(0, offset);
      syncButton();
      render();
      announce('الرسالة شغّالة');
    } catch {
      if (request !== generation) return;
      loading = false;
      playing = false;
      stopSource();
      mixer.setDucked(false);
      syncButton();
      announce('تعذّر تشغيل الفويس. اضغطي التشغيل للمحاولة.', true);
    }
  }
  button.addEventListener('click', () => { if (playing) pauseVoice(); else void playVoice(); });
  progress.addEventListener('input', () => { seeking = true; });
  progress.addEventListener('change', () => {
    if (!buffer) return;
    const resume = playing, next = Math.min(buffer.duration, Number(progress.value));
    pauseVoice();
    offset = next;
    seeking = false;
    render();
    if (resume && next < buffer.duration - 0.02) void playVoice();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (playing || loading)) pauseVoice();
  });
  button.disabled = false;
})();
