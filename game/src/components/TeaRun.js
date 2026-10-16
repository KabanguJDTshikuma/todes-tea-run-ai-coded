import * as THREE from 'three';
import { TEA_BONUS_POINTS } from './Difficulty.js';

const DEFEATS_PER_LEAF = 4;
const COLLECT_RADIUS = 22;
const BREW_RADIUS = 30;
const BREW_REWARD = TEA_BONUS_POINTS;

export class TeaRun {
  constructor(scene) {
    this.defeats = 0;
    this.carrying = false;
    this.brews = 0;
    this.bonus = 0;
    const gold = new THREE.MeshStandardMaterial({
      color: '#ffd56a', emissive: '#704000', roughness: 0.35,
    });
    this.kettle = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 12), gold);
    body.scale.z = 0.8;
    body.position.z = 7;
    const lid = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), gold);
    lid.position.z = 14;
    const spout = new THREE.Mesh(new THREE.ConeGeometry(3, 12, 12), gold);
    spout.rotation.z = -Math.PI / 3;
    spout.position.set(10, 0, 9);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(6, 1.5, 8, 16), gold);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(-7, 0, 8);
    this.kettle.add(body, lid, spout, handle);
    this.kettle.position.set(-20, 0, 0);
    scene.add(this.kettle);

    this.home = new THREE.Mesh(
      new THREE.RingGeometry(26, 30, 64),
      new THREE.MeshBasicMaterial({ color: '#ffd56a', side: THREE.DoubleSide }),
    );
    this.home.position.z = 0.4;
    scene.add(this.home);

    const shape = new THREE.Shape();
    shape.moveTo(0, -10);
    shape.quadraticCurveTo(-13, 0, 0, 12);
    shape.quadraticCurveTo(13, 0, 0, -10);
    this.leaf = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({ color: '#ffe88a', side: THREE.DoubleSide }),
    );
    this.leaf.position.z = 1;
    this.leaf.visible = false;
    scene.add(this.leaf);

    this.hud = document.createElement('div');
    this.hud.className = 'tea-run';
    this.hud.hidden = true;
    document.body.append(this.hud);
  }

  onDefeat(enemy) {
    this.defeats += 1;
    // Keep one objective in the world at a time; no unreachable pickup backlog.
    if (!this.carrying && !this.leaf.visible && this.defeats >= DEFEATS_PER_LEAF) {
      this.defeats = 0;
      this.leaf.position.set(enemy.position.x, enemy.position.y, 1);
      this.leaf.visible = true;
    }
  }

  collect(player) {
    if (this.leaf.visible && Math.hypot(
      player.position.x - this.leaf.position.x,
      player.position.y - this.leaf.position.y,
    ) <= COLLECT_RADIUS) {
      this.carrying = true;
      this.leaf.visible = false;
    }

    if (this.carrying && Math.hypot(player.position.x, player.position.y) <= BREW_RADIUS) {
      this.carrying = false;
      this.defeats = 0;
      this.brews += 1;
      this.bonus += BREW_REWARD;
      return BREW_REWARD;
    }
    return 0;
  }

  updateHud(playing) {
    this.hud.hidden = !playing;
    this.home.material.color.set(this.carrying ? '#aaffaa' : '#ffd56a');
    const instruction = this.carrying
      ? 'Leaf collected! Return to the kettle at the center.'
      : this.leaf.visible
        ? 'A golden tea leaf dropped! Collect it and return home.'
        : `Tea Run: defeat ${Math.max(0, DEFEATS_PER_LEAF - this.defeats)} more for a leaf.`;
    const text = `${instruction} Brews: ${this.brews} | +${BREW_REWARD} points & attack ready per brew`;
    if (this.hud.textContent !== text) {
      this.hud.textContent = text;
    }
  }

  reset() {
    this.defeats = 0;
    this.carrying = false;
    this.brews = 0;
    this.bonus = 0;
    this.leaf.visible = false;
  }
}
