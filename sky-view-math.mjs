import {DEG, dot, pointing} from './sky-math.mjs';

// Match the engine's stereographic projection: FOV spans the shortest side.
export function projectSky(v, width, height, fov) {
  const length=Math.hypot(...v.slice(0,3)), z=v[2]/length;
  if (!length || 1-z<1e-6) return null;
  const scale=Math.min(width,height)/(2*Math.tan(fov/4)*(1-z));
  return {x:width/2+v[0]/length*scale,y:height/2-v[1]/length*scale};
}

export function cameraAngles(matrix, screenAngle=0) {
  const {azimuth,altitude}=pointing(matrix),a=azimuth*DEG,h=altitude*DEG,s=screenAngle*DEG;
  const right=[Math.cos(a),-Math.sin(a),0];
  const up=[-Math.sin(a)*Math.sin(h),-Math.cos(a)*Math.sin(h),Math.cos(h)];
  const deviceUp=matrix.map(row=>-row[0]*Math.sin(s)+row[1]*Math.cos(s));
  return {yaw:a,pitch:h,roll:Math.atan2(dot(deviceUp,right),dot(deviceUp,up))};
}
