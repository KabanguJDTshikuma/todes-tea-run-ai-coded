export const ENEMY_TYPES = {
  regular: { health: 1, speed: 1, size: 1, color: null },
  scout: { health: 1, speed: 1.5, size: 0.8, color: '#55ddff' },
  armored: { health: 2, speed: 0.6, size: 1.2, color: '#bb99ff' },
};

export function selectEnemyType(wave, regularSpawned) {
  if (wave >= 3 && regularSpawned % 4 === 2) {
    return 'armored';
  }
  if (wave >= 2 && regularSpawned % 3 === 1) {
    return 'scout';
  }
  return 'regular';
}
