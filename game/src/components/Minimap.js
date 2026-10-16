import { MAP_HALF_SIZE } from './WorldBounds.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const UPDATE_INTERVAL = 0.1;

function svgElement(name, attributes) {
  const element = document.createElementNS(SVG_NAMESPACE, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

export class Minimap {
  constructor() {
    this.element = document.createElement('aside');
    this.element.className = 'minimap';
    this.element.setAttribute('aria-label', 'Minimap');
    this.element.hidden = true;
    const title = document.createElement('strong');
    title.textContent = 'Map (+Y up)';
    const size = MAP_HALF_SIZE * 2;
    const map = svgElement('svg', {
      viewBox: `${-MAP_HALF_SIZE} ${-MAP_HALF_SIZE} ${size} ${size}`,
      role: 'img',
      'aria-label': 'Top-down map: Tode, houses, regular enemies, scouts, armored enemies, and bosses',
    });
    this.houseLayer = svgElement('g', {});
    this.enemyLayer = svgElement('g', {});
    const kettleMarker = svgElement('rect', {
      x: -12, y: -12, width: 24, height: 24, fill: '#ffd56a',
      stroke: '#ffffff', 'stroke-width': 3,
    });
    this.leafMarker = svgElement('polygon', {
      points: '0,14 -9,0 0,-14 9,0', fill: '#ffe88a',
    });
    this.leafMarker.style.display = 'none';
    this.playerMarker = svgElement('circle', {
      r: 13,
      fill: '#90ee90',
      stroke: '#ffffff',
      'stroke-width': 5,
    });
    const world = svgElement('g', { transform: 'scale(1,-1)' });
    world.append(this.houseLayer, kettleMarker, this.leafMarker, this.enemyLayer, this.playerMarker);
    map.append(world);
    const legend = document.createElement('div');
    legend.className = 'minimap-legend';
    for (const [kind, label] of [
      ['player', 'Tode'], ['house', 'House'], ['enemy', 'Enemy'], ['boss', 'Boss'],
      ['scout', 'Scout'], ['armored', 'Armored'],
      ['tea', 'Tea'],
    ]) {
      const item = document.createElement('span');
      item.className = `minimap-key minimap-key-${kind}`;
      item.textContent = label;
      legend.append(item);
    }
    this.element.append(title, map, legend);
    document.body.append(this.element);
    this.markers = new Map();
    this.houses = null;
    this.elapsed = 0;
  }

  update(delta, visible, player, enemies, houses, teaRun) {
    const wasHidden = this.element.hidden;
    this.element.hidden = !visible;
    if (!visible) {
      return;
    }
    this.elapsed += delta;
    if (!wasHidden && this.elapsed < UPDATE_INTERVAL) {
      return;
    }
    this.elapsed = 0;
    if (teaRun) {
      this.leafMarker.style.display = teaRun.leaf.visible ? '' : 'none';
      this.leafMarker.setAttribute(
        'transform', `translate(${teaRun.leaf.position.x},${teaRun.leaf.position.y})`,
      );
    }

    if (houses !== this.houses) {
      this.houseLayer.replaceChildren();
      for (const house of houses) {
        this.houseLayer.append(svgElement('polygon', {
          points: house.footprint.map((point) => `${point.x},${point.y}`).join(' '),
          transform: `translate(${house.position.x},${house.position.y}) rotate(${house.heading * 180 / Math.PI})`,
          fill: '#d8c4a0',
          stroke: '#352514',
          'stroke-width': 4,
        }));
      }
      this.houses = houses;
    }

    const living = new Set(enemies);
    for (const [enemy, marker] of this.markers) {
      if (!living.has(enemy)) {
        marker.remove();
        this.markers.delete(enemy);
      }
    }
    for (const enemy of enemies) {
      if (!this.markers.has(enemy)) {
        const marker = enemy.isBoss
          ? svgElement('polygon', {
            points: '0,19 19,0 0,-19 -19,0',
            fill: '#ffbc57',
            stroke: '#ffffff',
            'stroke-width': 3,
          })
          : enemy.type === 'scout'
            ? svgElement('polygon', { points: '0,12 -10,-8 10,-8', fill: '#55ddff' })
            : enemy.type === 'armored'
              ? svgElement('rect', {
                x: -10, y: -10, width: 20, height: 20, fill: '#bb99ff',
              })
              : svgElement('circle', { r: 8, fill: '#ff6275' });
        this.markers.set(enemy, marker);
        this.enemyLayer.append(marker);
      }
      this.markers.get(enemy).setAttribute(
        'transform',
        `translate(${enemy.position.x},${enemy.position.y})`,
      );
    }
    this.playerMarker.setAttribute('cx', String(player.position.x));
    this.playerMarker.setAttribute('cy', String(player.position.y));
  }
}
