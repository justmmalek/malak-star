(() => {
  const dialog = document.getElementById('surprise-dialog');
  const launchers = document.querySelector('.surprise-launchers');
  const star = document.getElementById('note-star');
  const note = document.getElementById('star-note');
  const nextNote = document.getElementById('next-note');
  const messages = [
    'بين كل هالنجوم، إنتِ اللي بتضوّي أيامي.',
    'ضحكتكِ لحالها بتخلّي اليوم أحلى.',
    'لو كل كلمة بحبك تصير نجمة، كانت السما كلّها إلكِ.',
    'أحلى صدفة بحياتي كانت إنتِ.',
    'كل ما أشوف هالنجمة، بتذكّركِ وببتسم.',
    'إنتِ راحتي، وضحكتي، وأحلى جزء بيومي.',
    'يا ملك، وجودكِ بحياتي هدية كل يوم.',
    'لو أختار من جديد، كل مرة بختاركِ إنتِ.'
  ];
  let messageIndex = 0;
  let opener;
  let savedScrollY = 0;
  function showNote() {
    note.textContent = messages[messageIndex % messages.length];
    messageIndex++;
    star.setAttribute('aria-label', 'رسالة أخرى من نجمتكِ');
    nextNote.hidden = false;
  }

  document.querySelectorAll('[data-surprise]').forEach(button => {
    button.addEventListener('click', () => {
      if (dialog.open) return;
      opener = button;
      note.textContent = 'اكبسي عالنجمة ✦';
      nextNote.hidden = true;
      star.setAttribute('aria-label', 'افتحي رسالة من نجمتكِ');
      document.getElementById('note-surprise').hidden = false;
      // Fixed body locking also prevents background scrolling in mobile Safari.
      savedScrollY = window.scrollY;
      document.body.style.top = `-${savedScrollY}px`;
      document.body.classList.add('surprise-open');
      dialog.showModal();
    });
  });
  dialog.querySelector('.surprise-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('surprise-open');
    document.body.style.top = '';
    window.scrollTo(0, savedScrollY);
    opener?.focus({preventScroll: true});
  });
  star.addEventListener('click', showNote);
  nextNote.addEventListener('click', showNote);
  launchers.hidden = false;
})();
