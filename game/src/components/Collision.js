import * as THREE from 'three';

export const COLLISION_DISTANCE = 1;
const radiusCache = new WeakMap();
const footprintCache = new WeakMap();

export function getCollisionRadius(footprint) {
  if (radiusCache.has(footprint)) {
    return radiusCache.get(footprint);
  }

  let radius = 0;
  let minimumHalfAngleSine = 1;

  for (let index = 0; index < footprint.length; index += 1) {
    const previous = footprint[(index + footprint.length - 1) % footprint.length];
    const current = footprint[index];
    const next = footprint[(index + 1) % footprint.length];
    const ax = current.x - previous.x;
    const ay = current.y - previous.y;
    const bx = next.x - current.x;
    const by = next.y - current.y;
    const cosine = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by));
    minimumHalfAngleSine = Math.min(
      minimumHalfAngleSine,
      Math.sqrt(Math.max(Number.EPSILON, (1 + Math.max(-1, Math.min(1, cosine))) / 2)),
    );
    radius = Math.max(radius, Math.hypot(current.x, current.y));
  }

  // Include the mitered clearance at sharp convex corners in broad-phase bounds.
  radius += COLLISION_DISTANCE / minimumHalfAngleSine;
  radiusCache.set(footprint, radius);
  return radius;
}

function cross(origin, a, b) {
  return (a.x - origin.x) * (b.y - origin.y)
    - (a.y - origin.y) * (b.x - origin.x);
}

export function createFootprint(model) {
  model.updateMatrixWorld(true);
  const points = [];
  const vertex = new THREE.Vector3();

  model.traverse((object) => {
    if (!object.isMesh) {
      return;
    }

    if (object.isSkinnedMesh) {
      object.skeleton.update();
    }

    const positions = object.geometry.getAttribute('position');

    for (let index = 0; index < positions.count; index += 1) {
      object.getVertexPosition(index, vertex);
      vertex.applyMatrix4(object.matrixWorld);
      points.push({ x: vertex.x, y: vertex.y });
    }
  });

  points.sort((a, b) => a.x - b.x || a.y - b.y);
  const unique = points.filter((point, index) => index === 0
    || point.x !== points[index - 1].x || point.y !== points[index - 1].y);
  const lower = [];
  const upper = [];

  for (const point of unique) {
    while (lower.length >= 2
      && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }

  for (let index = unique.length - 1; index >= 0; index -= 1) {
    const point = unique[index];
    while (upper.length >= 2
      && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  const footprint = lower.slice(0, -1).concat(upper.slice(0, -1));

  if (footprint.length < 3) {
    throw new Error('Character model must have a nonzero ground-plane footprint.');
  }

  return footprint;
}

function worldFootprint(entity, angle) {
  const cached = footprintCache.get(entity);

  if (cached && cached.x === entity.position.x && cached.y === entity.position.y
    && cached.angle === angle && cached.footprint === entity.footprint) {
    return cached.points;
  }

  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  const points = entity.footprint.map((point) => ({
    x: entity.position.x + point.x * cosine - point.y * sine,
    y: entity.position.y + point.x * sine + point.y * cosine,
  }));
  footprintCache.set(entity, {
    x: entity.position.x,
    y: entity.position.y,
    angle,
    footprint: entity.footprint,
    points,
  });
  return points;
}

function project(points, axisX, axisY) {
  let min = Infinity;
  let max = -Infinity;

  for (const point of points) {
    const projection = point.x * axisX + point.y * axisY;
    min = Math.min(min, projection);
    max = Math.max(max, projection);
  }

  return { min, max };
}

// Swept separating-axis checks cover the entire move, not just its destination.
function intersectsDuringMove(moving, stationary, dx, dy) {
  let entry = 0;
  let exit = 1;

  for (const polygon of [moving, stationary]) {
    for (let index = 0; index < polygon.length; index += 1) {
      const a = polygon[index];
      const b = polygon[(index + 1) % polygon.length];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const axisX = -(b.y - a.y) / length;
      const axisY = (b.x - a.x) / length;
      const first = project(moving, axisX, axisY);
      const second = project(stationary, axisX, axisY);
      const velocity = dx * axisX + dy * axisY;
      const min = second.min - first.max - COLLISION_DISTANCE;
      const max = second.max - first.min + COLLISION_DISTANCE;

      if (Math.abs(velocity) < 1e-10) {
        if (min > 0 || max < 0) {
          return false;
        }
      } else {
        const t1 = min / velocity;
        const t2 = max / velocity;
        entry = Math.max(entry, Math.min(t1, t2));
        exit = Math.min(exit, Math.max(t1, t2));

        if (entry > exit) {
          return false;
        }
      }
    }
  }

  return true;
}

export function isMoveClear(entity, nextPosition, nextAngle, others) {
  const dx = nextPosition.x - entity.position.x;
  const dy = nextPosition.y - entity.position.y;
  const radius = getCollisionRadius(entity.footprint);
  const candidates = Array.isArray(others) ? others : others.queryMove(entity, nextPosition);
  let moving;

  for (const other of candidates) {
    if (other === entity) {
      continue;
    }

    const reach = radius + getCollisionRadius(other.footprint);
    if (other.position.x < Math.min(entity.position.x, nextPosition.x) - reach
      || other.position.x > Math.max(entity.position.x, nextPosition.x) + reach
      || other.position.y < Math.min(entity.position.y, nextPosition.y) - reach
      || other.position.y > Math.max(entity.position.y, nextPosition.y) + reach) {
      continue;
    }

    moving ??= worldFootprint(entity, nextAngle);
    if (intersectsDuringMove(moving, worldFootprint(other, other.heading), dx, dy)) {
      return false;
    }
  }

  return true;
}
