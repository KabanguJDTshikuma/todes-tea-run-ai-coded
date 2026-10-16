import * as THREE from 'three';
import { COLLISION_DISTANCE, isMoveClear } from './Collision.js';
import { isMapMoveClear } from './WorldBounds.js';

const WAYPOINT_CLEARANCE = 4;
const graphCache = new WeakMap();

function canTravel(entity, start, end, houses) {
  const heading = Math.atan2(end.y - start.y, end.x - start.x) + Math.PI / 2;
  const probe = {
    position: start,
    footprint: entity.footprint,
    heading,
  };

  return isMapMoveClear(probe, end, heading)
    && isMoveClear(probe, end, heading, houses);
}

function getObstacleGraph(entity, houses) {
  let graphs = graphCache.get(houses);
  if (!graphs) {
    graphs = new WeakMap();
    graphCache.set(houses, graphs);
  }
  if (graphs.has(entity.footprint)) {
    return graphs.get(entity.footprint);
  }
  const radius = Math.max(...entity.footprint.map((point) => Math.hypot(point.x, point.y)));
  const padding = radius + COLLISION_DISTANCE + WAYPOINT_CLEARANCE;
  const nodes = [];

  for (const house of houses) {
    const cosine = Math.cos(house.heading);
    const sine = Math.sin(house.heading);
    const points = house.footprint.map((point) => ({
      x: house.position.x + point.x * cosine - point.y * sine,
      y: house.position.y + point.x * sine + point.y * cosine,
    }));
    const minX = Math.min(...points.map((point) => point.x)) - padding;
    const maxX = Math.max(...points.map((point) => point.x)) + padding;
    const minY = Math.min(...points.map((point) => point.y)) - padding;
    const maxY = Math.max(...points.map((point) => point.y)) + padding;

    nodes.push(
      new THREE.Vector3(minX, minY, 0),
      new THREE.Vector3(minX, maxY, 0),
      new THREE.Vector3(maxX, minY, 0),
      new THREE.Vector3(maxX, maxY, 0),
    );
  }

  const graph = { nodes, edges: new Map() };
  graphs.set(entity.footprint, graph);
  return graph;
}

export function findRoute(entity, target, houses) {
  if (canTravel(entity, entity.position, target, houses)) {
    return [target.clone()];
  }

  const graph = getObstacleGraph(entity, houses);
  const nodes = [entity.position.clone(), target.clone(), ...graph.nodes];
  const costs = nodes.map(() => Infinity);
  const previous = nodes.map(() => -1);
  const visited = new Set();
  costs[0] = 0;

  while (visited.size < nodes.length) {
    let current = -1;

    for (let index = 0; index < nodes.length; index += 1) {
      if (!visited.has(index) && costs[index] < Infinity
        && (current === -1 || costs[index] < costs[current])) {
        current = index;
      }
    }

    if (current === -1) {
      return [];
    }

    if (current === 1) {
      const route = [];
      for (let index = 1; index !== 0; index = previous[index]) {
        route.unshift(nodes[index]);
      }
      return route;
    }

    visited.add(current);

    for (let next = 0; next < nodes.length; next += 1) {
      if (visited.has(next)) {
        continue;
      }

      const cost = costs[current] + nodes[current].distanceTo(nodes[next]);

      if (cost >= costs[next]) {
        continue;
      }

      let clear;
      if (current >= 2 && next >= 2) {
        // House layouts are static; cache directed edges for this model footprint.
        const key = current * nodes.length + next;
        if (!graph.edges.has(key)) {
          graph.edges.set(key, canTravel(entity, nodes[current], nodes[next], houses));
        }
        clear = graph.edges.get(key);
      } else {
        clear = canTravel(entity, nodes[current], nodes[next], houses);
      }

      if (clear) {
        costs[next] = cost;
        previous[next] = current;
      }
    }
  }

  return [];
}
