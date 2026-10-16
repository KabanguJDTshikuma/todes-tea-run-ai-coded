import * as THREE from 'three';
import { getCollisionRadius, isMoveClear } from './Collision.js';
import { isMapMoveClear } from './WorldBounds.js';

const CHASE_DURATION = 3;
const WARNING_DURATION = 1.2;
const RECOVERY_DURATION = 1.5;
const CHARGE_DISTANCE = 240;
const CHARGE_SPEED = 300;

export class BossCharge {
  constructor(boss) {
    this.boss = boss;
    this.state = 'chasing';
    this.remaining = CHASE_DURATION;
    this.direction = new THREE.Vector3();
    this.nextPosition = new THREE.Vector3();
    this.distanceRemaining = 0;
    this.lane = new THREE.Mesh(
      new THREE.PlaneGeometry(CHARGE_DISTANCE, getCollisionRadius(boss.footprint) * 2),
      new THREE.MeshBasicMaterial({
        color: 0xff6622,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.lane.visible = false;
    boss.add(this.lane);
  }

  recover() {
    this.state = 'recovering';
    this.remaining = RECOVERY_DURATION;
    this.lane.visible = false;
    this.boss.route = [];
    this.boss.routeRefreshRemaining = 0;
  }

  update(delta, player, enemies, houses) {
    const boss = this.boss;

    if (this.state === 'charging') {
      const distance = Math.min(CHARGE_SPEED * delta, this.distanceRemaining);
      this.nextPosition.copy(boss.position).addScaledVector(this.direction, distance);

      if (!isMapMoveClear(boss, this.nextPosition, boss.heading)
        || !isMoveClear(boss, this.nextPosition, boss.heading, houses)
        || !isMoveClear(boss, this.nextPosition, boss.heading, enemies)) {
        this.recover();
        return false;
      }

      if (!isMoveClear(boss, this.nextPosition, boss.heading, [player])) {
        this.recover();
        return true;
      }

      boss.position.copy(this.nextPosition);
      this.distanceRemaining = Math.max(0, this.distanceRemaining - distance);
      if (this.distanceRemaining === 0) {
        this.recover();
      }
      return false;
    }

    this.remaining = Math.max(0, this.remaining - delta);
    if (this.state === 'warning') {
      if (this.remaining === 0) {
        this.state = 'charging';
        this.lane.visible = false;
      }
      return false;
    }

    if (this.state === 'recovering') {
      if (this.remaining === 0) {
        this.state = 'chasing';
        this.remaining = CHASE_DURATION;
      }
      return false;
    }

    if (this.remaining > 0) {
      return null;
    }

    this.direction.subVectors(player.position, boss.position).setZ(0);
    if (this.direction.lengthSq() === 0) {
      return null;
    }
    this.direction.normalize();
    const angle = Math.atan2(this.direction.y, this.direction.x);
    const heading = angle + Math.PI / 2;

    // Turning must not introduce overlap before the stationary warning starts.
    if (!isMapMoveClear(boss, boss.position, heading)
      || !isMoveClear(boss, boss.position, heading, houses)
      || !isMoveClear(boss, boss.position, heading, enemies)) {
      this.remaining = 0.5;
      return null;
    }
    if (!isMoveClear(boss, boss.position, heading, [player])) {
      return true;
    }

    boss.heading = heading;
    boss.model.rotation.set(Math.PI / 2, 0, 0);
    boss.model.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), heading);
    this.distanceRemaining = CHARGE_DISTANCE;
    this.state = 'warning';
    this.remaining = WARNING_DURATION;
    this.lane.rotation.z = angle;
    this.lane.position.set(
      this.direction.x * CHARGE_DISTANCE / 2,
      this.direction.y * CHARGE_DISTANCE / 2,
      0.5,
    );
    this.lane.visible = true;
    return false;
  }

  dispose() {
    this.lane.removeFromParent();
    this.lane.geometry.dispose();
    this.lane.material.dispose();
  }
}
