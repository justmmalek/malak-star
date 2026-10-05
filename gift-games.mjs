import {GOALS,getGiftState,hitGiftBricks,completeBreaker,swapGiftPieces,replayGiftGame} from './gift-state.mjs?v=20261005-heart';
import {mountBreaker} from './star-breaker-view.mjs?v=20261005-challenge';
import {WIDTH,HEIGHT,HEART_TARGET} from './star-breaker-model.mjs?v=20261005-challenge';
import {PUZZLE_COLUMNS,PUZZLE_ROWS,heartPieceRect,isPiecePlaced} from './heart-puzzle.mjs?v=20261005-fit';
const dialog=document.getElementById('journey-dialog');
let mode='connect',guided=true,opener=null,scrollY=0,pointer=null;
let selected=null,dragStart=null,dragging=false,hintPointer=null,hintKey=null,celebrationTimer=0,returnTimer=0;
const ar=n=>n.toLocaleString('ar-JO');
const done=()=>mode==='connect'?getGiftState().connect===GOALS.connect:getGiftState().heartFound;

dialog.innerHTML=`<div class="star-play-shell">
  <header class="star-play-header"><h2 id="journey-title" tabindex="-1">تركيب قلب مالك</h2><button class="star-play-close" aria-label="إغلاق اللعبة">×</button></header>
  <p class="game-chapter" id="game-chapter"></p>
  <p id="puzzle-message" class="puzzle-message" aria-live="polite"></p>
  <p id="play-instruction" class="play-instruction"></p>
  <button id="puzzle-hint" class="puzzle-hint" aria-label="تلميح" aria-controls="puzzle-preview" aria-pressed="false">تلميح ◇</button>
  <div class="star-play-space"><div id="star-play-field" class="star-play-field">
    <div id="heart-puzzle" class="heart-puzzle" dir="ltr" aria-label="تركيب قلب مالك، اثنتا عشرة قطعة"></div>
    <div id="puzzle-ghost" class="puzzle-piece puzzle-ghost" aria-hidden="true" hidden></div>
    <img id="puzzle-preview" class="puzzle-preview" src="assets/malek-heart.svg" alt="القلب كاملًا، مرجع لتركيب القطع" hidden>
    <div id="breaker-stage" class="breaker-stage" tabindex="0" aria-label="الوصول لقلب مالك، حرّكي المضرب لتوصيل النجمة للقلب" hidden></div>
    <div class="star-play-result" hidden><span aria-hidden="true">♥</span><h3 id="play-result-title" tabindex="-1"></h3></div>
  </div></div>
  <div id="breaker-controls" class="breaker-controls" dir="ltr" hidden></div>
  <footer class="star-play-footer"><p id="play-progress" role="status" aria-live="polite"></p><div class="play-progress-dots" aria-hidden="true"></div><button id="game-next" class="game-next" hidden></button><button id="play-again" class="play-again" hidden>كمان مرّة ♡</button></footer>
</div><div id="heart-celebration" class="heart-celebration" aria-hidden="true"></div>`;
const field=dialog.querySelector('#star-play-field'),wrap=dialog.querySelector('.star-play-space');
const result=dialog.querySelector('.star-play-result'),replay=dialog.querySelector('#play-again'),next=dialog.querySelector('#game-next');
const progress=dialog.querySelector('#play-progress'),instruction=dialog.querySelector('#play-instruction'),message=dialog.querySelector('#puzzle-message');
const board=dialog.querySelector('#heart-puzzle'),ghost=dialog.querySelector('#puzzle-ghost'),preview=dialog.querySelector('#puzzle-preview'),hint=dialog.querySelector('#puzzle-hint');
const stage=dialog.querySelector('#breaker-stage'),controls=dialog.querySelector('#breaker-controls'),celebration=dialog.querySelector('#heart-celebration');
const breaker=mountBreaker(stage,controls,{
  onHit(ids){hitGiftBricks(ids);updateProgress();},
  onFinish(){completeBreaker();update();celebrate();dialog.querySelector('#play-result-title').focus({preventScroll:true});}
});
function pieceArt(piece){
  const {x,y,width,height}=heartPieceRect(piece);
  return `<svg class="puzzle-art" viewBox="${x} ${y} ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><image href="assets/malek-heart.svg" x="0" y="0" width="600" height="600"/></svg>`;
}
function paintPiece(element,piece){element.innerHTML=pieceArt(piece);}
function renderPuzzle(){
  board.innerHTML=getGiftState().board.map((piece,index)=>{
    const placed=isPiecePlaced(piece,index);
    return `<button class="puzzle-piece${placed?' placed':''}${index===selected?' selected':''}" data-cell="${index}" aria-label="قطعة ${index+1}${placed?'، بمكانها الصح':''}" aria-pressed="${index===selected}" ${placed?'disabled':''}>${pieceArt(piece)}${placed?'<span class="puzzle-check" aria-hidden="true">✓</span>':''}</button>`;
  }).join('');
}
function choosePiece(index){
  if(isPiecePlaced(getGiftState().board[index],index))return;
  if(selected===null){selected=index;renderPuzzle();return;}
  if(selected===index){selected=null;renderPuzzle();return;}
  swapGiftPieces(selected,index);selected=null;update();
  if(done()){
    (guided?next:replay).focus({preventScroll:true});
    if(guided)returnTimer=setTimeout(()=>{if(dialog.open&&mode==='connect'&&done())dialog.close();},1800);
  }
}
function cellAt(point){
  const rect=board.getBoundingClientRect(),x=point.x-rect.left,y=point.y-rect.top;
  if(x<0||y<0||x>=rect.width||y>=rect.height)return null;
  const index=Math.floor(y/rect.height*PUZZLE_ROWS)*PUZZLE_COLUMNS+Math.floor(x/rect.width*PUZZLE_COLUMNS);
  return isPiecePlaced(getGiftState().board[index],index)?null:index;
}
function clearDrag(){dragStart=null;dragging=false;ghost.hidden=true;board.classList.remove('dragging');board.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));}
function clearCelebration(){clearTimeout(celebrationTimer);celebration.replaceChildren();}
function celebrate(){
  clearCelebration();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,rect=stage.getBoundingClientRect(),origin={x:rect.left+rect.width*HEART_TARGET.x/WIDTH,y:rect.top+rect.height*HEART_TARGET.y/HEIGHT};
  const count=reduced?12:18;
  const colors=['#f6a8c9','#e5bf85','#ffcedd','#dca8ec'];
  function heart(className,x,y,dx,dy,size,delay,color){
    const el=document.createElement('span');el.className=className;el.textContent='♥';el.style.left=`${x}px`;el.style.top=`${y}px`;
    el.style.setProperty('--heart-color',color);el.style.setProperty('--heart-size',`${size}px`);el.style.setProperty('--heart-x',`${dx}px`);el.style.setProperty('--heart-y',`${dy}px`);el.style.setProperty('--heart-turn',`${Math.random()*180-90}deg`);el.style.setProperty('--heart-delay',`${delay}ms`);celebration.append(el);
  }
  for(let i=0;i<count;i++){
    const x=innerWidth*(.1+(i%4)*.26)+Math.random()*15,y=innerHeight*(.12+Math.floor(i/4)*.17),delay=180+(i%4)*90;
    if(reduced){heart('celebration-still',x,y,0,0,24,0,colors[i%4]);continue;}
    heart('heart-firework',origin.x,origin.y,x-origin.x,y-origin.y,25+Math.random()*16,delay,colors[i%4]);
    for(let j=0;j<5;j++){
      const angle=j/5*Math.PI*2,radius=65+Math.random()*100;
      heart('heart-fragment',x,y,Math.cos(angle)*radius,Math.sin(angle)*radius,13+Math.random()*12,delay+1180,colors[(i+j)%4]);
    }
  }
  celebrationTimer=setTimeout(()=>{
    clearCelebration();
    if(guided&&mode==='chase'&&done()&&dialog.open)dialog.close();
  },reduced?2500:6000);
}
function updateProgress(){
  const state=getGiftState(),complete=done();
  progress.textContent=complete?'✓':mode==='connect'?`${ar(state.connect)} من ${ar(GOALS.connect)} قطعة بمكانها`:`بلوكات: ${ar(state.chase)}`;
  dialog.querySelector('.play-progress-dots').innerHTML=mode==='connect'?Array.from({length:GOALS.connect},(_,i)=>`<span class="${i<state.connect?'filled':''}"></span>`).join(''):'';
}
function resize(){
  const rect=wrap.getBoundingClientRect(),ratio=mode==='connect'?1:WIDTH/HEIGHT;
  const width=Math.max(0,Math.min(rect.width,rect.height*ratio));field.style.width=`${width}px`;field.style.height=`${width/ratio}px`;
}
function update(){
  const complete=done(),puzzle=mode==='connect';
  dialog.classList.toggle('play-complete',complete);dialog.classList.toggle('play-connect',puzzle);dialog.classList.toggle('play-breaker',!puzzle);
  dialog.querySelector('#journey-title').textContent=puzzle?'تركيب قلب مالك':'الوصول لقلب مالك';
  dialog.querySelector('#game-chapter').textContent=guided?`${puzzle?'١':'٢'} من ٢`:'';
  message.hidden=!puzzle;message.textContent=complete?'بحبك يماما':'هاد قلبي الي لخبطتيه بحلاوتك يلا صليحه';
  instruction.textContent=complete?'':puzzle?'بدّلي قطعتين أو اسحبيهم؛ القطعة الصح بتثبت لحالها.':'حرّكي المضرب بإصبعكِ ووصّلي النجمة للقلب.';
  board.hidden=!puzzle||complete;hint.hidden=!puzzle||complete;preview.hidden=!puzzle||!complete;hint.setAttribute('aria-pressed','false');hintPointer=null;hintKey=null;
  if(puzzle)renderPuzzle();
  stage.hidden=puzzle;controls.hidden=puzzle||complete;result.hidden=puzzle||!complete;replay.hidden=!complete||guided;next.hidden=!complete||!guided;
  dialog.querySelector('#play-result-title').textContent='بحبككككككككككككك';
  next.textContent='رجوع للألعاب';updateProgress();resize();
}
function startMode(){
  breaker.deactivate();clearCelebration();clearTimeout(returnTimer);selected=null;clearDrag();pointer=null;
  if(mode==='chase')breaker.load(getGiftState().bricks);
  update();if(mode==='chase'&&!done()&&dialog.open)breaker.activate();
}
function showHint(){if(mode!=='connect'||done()||hint.hidden)return;preview.hidden=false;hint.setAttribute('aria-pressed','true');}
function hideHint(){hintPointer=null;hintKey=null;preview.hidden=mode!=='connect'||!done();hint.setAttribute('aria-pressed','false');}
hint.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0)return;
  event.preventDefault();hint.focus({preventScroll:true});hintPointer=event.pointerId;hint.setPointerCapture(hintPointer);showHint();
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])hint.addEventListener(type,event=>{if(event.pointerId===hintPointer)hideHint();});
hint.addEventListener('keydown',event=>{if(![' ','Enter'].includes(event.key))return;event.preventDefault();hintKey=event.key;showHint();});
hint.addEventListener('keyup',event=>{if(event.key===hintKey){event.preventDefault();hideHint();}});
hint.addEventListener('blur',hideHint);
hint.addEventListener('contextmenu',event=>event.preventDefault());
window.addEventListener('blur',hideHint);
board.addEventListener('click',event=>{const piece=event.target.closest('[data-cell]');if(piece&&event.detail===0&&!done()){const index=Number(piece.dataset.cell);choosePiece(index);if(!done())(board.querySelector(`[data-cell="${index}"]:not(:disabled)`)||board.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});}});
field.addEventListener('pointerdown',event=>{
  if(mode!=='connect'||!event.isPrimary||event.button!==0||done())return;
  const piece=event.target.closest('[data-cell]');if(!piece||piece.disabled||!preview.hidden)return;
  event.preventDefault();pointer=event.pointerId;field.setPointerCapture(pointer);dragStart={x:event.clientX,y:event.clientY,index:Number(piece.dataset.cell)};
});
field.addEventListener('pointermove',event=>{
  if(mode!=='connect'||event.pointerId!==pointer||done()||!dragStart)return;
  if(!dragging&&Math.hypot(event.clientX-dragStart.x,event.clientY-dragStart.y)>9){dragging=true;selected=dragStart.index;renderPuzzle();board.classList.add('dragging');paintPiece(ghost,getGiftState().board[selected]);ghost.hidden=false;}
  if(dragging){const rect=field.getBoundingClientRect();ghost.style.left=`${event.clientX-rect.left}px`;ghost.style.top=`${event.clientY-rect.top}px`;const hovered=cellAt({x:event.clientX,y:event.clientY});board.querySelectorAll('[data-cell]').forEach(el=>el.classList.toggle('drop-target',Number(el.dataset.cell)===hovered&&hovered!==selected));}
});
function releasePointer(event){
  if(event.pointerId!==pointer)return;
  if(dragStart&&event.type==='pointerup'){
    if(dragging){const target=cellAt({x:event.clientX,y:event.clientY});if(target!==null&&target!==selected)choosePiece(target);}
    else choosePiece(dragStart.index);
  }
  clearDrag();pointer=null;
}
for(const type of ['pointerup','pointercancel','lostpointercapture'])field.addEventListener(type,releasePointer);
replay.addEventListener('click',()=>{replayGiftGame(mode);startMode();(mode==='connect'?board.querySelector('button'):stage.querySelector('button')).focus({preventScroll:true});});
next.addEventListener('click',()=>dialog.close());
dialog.querySelector('.star-play-close').addEventListener('click',()=>dialog.close());
export function openGiftGame(requestedMode,source=document.activeElement){
  if(dialog.open)return;
  const state=getGiftState();guided=!state.unlocked;mode=requestedMode==='chase'&&(!guided||state.completed.connect)?'chase':'connect';
  if(state.unlocked&&done())replayGiftGame(mode);
  opener=source;scrollY=window.scrollY;document.body.style.top=`-${scrollY}px`;document.body.classList.add('surprise-open');
  startMode();dialog.showModal();resize();if(mode==='chase'&&!done())breaker.activate();
}
dialog.addEventListener('close',()=>{
  breaker.deactivate();clearDrag();clearCelebration();clearTimeout(returnTimer);hideHint();preview.hidden=true;pointer=null;document.body.classList.remove('surprise-open');document.body.style.top='';
  const revealing=guided&&getGiftState().unlocked;window.scrollTo(0,revealing?0:scrollY);
  if(guided&&done())document.dispatchEvent(new Event('gift:game-return'));
  else if(!revealing&&opener instanceof HTMLElement&&!opener.closest('[hidden]'))opener.focus({preventScroll:true});
});
new ResizeObserver(resize).observe(wrap);
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearDrag();hideHint();pointer=null;}});
