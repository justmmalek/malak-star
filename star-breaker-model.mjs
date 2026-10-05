export const WIDTH=360,HEIGHT=490,COLUMNS=6,ROWS=7,TOTAL_BRICKS=COLUMNS*ROWS-4;
export const HEART_TARGET={x:180,y:118.5,r:17};
export const PADDLE_WIDTH=92,MIN_SPEED=282,MAX_SPEED=355;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function createBreaker(cleared=[]){
  const gone=new Set(cleared),gap=6,width=(WIDTH-28-gap*(COLUMNS-1))/COLUMNS;
  const bricks=[];
  for(let row=0;row<ROWS;row++)for(let col=0;col<COLUMNS;col++){
    if((row===2||row===3)&&(col===2||col===3))continue;
    const id=bricks.length;bricks.push({id,row,x:14+col*(width+gap),y:38+row*28,w:width,h:21,alive:!gone.has(id)});
  }
  const state={bricks,paddle:{x:WIDTH/2,targetX:WIDTH/2,y:HEIGHT-57,w:PADDLE_WIDTH,h:12},ball:{x:WIDTH/2,y:HEIGHT-72,r:7,vx:0,vy:0},phase:'ready',serves:0};
  return state;
}
export function movePaddle(state,x){
  state.paddle.x=clamp(x,state.paddle.w/2+4,WIDTH-state.paddle.w/2-4);
  state.paddle.targetX=state.paddle.x;
  if(state.phase==='ready'||state.phase==='missed'){state.ball.x=state.paddle.x;state.ball.y=state.paddle.y-state.ball.r-2;}
}
export function aimPaddle(state,x){
  state.paddle.targetX=clamp(x,state.paddle.w/2+4,WIDTH-state.paddle.w/2-4);
}
export function smoothPaddle(state,seconds){
  const p=state.paddle;
  p.x+=(p.targetX-p.x)*(1-Math.exp(-Math.max(0,seconds)*45));
  if(Math.abs(p.targetX-p.x)<.02)p.x=p.targetX;
  if(state.phase==='ready'||state.phase==='missed'){state.ball.x=p.x;state.ball.y=p.y-state.ball.r-2;}
  return p.x!==p.targetX;
}
export function launchBreaker(state){
  if(!['ready','missed'].includes(state.phase))return false;
  movePaddle(state,state.paddle.x);state.serves++;state.ball.vx=state.serves%2?100:-112;state.ball.vy=-263;state.phase='playing';return true;
}
function overlaps(ball,box){
  const dx=ball.x-clamp(ball.x,box.x,box.x+box.w),dy=ball.y-clamp(ball.y,box.y,box.y+box.h);
  return dx*dx+dy*dy<=ball.r*ball.r;
}
function bounceBrick(ball,brick,previous){
  if(previous.y+ball.r<=brick.y){ball.y=brick.y-ball.r-.05;ball.vy=-Math.abs(ball.vy);}
  else if(previous.y-ball.r>=brick.y+brick.h){ball.y=brick.y+brick.h+ball.r+.05;ball.vy=Math.abs(ball.vy);}
  else if(previous.x+ball.r<=brick.x){ball.x=brick.x-ball.r-.05;ball.vx=-Math.abs(ball.vx);}
  else if(previous.x-ball.r>=brick.x+brick.w){ball.x=brick.x+brick.w+ball.r+.05;ball.vx=Math.abs(ball.vx);}
  else {
    const horizontal=Math.min(Math.abs(ball.x-brick.x),Math.abs(ball.x-brick.x-brick.w));
    const vertical=Math.min(Math.abs(ball.y-brick.y),Math.abs(ball.y-brick.y-brick.h));
    if(horizontal<vertical)ball.vx*=-1;else ball.vy*=-1;
  }
  const old=Math.hypot(ball.vx,ball.vy),speed=Math.min(MAX_SPEED,old*1.008);
  ball.vx*=speed/old;ball.vy*=speed/old;
  if(Math.abs(ball.vy)<speed*.4){ball.vy=Math.sign(ball.vy||-1)*speed*.4;ball.vx=Math.sign(ball.vx||1)*Math.sqrt(speed*speed-ball.vy*ball.vy);}
}
export function stepBreaker(state,seconds){
  const hits=[];if(state.phase!=='playing')return hits;
  const duration=clamp(seconds,0,.06),steps=Math.max(1,Math.ceil(duration*180)),dt=duration/steps;
  for(let i=0;i<steps&&state.phase==='playing';i++){
    smoothPaddle(state,dt);
    const b=state.ball,p=state.paddle,previous={x:b.x,y:b.y};
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx);}else if(b.x>WIDTH-b.r){b.x=WIDTH-b.r;b.vx=-Math.abs(b.vx);}
    if(b.y<b.r+7){b.y=b.r+7;b.vy=Math.abs(b.vy);}
    for(const brick of state.bricks){
      if(!brick.alive||!overlaps(b,brick))continue;
      brick.alive=false;hits.push(brick.id);bounceBrick(b,brick,previous);break;
    }
    if(b.vy>0&&previous.y+b.r<=p.y&&b.y+b.r>=p.y&&Math.abs(b.x-p.x)<=p.w/2+b.r){
      const speed=clamp(Math.hypot(b.vx,b.vy)+2,MIN_SPEED,MAX_SPEED);
      let angle=clamp((b.x-p.x)/(p.w/2),-.95,.95)*1.08;
      if(Math.abs(angle)<.19)angle=(Math.sign(b.vx)||1)*.19;
      b.x=clamp(b.x,b.r,WIDTH-b.r);b.y=p.y-b.r-.1;b.vx=Math.sin(angle)*speed;b.vy=-Math.cos(angle)*speed;
    }
    if(Math.hypot(b.x-HEART_TARGET.x,b.y-HEART_TARGET.y)<=b.r+HEART_TARGET.r){state.phase='won';break;}
    if(b.y-b.r>HEIGHT){state.phase='missed';b.vx=0;b.vy=0;movePaddle(state,p.x);}
  }
  return hits;
}
