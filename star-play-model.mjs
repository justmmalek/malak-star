export const HEART = [[50,84],[32,71],[19,56],[15,39],[22,24],[37,21],[50,32],[63,21],[78,24],[85,39],[81,56],[68,71],[50,84]];
export const TOTAL = HEART.length;
export function restorePlay(raw) {
  const empty={mode:'chase',chase:0,connect:0};
  try {
    const s=JSON.parse(raw);
    if(!s||!['chase','connect'].includes(s.mode))return empty;
    for(const mode of ['chase','connect'])if(!Number.isInteger(s[mode])||s[mode]<0||s[mode]>TOTAL)return empty;
    return {mode:s.mode,chase:s.chase,connect:s.connect};
  } catch{return empty;}
}
export function starPosition(index,size,time,drift) {
  const p=HEART[Math.min(Math.max(index,0),TOTAL-1)];
  const margin=Math.min(40,size/2),amp=drift?Math.min(13,size*.04):0;
  const clamp=n=>Math.max(margin,Math.min(size-margin,n));
  return {x:clamp(p[0]*size/100+Math.sin(time/1050+index)*amp),y:clamp(p[1]*size/100+Math.cos(time/1250+index)*amp)};
}
export function canCatch(x,y,star,radius=40){return Math.hypot(x-star.x,y-star.y)<=radius;}
export function heartPath(count){
  const points=HEART.slice(0,count);
  if(!points.length)return '';
  let path=`M ${points[0][0]} ${points[0][1]}`;
  for(let i=1;i<points.length;i++){
    const a=points[i-2]||points[0],b=points[i-1],c=points[i],d=HEART[i+1]||c;
    path+=` C ${b[0]+(c[0]-a[0])/6} ${b[1]+(c[1]-a[1])/6}, ${c[0]-(d[0]-b[0])/6} ${c[1]-(d[1]-b[1])/6}, ${c[0]} ${c[1]}`;
  }
  return path;
}
