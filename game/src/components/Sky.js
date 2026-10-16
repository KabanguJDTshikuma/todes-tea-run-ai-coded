import * as THREE from 'three';
import { MAP_HALF_SIZE, TILE_SIZE } from './WorldBounds.js';

const SKY_COLOR = '#bfe3ff';
// Matches the meadow tiles in Map.js so the floor's real edge is invisible.
const GRASS_COLORS = ['#228B22', '#90EE90'];
// An even tile count keeps the repeating 2x2 texture aligned with the meadow grid.
const PLAIN_TILE_COUNT = 260;

const CLOUD_COUNT = 60;
const CLOUD_FIELD_HALF_SIZE = 1100;
const CLOUD_CLEAR_ZONE = MAP_HALF_SIZE + 70;
const CLOUD_MIN_HEIGHT = 30;
const CLOUD_MAX_HEIGHT = 140;
const WIND_SPEED = 8;
// Clouds fade out over the meadow and near the camera so they never hide gameplay.
const MEADOW_FADE_START = MAP_HALF_SIZE + 20;
const MEADOW_FADE_LENGTH = 60;
const CAMERA_FADE_START = 380;
const CAMERA_FADE_LENGTH = 200;

const puffGeometry = new THREE.SphereGeometry(1, 16, 12);
const cameraPosition = new THREE.Vector3();

function createPlainTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const context = canvas.getContext('2d');
  // Canvas rows are flipped into UV space: the bottom-left pixel is the plane's corner tile.
  context.fillStyle = GRASS_COLORS[0];
  context.fillRect(0, 1, 1, 1);
  context.fillRect(1, 0, 1, 1);
  context.fillStyle = GRASS_COLORS[1];
  context.fillRect(1, 1, 1, 1);
  context.fillRect(0, 0, 1, 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(PLAIN_TILE_COUNT / 2, PLAIN_TILE_COUNT / 2);
  texture.magFilter = THREE.NearestFilter;
  texture.anisotropy = 8;
  return texture;
}

function createCloud() {
  const material = new THREE.MeshLambertMaterial({
    color: '#ffffff',
    emissive: '#dce8f5',
    emissiveIntensity: 0.45,
    transparent: true,
    // Fog would tint distant clouds to the sky color and make them vanish.
    fog: false,
  });
  const cloud = new THREE.Group();
  const puffCount = 5 + Math.floor(Math.random() * 4);
  const size = 22 + Math.random() * 22;

  for (let index = 0; index < puffCount; index += 1) {
    const puff = new THREE.Mesh(puffGeometry, material);
    const radius = size * (0.6 + Math.random() * 0.5);
    puff.position.set(
      (index - (puffCount - 1) / 2) * size * 0.7 + (Math.random() - 0.5) * size * 0.4,
      (Math.random() - 0.5) * size * 0.9,
      Math.random() * size * 0.35,
    );
    // Flattened puffs give the cloud a softer, wider silhouette.
    puff.scale.set(radius, radius * 0.85, radius * 0.6);
    cloud.add(puff);
  }

  cloud.rotation.z = Math.random() * Math.PI;
  cloud.userData.material = material;
  return cloud;
}

function randomCloudPosition(cloud) {
  let x;
  let y;

  do {
    x = (Math.random() * 2 - 1) * CLOUD_FIELD_HALF_SIZE;
    y = (Math.random() * 2 - 1) * CLOUD_FIELD_HALF_SIZE;
  } while (Math.max(Math.abs(x), Math.abs(y)) < CLOUD_CLEAR_ZONE);

  cloud.position.set(
    x,
    y,
    CLOUD_MIN_HEIGHT + Math.random() * (CLOUD_MAX_HEIGHT - CLOUD_MIN_HEIGHT),
  );
}

// Extends the checkerboard to the horizon under drifting clouds and fades the distance
// into sky blue. Decorative only: the play area's invisible floor edge still applies.
export function createSky(scene) {
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.Fog(SKY_COLOR, 500, 1200);

  const surroundings = new THREE.Group();

  const plainSize = PLAIN_TILE_COUNT * TILE_SIZE;
  const plain = new THREE.Mesh(
    new THREE.PlaneGeometry(plainSize, plainSize),
    new THREE.MeshStandardMaterial({ map: createPlainTexture() }),
  );
  // Just below the meadow tiles, which keep rendering on top inside the play area.
  plain.position.z = -0.5;
  plain.receiveShadow = true;

  const clouds = [];
  for (let index = 0; index < CLOUD_COUNT; index += 1) {
    const cloud = createCloud();
    randomCloudPosition(cloud);
    clouds.push(cloud);
  }

  surroundings.add(plain, ...clouds);
  scene.add(surroundings);

  return {
    update(delta, camera) {
      camera.getWorldPosition(cameraPosition);

      for (const cloud of clouds) {
        cloud.position.x += WIND_SPEED * delta;
        if (cloud.position.x > CLOUD_FIELD_HALF_SIZE) {
          cloud.position.x -= CLOUD_FIELD_HALF_SIZE * 2;
        }

        const meadowDistance = Math.max(Math.abs(cloud.position.x), Math.abs(cloud.position.y));
        const meadowFade = THREE.MathUtils.clamp(
          (meadowDistance - MEADOW_FADE_START) / MEADOW_FADE_LENGTH,
          0,
          1,
        );
        const cameraFade = THREE.MathUtils.clamp(
          (cloud.position.distanceTo(cameraPosition) - CAMERA_FADE_START) / CAMERA_FADE_LENGTH,
          0,
          1,
        );
        const opacity = Math.min(meadowFade, cameraFade);

        cloud.visible = opacity > 0;
        cloud.userData.material.opacity = opacity;
      }
    },
  };
}
