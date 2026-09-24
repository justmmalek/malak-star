import {DEG,starVector,dedicatedStarPosition} from './sky-math.mjs';
import {describeSkyPosition} from './sky-description.mjs?v=20260924-home-map';
const $=id=>document.getElementById(id);
const A=window.Astronomy;
const AMMAN={lat:31.9539,lon:35.9106,height:800,label:'عمّان'};
const location=AMMAN;
let catalog=[],currentView='home',position=null;
const buttons=[...document.querySelectorAll('[data-view]')];
function showView(view){
  currentView=view;
  for(const name of ['home','certificate']) $(`${name}-view`).hidden=name!==view;
  for(const button of document.querySelectorAll('nav [data-view]')) {const selected=button.dataset.view===view;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
  if(view==='home') drawMap();
  window.scrollTo({top:0,behavior:'instant'});
}
buttons.forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();showView('home');});
function refresh(){
  if(!A){$('visibility-home').textContent='تعذّر تحميل حسابات السماء. أعيدي فتح الصفحة.';return;}
  try{position=dedicatedStarPosition(new Date(),location,A);}catch(error){$('visibility-home').textContent='تعذّر حساب موقع النجمة. أعيدي المحاولة.';return;}
  const description=describeSkyPosition(position.azimuth,position.altitude);
  if($('visibility-home').textContent!==description.heading)$('visibility-home').textContent=description.heading;
  if($('position-hint').textContent!==description.detail)$('position-hint').textContent=description.detail;
  $('sky-map').setAttribute('aria-label',`${description.heading} ${description.detail} خريطة سماء عمّان الآن.`);
  $('live-time').textContent=new Intl.DateTimeFormat('ar-JO',{timeZone:'Asia/Amman',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date())+' · عمّان';
  if(currentView==='home')drawMap();

}
const constellationPaths=[{name:'الدب الأصغر',ids:[11767,85822,82080,77055,72607,75097,79822,77055]},{name:'الدب الأكبر',ids:[67301,65378,62956,59774,54061,53910,58001,59774]},{name:'ذات الكرسي',ids:[8886,6686,4427,3179,746]}];
function drawMap(){
  const canvas=$('sky-map'),bounds=canvas.getBoundingClientRect();if(!bounds.width||!position||!A)return;
  const size=Math.min(bounds.width,bounds.height),dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(size*dpr);canvas.height=Math.round(size*dpr);
  const c=canvas.getContext('2d');c.scale(dpr,dpr);const center=size/2,r=size*.425;
  c.clearRect(0,0,size,size);
  const background=c.createRadialGradient(center,center,0,center,center,r);
  background.addColorStop(0,'#152841');background.addColorStop(1,'#080f1b');
  c.fillStyle=background;c.beginPath();c.arc(center,center,r,0,Math.PI*2);c.fill();
  const projection=(az,alt)=>{const radius=(90-alt)/90*r;return [center-Math.sin(az*DEG)*radius,center-Math.cos(az*DEG)*radius];};
  c.save();c.lineWidth=1;c.strokeStyle='#3a4b63';c.beginPath();c.arc(center,center,r,0,Math.PI*2);c.stroke();
  c.strokeStyle='#263a52';c.setLineDash([2,6]);c.beginPath();c.arc(center,center,r/2,0,Math.PI*2);c.stroke();c.setLineDash([]);
  c.font=`${size<450?12:15}px NotoArabic`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#acbcd1';
  for(const [az,label] of [[0,'شمال'],[90,'شرق'],[180,'جنوب'],[270,'غرب']]){const p=projection(az,-8);c.fillText(label,...p);}
  c.fillStyle='#93a7c1';c.beginPath();c.arc(center,center,2,0,Math.PI*2);c.fill();
  c.font=`${size<450?11:13}px NotoArabic`;c.fillText('فوق راسكِ',center,center+18);
  const date=new Date(),observer=new A.Observer(location.lat,location.lon,location.height||0),rotation=A.Rotation_EQJ_HOR(date,observer),points=new Map();
  for(const [id,ra,dec,mag] of catalog){const h=A.HorizonFromVector(A.RotateVector(rotation,starVector(ra,dec,date,A)),'normal');if(h.lat<0||mag>5)continue;const p=projection(h.lon,h.lat);points.set(id,{p,mag});}
  c.strokeStyle='#536b8866';c.lineWidth=.9;
  for(const path of constellationPaths){for(let i=1;i<path.ids.length;i++){const a=points.get(path.ids[i-1]),b=points.get(path.ids[i]);if(!a||!b)continue;c.beginPath();c.moveTo(...a.p);c.lineTo(...b.p);c.stroke();}}
  for(const {p,mag} of points.values()){const radius=Math.max(.55,2.8-mag*.37)*(size<450?.8:1);c.fillStyle=mag<2?'#e6efff':`rgba(191,213,242,${Math.max(.2,1-mag*.12)})`;c.beginPath();c.arc(...p,radius,0,Math.PI*2);c.fill();}
  if(position.altitude>=0){
    const [x,y]=projection(position.azimuth,position.altitude);
    const glow=c.createRadialGradient(x,y,0,x,y,30);glow.addColorStop(0,'#ffe0a766');glow.addColorStop(1,'#d4b77c00');
    c.fillStyle=glow;c.fillRect(x-30,y-30,60,60);c.strokeStyle='#e5c48a';c.lineWidth=1.2;c.beginPath();c.arc(x,y,15,0,Math.PI*2);c.stroke();
    c.fillStyle='#fff0c8';c.textAlign='center';c.font='27px Georgia';c.fillText('✦',x,y+1);
    const labelY=y>center-55?y-32:y+35;
    c.font=`${size<450?23:29}px Amiri`;c.fillStyle='#f3d59b';c.fillText('نجمة ملك',x,labelY);
  }
  c.restore();
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
new ResizeObserver(()=>{if(currentView==='home')drawMap();}).observe($('sky-map'));
refresh();setInterval(()=>{if(!document.hidden)refresh();},15000);
fetch('assets/stars.json').then(response=>{if(!response.ok)throw new Error('catalog');return response.json();}).then(stars=>{catalog=stars;drawMap();}).catch(()=>{$('map-error').textContent='تعذّر تحميل بقية النجوم. موضع نجمتكِ المحسوب ما زال ظاهرًا.';$('map-error').hidden=false;});
document.fonts.ready.then(drawMap);
