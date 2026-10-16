import * as THREE from 'three';
import { isMoveClear } from './Collision.js';
import { TILE_SIZE, TILE_COUNT, MAP_HALF_SIZE } from './WorldBounds.js';

const HOUSE_COUNT = 3;
const PLACEMENT_CLEARANCE = 20;
const START_CLEARANCE = 60;

export function createMap(createHouse, reservedEntities) {
  const map = new THREE.Group();
  const halfSize = MAP_HALF_SIZE;
  const geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
  const materials = [
    new THREE.MeshStandardMaterial({ color: '#228B22' }),
    new THREE.MeshStandardMaterial({ color: '#90EE90' }),
  ];

  for (let row = 0; row < TILE_COUNT; row += 1) {
    for (let column = 0; column < TILE_COUNT; column += 1) {
      const tile = new THREE.Mesh(geometry, materials[(row + column) % 2]);
      tile.position.set(
        -halfSize + (column + 0.5) * TILE_SIZE,
        -halfSize + (row + 0.5) * TILE_SIZE,
        0,
      );
      tile.receiveShadow = true;
      map.add(tile);
    }
  }

  const reservedAreas = reservedEntities.map((entity) => ({
    position: entity.position,
    heading: 0,
    footprint: [
      { x: -START_CLEARANCE, y: -START_CLEARANCE },
      { x: START_CLEARANCE, y: -START_CLEARANCE },
      { x: START_CLEARANCE, y: START_CLEARANCE },
      { x: -START_CLEARANCE, y: START_CLEARANCE },
    ],
  }));
  const candidates = [];

  for (let x = -210; x <= 210; x += 60) {
    for (let y = -210; y <= 210; y += 60) {
      candidates.push(new THREE.Vector3(
        x + (Math.random() - 0.5) * 20,
        y + (Math.random() - 0.5) * 20,
        0,
      ));
    }
  }

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
  }

  const houses = [];

  for (let index = 0; index < HOUSE_COUNT; index += 1) {
    const house = createHouse();
    const position = candidates.find((candidate) => {
      house.position.copy(candidate);
      const insideMap = house.footprint.every((point) => (
        Math.abs(point.x + candidate.x) <= halfSize - PLACEMENT_CLEARANCE
        && Math.abs(point.y + candidate.y) <= halfSize - PLACEMENT_CLEARANCE
      ));

      return insideMap && isMoveClear(
        house,
        house.position,
        house.heading,
        [...reservedEntities, ...reservedAreas, ...houses],
      );
    });

    if (!position) {
      throw new Error('Could not place three houses without blocking the starting or spawn areas.');
    }

    house.position.copy(position);
    houses.push(house);
    map.add(house);
  }

  return { map, houses };
}
