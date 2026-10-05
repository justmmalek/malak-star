import {HEART_TAPS,getGiftState,tapGiftHeart,unlockGift} from './gift-state.mjs?v=20261005-heart50';

export function mountGiftHeart(section,burst){
  const button=section.querySelector('button'),grow=section.querySelector('.heart-grow'),art=grow.querySelector('svg');
  const count=section.querySelector('.heart-tap-count'),dots=section.querySelector('.heart-tap-dots');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let timer=0,bouncing=null,popping=false;
  const marks=10;
  dots.innerHTML=Array.from({length:marks},()=>'<i></i>').join('');
  function update(state){
    section.hidden=!state.completed.connect||!state.completed.chase||state.unlocked;
    button.disabled=state.heartTaps>=HEART_TAPS||section.hidden;
    const active=state.heartTaps>0&&!section.hidden;
    section.classList.toggle('heart-active',active);
    document.body.classList.toggle('heart-filling-screen',active);
    const width=window.visualViewport?.width||innerWidth,height=window.visualViewport?.height||innerHeight;
    // Fill most of the viewport; the full-screen layer safely clips the outer lobes on phones.
    const maximum=Math.min(Math.max(width*.94,height*.84),width*1.75);
    const diameter=136+(Math.max(136,maximum)-136)*Math.pow(state.heartTaps/HEART_TAPS,1.12);
    section.style.setProperty('--heart-diameter',`${diameter}px`);
    count.textContent=`${state.heartTaps.toLocaleString('ar-JO')} من ${HEART_TAPS.toLocaleString('ar-JO')}`;
    [...dots.children].forEach((dot,i)=>dot.classList.toggle('filled',i<Math.floor(state.heartTaps/HEART_TAPS*marks)));
  }
  function reset(){
    clearTimeout(timer);bouncing?.cancel();popping=false;
    section.classList.remove('heart-popping');burst.replaceChildren();burst.classList.remove('burst-active');
    update(getGiftState());
  }
  function pop(){
    if(popping)return;popping=true;bouncing?.cancel();
    section.classList.add('heart-popping');burst.classList.add('burst-active');
    const rect=button.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
    if(!reduced.matches){
      for(let i=0;i<42;i++){
        const heart=document.createElement('span'),angle=i*2.39996,radius=Math.max(innerWidth,innerHeight)*(.25+(i%7)*.08);
        heart.textContent='♥';heart.style.left=`${x}px`;heart.style.top=`${y}px`;
        heart.style.setProperty('--burst-x',`${Math.cos(angle)*radius}px`);
        heart.style.setProperty('--burst-y',`${Math.sin(angle)*radius}px`);
        heart.style.setProperty('--burst-turn',`${(i%2?1:-1)*(35+i*7)}deg`);
        heart.style.setProperty('--burst-size',`${22+(i%5)*9}px`);
        heart.style.setProperty('--burst-color',['#ffc5dc','#f28bbb','#eed09b','#d9a9f5'][i%4]);
        burst.append(heart);
      }
    }
    timer=setTimeout(()=>{burst.replaceChildren();burst.classList.remove('burst-active');unlockGift();},reduced.matches?250:1200);
  }
  button.addEventListener('click',()=>{
    if(popping||section.hidden)return;
    const before=getGiftState().heartTaps,taps=tapGiftHeart();
    if(taps===before)return;
    update(getGiftState());
    if(taps===HEART_TAPS){pop();return;}
    if(!reduced.matches){bouncing?.cancel();bouncing=art.animate([{transform:'scale(1)'},{transform:'scale(1.035)',offset:.4},{transform:'scale(1)'}],{duration:160,easing:'ease-out'});}
  });
  button.addEventListener('keydown',event=>{if(event.repeat&&['Enter',' '].includes(event.key))event.preventDefault();});
  document.addEventListener('gift:reset',reset);
  window.addEventListener('resize',()=>update(getGiftState()));
  window.visualViewport?.addEventListener('resize',()=>update(getGiftState()));
  update(getGiftState());
  return {update};
}
