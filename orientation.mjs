import {DEG,wrap,angleDifference,rotationMatrix} from './sky-math.mjs';

// Align Safari's independent motion and compass frames only nearly flat.
// A tilted magnetic CLHeading is not a rear-camera bearing.
export class OrientationTracker {
  constructor(){this.yawOffset=null;this.lastAbsolute=null;}
  read(event,declination,now=Date.now()){
    const {alpha,beta,gamma}=event;
    if(![alpha,beta,gamma].every(Number.isFinite))return {state:'missing'};
    const ios='webkitCompassHeading' in event;
    if(!ios&&!event.absolute&&this.lastAbsolute!==null&&now-this.lastAbsolute<2000)return {state:'ignored'};
    if(!Number.isFinite(declination))return {state:'declination'};
    if(ios){
      const heading=event.webkitCompassHeading,accuracy=event.webkitCompassAccuracy;
      if(!Number.isFinite(heading)||heading<0||!Number.isFinite(accuracy)||accuracy<0||accuracy>20)return {state:'calibrate'};
      if(Math.abs(beta)<25&&Math.abs(gamma)<25){
        const m=rotationMatrix(alpha,beta,gamma);
        const relativeHeading=wrap(Math.atan2(m[0][1],m[1][1])/DEG);
        const offset=angleDifference(relativeHeading,wrap(heading+declination));
        this.yawOffset=this.yawOffset===null?offset:this.yawOffset+angleDifference(offset,this.yawOffset)*.15;
      }
      if(this.yawOffset===null)return {state:'flat'};
      return {state:'ready',matrix:rotationMatrix(wrap(alpha+this.yawOffset),beta,gamma)};
    }
    if(event.absolute===true){this.lastAbsolute=now;return {state:'ready',matrix:rotationMatrix(wrap(alpha-declination),beta,gamma)};}
    return {state:'relative'};
  }
}
