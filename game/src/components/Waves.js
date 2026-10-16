import { selectEnemyType } from './EnemyTypes.js';

const FIRST_WAVE_SIZE = 4;
const ENEMIES_PER_WAVE = 2;
const INTERMISSION_DURATION = 3;
const BONUS_PER_WAVE = 25;
const BOSS_WAVE_INTERVAL = 5;

export class Waves {
  constructor() {
    this.reset();
  }

  reset() {
    this.number = 1;
    this.pending = FIRST_WAVE_SIZE;
    this.spawnElapsed = 0;
    this.intermissionRemaining = 0;
    this.completed = 0;
    this.bossPending = false;
    this.regularSpawned = 0;
  }

  spawnNext(spawnEnemy) {
    const type = selectEnemyType(this.number, this.regularSpawned);
    if (!spawnEnemy(this.bossPending, this.number, type)) {
      return false;
    }

    if (!this.bossPending) {
      this.regularSpawned += 1;
    }
    this.bossPending = false;
    this.pending -= 1;
    return true;
  }

  spawnInitial(spawnEnemy) {
    while (this.pending > 0 && this.spawnNext(spawnEnemy)) {
      // Initial enemies occupy separate clear corners.
    }
  }

  update(delta, activeEnemies, spawnDelay, spawnEnemy) {
    if (this.intermissionRemaining > 0) {
      this.intermissionRemaining = Math.max(0, this.intermissionRemaining - delta);

      if (this.intermissionRemaining === 0) {
        this.number += 1;
        this.regularSpawned = 0;
        this.pending = FIRST_WAVE_SIZE + (this.number - 1) * ENEMIES_PER_WAVE;
        this.bossPending = this.number % BOSS_WAVE_INTERVAL === 0;
        if (this.bossPending) {
          this.pending += 1;
        }
        this.spawnElapsed = 0;
        // Start with one enemy; stagger the rest using score-based spawn timing.
        this.spawnNext(spawnEnemy);
      }

      return 0;
    }

    if (this.pending === 0 && activeEnemies === 0) {
      this.completed = this.number;
      this.intermissionRemaining = INTERMISSION_DURATION;
      return BONUS_PER_WAVE * this.number;
    }

    if (this.pending > 0) {
      this.spawnElapsed += delta;

      while (this.pending > 0 && this.spawnElapsed >= spawnDelay) {
        if (!this.spawnNext(spawnEnemy)) {
          // Preserve the pending enemy and retry when a corner becomes free.
          this.spawnElapsed = spawnDelay;
          break;
        }

        this.spawnElapsed -= spawnDelay;
      }
    }

    return 0;
  }
}
