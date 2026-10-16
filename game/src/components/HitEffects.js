import * as THREE from 'three';

const BURST_DURATION = 0.4;
const PARTICLE_COUNT = 12;
const INITIAL_POOL_SIZE = 30;

export class HitEffects {
  constructor(scene) {
    this.scene = scene;
    this.enabled = true;
    this.bursts = [];
    this.pool = [];
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    for (let i = 0; i < INITIAL_POOL_SIZE; i += 1) {
      this.pool.push(this.createBurstMesh());
    }
  }

  createBurstMesh() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3),
    );
    const material = new THREE.PointsMaterial({
      color: 0xffe680,
      size: 4,
      transparent: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.visible = false;
    return points;
  }

  spawn(position) {
    if (!this.enabled || this.reducedMotion.matches) {
      return;
    }

    const points = this.pool.pop() || this.createBurstMesh();
    points.position.set(position.x, position.y, 8);
    points.material.opacity = 1;
    points.visible = true;

    if (!points.parent) {
      this.scene.add(points);
    }

    this.bursts.push({ points, elapsed: 0 });
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.reset();
    }
  }

  update(delta) {
    for (let index = this.bursts.length - 1; index >= 0; index -= 1) {
      const burst = this.bursts[index];
      burst.elapsed += delta;

      if (burst.elapsed >= BURST_DURATION || this.reducedMotion.matches) {
        this.recycle(index);
        continue;
      }

      const progress = burst.elapsed / BURST_DURATION;
      const positions = burst.points.geometry.getAttribute('position');

      for (let particle = 0; particle < PARTICLE_COUNT; particle += 1) {
        const angle = particle * Math.PI * 2 / PARTICLE_COUNT;
        const distance = progress * (18 + (particle % 3) * 4);
        positions.setXYZ(
          particle,
          Math.cos(angle) * distance,
          Math.sin(angle) * distance,
          Math.sin(progress * Math.PI) * (8 + particle % 4),
        );
      }

      positions.needsUpdate = true;
      burst.points.material.opacity = 1 - progress;
    }
  }

  recycle(index) {
    const { points } = this.bursts[index];
    points.visible = false;
    this.bursts.splice(index, 1);
    this.pool.push(points);
  }

  reset() {
    while (this.bursts.length > 0) {
      this.recycle(this.bursts.length - 1);
    }
  }
}
