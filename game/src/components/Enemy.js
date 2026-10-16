import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { createFootprint, isMoveClear } from './Collision.js';
import { ENEMY_MOVEMENT_SPEED } from './Difficulty.js';
import { findRoute } from './Navigation.js';
import { BossCharge } from './BossCharge.js';
import { isMapMoveClear } from './WorldBounds.js';
import { ENEMY_TYPES } from './EnemyTypes.js';

const ENEMY_SCALE = 5;
const BOSS_SIZE_MULTIPLIER = 1.4;
const BOSS_SPEED_MULTIPLIER = 0.7;
const BOSS_BASE_HEALTH = 5;
const ROUTE_REFRESH_DELAY = 0.5;
const UP = new THREE.Vector3(0, 0, 1);

class Enemy extends THREE.Group {
  constructor(model, position, footprint, isBoss = false, wave = 1, type = 'regular') {
    super();
    this.model = model;
    this.isBoss = isBoss;
    this.type = isBoss ? 'boss' : type;
    this.speedMultiplier = isBoss ? BOSS_SPEED_MULTIPLIER : ENEMY_TYPES[type].speed;
    this.maxHealth = isBoss
      ? BOSS_BASE_HEALTH + Math.floor(wave / 5) - 1 : ENEMY_TYPES[type].health;
    this.health = this.maxHealth;
    this.footprint = footprint;
    this.heading = 0;
    this.direction = new THREE.Vector3();
    this.nextPosition = new THREE.Vector3();
    this.route = [];
    this.routeRefreshRemaining = 0;
    this.position.copy(position);
    this.add(model);
    this.charge = isBoss ? new BossCharge(this) : null;
  }

  takeDamage() {
    this.health = Math.max(0, this.health - 1);
    return this.health === 0;
  }

  dispose() {
    this.charge?.dispose();
  }

  update(delta, player, enemies, movementSpeed = ENEMY_MOVEMENT_SPEED, houses = []) {
    if (!isMoveClear(this, this.position, this.heading, [player])) {
      return true;
    }

    if (this.charge) {
      const result = this.charge.update(delta, player, enemies, houses);
      if (result !== null) {
        return result;
      }
    }

    this.routeRefreshRemaining -= delta;

    if (this.routeRefreshRemaining <= 0) {
      this.route = findRoute(this, player.position, houses);
      this.routeRefreshRemaining = ROUTE_REFRESH_DELAY;
    }

    while (this.route.length > 0
      && this.position.distanceToSquared(this.route[0]) < 1e-8) {
      this.route.shift();
    }

    const target = this.route[0];

    if (!target) {
      return false;
    }

    this.direction.set(
      target.x - this.position.x,
      target.y - this.position.y,
      0,
    );

    const distance = this.direction.length();

    if (distance === 0) {
      return !isMoveClear(this, this.position, this.heading, [player]);
    }

    this.direction.divideScalar(distance);
    const nextPosition = this.nextPosition.copy(this.position).addScaledVector(
      this.direction,
      Math.min(movementSpeed * this.speedMultiplier * delta, distance),
    );
    const nextHeading = Math.atan2(this.direction.y, this.direction.x) + Math.PI / 2;

    if (!isMapMoveClear(this, nextPosition, nextHeading)
      || !isMoveClear(this, nextPosition, nextHeading, houses)) {
      this.route = [];
      return false;
    }

    if (!isMoveClear(this, nextPosition, nextHeading, enemies)) {
      return false;
    }

    if (!isMoveClear(this, nextPosition, nextHeading, [player])) {
      return true;
    }

    this.position.copy(nextPosition);
    this.heading = nextHeading;
    this.model.rotation.set(Math.PI / 2, 0, 0);
    this.model.rotateOnWorldAxis(
      UP,
      this.heading,
    );

    return false;
  }
}

export async function createEnemyFactory() {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/enemy.glb`);
  const model = gltf.scene;

  model.rotation.x = Math.PI / 2;
  model.scale.setScalar(ENEMY_SCALE);
  model.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(model);
  model.position.z -= bounds.min.z;

  model.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  const footprint = createFootprint(model);
  const bossModel = clone(model);
  bossModel.scale.multiplyScalar(BOSS_SIZE_MULTIPLIER);
  bossModel.position.z *= BOSS_SIZE_MULTIPLIER;
  const bossFootprint = createFootprint(bossModel);
  const variants = new Map([['regular', { model, footprint }]]);

  for (const [type, settings] of Object.entries(ENEMY_TYPES)) {
    if (type === 'regular') {
      continue;
    }
    const variant = clone(model);
    variant.scale.multiplyScalar(settings.size);
    variant.position.z *= settings.size;
    const materials = new Map();
    variant.traverse((object) => {
      if (!object.isMesh) {
        return;
      }
      const tint = (material) => {
        if (!materials.has(material)) {
          const tinted = material.clone();
          if (tinted.color) {
            tinted.color.set(settings.color);
          }
          materials.set(material, tinted);
        }
        return materials.get(material);
      };
      object.material = Array.isArray(object.material)
        ? object.material.map(tint) : tint(object.material);
    });
    variants.set(type, { model: variant, footprint: createFootprint(variant) });
  }

  return (position, isBoss = false, wave = 1, type = 'regular') => {
    const variant = variants.get(type);
    if (!variant) {
      throw new Error(`Unknown enemy type: ${type}`);
    }
    return new Enemy(
      clone(isBoss ? bossModel : variant.model),
      position,
      isBoss ? bossFootprint : variant.footprint,
      isBoss,
      wave,
      type,
    );
  };
}
