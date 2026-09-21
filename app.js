import {DEG,starVector,dedicatedStarPosition,DEDICATED_STAR} from './sky-math.mjs';
import {Planetarium} from './planetarium.mjs?v=20260921-simple';
import {describeSkyPosition} from './sky-description.mjs';
const $=id=>document.getElementById(id);
const A=window.Astronomy;
const AMMAN={lat:31.9539,lon:35.9106,height:800,label:'عمّان'};
let location={...AMMAN},catalog=[],currentView='home',position=null,geoRequest=0;
const planetarium=new Planetarium(()=>location);
const formatDegree=n=>`${n.toFixed(1)}°`;
const buttons=[...document.querySelectorAll('[data-view]')];
function showView(view){
  currentView=view;
  for(const name of ['home','guide','certificate']) $(`${name}-view`).hidden=name!==view;
  for(const button of document.querySelectorAll('nav [data-view]')) {const selected=button.dataset.view===view;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
  document.body.classList.toggle('sky-open',view==='guide');
  if(view==='guide')void planetarium.open();else planetarium.close();
  if(view==='home') drawMap();
  window.scrollTo({top:0,behavior:'instant'});
}
buttons.forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();showView('home');});
$('start-guide').addEventListener('click',()=>{showView('guide');});
function visibilityText(p){const d=describeSkyPosition(p.azimuth,p.altitude);return `${d.heading} ${d.detail}`;}
function refresh(){
  if(!A){$('visibility-home').textContent='تعذّر تحميل حسابات السماء. أعيدي فتح الصفحة.';return;}
  try{position=dedicatedStarPosition(new Date(),location,A);}catch(error){$('visibility-home').textContent='تعذّر حساب موقع النجمة. أعيدي المحاولة.';return;}
  $('azimuth').textContent=formatDegree(position.azimuth);
  $('altitude').textContent=formatDegree(position.altitude);
  $('visibility-home').textContent=visibilityText(position);
  $('live-time').textContent=new Intl.DateTimeFormat('ar-JO',{timeZone:'Asia/Amman',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date())+' · عمّان';
  if(currentView==='home')drawMap();

}
const constellationPaths=[{name:'الدب الأصغر',ids:[11767,85822,82080,77055,72607,75097,79822,77055]},{name:'الدب الأكبر',ids:[67301,65378,62956,59774,54061,53910,58001,59774]},{name:'ذات الكرسي',ids:[8886,6686,4427,3179,746]}];
function drawMap(){
  const canvas=$('sky-map'),bounds=canvas.getBoundingClientRect();if(!bounds.width||!position||!A)return;
  const size=Math.min(bounds.width,bounds.height),dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(size*dpr);canvas.height=Math.round(size*dpr);
  const c=canvas.getContext('2d');c.scale(dpr,dpr);const center=size/2,r=size*.425;
  c.clearRect(0,0,size,size);c.lineWidth=.7;c.strokeStyle='#2a405b';
  const projection=(az,alt)=>{const radius=(90-alt)/90*r;return [center-Math.sin(az*DEG)*radius,center-Math.cos(az*DEG)*radius];};
  c.save();c.beginPath();c.arc(center,center,r,0,Math.PI*2);c.stroke();
  for(let alt=15;alt<90;alt+=15){c.setLineDash([2,4]);c.beginPath();c.arc(center,center,(90-alt)/90*r,0,Math.PI*2);c.stroke();}c.setLineDash([]);
  for(let az=0;az<360;az+=30){const p=projection(az,0);c.beginPath();c.moveTo(center,center);c.lineTo(...p);c.stroke();}
  c.font=`${size<450?12:14}px Georgia`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#b4c3d5';
  for(const [az,label] of [[0,'N · الشمال'],[90,'E'],[180,'S'],[270,'W']]){const p=projection(az,-6);c.fillText(label,...p);}
  c.fillStyle='#778ca7';c.font=`${size<450?10:12}px Georgia`;for(let alt=30;alt<90;alt+=30){const p=projection(140,alt);c.fillText(`${alt}°`,...p);}
  const date=new Date(),observer=new A.Observer(location.lat,location.lon,location.height||0),rotation=A.Rotation_EQJ_HOR(date,observer),points=new Map();
  for(const [id,ra,dec,mag] of catalog){const h=A.HorizonFromVector(A.RotateVector(rotation,starVector(ra,dec,date,A)),'normal');if(h.lat<0)continue;const p=projection(h.lon,h.lat);points.set(id,{p,mag});}
  c.strokeStyle='#536b8866';c.lineWidth=.9;
  for(const path of constellationPaths){for(let i=1;i<path.ids.length;i++){const a=points.get(path.ids[i-1]),b=points.get(path.ids[i]);if(!a||!b)continue;c.beginPath();c.moveTo(...a.p);c.lineTo(...b.p);c.stroke();}const labelPoint=points.get(path.ids[2]);if(labelPoint&&size>450){c.fillStyle='#91a3bc';c.font='13px NotoArabic';c.fillText(path.name,labelPoint.p[0]-(path.ids[0]===11767?72:0),labelPoint.p[1]+22);}}
  for(const {p,mag} of points.values()){const radius=Math.max(.55,2.8-mag*.37)*(size<450?.8:1);c.fillStyle=mag<2?'#e6efff':`rgba(191,213,242,${Math.max(.2,1-mag*.12)})`;c.beginPath();c.arc(...p,radius,0,Math.PI*2);c.fill();}
  if(position.altitude>0){const [x,y]=projection(position.azimuth,position.altitude);const glow=c.createRadialGradient(x,y,1,x,y,24);glow.addColorStop(0,'#ffe0a755');glow.addColorStop(1,'#d4b77c00');c.fillStyle=glow;c.fillRect(x-24,y-24,48,48);c.strokeStyle='#d4b77c';c.lineWidth=1;c.beginPath();c.arc(x,y,13,0,Math.PI*2);c.stroke();c.fillStyle='#fff1cd';c.beginPath();c.arc(x,y,3.5,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(x-8,y);c.lineTo(x+8,y);c.moveTo(x,y-8);c.lineTo(x,y+8);c.stroke();const offset=size<450?27:46,side=x>size*.52?-1:1,above=y>size*.23;const labelY=y+(above?-33:33),labelX=x+side*(offset+5);c.beginPath();c.moveTo(x+side*11,y+(above?-8:8));c.lineTo(x+side*offset,labelY);c.stroke();c.textAlign=side>0?'left':'right';c.fillStyle='#dcc189';c.font=`${size<450?16:21}px Amiri`;c.fillText('نجمة ملك',labelX,labelY-4);c.fillStyle='#a9b8c9';c.font=`${size<450?10:12}px Georgia`;c.fillText(DEDICATED_STAR.catalogue,labelX,labelY+15);}
  c.restore();
}
$('use-location').addEventListener('click',()=>{
  if(!navigator.geolocation){$('location-status').textContent='الموقع غير متاح؛ الحسابات مستمرة لعمّان.';return;}
  const request=++geoRequest;$('use-location').disabled=true;$('location-status').textContent='جارٍ تحديد موقعكِ…';
  navigator.geolocation.getCurrentPosition(result=>{if(request!==geoRequest)return;const p=result.coords;location={lat:p.latitude,lon:p.longitude,height:0,label:'موقعكِ الحالي'};planetarium.updateObserver();$('location-label').textContent='موقعكِ الحالي';$('location-status').textContent=`تم استخدام موقعكِ. دقة التحديد نحو ${Math.round(p.accuracy)} مترًا. لا يُرسل الموقع لأي خادم.`;$('use-location').disabled=false;refresh();},()=>{if(request!==geoRequest)return;$('location-status').textContent='تعذّر تحديد موقعكِ أو لم يُسمح به. ما زلنا نستخدم الموقع السابق الظاهر أسفل الصفحة.';$('use-location').disabled=false;},{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
});
$('reset-location').addEventListener('click',()=>{geoRequest++;location={...AMMAN};planetarium.updateObserver();$('use-location').disabled=false;$('location-label').textContent='عمّان، الأردن · موقع تقريبي';$('location-status').textContent='نستخدم وسط عمّان كموقع تقريبي. موقعكِ الحالي يُحسب داخل جهازكِ.';refresh();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
new ResizeObserver(()=>{if(currentView==='home')drawMap();}).observe($('sky-map'));
refresh();setInterval(()=>{if(!document.hidden)refresh();},15000);
fetch('assets/stars.json').then(response=>{if(!response.ok)throw new Error('catalog');return response.json();}).then(stars=>{catalog=stars;drawMap();}).catch(()=>{$('map-error').textContent='تعذّر تحميل بقية النجوم. موضع نجمتكِ المحسوب ما زال ظاهرًا.';$('map-error').hidden=false;});
document.fonts.ready.then(drawMap);
