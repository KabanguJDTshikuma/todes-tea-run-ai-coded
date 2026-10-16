import { getCollisionRadius } from './Collision.js';

const CELL_SIZE = 80;

export class SpatialIndex {
  constructor() {
    this.cells = new Map();
    this.memberships = new Map();
  }

  clear() {
    this.cells.clear();
    this.memberships.clear();
  }

  keys(minX, minY, maxX, maxY) {
    const keys = [];
    for (let x = Math.floor(minX / CELL_SIZE); x <= Math.floor(maxX / CELL_SIZE); x += 1) {
      for (let y = Math.floor(minY / CELL_SIZE); y <= Math.floor(maxY / CELL_SIZE); y += 1) {
        keys.push(`${x},${y}`);
      }
    }
    return keys;
  }

  update(entity) {
    const radius = getCollisionRadius(entity.footprint);
    const { x, y } = entity.position;
    const keys = this.keys(x - radius, y - radius, x + radius, y + radius);
    const previous = this.memberships.get(entity);
    if (previous && previous.length === keys.length
      && previous.every((key, index) => key === keys[index])) {
      return;
    }

    this.remove(entity);
    for (const key of keys) {
      if (!this.cells.has(key)) {
        this.cells.set(key, new Set());
      }
      this.cells.get(key).add(entity);
    }
    this.memberships.set(entity, keys);
  }

  remove(entity) {
    for (const key of this.memberships.get(entity) ?? []) {
      const cell = this.cells.get(key);
      cell.delete(entity);
      if (cell.size === 0) {
        this.cells.delete(key);
      }
    }
    this.memberships.delete(entity);
  }

  queryMove(entity, nextPosition) {
    const radius = getCollisionRadius(entity.footprint);
    const keys = this.keys(
      Math.min(entity.position.x, nextPosition.x) - radius,
      Math.min(entity.position.y, nextPosition.y) - radius,
      Math.max(entity.position.x, nextPosition.x) + radius,
      Math.max(entity.position.y, nextPosition.y) + radius,
    );
    const candidates = new Set();
    for (const key of keys) {
      for (const other of this.cells.get(key) ?? []) {
        candidates.add(other);
      }
    }
    return candidates;
  }

  getCellCount() {
    return this.cells.size;
  }

  getEntityCount() {
    return this.memberships.size;
  }
}
