import * as THREE from 'three';
import { MAP_HALF_SIZE } from './WorldBounds.js';

const FLOWER_SPACING = 6;
const ROWS = 2;
// Flowers start just outside the floor edge so they never overlap the play area.
const MIN_OFFSET = 3;
const MAX_OFFSET = 14;
const MIN_HEIGHT = 3.5;
const MAX_HEIGHT = 6.5;
const PETAL_COLORS = ['#ffffff', '#ffe14d', '#ff8fc7', '#c58cff', '#ff9a4d'];

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const scale = new THREE.Vector3();
const rotation = new THREE.Quaternion();
const color = new THREE.Color();

function flowerPlacements() {
  const placements = [];
  const extent = MAP_HALF_SIZE + MAX_OFFSET;

  for (const [axis, sign] of [['x', 1], ['x', -1], ['y', 1], ['y', -1]]) {
    for (let row = 0; row < ROWS; row += 1) {
      for (let along = -extent; along <= extent; along += FLOWER_SPACING) {
        const outward = MAP_HALF_SIZE + MIN_OFFSET + Math.random() * (MAX_OFFSET - MIN_OFFSET);
        const jitter = along + (Math.random() - 0.5) * FLOWER_SPACING;
        placements.push(axis === 'x'
          ? { x: sign * outward, y: jitter }
          : { x: jitter, y: sign * outward });
      }
    }
  }

  return placements;
}

// A decorative flower hedge marks the play area's invisible edge.
// It does not block movement or take part in collisions.
export function createBoundaryFlowers(scene) {
  const placements = flowerPlacements();

  const stemGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 5);
  stemGeometry.rotateX(Math.PI / 2);
  stemGeometry.translate(0, 0, 0.5);
  const stems = new THREE.InstancedMesh(
    stemGeometry,
    new THREE.MeshLambertMaterial({ color: '#2f7d32' }),
    placements.length,
  );

  const heads = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshLambertMaterial({ color: '#ffffff' }),
    placements.length,
  );

  placements.forEach((placement, index) => {
    const height = MIN_HEIGHT + Math.random() * (MAX_HEIGHT - MIN_HEIGHT);

    position.set(placement.x, placement.y, 0);
    scale.set(1, 1, height);
    stems.setMatrixAt(index, matrix.compose(position, rotation, scale));

    const size = 1.6 + Math.random() * 0.9;
    position.z = height;
    scale.set(size, size, size * 0.6);
    heads.setMatrixAt(index, matrix.compose(position, rotation, scale));
    heads.setColorAt(index, color.set(PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)]));
  });

  const flowers = new THREE.Group();
  flowers.add(stems, heads);
  scene.add(flowers);
  return flowers;
}
