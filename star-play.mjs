import {HEART,TOTAL,restorePlay,starPosition,canCatch,heartPath} from './star-play-model.mjs';
const dialog=document.getElementById('journey-dialog'),launch=document.getElementById('journey-launch');
const STORAGE='malak-star-touch-play-v2';
let state;
try{state=restorePlay(localStorage.getItem(STORAGE));}catch{state=restorePlay(null);}
let scrollY=0,frame=0,size=0,pointer=null,lastCatch=-Infinity,lastFinger=null,active={x:0,y:0};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const ar=n=>n.toLocaleString('ar-JO'),count=()=>state[state.mode],done=()=>count()===TOTAL;
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch{/* Play also works without storage. */}}
dialog.innerHTML=`<div class="star-play-shell">
  <header class="star-play-header"><h2 id="journey-title">العبي مع نجمتكِ</h2><button class="star-play-close" aria-label="إغلاق اللعبة">×</button></header>
  <div class="star-play-modes" role="group" aria-label="اختاري اللعبة"><button data-mode="chase" aria-pressed="false">لحّقي النجمة</button><button data-mode="connect" aria-pressed="false">وصّلي القلب</button></div>
  <p id="play-instruction" class="play-instruction"></p>
  <div class="star-play-space"><div id="star-play-field" class="star-play-field">
    <svg class="heart-trail" viewBox="0 0 100 100" aria-hidden="true"><path class="heart-guide" d="${heartPath(TOTAL)}"/><path id="caught-trail"/>${HEART.slice(0,-1).map(([x,y],i)=>`<circle data-dot="${i}" cx="${x}" cy="${y}" r=".9"/>`).join('')}</svg>
    <div class="star-burst" aria-hidden="true">${Array.from({length:8},(_,i)=>`<i style="--turn:${i*45}deg">✦</i>`).join('')}</div>
    <button id="catch-star" class="catch-star" aria-label="المسي النجمة المضيئة"><span aria-hidden="true">✦</span></button>
    <div class="star-play-result" hidden><h3 id="play-result-title" tabindex="-1">بحبك يا ملك</h3></div>
  </div></div>
  <footer class="star-play-footer"><p id="play-progress" role="status" aria-live="polite"></p><div class="play-progress-dots" aria-hidden="true">${Array.from({length:TOTAL},()=>'<span></span>').join('')}</div><button id="play-again" class="play-again" hidden>كمان مرّة ♡</button></footer>
</div>`;
const field=dialog.querySelector('#star-play-field'),wrap=dialog.querySelector('.star-play-space'),star=dialog.querySelector('#catch-star');
const burst=dialog.querySelector('.star-burst'),result=dialog.querySelector('.star-play-result'),replay=dialog.querySelector('#play-again');
const progress=dialog.querySelector('#play-progress'),instruction=dialog.querySelector('#play-instruction');
function placeStar(time=performance.now()){
  active=starPosition(count(),size,time,state.mode==='chase'&&!reduced.matches);
  star.style.left=`${active.x}px`;star.style.top=`${active.y}px`;
}
function stopMotion(){cancelAnimationFrame(frame);frame=0;}
function animate(time){
  frame=0;if(!dialog.open||document.hidden||done())return;
  placeStar(time);if(state.mode==='chase'&&!reduced.matches)frame=requestAnimationFrame(animate);
}
function startMotion(){stopMotion();if(dialog.open&&!done())frame=requestAnimationFrame(animate);}
function resize(){
  const rect=wrap.getBoundingClientRect();size=Math.max(0,Math.min(rect.width,rect.height));
  field.style.width=`${size}px`;field.style.height=`${size}px`;placeStar();
}
function update(){
  const complete=done();
  dialog.classList.toggle('play-complete',complete);dialog.classList.toggle('play-connect',state.mode==='connect');
  dialog.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===state.mode)));
  instruction.textContent=complete?'رسمتي قلبي بالنجوم.':state.mode==='chase'?'لحّقي النجمة ولمسيها ✦':'وصّلي النجوم المضيئة بلمسات أو بسحبة إصبع.';
  dialog.querySelector('#caught-trail').setAttribute('d',heartPath(count()));
  dialog.querySelectorAll('[data-dot]').forEach(dot=>dot.classList.toggle('caught',Number(dot.dataset.dot)<count()));
  dialog.querySelectorAll('.play-progress-dots span').forEach((dot,i)=>dot.classList.toggle('filled',i<count()));
  progress.textContent=complete?'هالقلب إلكِ.':`${ar(count())} من ${ar(TOTAL)} نجمة${count()>=9?' · قربتي!':''}`;
  star.hidden=complete;result.hidden=!complete;replay.hidden=!complete;
  star.setAttribute('aria-label',`المسي النجمة المضيئة ${count()+1}`);placeStar();startMotion();
}
function catchStar(x=active.x,y=active.y){
  if(done()||!dialog.open)return;
  const now=performance.now();
  lastCatch=now;lastFinger={x,y};
  burst.style.left=`${active.x}px`;burst.style.top=`${active.y}px`;
  burst.classList.remove('bursting');void burst.offsetWidth;burst.classList.add('bursting');
  state[state.mode]++;save();update();
  if(done()){stopMotion();dialog.querySelector('#play-result-title').focus({preventScroll:true});}
}
function touchPosition(event){const rect=field.getBoundingClientRect();return{x:event.clientX-rect.left,y:event.clientY-rect.top};}
field.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0||done())return;
  event.preventDefault();pointer=event.pointerId;lastFinger=null;field.setPointerCapture(pointer);
  const point=touchPosition(event);if(canCatch(point.x,point.y,active))catchStar(point.x,point.y);
});
field.addEventListener('pointermove',event=>{
  if(state.mode!=='connect'||event.pointerId!==pointer||done()||performance.now()-lastCatch<100)return;
  const point=touchPosition(event);
  if(lastFinger&&Math.hypot(point.x-lastFinger.x,point.y-lastFinger.y)<12)return;
  if(canCatch(point.x,point.y,active))catchStar(point.x,point.y);
});
function releasePointer(event){if(event.pointerId===pointer)pointer=null;}
for(const type of ['pointerup','pointercancel','lostpointercapture'])field.addEventListener(type,releasePointer);
// Physical contacts are handled on the field; keyboard activation stays usable.
star.addEventListener('click',event=>{if(event.detail===0)catchStar();});
star.addEventListener('keydown',event=>{if(event.repeat&&['Enter',' '].includes(event.key))event.preventDefault();});
replay.addEventListener('click',()=>{state[state.mode]=0;lastCatch=-Infinity;pointer=null;save();update();resize();star.focus({preventScroll:true});});
dialog.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  state.mode=button.dataset.mode;pointer=null;lastCatch=-Infinity;save();update();resize();
}));
dialog.querySelector('.star-play-close').addEventListener('click',()=>dialog.close());
launch.addEventListener('click',()=>{
  if(dialog.open)return;
  scrollY=window.scrollY;document.body.style.top=`-${scrollY}px`;document.body.classList.add('surprise-open');
  update();dialog.showModal();resize();startMotion();
});
dialog.addEventListener('close',()=>{
  stopMotion();pointer=null;save();document.body.classList.remove('surprise-open');document.body.style.top='';
  window.scrollTo(0,scrollY);launch.focus({preventScroll:true});
});
new ResizeObserver(resize).observe(wrap);
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopMotion();pointer=null;}else startMotion();});
reduced.addEventListener('change',startMotion);launch.disabled=false;
