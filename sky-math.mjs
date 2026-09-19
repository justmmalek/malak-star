// Device axes follow W3C Z-X-Y intrinsic rotations: Earth frame east, north, up.
export const DEG = Math.PI / 180;
export const wrap = n => ((n % 360) + 360) % 360;
export const angleDifference = (a,b) => ((a-b+540)%360)-180;
export const dot = (a,b) => a.reduce((sum,x,i)=>sum+x*b[i],0);
export function rotationMatrix(alpha,beta,gamma) {
  const a=alpha*DEG,b=beta*DEG,g=gamma*DEG;
  const ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),cg=Math.cos(g),sg=Math.sin(g);
  return [[ca*cg-sa*sb*sg,-cb*sa,cg*sa*sb+ca*sg],[cg*sa+ca*sb*sg,ca*cb,sa*sg-ca*cg*sb],[-cb*sg,sb,cb*cg]];
}
export function pointing(matrix) {
  const v=matrix.map(row=>-row[2]);
  return {azimuth:wrap(Math.atan2(v[0],v[1])/DEG),altitude:Math.asin(Math.max(-1,Math.min(1,v[2])))/DEG};
}
export function targetInScreen(matrix,azimuth,altitude,screenAngle=0) {
  const a=azimuth*DEG,h=altitude*DEG;
  const v=[Math.sin(a)*Math.cos(h),Math.cos(a)*Math.cos(h),Math.sin(h)];
  const q=[0,1,2].map(i=>dot(matrix.map(row=>row[i]),v));
  const s=screenAngle*DEG;
  return {x:q[0]*Math.cos(s)+q[1]*Math.sin(s),y:-q[0]*Math.sin(s)+q[1]*Math.cos(s),forward:-q[2],separation:Math.acos(Math.max(-1,Math.min(1,-q[2])))/DEG};
}
export function starVector(raDeg,decDeg,date,A) {
  const ra=raDeg*DEG,dec=decDeg*DEG;
  return new A.Vector(Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec),date);
}
export const DEDICATED_STAR = Object.freeze({
  catalogue: '15h 23m 41.2s · +67° 11′ 09″',
  suppliedIdentifier: 'USNO-A2.0 1500-0812345',
  identificationVerified: false,
  ra: (15 + 23/60 + 41.2/3600)*15,
  dec: 67 + 11/60 + 9/3600,
  reportedMagnitude: 15.2
});
export function dedicatedStarCoordinates(date) {
  // Coordinates transcribed from the supplied image. Interpret as J2000,
  // following USNO-A2.0's equinox convention. Identity and proper motion are
  // unverified; do not substitute another catalogue star or invent motion.
  return {ra:DEDICATED_STAR.ra,dec:DEDICATED_STAR.dec};
}
export function dedicatedStarPosition(date,location,A) {
  const observer=new A.Observer(location.lat,location.lon,location.height||0);
  const coords=dedicatedStarCoordinates(date);
  const rotated=A.RotateVector(A.Rotation_EQJ_HOR(date,observer),starVector(coords.ra,coords.dec,date,A));
  const h=A.HorizonFromVector(rotated,'normal');
  const eq=A.Equator(A.Body.Sun,date,observer,true,true);
  const sun=A.Horizon(date,observer,eq.ra,eq.dec,'normal');
  return {azimuth:h.lon,altitude:h.lat,sunAltitude:sun.altitude};
}
