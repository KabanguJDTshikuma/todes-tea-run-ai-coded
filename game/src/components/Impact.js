import * as THREE from 'three';

// Trauma decays linearly; the shake strength grows with trauma squared so small
// hits stay subtle while big ones punch.
const TRAUMA_DECAY = 1.6;
const MAX_SHAKE_OFFSET = 9;
const SHAKE_FREQUENCIES = [23, 29, 17];
const MAX_HIT_STOP = 0.2;

export const IMPACTS = {
  enemyDefeat: { shake: 0.25, hitStop: 0.04 },
  bossHit: { shake: 0.35, hitStop: 0.06 },
  bossDefeat: { shake: 0.8, hitStop: 0.15 },
  playerHit: { shake: 0.65, hitStop: 0.12 },
  superCroak: { shake: 0.8, hitStop: 0.1 },
  gameOver: { shake: 0.9, hitStop: 0 },
};

// Camera shake and hit-stop. Both are purely presentational: hit-stop only delays
// gameplay updates by a fraction of a second and never changes their results.
export class Impact {
  constructor(camera) {
    this.camera = camera;
    this.basePosition = camera.position.clone();
    this.offset = new THREE.Vector3();
    this.trauma = 0;
    this.time = 0;
    this.hitStopRemaining = 0;
    this.shakeEnabled = true;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  }

  trigger({ shake, hitStop }) {
    if (this.shakeEnabled && !this.reducedMotion.matches) {
      this.trauma = Math.min(1, this.trauma + shake);
    }
    // Hit-stops don't stack: a multi-kill freezes once, for the longest stop.
    this.hitStopRemaining = Math.min(MAX_HIT_STOP, Math.max(this.hitStopRemaining, hitStop));
  }

  // Spends this frame's time on any active hit-stop and returns the gameplay time
  // left over, so a stop never lasts longer than intended on slow frames.
  consumeHitStop(delta) {
    const frozen = Math.min(delta, this.hitStopRemaining);
    this.hitStopRemaining -= frozen;
    return delta - frozen;
  }

  setShakeEnabled(enabled) {
    this.shakeEnabled = enabled;
    if (!enabled) {
      this.trauma = 0;
    }
  }

  update(delta) {
    this.time += delta;
    this.trauma = Math.max(0, this.trauma - TRAUMA_DECAY * delta);
    const amount = this.trauma * this.trauma * MAX_SHAKE_OFFSET;

    // Layered sine waves give a smooth, organic wobble instead of per-frame noise.
    this.offset.set(
      Math.sin(this.time * SHAKE_FREQUENCIES[0]) * amount,
      Math.sin(this.time * SHAKE_FREQUENCIES[1] + 1.3) * amount,
      Math.sin(this.time * SHAKE_FREQUENCIES[2] + 2.1) * amount * 0.5,
    );
    this.camera.position.copy(this.basePosition).add(this.offset);
  }

  reset() {
    this.trauma = 0;
    this.hitStopRemaining = 0;
    this.camera.position.copy(this.basePosition);
  }
}
