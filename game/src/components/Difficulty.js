export const GAME_CONFIG = {
  player: {
    maxHealth: 3,
    invulnerabilityDuration: 1.5,
    baseSpeed: 4,
    maxSpeed: 8,
  },
  combat: {
    baseAttackCooldown: 1,
    minAttackCooldown: 0.4,
    baseAttackRadius: 80,
    maxAttackRadius: 120,
    superCroakRadiusMultiplier: 1.8,
    superCroakKnockback: 40,
    contactKnockback: 45,
    chargePerKill: 10,
    chargePerTea: 50,
  },
  enemies: {
    baseSpawnDelay: 2,
    minSpawnDelay: 0.4,
    baseSpeed: 25,
    maxSpeed: 100,
  },
  scoring: {
    scorePerSecond: 0.1,
    scorePerKill: 10,
    teaBonusPoints: 50,
  },
  scaling: {
    complexityGrowthRate: 0.002,
  },
};

export const COMPLEXITY_GROWTH_RATE = GAME_CONFIG.scaling.complexityGrowthRate;
export const ENEMY_SPAWN_DELAY = GAME_CONFIG.enemies.baseSpawnDelay;
export const ENEMY_MOVEMENT_SPEED = GAME_CONFIG.enemies.baseSpeed;
export const PLAYER_MOVEMENT_SPEED = GAME_CONFIG.player.baseSpeed;
export const ATTACK_COOLDOWN = GAME_CONFIG.combat.baseAttackCooldown;
export const ATTACK_RADIUS = GAME_CONFIG.combat.baseAttackRadius;
export const PLAYER_MAX_HEALTH = GAME_CONFIG.player.maxHealth;
export const INVULNERABILITY_DURATION = GAME_CONFIG.player.invulnerabilityDuration;
export const SUPER_CROAK_RADIUS_MULTIPLIER = GAME_CONFIG.combat.superCroakRadiusMultiplier;
export const SUPER_CROAK_KNOCKBACK = GAME_CONFIG.combat.superCroakKnockback;
export const CONTACT_KNOCKBACK = GAME_CONFIG.combat.contactKnockback;
export const CHARGE_PER_KILL = GAME_CONFIG.combat.chargePerKill;
export const CHARGE_PER_TEA = GAME_CONFIG.combat.chargePerTea;
export const SCORE_PER_SECOND = GAME_CONFIG.scoring.scorePerSecond;
export const SCORE_PER_KILL = GAME_CONFIG.scoring.scorePerKill;
export const TEA_BONUS_POINTS = GAME_CONFIG.scoring.teaBonusPoints;

export function calculateDifficulty(score) {
  const factor = score * COMPLEXITY_GROWTH_RATE;

  return {
    spawnDelay: Math.max(GAME_CONFIG.enemies.minSpawnDelay, ENEMY_SPAWN_DELAY * (1 - factor)),
    enemySpeed: Math.min(GAME_CONFIG.enemies.maxSpeed, ENEMY_MOVEMENT_SPEED * (1 + factor)),
    playerSpeed: Math.min(GAME_CONFIG.player.maxSpeed, PLAYER_MOVEMENT_SPEED * (1 + factor * 0.25)),
    attackCooldown: Math.max(GAME_CONFIG.combat.minAttackCooldown, ATTACK_COOLDOWN * (1 - factor * 0.25)),
    attackRadius: Math.min(GAME_CONFIG.combat.maxAttackRadius, ATTACK_RADIUS * (1 + factor * 0.15)),
  };
}
