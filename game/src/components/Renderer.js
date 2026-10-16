import * as THREE from 'three';

export function createRenderer() {
  const canvas = document.querySelector('canvas.game');

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('The game requires a canvas with the class "game".');
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  return renderer;
}
