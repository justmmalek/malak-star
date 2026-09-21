import {DEG, DEDICATED_STAR} from './sky-math.mjs';
import {describeSkyPosition} from './sky-description.mjs';
import {projectSky} from './sky-view-math.mjs';

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
    this.getLocation=getLocation;this.active=false;
    $('sky-center').addEventListener('click',()=>this.center());
    $('sky-zoom-in').addEventListener('click',()=>this.zoom(.75));
    $('sky-zoom-out').addEventListener('click',()=>this.zoom(1/.75));
    $('sky-canvas').addEventListener('pointerdown',()=>{if(this.stel)this.stel.core.lock=null;});
    $('sky-retry').addEventListener('click',()=>location.reload());
    $('sky-canvas').addEventListener('webglcontextlost',e=>{e.preventDefault();this.fail();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&this.active)this.updateObserver();});
  }
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
    } catch(e) { console.error('Sky map:',e);this.fail(); }
    finally {this.loading=false;}
  }
  fail(){ $('sky-loading').hidden=false;$('sky-load-text').textContent='تعذّر فتح خريطة السماء. تحقّقي من الاتصال ثم أعيدي المحاولة.';$('sky-retry').hidden=false; }
  close(){this.active=false;$('sky-settings').open=false;}
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
  }
  center(animate=true){
    if(!this.stel)return;
    this.stel.observer.roll=0;this.stel.pointAndLock(this.target,animate?.6:0);
    this.stel.zoomTo(65*DEG,animate?.6:0);
  }
  zoom(factor){if(this.stel)this.stel.zoomTo(Math.max(10*DEG,Math.min(110*DEG,this.stel.core.fov*factor)),.25);}
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
      const description=describeSkyPosition(az,alt);
      if($('sky-position-title').textContent!==description.heading)$('sky-position-title').textContent=description.heading;
      if($('sky-position-detail').textContent!==description.detail)$('sky-position-detail').textContent=description.detail;
      $('sky-location').textContent=this.getLocation().label;
      $('sky-clock').textContent=new Intl.DateTimeFormat('ar-JO',{hour:'2-digit',minute:'2-digit'}).format(new Date());
      $('sky-fov').textContent=(s.core.fov/DEG).toFixed(0)+'°';
    }
  }
}
