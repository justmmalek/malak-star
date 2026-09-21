import {DEG, DEDICATED_STAR} from './sky-math.mjs';
import {OrientationTracker} from './orientation.mjs?v=20260921-sky';
import {projectSky,cameraAngles} from './sky-view-math.mjs';

const $=id=>document.getElementById(id);
const BASE=new URL('./',import.meta.url);
let enginePromise;
function loadEngine() {
  return enginePromise??=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=new URL('vendor/stellarium/stellarium-web-engine.js',BASE).href;
    script.onload=resolve;script.onerror=()=>{enginePromise=null;script.remove();reject(new Error('engine download'));};
    document.head.append(script);
  });
}

export class Planetarium {
  constructor(getLocation) {
    this.getLocation=getLocation;this.active=false;this.sensors=false;this.session=0;this.lastReading=0;this.frameAngles=null;
    this.orientation=e=>this.onOrientation(e);
    $('sky-center').addEventListener('click',()=>this.center());
    $('enable-motion').addEventListener('click',()=>this.sensors?this.stopMotion():void this.startMotion());
    $('sky-recalibrate').addEventListener('click',()=>{this.tracker=new OrientationTracker();this.frameAngles=null;this.status('امسكي الهاتف مسطّحًا للحظة، ثم ارفعي ظهره نحو السماء.');});
    $('sky-zoom-in').addEventListener('click',()=>this.zoom(.75));
    $('sky-zoom-out').addEventListener('click',()=>this.zoom(1/.75));
    $('sky-grid').addEventListener('click',()=>{if(!this.stel)return;const line=this.stel.core.lines.azimuthal;line.visible=!line.visible;$('sky-grid').setAttribute('aria-pressed',String(line.visible));});
    $('sky-canvas').addEventListener('pointerdown',()=>{this.stopMotion();if(this.stel)this.stel.core.lock=null;this.status('اسحبي السماء واستكشفيها · «نجمتي» تعيدكِ لمكانها.');});
    $('sky-retry').addEventListener('click',()=>location.reload());
    $('sky-canvas').addEventListener('webglcontextlost',e=>{e.preventDefault();this.stopMotion();this.fail();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stopMotion();else if(this.active)this.updateObserver();});
    window.addEventListener('pagehide',()=>this.stopMotion());
  }
  status(text){$('sensor-status').textContent=text;}
  async open() {
    this.active=true;
    if(this.stel){this.updateObserver();this.center();return;}
    if(this.loading)return;
    this.loading=true;$('sky-loading').hidden=false;
    try {
      await loadEngine();
      await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(new Error('engine timeout')),30000);
        window.StelWebEngine({canvas:$('sky-canvas'),wasmFile:new URL('vendor/stellarium/stellarium-web-engine.wasm',BASE).href,
          onAbort:()=>{clearTimeout(timeout);reject(new Error('engine abort'));},
          onReady:stel=>{try{this.setup(stel);clearTimeout(timeout);resolve();}catch(e){clearTimeout(timeout);reject(e);}},
          onFrame:()=>this.renderOverlay()
        }).catch?.(e=>{clearTimeout(timeout);reject(e);});
      });
      $('sky-loading').hidden=true;
      document.querySelectorAll('[data-sky-control]').forEach(b=>b.disabled=false);
      this.status('اسحبي السماء للتصفّح، أو شغّلي تتبّع الهاتف.');
    } catch(e) { console.error('Sky map:',e);this.fail(); }
    finally {this.loading=false;}
  }
  fail(){ $('sky-loading').hidden=false;$('sky-load-text').textContent='تعذّر فتح خريطة السماء. تحقّقي من الاتصال ثم أعيدي المحاولة.';$('sky-retry').hidden=false; }
  close(){this.active=false;this.stopMotion();$('sky-settings').open=false;}
  setup(stel) {
    this.stel=stel;const c=stel.core;
    c.projection=2;c.fov=65*DEG;c.time_speed=1;
    c.atmosphere.visible=false;c.landscapes.visible=false;
    c.constellations.lines_visible=true;c.constellations.labels_visible=true;c.constellations.images_visible=false;
    c.stars.hints_visible=true;
    const data=new URL('assets/skydata/',BASE).href;
    c.stars.addDataSource({url:data+'stars'});
    c.skycultures.addDataSource({url:data+'skycultures/western',key:'western'});
    c.milkyway.addDataSource({url:data+'surveys/milkyway'});
    c.planets.addDataSource({url:data+'surveys/sso/moon',key:'moon'});
    c.planets.addDataSource({url:data+'surveys/sso/sun',key:'sun'});
    c.planets.addDataSource({url:data+'surveys/sso/moon',key:'default'});
    // A coordinate target, separate from the bundled catalogue. Its marker is
    // deliberately enlarged; we do not fabricate a bright catalogue star.
    this.target=stel.createObj('star',{model_data:{ra:DEDICATED_STAR.ra,de:DEDICATED_STAR.dec,Vmag:15.2},names:['NAME Malak']});
    this.updateObserver();this.center(false);
  }
  updateObserver(){
    if(!this.stel)return;const l=this.getLocation(),o=this.stel.observer;
    o.longitude=l.lon*DEG;o.latitude=l.lat*DEG;o.elevation=l.height||0;o.utc=this.stel.date2MJD(Date.now());
    if(this.sensors){this.tracker=new OrientationTracker();this.frameAngles=null;}
  }
  center(animate=true){
    this.stopMotion();if(!this.stel)return;
    this.stel.observer.roll=0;this.stel.pointAndLock(this.target,animate?.6:0);
    this.stel.zoomTo(65*DEG,animate?.6:0);this.status('هاي نجمتكِ، ملك · اسحبي الخريطة لتشوفي السماء حولها.');
  }
  zoom(factor){if(this.stel)this.stel.zoomTo(Math.max(10*DEG,Math.min(110*DEG,this.stel.core.fov*factor)),.25);}
  declination(){
    const l=this.getLocation(),key=[l.lat,l.lon,new Date().toISOString().slice(0,10)].join(':');
    if(this.declKey!==key){try{this.decl=window.geomagnetism.model(new Date()).point([l.lat,l.lon,(l.height||0)/1000]).decl;}catch{this.decl=null;}this.declKey=key;}
    return this.decl;
  }
  stopMotion(){
    this.session++;this.sensors=false;this.pending=false;this.frameAngles=null;
    window.removeEventListener('deviceorientation',this.orientation);window.removeEventListener('deviceorientationabsolute',this.orientation);
    clearInterval(this.timer);$('enable-motion').disabled=!this.stel;$('enable-motion').setAttribute('aria-pressed','false');$('enable-motion').textContent='تتبّع الهاتف';$('sky-recalibrate').hidden=true;$('sky-mode').textContent='استكشاف السماء';
  }
  async startMotion(){
    if(this.pending||!this.stel)return;
    this.stopMotion();const session=this.session;this.tracker=new OrientationTracker();this.lastReading=0;
    if(!window.isSecureContext||!window.DeviceOrientationEvent){this.status('تتبّع الهاتف متاح على الآيفون في Safari. تقدري تتصفّحي الخريطة بالسحب الآن.');return;}
    this.pending=true;$('enable-motion').disabled=true;
    try{
      if(typeof DeviceOrientationEvent.requestPermission==='function'){
        const result=await DeviceOrientationEvent.requestPermission(true);
        if(session!==this.session||!this.active)return;
        if(result!=='granted'){this.status('اسمحي بالحركة من إعدادات Safari لتتبّع الهاتف. الخريطة متاحة بالسحب.');return;}
      }
      if(session!==this.session||!this.active)return;
      this.sensors=true;this.stel.core.lock=null;
      window.addEventListener('deviceorientation',this.orientation);window.addEventListener('deviceorientationabsolute',this.orientation);
      $('enable-motion').textContent='إيقاف التتبّع';$('enable-motion').setAttribute('aria-pressed','true');$('sky-recalibrate').hidden=false;
      this.status('امسكي الآيفون مسطّحًا للحظة، ثم وجّهي ظهره نحو السماء.');
      const started=Date.now();this.timer=setInterval(()=>{
        if(Date.now()-(this.lastReading||started)>5000){this.stopMotion();this.status('توقفت قراءة الحركة. جرّبي تشغيل التتبّع مجددًا، أو اسحبي الخريطة.');}
      },1000);
    }catch{if(session===this.session)this.status('تعذّر إذن الحركة. افتحي الرابط مباشرة في Safari؛ الخريطة تعمل بالسحب.');}
    finally{if(session===this.session){this.pending=false;$('enable-motion').disabled=false;}}
  }
  onOrientation(event){
    if(!this.sensors||!this.active)return;
    const reading=this.tracker.read(event,this.declination());
    if(reading.state==='ignored'||reading.state==='missing')return;
    this.lastReading=Date.now();
    if(reading.state!=='ready'){
      this.frameAngles=null;$('sky-mode').textContent='بانتظار البوصلة';
      const messages={flat:'امسكي الآيفون مسطّحًا للحظة لالتقاط الشمال، ثم ارفعيه نحو السماء.',calibrate:'البوصلة تحتاج معايرة. أبعدي المغناطيس وحرّكي الهاتف بشكل 8، أو اسحبي الخريطة.',relative:'الجهاز لم يرسل اتجاه الشمال. استخدمي السحب لاستكشاف السماء.',declination:'تعذّر تصحيح البوصلة لموقعكِ. استخدمي الخريطة بالسحب.'};
      this.status(messages[reading.state]);return;
    }
    const angles=cameraAngles(reading.matrix,screen.orientation?.angle??window.orientation??0);
    // Preserve the sensor frame exactly: independently interpolating Euler
    // angles can turn the sky the wrong way when crossing the zenith.
    this.frameAngles=angles;
    Object.assign(this.stel.observer,angles);
    $('sky-mode').textContent='تتبّع الهاتف';this.status('السماء تتحرّك معكِ · علامة ملك تدلّكِ على موضع نجمتكِ.');
  }
  renderOverlay(){
    if(!this.active||!this.stel||!this.target)return;
    const s=this.stel,o=s.observer;
    const v=s.convertFrame(o,'ICRF','VIEW',this.target.getInfo('radec',o));
    const w=$('sky-canvas').clientWidth,h=$('sky-canvas').clientHeight;
    const p=projectSky(v,w,h,s.core.fov),visible=p&&p.x>28&&p.x<w-28&&p.y>96&&p.y<h-180;
    $('sky-target').hidden=!visible;
    if(visible){$('sky-target').style.left=p.x+'px';$('sky-target').style.top=p.y+'px';}
    $('sky-offscreen').hidden=!!visible;
    $('sky-edge').hidden=!!visible;
    if(!visible){
      const dx=v[0],dy=-v[1],radius=Math.hypot(dx,dy)||1;
      const nx=dx/radius,ny=dy/radius;
      const maxX=Math.max(30,w/2-54),maxY=Math.max(30,h/2-205);
      const scale=Math.min(maxX/(Math.abs(nx)||.001),maxY/(Math.abs(ny)||.001));
      $('sky-edge').style.left=(w/2+nx*scale)+'px';$('sky-edge').style.top=(h/2+ny*scale)+'px';
      $('sky-edge-arrow').style.transform=`rotate(${Math.atan2(ny,nx)/DEG+90}deg)`;
    }
    const now=Date.now();
    if(!this.lastHUD||now-this.lastHUD>500){
      this.lastHUD=now;
      const v=s.convertFrame(o,'ICRF','OBSERVED',this.target.getInfo('radec',o));
      const az=(Math.atan2(v[1],v[0])/DEG+360)%360,alt=Math.asin(v[2]/Math.hypot(...v.slice(0,3)))/DEG;
      $('guide-az').textContent=az.toFixed(1)+'°';$('guide-alt').textContent=alt.toFixed(1)+'°';
      $('sky-clock').textContent=new Intl.DateTimeFormat('ar-JO',{hour:'2-digit',minute:'2-digit'}).format(new Date());
      $('sky-fov').textContent=(s.core.fov/DEG).toFixed(0)+'°';
    }
  }
}
