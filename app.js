import {DEG,rotationMatrix,pointing,targetInScreen,starVector,dedicatedStarPosition,DEDICATED_STAR} from './sky-math.mjs';
import {OrientationTracker} from './orientation.mjs?v=20260920-motion';
const $=id=>document.getElementById(id);
const A=window.Astronomy;
const AMMAN={lat:31.9539,lon:35.9106,height:800};
let location={...AMMAN},catalog=[],currentView='home',position=null,sensors=false,lastReading=0,lastMatrix=null;
let tracker=new OrientationTracker(),sensorReliable=false,sensorManual=false;
let sensorTimer=null,frame=null,geoRequest=0,declinationCache={},sensorSession=0,permissionPending=false,resumeGuide=false;
const formatDegree=n=>`${n.toFixed(1)}°`;
const buttons=[...document.querySelectorAll('[data-view]')];
function showView(view){
  currentView=view;
  for(const name of ['home','guide','certificate']) $(`${name}-view`).hidden=name!==view;
  for(const button of document.querySelectorAll('nav [data-view]')) {const selected=button.dataset.view===view;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
  if(view!=='guide') stopSensors();
  if(view==='home') drawMap();
  window.scrollTo({top:0,behavior:'instant'});
}
buttons.forEach(button=>button.addEventListener('click',()=>{showView(button.dataset.view);if(button.dataset.view==='guide'&&!sensors&&!permissionPending)void enableSensors();}));
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();showView('home');});
$('start-guide').addEventListener('click',()=>{showView('guide');void enableSensors();});
function visibilityText(p){if(p.altitude<=0)return 'موضع نجمتكِ تحت الأفق الآن من هذا المكان.';if(p.sunAltitude>-6)return 'موضع نجمتكِ فوق الأفق الآن · السماء لم تُظلم بعد.';return 'موضع نجمتكِ فوق الأفق الآن.';}
function refresh(){
  if(!A){$('visibility-home').textContent='تعذّر تحميل حسابات السماء. أعيدي فتح الصفحة.';return;}
  try{position=dedicatedStarPosition(new Date(),location,A);}catch(error){$('visibility-home').textContent='تعذّر حساب موقع النجمة. أعيدي المحاولة.';return;}
  $('azimuth').textContent=$('guide-az').textContent=formatDegree(position.azimuth);
  $('altitude').textContent=$('guide-alt').textContent=formatDegree(position.altitude);
  $('visibility-home').textContent=$('guide-visibility').textContent=visibilityText(position);
  $('live-time').textContent=new Intl.DateTimeFormat('ar-JO',{timeZone:'Asia/Amman',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date())+' · عمّان';
  if(currentView==='home')drawMap();
  if(lastMatrix&&sensors)updateFinder(lastMatrix);
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
function setSensorStatus(text){$('sensor-status').textContent=text;}
function resetFinder(message='شغّلي التوجيه لتبدئي'){
  lastMatrix=null;$('target-dot').hidden=true;$('direction-arrow').hidden=true;$('finder-idle').hidden=false;$('finder').classList.remove('aligned');
  $('finder-idle').querySelector('small').textContent=message;
  $('direction-text').textContent='اتبعي موقع نجمتكِ الآن.';
  $('pointing-reading').textContent='حساب الموقع يتجدّد تلقائيًا';
}
function stopSensors(){sensorSession++;permissionPending=false;sensors=false;window.removeEventListener('deviceorientation',onOrientation);window.removeEventListener('deviceorientationabsolute',onOrientation);clearInterval(sensorTimer);sensorTimer=null;if(frame)cancelAnimationFrame(frame);frame=null;$('enable-motion').textContent='تشغيل التوجيه بالتلفون';$('enable-motion').disabled=false;$('north-calibration').hidden=true;resetFinder();}
function magneticDeclination(){const key=`${new Date().toISOString().slice(0,10)}:${location.lat}:${location.lon}`;if(declinationCache.key===key)return declinationCache.value;try{const value=window.geomagnetism.model(new Date()).point([location.lat,location.lon,(location.height||0)/1000]).decl;declinationCache={key,value};return value;}catch{return null;}}
async function enableSensors(){
  if(permissionPending)return;
  stopSensors();const session=sensorSession;lastReading=0;tracker=new OrientationTracker();sensorReliable=false;sensorManual=false;resumeGuide=false;
  if(!window.isSecureContext){setSensorStatus('افتحي رابط الموقع الآمن HTTPS في Safari لتشغيل البوصلة.');return;}
  if(typeof window.DeviceOrientationEvent==='undefined'){setSensorStatus('هذا الجهاز لا يوفّر حساسات الاتجاه. افتحي الرابط على الآيفون، أو استخدمي اتجاه النجمة وارتفاعها أعلاه.');return;}
  permissionPending=true;$('enable-motion').disabled=true;setSensorStatus('اسمحي بالحركة إذا ظهر طلب، ثم حرّكي الهاتف بهدوء.');
  try{if(typeof DeviceOrientationEvent.requestPermission==='function'){const permission=await DeviceOrientationEvent.requestPermission(true);if(session!==sensorSession||currentView!=='guide')return;if(permission!=='granted'){resetFinder('إذن الحركة مطلوب');setSensorStatus('إذن الحركة غير مسموح. اسمحي به من إعدادات Safari أو أعيدي فتح الصفحة؛ اتجاه النجمة متاح أعلاه.');return;}}
    if(session!==sensorSession||currentView!=='guide')return;
    sensors=true;window.addEventListener('deviceorientation',onOrientation);window.addEventListener('deviceorientationabsolute',onOrientation);$('enable-motion').textContent='إعادة تشغيل ومعايرة';resetFinder('بانتظار البوصلة…');setSensorStatus('حرّكي الهاتف قليلًا لالتقاط البوصلة، ثم وجّهي ظهره نحو السماء.');
    const started=Date.now();sensorTimer=setInterval(()=>{if(Date.now()-(lastReading||started)>6500){resetFinder('لم تصل بيانات الحركة');setSensorStatus(lastReading?'توقفت بيانات الحساس. اضغطي إعادة تشغيل ومعايرة.':'لم تصل بيانات الحركة. افتحي الرابط مباشرة في Safari واسمحي بالحركة، ثم اضغطي إعادة تشغيل ومعايرة.');}},1000);
  }catch{if(session===sensorSession)setSensorStatus('تعذّر تشغيل الحساس. افتحي الرابط مباشرة في Safari ثم حاولي مرة أخرى.');}finally{if(session===sensorSession){permissionPending=false;$('enable-motion').disabled=false;}}
}
function onOrientation(event){
  if(!sensors)return;
  const reading=tracker.read(event,magneticDeclination());
  if(reading.state==='ignored'||reading.state==='missing')return;
  lastReading=Date.now();
  if(reading.state!=='ready'){
    const messages={tilt:'ميّلي الهاتف قليلًا باتجاهكِ للحظة حتى تلتقط البوصلة الشمال، ثم وجّهي ظهره نحو السماء.',calibrate:'البوصلة تحتاج معايرة. أبعدي الهاتف عن المغناطيس وحرّكيه على شكل 8.',declination:'استخدمي زر معايرة الشمال أدناه لإكمال التوجيه.',relative:'وصلت حركة الهاتف. وجّهي ظهره نحو الشمال الحقيقي واضغطي معايرة الشمال أدناه.'};
    resetFinder(reading.state==='tilt'?'ميّلي الهاتف قليلًا':'بانتظار اتجاه الشمال');setSensorStatus(messages[reading.state]);
    $('north-calibration').hidden=!['relative','declination','calibrate'].includes(reading.state);
    $('pointing-reading').textContent='وصلت قراءة الحركة · بانتظار ضبط البوصلة';return;
  }
  lastMatrix=reading.matrix;sensorReliable=reading.reliable;sensorManual=reading.manual;$('north-calibration').hidden=!reading.manual;
  if(!frame)frame=requestAnimationFrame(()=>{frame=null;if(sensors&&lastMatrix)updateFinder(lastMatrix);});
}
function updateFinder(matrix){
  if(!position)return;const screenAngle=screen.orientation?.angle??window.orientation??0;
  const target=targetInScreen(matrix,position.azimuth,position.altitude,screenAngle),phone=pointing(matrix);
  $('finder-idle').hidden=true;const reliable=sensorReliable;
  if(!reliable)setSensorStatus('دقة البوصلة ضعيفة. ابتعدي عن المعادن وحرّكي الجهاز على شكل 8 قبل الاعتماد على السهم.');else setSensorStatus(sensorManual?'التوجيه يعمل بمعايرتكِ اليدوية. أعيدي المعايرة إذا تغيّر الاتجاه.':'التوجيه يعمل. وجّهي ظهر الآيفون نحو السماء وحرّكيه بهدوء.');
  const close=target.separation<6&&reliable&&position.altitude>0;
  $('finder').classList.toggle('aligned',close);
  const inView=target.forward>0&&Math.hypot(target.x,target.y)/target.forward<.7;
  $('target-dot').hidden=!inView;$('direction-arrow').hidden=inView;
  if(inView){$('target-dot').style.left=`${50+target.x/target.forward*60}%`;$('target-dot').style.top=`${50-target.y/target.forward*60}%`;}
  else{const turn=Math.atan2(target.x,target.y)/DEG;$('direction-arrow').style.transform=`translate(-50%, -50%) rotate(${Number.isFinite(turn)?turn:90}deg)`;}
  let instruction;
  if(position.altitude<=0)instruction='نجمتكِ تحت الأفق من هذا المكان.';
  else if(close)instruction='هون نجمتكِ، ملك ✦';
  else if(target.forward<-.3)instruction='لفّي بهدوء باتجاه السهم.';
  else if(Math.abs(target.x)>Math.abs(target.y))instruction=target.x>0?'حرّكي الهاتف لليمين.':'حرّكي الهاتف لليسار.';
  else instruction=target.y>0?'ارفعي الهاتف قليلًا.':'نزّلي الهاتف قليلًا.';
  if(!reliable)instruction='عايري البوصلة لتحسين التوجيه.';
  $('direction-text').textContent=instruction;
  $('pointing-reading').textContent=`اتجاه الهاتف ${formatDegree(phone.azimuth)} · ميله ${formatDegree(phone.altitude)} · توجيه تقريبي`;
}
$('enable-motion').addEventListener('click',enableSensors);
$('calibrate-north').addEventListener('click',()=>{const event=tracker.lastEvent;if(!sensors||!event||Date.now()-lastReading>6500){$('calibration-status').textContent='شغّلي التوجيه أولًا. المعايرة تحتاج قراءة حركة من الجهاز.';return;}const p=pointing(rotationMatrix(event.alpha,event.beta,event.gamma));if(Math.abs(p.altitude)>60){$('calibration-status').textContent='ارفعي الشاشة لتكون عمودية، ووجّهي ظهر الهاتف نحو الشمال الحقيقي.';return;}tracker.manualOffset=p.azimuth;$('calibration-status').textContent='تم اعتماد اتجاه ظهر الهاتف كشمال حقيقي. يمكنكِ الآن تتبّع النجمة.';onOrientation(event);});
$('use-location').addEventListener('click',()=>{
  if(!navigator.geolocation){$('location-status').textContent='الموقع غير متاح؛ الحسابات مستمرة لعمّان.';return;}
  const request=++geoRequest;$('use-location').disabled=true;$('location-status').textContent='جارٍ تحديد موقعكِ…';
  navigator.geolocation.getCurrentPosition(result=>{if(request!==geoRequest)return;const oldDeclination=magneticDeclination(),p=result.coords;location={lat:p.latitude,lon:p.longitude,height:0};adjustDeclination(oldDeclination);$('location-label').textContent='موقعكِ الحالي';$('location-status').textContent=`تم استخدام موقعكِ. دقة التحديد نحو ${Math.round(p.accuracy)} مترًا. لا يُرسل الموقع لأي خادم.`;$('use-location').disabled=false;refresh();},()=>{if(request!==geoRequest)return;$('location-status').textContent='تعذّر تحديد موقعكِ أو لم يُسمح به. ما زلنا نستخدم الموقع السابق الظاهر أسفل الصفحة.';$('use-location').disabled=false;},{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
});
function adjustDeclination(previous){const next=magneticDeclination();if(tracker.yawOffset!==null&&Number.isFinite(previous)&&Number.isFinite(next))tracker.yawOffset+=previous-next;}
$('reset-location').addEventListener('click',()=>{geoRequest++;const previous=magneticDeclination();location={...AMMAN};adjustDeclination(previous);$('use-location').disabled=false;$('location-label').textContent='عمّان، الأردن · موقع تقريبي';$('location-status').textContent='نستخدم وسط عمّان كموقع تقريبي. موقعكِ الحالي يُحسب داخل جهازكِ.';refresh();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resumeGuide=sensors;if(sensors){stopSensors();setSensorStatus('اضغطي تشغيل التوجيه بعد العودة للصفحة.');}}else{refresh();if(resumeGuide&&currentView==='guide')void enableSensors();}});
window.addEventListener('pagehide',stopSensors);
new ResizeObserver(()=>{if(currentView==='home')drawMap();}).observe($('sky-map'));
refresh();setInterval(()=>{if(!document.hidden)refresh();},15000);
fetch('assets/stars.json').then(response=>{if(!response.ok)throw new Error('catalog');return response.json();}).then(stars=>{catalog=stars;drawMap();}).catch(()=>{$('map-error').textContent='تعذّر تحميل بقية النجوم. موضع نجمتكِ المحسوب ما زال ظاهرًا.';$('map-error').hidden=false;});
document.fonts.ready.then(drawMap);
