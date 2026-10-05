// The star dodges once per catch, then rests long enough to be caught by touch.
const SPOTS=[[.5,.65],[.23,.3],[.76,.5],[.3,.72],[.74,.25],[.45,.45]];
export function clampStar(value,size){const margin=Math.min(44,size/2);return Math.max(margin,Math.min(size-margin,value));}
export function spawnChaser(index,size,now){
  const [x,y]=SPOTS[index%SPOTS.length];
  return {x:clampStar(x*size,size),y:clampStar(y*size,size),homeX:x*size,homeY:y*size,evaded:false,spawnedAt:now,escapeAt:0,escapeEnd:0,restUntil:now+400,fromX:0,fromY:0,toX:0,toY:0};
}
export function dodgeChaser(star,finger,size,now,reduced=false){
  if(star.evaded)return false;
  const candidates=[[.2,.22],[.8,.22],[.2,.74],[.8,.74],[.5,.44]].map(([x,y])=>({x:clampStar(x*size,size),y:clampStar(y*size,size)}));
  const score=p=>Math.hypot(p.x-finger.x,p.y-finger.y)+Math.hypot(p.x-star.x,p.y-star.y)*.2;
  const next=candidates.reduce((best,p)=>score(p)>score(best)?p:best);
  Object.assign(star,{evaded:true,fromX:star.x,fromY:star.y,toX:next.x,toY:next.y,homeX:next.x,homeY:next.y,escapeAt:now,escapeEnd:now+(reduced?0:270),restUntil:now+1500});
  if(reduced){star.x=next.x;star.y=next.y;}
  return true;
}
export function stepChaser(star,size,now,reduced=false){
  if(now<star.escapeEnd){const t=1-Math.pow(1-(now-star.escapeAt)/(star.escapeEnd-star.escapeAt),3);star.x=star.fromX+(star.toX-star.fromX)*t;star.y=star.fromY+(star.toY-star.fromY)*t;}
  else if(star.evaded&&now<star.restUntil){star.x=star.homeX;star.y=star.homeY;}
  else {const t=(now-(star.evaded?star.restUntil:star.spawnedAt))/1000;const drift=reduced?0:Math.min(29,size*.085);star.x=star.homeX+Math.sin(t*1.6)*drift;star.y=star.homeY+Math.sin(t*1.13)*drift*.7;}
  star.x=clampStar(star.x,size);star.y=clampStar(star.y,size);return star;
}
export function chaserCatchable(star,now){return star.evaded&&now>=star.escapeEnd+100;}
