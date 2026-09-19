(() => {
  const toggle = document.getElementById('music-toggle');
  const panel = document.getElementById('music-panel');
  const container = document.getElementById('music-player');
  toggle.hidden = false;

  toggle.addEventListener('click', () => {
    const opening = panel.hidden;
    if (opening) {
      // Load the official player only after a deliberate tap.
      const player = document.createElement('iframe');
      player.src = 'https://www.youtube-nocookie.com/embed/f5-IY_Ja1RM?autoplay=1&playsinline=1&rel=0&hl=ar';
      player.title = 'JVKE — her (official lyric video)';
      player.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      player.allowFullscreen = true;
      player.referrerPolicy = 'strict-origin-when-cross-origin';
      container.replaceChildren(player);
    } else {
      // Removing the iframe also stops its sound; it is never a hidden player.
      container.replaceChildren();
    }
    panel.hidden = !opening;
    toggle.setAttribute('aria-expanded', String(opening));
    toggle.textContent = opening ? 'إيقاف وإغلاق الأغنية' : 'شغّلي أغنيتنا';
  });
})();
