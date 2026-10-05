import {WIDTH,HEIGHT,HEART_TARGET,PADDLE_WIDTH,createBreaker,aimPaddle,smoothPaddle,launchBreaker,stepBreaker} from './star-breaker-model.mjs?v=20261005-challenge';

export function mountBreaker(stage,controls,{onHit,onFinish}){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let game=createBreaker(),active=false,paused=false,frame=0,lastTime=0,pointer=null,sliderPointer=null,trail=[],stageWidth=0,stageHeight=0;
  stage.innerHTML=`<div class="breaker-bricks" aria-hidden="true"></div><div class="breaker-heart" aria-label="القلب، هدف النجمة" role="img" style="left:${HEART_TARGET.x/WIDTH*100}%;top:${HEART_TARGET.y/HEIGHT*100}%">♥</div><svg class="breaker-trail" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true"><polyline/></svg><div class="breaker-star" aria-hidden="true">✦</div><div class="breaker-paddle" aria-hidden="true"></div><div class="breaker-floor" aria-hidden="true"></div><div class="breaker-overlay"><button class="breaker-launch">ابدي من هون يعيوني</button></div>`;
  controls.innerHTML=`<button class="breaker-pause" aria-label="إيقاف اللعبة مؤقتًا" disabled>Ⅱ</button><input class="breaker-slider" type="range" min="${PADDLE_WIDTH/2+4}" max="${WIDTH-PADDLE_WIDTH/2-4}" value="180" step="0.01" aria-label="تحريك المضرب"><span class="breaker-control-icon" aria-hidden="true">↔</span>`;
  const bricks=stage.querySelector('.breaker-bricks'),star=stage.querySelector('.breaker-star'),paddle=stage.querySelector('.breaker-paddle'),overlay=stage.querySelector('.breaker-overlay'),launch=stage.querySelector('.breaker-launch'),pause=controls.querySelector('.breaker-pause'),slider=controls.querySelector('.breaker-slider'),line=stage.querySelector('polyline');
  const pctX=n=>`${n/WIDTH*100}%`,pctY=n=>`${n/HEIGHT*100}%`;
  star.style.left=star.style.top=paddle.style.left=paddle.style.top='0';
  function stop(){cancelAnimationFrame(frame);frame=0;lastTime=0;pointer=null;sliderPointer=null;}
  function renderPositions(){
    const won=game.phase==='won';
    star.style.transform=`translate3d(${(won?WIDTH/2:game.ball.x)/WIDTH*stageWidth}px,${(won?HEIGHT*.42:game.ball.y)/HEIGHT*stageHeight}px,0) translate(-50%,-50%)`;
    paddle.style.transform=`translate3d(${game.paddle.x/WIDTH*stageWidth}px,${game.paddle.y/HEIGHT*stageHeight}px,0) translateX(-50%)`;
    slider.value=game.paddle.x.toFixed(2);
  }
  function render(){
    const won=game.phase==='won';renderPositions();
    paddle.style.width=pctX(game.paddle.w);slider.disabled=won;
    pause.disabled=game.phase!=='playing';pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?'إكمال اللعبة':'إيقاف اللعبة مؤقتًا');
    overlay.hidden=won||(game.phase==='playing'&&!paused);
    launch.textContent=paused?'كمّلي':game.phase==='missed'?'حاولي كمان':'ابدي من هون يعيوني';
    stage.classList.toggle('breaker-won',won);stage.classList.toggle('breaker-paused',paused);
    line.style.display=reduced.matches||won?'none':'';
  }
  function spark(brick){
    if(reduced.matches)return;
    for(let i=0;i<5;i++){
      const bit=document.createElement('i');bit.className='breaker-spark';bit.style.left=pctX(brick.x+brick.w/2);bit.style.top=pctY(brick.y+brick.h/2);bit.style.setProperty('--spark-x',`${(i-2)*17}px`);bit.style.setProperty('--spark-y',`${-16-Math.sin(i+1)*26}px`);stage.append(bit);bit.addEventListener('animationend',()=>bit.remove(),{once:true});
    }
  }
  function animate(now){
    frame=0;if(!active||document.hidden)return;
    const dt=lastTime?Math.min((now-lastTime)/1000,.06):1/60;lastTime=now;
    const previousPhase=game.phase,playing=game.phase==='playing'&&!paused;
    const hits=playing?stepBreaker(game,dt):(smoothPaddle(game,dt),[]);
    if(hits.length){
      for(const id of hits){bricks.children[id].hidden=true;spark(game.bricks[id]);}
      onHit(hits);
    }
    if(playing&&!reduced.matches){trail.push([game.ball.x,game.ball.y]);if(trail.length>9)trail.shift();line.setAttribute('points',trail.map(p=>p.join(',')).join(' '));}
    renderPositions();if(previousPhase!==game.phase)render();
    if(game.phase==='won'){stop();onFinish();return;}
    if(game.phase==='missed'&&previousPhase==='playing')launch.focus({preventScroll:true});
    if((game.phase==='playing'&&!paused)||game.paddle.x!==game.paddle.targetX)schedule();else lastTime=0;
  }
  function schedule(){if(!frame&&active&&!document.hidden)frame=requestAnimationFrame(animate);}
  function run(){stop();if(active&&!paused&&game.phase==='playing')schedule();}
  function target(x){if(!active||game.phase==='won')return;aimPaddle(game,x);schedule();}
  function play(){
    if(!active)return;
    if(paused)paused=false;else launchBreaker(game);
    trail=[];render();run();stage.focus({preventScroll:true});
  }
  function pauseGame(){if(game.phase!=='playing')return;paused=true;stop();render();}
  function point(event){const rect=stage.getBoundingClientRect();return (event.clientX-rect.left)/rect.width*WIDTH;}
  launch.addEventListener('click',play);
  pause.addEventListener('click',()=>{if(paused)play();else pauseGame();});
  slider.addEventListener('input',()=>target(Number(slider.value)));
  function sliderPoint(event){const rect=slider.getBoundingClientRect(),fraction=Math.max(0,Math.min(1,(event.clientX-rect.left-9)/(rect.width-18)));return Number(slider.min)+fraction*(Number(slider.max)-Number(slider.min));}
  slider.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0||slider.disabled)return;
    event.preventDefault();sliderPointer=event.pointerId;slider.setPointerCapture(sliderPointer);slider.focus({preventScroll:true});target(sliderPoint(event));
  });
  slider.addEventListener('pointermove',event=>{if(event.pointerId===sliderPointer)target(sliderPoint(event));});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])slider.addEventListener(type,event=>{if(event.pointerId===sliderPointer)sliderPointer=null;});
  slider.addEventListener('keydown',event=>{
    const moves={ArrowLeft:-12,ArrowDown:-12,ArrowRight:12,ArrowUp:12,PageDown:-36,PageUp:36};
    if(event.key in moves){event.preventDefault();target(game.paddle.targetX+moves[event.key]);}
    else if(event.key==='Home'||event.key==='End'){event.preventDefault();target(Number(event.key==='Home'?slider.min:slider.max));}
  });
  stage.addEventListener('pointerdown',event=>{
    if(!active||!event.isPrimary||event.button!==0||event.target.closest('button')||game.phase==='won')return;
    event.preventDefault();pointer=event.pointerId;stage.setPointerCapture(pointer);target(point(event));
  });
  stage.addEventListener('pointermove',event=>{if(event.pointerId===pointer)target(point(event));});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(type,event=>{if(event.pointerId===pointer)pointer=null;});
  stage.addEventListener('keydown',event=>{
    if(event.target.closest('button'))return;
    if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();target(game.paddle.targetX+(event.key==='ArrowLeft'?-20:20));}
    if([' ','Enter'].includes(event.key)&&!event.repeat){event.preventDefault();if(game.phase==='playing'&&!paused)pauseGame();else play();}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)pauseGame();});
  new ResizeObserver(()=>{stageWidth=stage.clientWidth;stageHeight=stage.clientHeight;renderPositions();}).observe(stage);
  return {
    load(cleared){
      stop();paused=false;trail=[];line.setAttribute('points','');game=createBreaker(cleared);
      bricks.innerHTML=game.bricks.map(b=>`<div class="breaker-brick brick-row-${b.row}" style="left:${pctX(b.x)};top:${pctY(b.y)};width:${pctX(b.w)};height:${pctY(b.h)}"${b.alive?'':' hidden'}></div>`).join('');
      stage.querySelectorAll('.breaker-spark').forEach(bit=>bit.remove());render();
    },
    activate(){active=true;render();},
    deactivate(){active=false;stop();if(game.phase==='playing')paused=true;render();},
  };
}
