(() => {
  const dialog = document.getElementById('surprise-dialog');
  const launchers = document.querySelector('.surprise-launchers');
  const hearts = document.getElementById('heart-surprise');
  const notes = document.getElementById('note-surprise');
  const field = document.getElementById('heart-field');
  const progress = document.getElementById('heart-progress');
  const instruction = hearts.querySelector('.surprise-instruction');
  const reveal = document.getElementById('heart-reveal');
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
  let collected = 0;

  function resetHearts() {
    collected = 0;
    field.replaceChildren();
    field.hidden = false;
    progress.hidden = false;
    reveal.hidden = true;
    instruction.hidden = false;
    progress.textContent = '٠ من ٥ قلوب';
    for (let i = 0; i < 5; i++) {
      const heart = document.createElement('button');
      heart.type = 'button';
      heart.className = 'collect-heart';
      heart.setAttribute('aria-label', `اجمعي القلب ${i + 1}`);
      heart.innerHTML = '<span aria-hidden="true">♥</span>';
      heart.addEventListener('click', () => {
        if (heart.getAttribute('aria-disabled') === 'true') return;
        // Keep each button focusable until the reveal so keyboard focus is stable.
        heart.setAttribute('aria-disabled', 'true');
        heart.setAttribute('aria-label', `تم جمع القلب ${i + 1}`);
        heart.classList.add('collected');
        heart.firstElementChild.textContent = '✦';
        collected++;
        progress.textContent = `${collected.toLocaleString('ar-JO')} من ٥ قلوب`;
        if (collected === 5) {
          field.hidden = true;
          progress.hidden = true;
          reveal.hidden = false;
          instruction.hidden = true;
          reveal.querySelector('h3').focus({preventScroll: true});
        }
      });
      field.append(heart);
    }
  }

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
      const isHearts = button.dataset.surprise === 'hearts';
      hearts.hidden = !isHearts;
      notes.hidden = isHearts;
      dialog.setAttribute('aria-labelledby', isHearts ? 'surprise-title' : 'note-title');
      if (isHearts) resetHearts();
      else {
        note.textContent = 'اكبسي عالنجمة ✦';
        nextNote.hidden = true;
        star.setAttribute('aria-label', 'افتحي رسالة من نجمتكِ');
      }
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
  document.getElementById('heart-replay').addEventListener('click', () => {
    resetHearts();
    field.querySelector('button').focus({preventScroll: true});
  });
  star.addEventListener('click', showNote);
  nextNote.addEventListener('click', showNote);
  launchers.hidden = false;
})();
