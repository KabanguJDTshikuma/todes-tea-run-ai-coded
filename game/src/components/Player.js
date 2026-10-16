import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createFootprint, isMoveClear } from './Collision.js';
import {
  INVULNERABILITY_DURATION, PLAYER_MAX_HEALTH, PLAYER_MOVEMENT_SPEED,
} from './Difficulty.js';
import { isMapMoveClear } from './WorldBounds.js';

const PLAYER_SCALE = 20;
const JUMP_HEIGHT = 12;
const JUMP_DISTANCE = 30;
const UP = new THREE.Vector3(0, 0, 1);

const DIRECTIONS = new Map([
  ['ArrowUp', new THREE.Vector3(0, 1, 0)],
  ['ArrowDown', new THREE.Vector3(0, -1, 0)],
  ['ArrowLeft', new THREE.Vector3(-1, 0, 0)],
  ['ArrowRight', new THREE.Vector3(1, 0, 0)],
  ['KeyW', new THREE.Vector3(0, 1, 0)],
  ['KeyS', new THREE.Vector3(0, -1, 0)],
  ['KeyA', new THREE.Vector3(-1, 0, 0)],
  ['KeyD', new THREE.Vector3(1, 0, 0)],
  ['w', new THREE.Vector3(0, 1, 0)],
  ['s', new THREE.Vector3(0, -1, 0)],
  ['a', new THREE.Vector3(-1, 0, 0)],
  ['d', new THREE.Vector3(1, 0, 0)],
  ['W', new THREE.Vector3(0, 1, 0)],
  ['S', new THREE.Vector3(0, -1, 0)],
  ['A', new THREE.Vector3(-1, 0, 0)],
  ['D', new THREE.Vector3(1, 0, 0)],
]);

class Player extends THREE.Group {
  constructor(model) {
    super();
    this.model = model;
    this.footprint = createFootprint(model);
    this.heading = 0;
    this.groundOffset = model.position.z;
    this.inputQueue = [];
    this.move = null;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.health = this.maxHealth;
    this.invulnerabilityTimer = 0;
    this.add(model);
  }

  get isInvulnerable() {
    return this.invulnerabilityTimer > 0;
  }

  takeDamage(amount = 1) {
    if (this.invulnerabilityTimer > 0 || this.health <= 0) {
      return false;
    }
    this.health = Math.max(0, this.health - amount);
    this.invulnerabilityTimer = INVULNERABILITY_DURATION;
    return true;
  }

  setOpacity(opacity) {
    this.model.traverse((object) => {
      if (object.isMesh && object.material) {
        if (Array.isArray(object.material)) {
          for (const mat of object.material) {
            mat.transparent = opacity < 1;
            mat.opacity = opacity;
          }
        } else {
          object.material.transparent = opacity < 1;
          object.material.opacity = opacity;
        }
      }
    });
  }

  enqueueMove(key) {
    const direction = DIRECTIONS.get(key);

    if (!direction) {
      return false;
    }

    this.inputQueue.push(direction);
    return true;
  }

  reset() {
    this.position.set(0, 0, 0);
    this.heading = 0;
    this.inputQueue.length = 0;
    this.move = null;
    this.health = this.maxHealth;
    this.invulnerabilityTimer = 0;
    this.setOpacity(1);
    this.model.position.z = this.groundOffset;
    this.model.rotation.set(Math.PI / 2, 0, 0);
    this.model.visible = true;
  }

  update(delta, enemies, movementSpeed = PLAYER_MOVEMENT_SPEED, houses = []) {
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer = Math.max(0, this.invulnerabilityTimer - delta);
      if (this.invulnerabilityTimer > 0) {
        const strobe = Math.floor(this.invulnerabilityTimer * 12) % 2 === 0 ? 0.35 : 0.85;
        this.setOpacity(strobe);
      } else {
        this.setOpacity(1);
      }
    }

    let remainingTime = delta;

    while (remainingTime > 0) {
      if (!this.move) {
        const direction = this.inputQueue.shift();

        if (!direction) {
          break;
        }

        this.move = {
          direction,
          start: this.position.clone(),
          progress: 0,
        };
      }

      const progressStep = Math.min(
        remainingTime * movementSpeed,
        1 - this.move.progress,
      );
      remainingTime -= progressStep / movementSpeed;

      const nextProgress = this.move.progress + progressStep;
      const nextPosition = this.move.start.clone().addScaledVector(
        this.move.direction,
        JUMP_DISTANCE * nextProgress,
      );
      const nextHeading = Math.atan2(this.move.direction.y, this.move.direction.x)
        + Math.PI / 2;

      if (!isMapMoveClear(this, nextPosition, nextHeading)
        || !isMoveClear(this, nextPosition, nextHeading, houses)) {
        this.move = null;
        this.model.position.z = this.groundOffset;
        return false;
      }

      if (!isMoveClear(this, nextPosition, nextHeading, enemies)) {
        this.move = null;
        this.model.position.z = this.groundOffset;
        return true;
      }

      this.move.progress = nextProgress;
      this.position.copy(nextPosition);
      this.heading = nextHeading;
      this.model.rotation.set(Math.PI / 2, 0, 0);
      this.model.rotateOnWorldAxis(UP, this.heading);
      // Only the model hops so the attached camera does not bob vertically.
      this.model.position.z = this.groundOffset
        + Math.sin(this.move.progress * Math.PI) * JUMP_HEIGHT;

      if (this.move.progress === 1) {
        this.model.position.z = this.groundOffset;
        this.move = null;
      }
    }

    return false;
  }
}

export async function createPlayer() {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/tode.glb`);
  const model = gltf.scene;

  model.rotation.x = Math.PI / 2;
  model.scale.setScalar(PLAYER_SCALE);
  model.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(model);
  model.position.z -= bounds.min.z;

  model.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return new Player(model);
}
