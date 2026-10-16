import * as THREE from 'three';

const DROP_CHANCE = 0.25;
const PICKUP_LIFETIME = 15;
const BOOST_DURATION = 8;
const PICKUP_RADIUS = 22;
const SPEED_MULTIPLIER = 1.35;
const COOLDOWN_MULTIPLIER = 0.65;

export class PowerUps {
  constructor(scene) {
    this.scene = scene;
    this.pickups = [];
    this.speedRemaining = 0;
    this.attackRemaining = 0;
    this.geometry = new THREE.OctahedronGeometry(6);
    this.materials = {
      speed: new THREE.MeshBasicMaterial({ color: 0x55ddff }),
      attack: new THREE.MeshBasicMaterial({ color: 0xff99ee }),
    };
    this.hud = document.createElement('div');
    this.hud.className = 'power-ups';
    this.hud.hidden = true;
    document.body.append(this.hud);
  }

  drop(enemy) {
    if (!enemy.isBoss && Math.random() >= DROP_CHANCE) {
      return;
    }

    const kind = Math.random() < 0.5 ? 'speed' : 'attack';
    const mesh = new THREE.Mesh(this.geometry, this.materials[kind]);
    mesh.position.set(enemy.position.x, enemy.position.y, 9);
    this.scene.add(mesh);
    this.pickups.push({ kind, mesh, remaining: PICKUP_LIFETIME });
  }

  update(delta) {
    this.speedRemaining = Math.max(0, this.speedRemaining - delta);
    this.attackRemaining = Math.max(0, this.attackRemaining - delta);

    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];
      pickup.remaining = Math.max(0, pickup.remaining - delta);
      if (pickup.remaining === 0) {
        this.remove(index);
      }
    }
  }

  collect(player) {
    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];
      const distance = Math.hypot(
        pickup.mesh.position.x - player.position.x,
        pickup.mesh.position.y - player.position.y,
      );
      if (distance <= PICKUP_RADIUS) {
        if (pickup.kind === 'speed') {
          this.speedRemaining = BOOST_DURATION;
        } else {
          this.attackRemaining = BOOST_DURATION;
        }
        this.remove(index);
      }
    }
  }

  apply(difficulty) {
    return {
      ...difficulty,
      playerSpeed: difficulty.playerSpeed * (this.speedRemaining > 0 ? SPEED_MULTIPLIER : 1),
      attackCooldown: difficulty.attackCooldown
        * (this.attackRemaining > 0 ? COOLDOWN_MULTIPLIER : 1),
    };
  }

  updateHud(playing) {
    this.hud.hidden = !playing;
    const speed = this.speedRemaining > 0
      ? `Speed boost: ${Math.ceil(this.speedRemaining)}s` : 'Cyan: speed boost';
    const attack = this.attackRemaining > 0
      ? `Rapid attack: ${Math.ceil(this.attackRemaining)}s` : 'Pink: rapid attack';
    const text = `${speed} | ${attack}`;
    if (this.hud.textContent !== text) {
      this.hud.textContent = text;
    }
  }

  remove(index) {
    this.pickups[index].mesh.removeFromParent();
    this.pickups.splice(index, 1);
  }

  reset() {
    this.speedRemaining = 0;
    this.attackRemaining = 0;
    while (this.pickups.length > 0) {
      this.remove(this.pickups.length - 1);
    }
  }
}
