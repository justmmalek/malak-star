import {DEG, wrap, angleDifference, rotationMatrix} from './sky-math.mjs';

// Safari's heading is magnetic north for the portrait top edge. Its Euler
// angles use a separate relative frame. Align those frames only when the
// top edge has a useful horizontal projection; vertical is singular.
export class OrientationTracker {
  constructor() {
    this.yawOffset = null;
    this.manualOffset = null;
    this.lastCompass = null;
    this.lastAbsolute = null;
    this.lastEvent = null;
  }

  read(event, declination, now = Date.now()) {
    const {alpha, beta, gamma} = event;
    if (![alpha, beta, gamma].every(Number.isFinite)) return {state:'missing'};
    // Do not alternate between unrelated relative and absolute frames.
    const hasCompass = Number.isFinite(event.webkitCompassHeading) && event.webkitCompassHeading >= 0;
    if (!hasCompass && event.absolute !== true && this.lastAbsolute !== null && now - this.lastAbsolute < 1500) return {state:'ignored'};
    this.lastEvent = {alpha, beta, gamma, absolute:event.absolute};
    let corrected = alpha, reliable = true;
    if (this.manualOffset !== null) corrected = wrap(alpha + this.manualOffset);
    else if (hasCompass) {
      const accuracy = event.webkitCompassAccuracy;
      const valid = !Number.isFinite(accuracy) || accuracy >= 0;
      reliable = valid && (!Number.isFinite(accuracy) || accuracy <= 20);
      if (!Number.isFinite(declination)) return {state:'declination'};
      const matrix = rotationMatrix(alpha, beta, gamma);
      const horizontal = Math.hypot(matrix[0][1], matrix[1][1]);
      const flat = Math.abs(beta) < 35 && Math.abs(gamma) < 35;
      if (valid && horizontal > 0.25 && (this.yawOffset === null || flat)) {
        const heading = wrap(Math.atan2(matrix[0][1], matrix[1][1]) / DEG);
        this.yawOffset = angleDifference(heading, wrap(event.webkitCompassHeading + declination));
      }
      if (valid) this.lastCompass = now;
      if (this.yawOffset === null) return {state:valid ? 'tilt' : 'calibrate', beta};
      corrected = wrap(alpha + this.yawOffset);
    } else if (event.absolute === true) {
      this.lastAbsolute = now;
    } else if (this.yawOffset !== null && this.lastCompass !== null && now - this.lastCompass < 6500) {
      corrected = wrap(alpha + this.yawOffset);
      reliable = false;
    } else return {state:'relative', beta};
    return {state:'ready', matrix:rotationMatrix(corrected, beta, gamma), reliable, manual:this.manualOffset !== null};
  }
}
