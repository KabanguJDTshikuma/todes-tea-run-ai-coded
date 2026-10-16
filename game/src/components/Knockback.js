import * as THREE from 'three';
import { isMoveClear } from './Collision.js';
import { isMapMoveClear } from './WorldBounds.js';

const KNOCKBACK_STEPS = 4;
const target = new THREE.Vector3();

// Pushes an entity directly away from (fromX, fromY) using the same swept
// collision and floor checks as normal movement. If the full distance is
// blocked, shorter pushes are tried; returns the distance actually moved.
export function knockback(entity, fromX, fromY, distance, obstacles) {
  const dx = entity.position.x - fromX;
  const dy = entity.position.y - fromY;
  const length = Math.hypot(dx, dy);

  if (length < 1e-6) {
    return 0;
  }

  for (let step = KNOCKBACK_STEPS; step > 0; step -= 1) {
    const pushDistance = distance * step / KNOCKBACK_STEPS;
    target.set(
      entity.position.x + dx / length * pushDistance,
      entity.position.y + dy / length * pushDistance,
      entity.position.z,
    );

    if (isMapMoveClear(entity, target, entity.heading)
      && obstacles.every((others) => isMoveClear(entity, target, entity.heading, others))) {
      entity.position.copy(target);
      return pushDistance;
    }
  }

  return 0;
}
