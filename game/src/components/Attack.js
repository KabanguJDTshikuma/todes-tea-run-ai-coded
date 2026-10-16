import * as THREE from 'three';
import {
  ATTACK_COOLDOWN, ATTACK_RADIUS, SUPER_CROAK_KNOCKBACK, SUPER_CROAK_RADIUS_MULTIPLIER,
} from './Difficulty.js';
import { HitEffects } from './HitEffects.js';
import { knockback } from './Knockback.js';

const ATTACK_VISUAL_DURATION = 0.2;
const SUPER_CROAK_VISUAL_DURATION = 0.35;

export class Attack {
  constructor(scene) {
    this.hitEffects = new HitEffects(scene);
    this.cooldownRemaining = 0;
    this.cooldownDuration = ATTACK_COOLDOWN;
    this.radius = ATTACK_RADIUS;
    this.visualRemaining = 0;
    this.charge = 0;
    this.superVisualRemaining = 0;
    // What the most recent accepted attack hit, for impact feedback.
    this.lastBossHit = false;
    this.lastBossDefeated = false;
    this.circle = new THREE.Mesh(
      new THREE.CircleGeometry(ATTACK_RADIUS, 64),
      new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.circle.visible = false;

    this.superCircle = new THREE.Mesh(
      new THREE.RingGeometry(ATTACK_RADIUS * 0.4, ATTACK_RADIUS * SUPER_CROAK_RADIUS_MULTIPLIER, 64),
      new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.superCircle.visible = false;

    scene.add(this.circle, this.superCircle);
  }

  addCharge(amount) {
    this.charge = Math.min(100, Math.max(0, this.charge + amount));
  }

  update(delta, difficulty) {
    this.hitEffects.update(delta);
    if (difficulty) {
      // Preserve cooldown progress when the score changes its duration.
      this.cooldownRemaining *= difficulty.attackCooldown / this.cooldownDuration;
      this.cooldownDuration = difficulty.attackCooldown;
      this.radius = difficulty.attackRadius;
    }

    this.cooldownRemaining = Math.max(0, this.cooldownRemaining - delta);
    this.visualRemaining = Math.max(0, this.visualRemaining - delta);
    this.circle.visible = this.visualRemaining > 0;
    this.circle.material.opacity = 0.5 * this.visualRemaining / ATTACK_VISUAL_DURATION;

    this.superVisualRemaining = Math.max(0, this.superVisualRemaining - delta);
    this.superCircle.visible = this.superVisualRemaining > 0;
    if (this.superVisualRemaining > 0) {
      const progress = 1 - this.superVisualRemaining / SUPER_CROAK_VISUAL_DURATION;
      this.superCircle.scale.setScalar(0.6 + progress * 0.6);
      this.superCircle.material.opacity = 0.8 * (1 - progress);
    }
  }

  reset() {
    this.hitEffects.reset();
    this.cooldownRemaining = 0;
    this.cooldownDuration = ATTACK_COOLDOWN;
    this.radius = ATTACK_RADIUS;
    this.visualRemaining = 0;
    this.charge = 0;
    this.superVisualRemaining = 0;
    this.circle.visible = false;
    this.circle.material.opacity = 0;
    this.superCircle.visible = false;
    this.superCircle.material.opacity = 0;
  }

  trigger(player, enemies, enemyIndex, powerUps, teaRun) {
    if (this.cooldownRemaining > 0) {
      return 0;
    }

    this.cooldownRemaining = this.cooldownDuration;
    this.visualRemaining = ATTACK_VISUAL_DURATION;
    this.lastBossHit = false;
    this.lastBossDefeated = false;
    this.circle.position.set(player.position.x, player.position.y, 0.25);
    this.circle.scale.setScalar(this.radius / ATTACK_RADIUS);
    this.circle.material.opacity = 0.5;
    this.circle.visible = true;

    let defeated = 0;

    for (let index = enemies.length - 1; index >= 0; index -= 1) {
      const enemy = enemies[index];
      const distance = Math.hypot(
        enemy.position.x - player.position.x,
        enemy.position.y - player.position.y,
      );

      if (distance <= this.radius) {
        this.hitEffects.spawn(enemy.position);
        this.lastBossHit ||= enemy.isBoss;

        if (!enemy.takeDamage()) {
          continue;
        }

        this.lastBossDefeated ||= enemy.isBoss;

        powerUps?.drop(enemy);
        teaRun?.onDefeat(enemy);
        // Enemy clones share model resources with living enemies and future spawns.
        enemy.removeFromParent();
        enemy.dispose();
        enemyIndex?.remove(enemy);
        enemies.splice(index, 1);
        defeated += 1;
      }
    }

    return defeated;
  }

  triggerSuperCroak(player, enemies, enemyIndex, powerUps, teaRun, houses = []) {
    if (this.charge < 100) {
      return 0;
    }

    this.charge = 0;
    this.superVisualRemaining = SUPER_CROAK_VISUAL_DURATION;
    this.superCircle.position.set(player.position.x, player.position.y, 0.28);
    this.superCircle.scale.setScalar(1);
    this.superCircle.material.opacity = 0.8;
    this.superCircle.visible = true;

    const superRadius = this.radius * SUPER_CROAK_RADIUS_MULTIPLIER;
    let defeated = 0;

    for (let index = enemies.length - 1; index >= 0; index -= 1) {
      const enemy = enemies[index];
      const distance = Math.hypot(
        enemy.position.x - player.position.x,
        enemy.position.y - player.position.y,
      );

      if (distance <= superRadius) {
        this.hitEffects.spawn(enemy.position);

        if (!enemy.takeDamage()) {
          // Survivors are pushed back with the same collision rules as movement.
          if (!enemy.charge || enemy.charge.state === 'chasing') {
            knockback(enemy, player.position.x, player.position.y, SUPER_CROAK_KNOCKBACK, [
              houses, enemyIndex ?? enemies,
            ]);
            enemyIndex?.update(enemy);
          }
          continue;
        }

        powerUps?.drop(enemy);
        teaRun?.onDefeat(enemy);
        enemy.removeFromParent();
        enemy.dispose();
        enemyIndex?.remove(enemy);
        enemies.splice(index, 1);
        defeated += 1;
      }
    }

    return defeated;
  }
}
