import {DEG,wrap,angleDifference,rotationMatrix,pointing,targetInScreen,starVector,dedicatedStarPosition,DEDICATED_STAR} from './sky-math.mjs';
const $=id=>document.getElementById(id);
const A=window.Astronomy;
const AMMAN={lat:31.9539,lon:35.9106,height:800};
let location={...AMMAN},catalog=[],currentView='home',position=null,sensors=false,lastSensor=0,lastEvent=null,yawOffset=null,manualOffset=null,lastMatrix=null,compassAccuracy=null;
let sensorTimer=null,frame=null,previousAbsolute=0,geoRequest=0,declinationCache={};
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
buttons.forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();showView('home');});
$('start-guide').addEventListener('click',()=>showView('guide'));
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
function stopSensors(){sensors=false;window.removeEventListener('deviceorientation',onOrientation);window.removeEventListener('deviceorientationabsolute',onOrientation);clearInterval(sensorTimer);sensorTimer=null;if(frame)cancelAnimationFrame(frame);frame=null;lastMatrix=null;$('enable-motion').textContent='تشغيل التوجيه بالتلفون';$('enable-motion').disabled=false;$('target-dot').hidden=true;$('direction-arrow').hidden=true;$('finder-idle').hidden=false;$('finder').classList.remove('aligned');}
function magneticDeclination(){const key=`${new Date().toISOString().slice(0,10)}:${location.lat}:${location.lon}`;if(declinationCache.key===key)return declinationCache.value;try{const value=window.geomagnetism.model(new Date()).point([location.lat,location.lon,(location.height||0)/1000]).decl;declinationCache={key,value};return value;}catch{return null;}}
async function enableSensors(){
  stopSensors();lastSensor=0;lastEvent=null;yawOffset=null;manualOffset=null;previousAbsolute=0;compassAccuracy=null;
  if(!window.isSecureContext){setSensorStatus('افتحي رابط الموقع الآمن HTTPS في Safari لتشغيل البوصلة.');return;}
  if(typeof window.DeviceOrientationEvent==='undefined'){setSensorStatus('هذا الجهاز لا يوفّر حساسات الاتجاه. افتحي الرابط على الآيفون، أو استخدمي اتجاه النجمة وارتفاعها أعلاه.');return;}
  $('enable-motion').disabled=true;
  try{if(typeof DeviceOrientationEvent.requestPermission==='function'){const permission=await DeviceOrientationEvent.requestPermission(true);if(permission!=='granted'){setSensorStatus('إذن الحركة غير مسموح. اسمحي به من إعدادات Safari أو أعيدي فتح الصفحة؛ اتجاه النجمة متاح أعلاه.');return;}}
    sensors=true;window.addEventListener('deviceorientation',onOrientation);window.addEventListener('deviceorientationabsolute',onOrientation);$('enable-motion').textContent='إعادة تشغيل ومعايرة';setSensorStatus('امسكي الآيفون مسطّحًا لحظة حتى تتصل البوصلة، ثم وجّهي ظهره نحو السماء.');
    const started=Date.now();sensorTimer=setInterval(()=>{if(Date.now()-(lastSensor||started)>6500){lastMatrix=null;$('target-dot').hidden=true;$('direction-arrow').hidden=true;$('finder-idle').hidden=false;$('finder').classList.remove('aligned');setSensorStatus(lastSensor?'توقفت بيانات الحساس. أعيدي تشغيل التوجيه.':'لم تصل قراءة صالحة من البوصلة. افتحي الرابط في Safari على الآيفون واسمحي بالحركة.');}},1000);
  }catch{setSensorStatus('تعذّر تشغيل الحساس. افتحي الرابط مباشرة في Safari ثم حاولي مرة أخرى.');}finally{$('enable-motion').disabled=false;}
}
function onOrientation(event){
  if(!sensors||![event.alpha,event.beta,event.gamma].every(Number.isFinite))return;
  lastEvent={alpha:event.alpha,beta:event.beta,gamma:event.gamma};
  let alpha=event.alpha;const hasCompass=Number.isFinite(event.webkitCompassHeading)&&event.webkitCompassHeading>=0;
  if(manualOffset!==null)alpha=wrap(alpha+manualOffset);
  else if(hasCompass){
    const accuracy=Number.isFinite(event.webkitCompassAccuracy)?event.webkitCompassAccuracy:null;
    if(accuracy!==null&&accuracy<0){setSensorStatus('البوصلة تحتاج معايرة. أبعدي الهاتف عن المغناطيس وحرّكيه على شكل 8.');return;}
    compassAccuracy=accuracy;
    const declination=magneticDeclination();if(declination===null){setSensorStatus('تعذّر تصحيح الشمال. استخدمي المعايرة اليدوية على الشمال الحقيقي من قسم المساعدة.');return;}
    // Acquire Safari relative yaw against its independent magnetic compass while flat.
    if(Math.abs(event.beta)<35&&Math.abs(event.gamma)<35){const m=rotationMatrix(alpha,event.beta,event.gamma);const rawHeading=wrap(Math.atan2(m[0][1],m[1][1])/DEG);yawOffset=angleDifference(rawHeading,wrap(event.webkitCompassHeading+declination));}
    if(yawOffset===null){setSensorStatus('امسكي الآيفون مسطّحًا، والشاشة للأعلى، لثانية واحدة حتى نضبط اتجاه الشمال.');return;}
    alpha=wrap(alpha+yawOffset);
  }else if(event.absolute===true){previousAbsolute=Date.now();}
  else {if(Date.now()-previousAbsolute<1500)return;setSensorStatus('الجهاز يرسل حركة دون اتجاه الشمال. استخدمي المعايرة اليدوية في قسم المساعدة.');return;}
  lastSensor=Date.now();lastMatrix=rotationMatrix(alpha,event.beta,event.gamma);
  if(!frame)frame=requestAnimationFrame(()=>{frame=null;if(sensors&&lastMatrix)updateFinder(lastMatrix);});
}
function updateFinder(matrix){
  if(!position)return;const screenAngle=screen.orientation?.angle??window.orientation??0;
  const target=targetInScreen(matrix,position.azimuth,position.altitude,screenAngle),phone=pointing(matrix);
  $('finder-idle').hidden=true;const reliable=compassAccuracy===null||compassAccuracy<=20;
  if(!reliable)setSensorStatus('دقة البوصلة ضعيفة. ابتعدي عن المعادن وحرّكي الجهاز على شكل 8 قبل الاعتماد على السهم.');else setSensorStatus(manualOffset!==null?'التوجيه يعمل بمعايرتكِ اليدوية. أعيدي المعايرة إذا تغيّر الاتجاه.':'التوجيه يعمل. وجّهي ظهر الآيفون نحو السماء وحرّكيه بهدوء.');
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
$('calibrate-north').addEventListener('click',()=>{if(!sensors||!lastEvent){$('calibration-status').textContent='شغّلي التوجيه أولًا. المعايرة تحتاج قراءة حركة من الجهاز.';return;}const p=pointing(rotationMatrix(lastEvent.alpha,lastEvent.beta,lastEvent.gamma));if(Math.abs(p.altitude)>60){$('calibration-status').textContent='ارفعي الشاشة لتكون عمودية، ووجّهي ظهر الهاتف نحو الشمال الحقيقي.';return;}manualOffset=p.azimuth;compassAccuracy=null;$('calibration-status').textContent='تم اعتماد اتجاه ظهر الهاتف كشمال حقيقي. يمكنكِ الآن تتبّع النجمة.';});
$('use-location').addEventListener('click',()=>{
  if(!navigator.geolocation){$('location-status').textContent='الموقع غير متاح؛ الحسابات مستمرة لعمّان.';return;}
  const request=++geoRequest;$('use-location').disabled=true;$('location-status').textContent='جارٍ تحديد موقعكِ…';
  navigator.geolocation.getCurrentPosition(result=>{if(request!==geoRequest)return;const p=result.coords;location={lat:p.latitude,lon:p.longitude,height:0};yawOffset=null;$('location-label').textContent='موقعكِ الحالي';$('location-status').textContent=`تم استخدام موقعكِ. دقة التحديد نحو ${Math.round(p.accuracy)} مترًا. لا يُرسل الموقع لأي خادم.`;$('use-location').disabled=false;refresh();},()=>{if(request!==geoRequest)return;$('location-status').textContent='تعذّر تحديد موقعكِ أو لم يُسمح به. ما زلنا نستخدم الموقع السابق الظاهر أسفل الصفحة.';$('use-location').disabled=false;},{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
});
$('reset-location').addEventListener('click',()=>{geoRequest++;location={...AMMAN};yawOffset=null;$('use-location').disabled=false;$('location-label').textContent='عمّان، الأردن · موقع تقريبي';$('location-status').textContent='نستخدم وسط عمّان كموقع تقريبي. موقعكِ الحالي يُحسب داخل جهازكِ.';refresh();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(sensors){stopSensors();setSensorStatus('اضغطي تشغيل التوجيه بعد العودة للصفحة.');}}else refresh();});
window.addEventListener('pagehide',stopSensors);
new ResizeObserver(()=>{if(currentView==='home')drawMap();}).observe($('sky-map'));
refresh();setInterval(()=>{if(!document.hidden)refresh();},15000);
fetch('assets/stars.json').then(response=>{if(!response.ok)throw new Error('catalog');return response.json();}).then(stars=>{catalog=stars;drawMap();}).catch(()=>{$('map-error').textContent='تعذّر تحميل بقية النجوم. موضع نجمتكِ المحسوب ما زال ظاهرًا.';$('map-error').hidden=false;});
document.fonts.ready.then(drawMap);
