import {ALL_LIGHTS, LIGHT_MASKS, INITIAL_LIGHTS, NODES, EDGES, SIGNAL_LENGTHS, KEYS, solveLights, traceEdges, extendTrace, finishTrace, checkPin, freshJourney, restoreJourney} from './journey-model.mjs';

const STORAGE = 'malak-star-journey-v1';
const dialog = document.getElementById('journey-dialog');
const launch = document.getElementById('journey-launch');
const arabic = n => n.toLocaleString('ar-JO');
let state;
let canSave = true;
try { state = restoreJourney(localStorage.getItem(STORAGE)); } catch { state = freshJourney(); canSave = false; }
let savedScroll = 0;
let signalMode = 'idle';
let entered = [];
let playbackId = 0;
const timers = new Map();
const titles = ['مرصد الضوء','صدى النجوم','الخيط الخفي','القفل الأخير'];
const names = ['الضوء','الإشارة','الكوكبة','الرسالة'];
const symbols = ['✦','☾','☀','◇'];
const instructions = [
  'نوّري كل النجوم. كل كبسة بتقلب النجمة وجيرانها فوق، تحت، يمين ويسار. فكّري بالكبسات اللي بتلغي أثر بعض.',
  'راقبي الإشارات، وبعدين رجّعي نفس الترتيب. أربع جولات، وكل جولة أطول من اللي قبلها.',
  'ارسمي الكوكبة كلها بمسار واحد: اكبسي النجوم بالتتابع ومرّي بكل خط مرة واحدة. ممكن ترجعي لنفس النجمة، بس مش لنفس الخط.',
  'الرموز اللي جمعتيها هي مفتاح الرسالة. حوّلي كل سطر لرقم، واكتبي الأرقام الأربعة بترتيب الخانات.'
];

function save() {
  try { localStorage.setItem(STORAGE,JSON.stringify(state)); } catch { canSave = false; }
  launch.querySelector('small').textContent = state.complete ? 'ارجعي لرسالتكِ' : state.started ? 'كمّلي رحلتكِ' : 'أربع مراحل… وسرّ إلكِ';
}
function pauseSignal() {
  playbackId++;
  for (const [id,resolve] of timers) { clearTimeout(id); resolve(); }
  timers.clear();
  signalMode = 'idle'; entered = [];
}
function delay(ms) { return new Promise(resolve => { const id = setTimeout(() => {timers.delete(id);resolve();},ms); timers.set(id,resolve); }); }
function feedback(text) { document.getElementById('journey-feedback').textContent = text; }
function focusHeading() { dialog.querySelector('#mission-title')?.focus({preventScroll:true}); }
function setBodyLock(lock) {
  if (lock) {
    savedScroll = window.scrollY;
    document.body.style.top = `-${savedScroll}px`;
    document.body.classList.add('surprise-open');
  } else {
    document.body.classList.remove('surprise-open'); document.body.style.top = '';
    window.scrollTo(0,savedScroll); launch.focus({preventScroll:true});
  }
}
function renderShell() {
  pauseSignal();
  dialog.innerHTML = `
    <header class="journey-header"><h2 id="journey-title">رسالة بين النجوم</h2><button class="journey-close" aria-label="إغلاق الرحلة">×</button></header>
    <nav class="journey-steps" aria-label="مراحل الرحلة">${names.map((name,i) => `<button data-chapter="${i}" ${i > 0 && !state.solved[i-1] ? 'disabled' : ''} ${state.stage === i ? 'aria-current="step"' : ''}><span>${(i < 3 && state.solved[i]) || (i === 3 && state.complete) ? '✓' : arabic(i+1)}</span>${name}</button>`).join('')}</nav>
    <div id="journey-content"></div>
    <footer class="journey-footer"><span>${canSave ? 'رحلتكِ بتنحفظ على هالجهاز تلقائيًا.' : 'الحفظ مش متاح بهالمتصفح؛ خلي الصفحة مفتوحة لتكمّلي.'}</span><button id="journey-restart" class="journey-link">رحلة جديدة</button></footer>`;
  dialog.querySelector('.journey-close').addEventListener('click',() => dialog.close());
  dialog.querySelectorAll('[data-chapter]').forEach(button => button.addEventListener('click',() => {state.stage=Number(button.dataset.chapter);state.started=true;save();render();focusHeading();}));
  dialog.querySelector('#journey-restart').addEventListener('click',confirmRestart);
  dialog.scrollTop=0;
}
function journal() {
  return `<aside class="journey-journal" aria-label="دفتر الرحلة"><h4>دفتر الرحلة</h4><div>${KEYS.map((key,i) => `<p><span class="journal-value">${state.solved[i] ? arabic(key.value) : '؟'}</span><span class="journal-symbol" aria-hidden="true">${key.symbol}</span><small>${key.name}${state.solved[i] ? '' : ' · مقفلة'}</small></p>`).join('')}</div></aside>`;
}
function render() {
  renderShell();
  const content = dialog.querySelector('#journey-content');
  if (!state.started) {
    content.innerHTML = `<section class="journey-intro"><div class="intro-orbit" aria-hidden="true"><span>✦</span></div><h3 id="mission-title" tabindex="-1">تركتلك رسالة،<br>ومفتاحها بين النجوم.</h3><p>أربع مراحل من الضوء، الذاكرة والشيفرات.<br>كل لغز بيفتح باب، وكل باب بقرّبكِ منّي.</p><button class="journey-primary" id="journey-start">ابدئي الرحلة</button><p class="journey-intro-note">خدي وقتكِ. ما في عدّاد، وفي تلميحات إذا احتجتي.</p></section>`;
    content.querySelector('#journey-start').addEventListener('click',() => {state.started=true;save();render();focusHeading();});
    return;
  }
  if (state.stage === 3 && state.complete) { renderLetter(content); return; }
  const solved = state.stage < 3 && state.solved[state.stage];
  content.innerHTML = `<section class="mission-layout">
    <div class="mission-brief"><h3 id="mission-title" tabindex="-1">${titles[state.stage]}</h3><div class="mission-rule" aria-hidden="true">✦</div><p>${solved ? 'انفتح هالباب، وصار معكِ مفتاح جديد للرسالة.' : instructions[state.stage]}</p><p class="journey-metric" id="journey-metric"></p></div>
    <div class="mission-play" id="mission-play"></div>
    ${journal()}
    <div class="mission-tools"><p id="journey-feedback" role="status" aria-live="polite"></p><div class="mission-actions">${solved ? '' : '<button id="journey-hint" class="journey-secondary">تلميح</button><button id="stage-reset" class="journey-secondary">إعادة المرحلة</button>'}</div></div>
  </section>`;
  if (solved) {renderReward();return;}
  const board = dialog.querySelector('#mission-play');
  [renderLights,renderSignal,renderTrace,renderCipher][state.stage](board);
  dialog.querySelector('#journey-hint').addEventListener('click',showHint);
  dialog.querySelector('#stage-reset').addEventListener('click',resetStage);
}
function metric(text) { dialog.querySelector('#journey-metric').textContent = text; }
function completeStage() { state.solved[state.stage]=true;save();render();focusHeading(); }
function renderReward() {
  const key = KEYS[state.stage];
  metric('اكتملت المرحلة');
  dialog.querySelector('#mission-play').innerHTML = `<div class="journey-reward"><span class="reward-symbol" aria-hidden="true">${key.symbol}</span><h4>${key.name} = ${arabic(key.value)}</h4><p>احتفظي بهالرمز في دفتر الرحلة.<br>رح تحتاجيه عند القفل الأخير.</p><button id="next-chapter" class="journey-primary">${state.stage === 2 ? 'إلى القفل الأخير' : 'افتحي المرحلة التالية'}</button></div>`;
  dialog.querySelector('#next-chapter').addEventListener('click',() => {state.stage++;save();render();focusHeading();});
}
function renderLights(board) {
  board.innerHTML = `<div class="orbital-board"><div class="light-grid" aria-label="لوحة الضوء، أربعة صفوف وأربعة أعمدة">${Array.from({length:16},(_,i) => `<button class="light-cell" data-light="${i}" aria-label="نجمة الصف ${Math.floor(i/4)+1} العمود ${i%4+1}"><span aria-hidden="true"></span></button>`).join('')}</div></div>`;
  board.querySelectorAll('[data-light]').forEach(button => button.addEventListener('click',() => {
    state.lights ^= LIGHT_MASKS[Number(button.dataset.light)];state.moves++;save();
    if (state.lights === ALL_LIGHTS) completeStage();
    else {updateLights();feedback('');}
  }));
  updateLights();
}
function updateLights() {
  dialog.querySelectorAll('[data-light]').forEach((button,i) => {const lit=Boolean(state.lights & (1<<i));button.classList.toggle('lit',lit);button.classList.remove('hinted');button.setAttribute('aria-pressed',String(lit));});
  metric(`الخطوات: ${arabic(state.moves)} · مضاءة: ${arabic(state.lights.toString(2).replace(/0/g,'').length)} / ١٦`);
}
function renderSignal(board) {
  board.innerHTML = `<div class="signal-grid" aria-label="لوحة الإشارات">${symbols.map((symbol,i) => `<button class="signal-pad pad-${i}" data-signal="${i}" disabled aria-label="إشارة ${['النجمة','القمر','الشمس','الماسة'][i]}"><span aria-hidden="true">${symbol}</span><small>${['النجمة','القمر','الشمس','الماسة'][i]}</small></button>`).join('')}</div><button id="signal-play" class="journey-primary">اعرضي الإشارة</button><p class="signal-guide" id="signal-guide">ابدئي العرض، وبعدين دوركِ.</p>`;
  board.querySelector('#signal-play').addEventListener('click',() => playSignal(false));
  board.querySelectorAll('[data-signal]').forEach(button => button.addEventListener('click',() => enterSignal(Number(button.dataset.signal))));
  metric(`الجولة ${arabic(state.signalRound+1)} من ٤ · ${arabic(SIGNAL_LENGTHS[state.signalRound])} إشارات`);
}
async function playSignal(slow) {
  pauseSignal();
  const id = playbackId;
  signalMode='showing'; entered=[];
  const pads=[...dialog.querySelectorAll('[data-signal]')];
  const play=dialog.querySelector('#signal-play');
  play.disabled=true; pads.forEach(pad=>{pad.disabled=true;pad.classList.remove('flashing','entered');});
  dialog.querySelector('#signal-guide').textContent='راقبي الترتيب…';
  feedback('');
  await delay(450);
  for (let i=0;i<SIGNAL_LENGTHS[state.signalRound];i++) {
    if (id !== playbackId) return;
    const index=state.sequence[i];pads[index].classList.add('flashing');
    dialog.querySelector('#signal-guide').textContent=`الإشارة ${arabic(i+1)}: ${['النجمة','القمر','الشمس','الماسة'][index]}`;
    await delay(slow?1100:680);
    if (id !== playbackId) return;
    pads[index].classList.remove('flashing');
    await delay(slow?450:300);
  }
  if (id !== playbackId) return;
  signalMode='input';pads.forEach(pad=>pad.disabled=false);play.disabled=false;play.textContent='أعيدي العرض';
  dialog.querySelector('#signal-guide').textContent='دوركِ: رجّعي الإشارات بنفس الترتيب.';
}
function enterSignal(index) {
  if (signalMode !== 'input') return;
  if (state.sequence[entered.length] !== index) {
    signalMode='idle';entered=[];
    dialog.querySelectorAll('[data-signal]').forEach(pad=>{pad.disabled=true;pad.classList.remove('entered');});
    dialog.querySelector('#signal-guide').textContent='ترتيب مختلف. أعيدي العرض وجرّبي نفس الجولة.';
    feedback('الجولات اللي خلّصتيها محفوظة.');return;
  }
  entered.push(index);
  dialog.querySelectorAll('[data-signal]').forEach(pad=>pad.classList.toggle('entered',Number(pad.dataset.signal)===index));
  dialog.querySelector('#signal-guide').textContent=`صحّ · ${arabic(entered.length)} من ${arabic(SIGNAL_LENGTHS[state.signalRound])}`;
  if (entered.length === SIGNAL_LENGTHS[state.signalRound]) {
    state.signalRound++;save();
    if (state.signalRound === 4) completeStage();
    else {render();feedback('صحّ! هسا الإشارة أطول.');}
  }
}
function renderTrace(board) {
  board.innerHTML = `<div class="trace-board"><svg viewBox="0 0 100 100" aria-hidden="true">${EDGES.map(([a,b],i) => `<line data-edge="${i}" x1="${NODES[a][0]}" y1="${NODES[a][1]}" x2="${NODES[b][0]}" y2="${NODES[b][1]}"/>`).join('')}</svg>${NODES.map(([x,y],i) => `<button class="trace-node" data-node="${i}" style="left:${x}%;top:${y}%" aria-label="النجمة ${i+1}"><span aria-hidden="true">${arabic(i+1)}</span></button>`).join('')}</div><button id="trace-undo" class="journey-secondary">تراجعي خطوة</button>`;
  board.querySelectorAll('[data-node]').forEach(button=>button.addEventListener('click',()=>{
    const next=extendTrace(state.trace,Number(button.dataset.node));
    if (!next) {feedback('اختاري نجمة موصولة بمكانكِ بخط لسه ما مرّيتي فيه.');return;}
    state.trace=next;save();
    if (state.trace.length === EDGES.length+1) completeStage();
    else {updateTrace();feedback(state.trace.length > 1 && !finishTrace(state.trace) ? 'هالمسار وصل لطريق مسدود. تراجعي خطوة أو أكثر وجرّبي فرع ثاني.' : '');}
  }));
  board.querySelector('#trace-undo').addEventListener('click',()=>{state.trace.pop();save();updateTrace();feedback('');});
  updateTrace();
}
function updateTrace() {
  const edges=traceEdges(state.trace);
  dialog.querySelectorAll('[data-edge]').forEach(line=>line.classList.toggle('traced',edges.includes(Number(line.dataset.edge))));
  dialog.querySelectorAll('[data-node]').forEach(button=>{const here=Number(button.dataset.node)===state.trace.at(-1);button.classList.toggle('current',here);button.classList.remove('hinted');button.setAttribute('aria-pressed',String(here));});
  dialog.querySelector('#trace-undo').disabled=!state.trace.length;
  metric(`الخطوط: ${arabic(edges.length)} من ${arabic(EDGES.length)}${state.trace.length ? ` · مكانكِ: النجمة ${arabic(state.trace.at(-1)+1)}` : ''}`);
}
function renderCipher(board) {
  metric('ثلاثة مفاتيح · رمز من أربع خانات');
  board.innerHTML = `<form id="cipher-form" class="cipher-form"><ol class="cipher-clues"><li><span>١</span>القمر ناقص النجمة</li><li><span>٢</span>الشمس زائد النجمة</li><li><span>٣</span>القمر كما هو</li><li><span>٤</span>الشمس كما هي</li></ol><label for="cipher-pin">الرمز، من الخانة الأولى للرابعة</label><input id="cipher-pin" type="text" dir="ltr" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="— — — —" aria-describedby="journey-feedback"><button class="journey-primary" type="submit">افتحي الرسالة</button></form>`;
  board.querySelector('#cipher-form').addEventListener('submit',event=>{
    event.preventDefault();
    const input=board.querySelector('#cipher-pin');
    if (!checkPin(input.value)) {input.setAttribute('aria-invalid','true');feedback('لسه القفل مسكّر. راجعي رموز الدفتر ورتّبي الخانات من ١ إلى ٤.');return;}
    state.complete=true;save();render();focusHeading();
  });
}
function showHint() {
  const level=Math.min(3,++state.hints[state.stage]);state.hints[state.stage]=level;save();
  const hints=[
    ['كل نجمة بتنقلب مرتين بترجع زي ما كانت. فكّري بأثر الكبسات مع بعض.','اعملي صف صف: لما تختاري نجمة بالصف اللي تحت، بتغيّري اللي فوقها.'],
    ['ركّزي بأسماء الرموز بدل أماكنها، وقسّمي الترتيب لمجموعات.'],
    ['عُدّي الخطوط عند كل نجمة. البداية والنهاية لازم يكون عدد خطوطهم فردي.','ابدئي من النجمة ٣ أو ٤. خلّي مسار للرجعة وما تسكّري فرع قبل وقته.'],
    ['النجمة = ٤، القمر = ٧، الشمس = ٢. طبّقي المكتوب على كل خانة.','أول خانة: ٧ ناقص ٤. ثاني خانة: ٢ زائد ٤.','الرمز من اليسار لليمين: ٣٦٧٢.']
  ];
  if (state.stage === 0 && level === 3) {
    const next=solveLights(state.lights)?.[0];
    if (next !== undefined) {dialog.querySelectorAll('[data-light]').forEach(b=>b.classList.remove('hinted'));dialog.querySelector(`[data-light="${next}"]`).classList.add('hinted');feedback(`جرّبي نجمة الصف ${arabic(Math.floor(next/4)+1)}، العمود ${arabic(next%4+1)} من اليسار. علّمتها إلكِ.`);}
  } else if (state.stage === 1 && level > 1) {
    void playSignal(true);feedback('رح نعرض نفس الإشارة أبطأ.');
  } else if (state.stage === 2 && level === 3) {
    const path=finishTrace(state.trace);
    if (!path) feedback('لازم ترجعي خطوة أو أكثر؛ ما في طريق يكمل كل الخطوط من هون.');
    else {const next=path[state.trace.length];dialog.querySelectorAll('[data-node]').forEach(b=>b.classList.remove('hinted'));dialog.querySelector(`[data-node="${next}"]`)?.classList.add('hinted');feedback(`الخطوة التالية الممكنة: النجمة ${arabic(next+1)}.`);}
  } else feedback(hints[state.stage][Math.min(level-1,hints[state.stage].length-1)]);
}
function resetStage() {
  if (state.stage===0) {state.lights=INITIAL_LIGHTS;state.moves=0;}
  if (state.stage===1) {state.signalRound=0;}
  if (state.stage===2) state.trace=[];
  save();render();focusHeading();feedback('رجعنا لبداية هالمرحلة. المفاتيح السابقة معكِ.');
}
function renderLetter(content) {
  content.innerHTML=`<section class="journey-letter"><span class="letter-star" aria-hidden="true">✦</span><h3 id="mission-title" tabindex="-1">كل الطرق كانت بتوصّلني إلكِ.</h3><div class="letter-paper"><h4>بحبك يا ملك.</h4><p>حلّيتي الضوء، وحفظتي الإشارات، ووصلتي النجوم…<br>بس في شغلة ما بدها أي شيفرة:</p><p>إنتِ أجمل جزء بيومي، والضحكة اللي بحبّها،<br>والشخص اللي بختاره كل مرة.</p><p>هالنجمة تذكير صغير،<br>إنه في حدا هون، كل ما يطلع عالسما، بتذكّركِ.</p><p class="letter-signature">مالك</p></div><button id="letter-close" class="journey-primary">ارجعي لنجمتكِ</button></section>`;
  content.querySelector('#letter-close').addEventListener('click',()=>dialog.close());
}
function confirmRestart() {
  pauseSignal();
  const content=dialog.querySelector('#journey-content');
  content.innerHTML=`<section class="journey-intro"><h3 id="mission-title" tabindex="-1">نبدأ من أول النجوم؟</h3><p>رح ينمسح تقدّم هالرحلة وتبدأ الألغاز من جديد.</p><div class="mission-actions"><button id="restart-confirm" class="journey-primary">ابدئي من جديد</button><button id="restart-cancel" class="journey-secondary">كمّلي رحلتي</button></div></section>`;
  content.querySelector('#restart-confirm').addEventListener('click',()=>{state=freshJourney();state.started=true;save();render();focusHeading();});
  content.querySelector('#restart-cancel').addEventListener('click',()=>{render();focusHeading();});focusHeading();
}
launch.addEventListener('click',()=>{if(dialog.open)return;render();setBodyLock(true);dialog.showModal();});
dialog.addEventListener('close',()=>{pauseSignal();save();setBodyLock(false);});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden && dialog.open && state.stage===1 && !state.solved[1]) {render();feedback('وقّفنا عرض الإشارة. أعيدي عرضها لما ترجعي.');}
});
launch.disabled=false;save();
