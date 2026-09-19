(() => {
  const music = document.getElementById('background-music');
  let context = null, musicGain = null, ducked = false;
  function setDucked(value) {
    ducked = Boolean(value);
    if (musicGain) {
      musicGain.gain.cancelScheduledValues(context.currentTime);
      musicGain.gain.setTargetAtTime(ducked ? 0.07 : 1, context.currentTime, ducked ? 0.08 : 0.25);
    }
    document.dispatchEvent(new CustomEvent('star:audio-duck', {detail: {ducked}}));
  }
  async function unlock() {
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio is unavailable');
      context = new AudioContextClass();
      musicGain = context.createGain();
      musicGain.gain.value = ducked ? 0.07 : 1;
      context.createMediaElementSource(music).connect(musicGain);
      musicGain.connect(context.destination);
    }
    // Resume inside the play gesture, before fetching or decoding.
    await context.resume();
    return context;
  }
  window.StarAudio = {unlock, setDucked, isDucked: () => ducked,
    resume: () => context ? context.resume() : Promise.resolve()};
})();
