import * as THREE from 'three';
import { Attack } from './components/Attack.js';
import { createCamera } from './components/Camera.js';
import { getCollisionRadius, isMoveClear } from './components/Collision.js';
import {
  calculateDifficulty, CHARGE_PER_KILL, CHARGE_PER_TEA, CONTACT_KNOCKBACK, SCORE_PER_KILL,
  SCORE_PER_SECOND,
} from './components/Difficulty.js';
import { createEnemyFactory } from './components/Enemy.js';
import { createHouseFactory } from './components/House.js';
import { HighScore } from './components/HighScore.js';
import { createMap } from './components/Map.js';
import { createPlayer } from './components/Player.js';
import { createRenderer } from './components/Renderer.js';
import { Sound } from './components/Sound.js';
import { TouchControls } from './components/TouchControls.js';
import { Waves } from './components/Waves.js';
import { SpatialIndex } from './components/SpatialIndex.js';
import { isInsideMap } from './components/WorldBounds.js';
import { Minimap } from './components/Minimap.js';
import { PowerUps } from './components/PowerUps.js';
import { Settings } from './components/Settings.js';
import { TeaRun } from './components/TeaRun.js';
import { knockback } from './components/Knockback.js';
import { createSky } from './components/Sky.js';
import { createBoundaryFlowers } from './components/Boundary.js';
import { Impact, IMPACTS } from './components/Impact.js';
import './style.css';

const MAP_HALF_SIZE = 250;
const ENEMY_SPAWN_POSITIONS = [
  new THREE.Vector3(-MAP_HALF_SIZE, -MAP_HALF_SIZE, 0),
  new THREE.Vector3(MAP_HALF_SIZE, -MAP_HALF_SIZE, 0),
  new THREE.Vector3(MAP_HALF_SIZE, MAP_HALF_SIZE, 0),
  new THREE.Vector3(-MAP_HALF_SIZE, MAP_HALF_SIZE, 0),
];

const scene = new THREE.Scene();
const camera = createCamera();
const impact = new Impact(camera);
const renderer = createRenderer();
const attack = new Attack(scene);
const powerUps = new PowerUps(scene);
const teaRun = new TeaRun(scene);
const clock = new THREE.Clock();
const waves = new Waves();
const minimap = new Minimap();
let player = null;
let createEnemy = null;
let nextSpawnCorner = 0;
const enemies = [];
const enemyIndex = new SpatialIndex();
let houses = [];
let attackRequested = false;
let superCroakRequested = false;
let lastSpaceTime = 0;
let gameState = 'loading';
let restartRequested = false;
let survivalTime = 0;
let defeatedEnemies = 0;
let waveBonus = 0;
let score = 0;
let displayedScore = -1;

// Top-left panels share one column so their changing heights never overlap.
const hudStack = document.createElement('div');
hudStack.className = 'hud-stack';
document.body.append(hudStack);

const scoreDisplay = document.createElement('div');
scoreDisplay.className = 'score';
const scoreValue = document.createElement('strong');
const bestValue = document.createElement('span');
const heartsContainer = document.createElement('div');
heartsContainer.className = 'player-hearts';
heartsContainer.setAttribute('aria-label', 'Player health');
const waveDisplay = document.createElement('span');
waveDisplay.className = 'wave-status';
scoreDisplay.append(scoreValue, bestValue, heartsContainer, waveDisplay);
hudStack.append(scoreDisplay);

function updateHealthHud() {
  if (!player) {
    return;
  }
  heartsContainer.replaceChildren();
  for (let i = 0; i < player.maxHealth; i += 1) {
    const heart = document.createElement('span');
    heart.className = i < player.health ? 'heart full' : 'heart empty';
    heart.textContent = i < player.health ? '❤️' : '🖤';
    heartsContainer.append(heart);
  }
}

const storageWarning = document.createElement('div');
storageWarning.className = 'storage-warning';
storageWarning.setAttribute('role', 'status');
storageWarning.hidden = true;
storageWarning.textContent = 'High score cannot be saved in this browser. This session only.';
document.body.append(storageWarning);

const highScore = new HighScore(() => {
  storageWarning.hidden = false;
});
const menuHighScore = document.createElement('p');
menuHighScore.textContent = `High score: ${highScore.value}`;
const finalHighScore = document.createElement('p');

function updateScore() {
  score = survivalTime * SCORE_PER_SECOND + defeatedEnemies * SCORE_PER_KILL
    + waveBonus + teaRun.bonus;
  const nextDisplayedScore = Math.floor(score);

  if (nextDisplayedScore !== displayedScore) {
    displayedScore = nextDisplayedScore;
    highScore.record(displayedScore);
    scoreValue.textContent = `Score: ${displayedScore}`;
    bestValue.textContent = `Best: ${highScore.value}`;
    menuHighScore.textContent = `High score: ${highScore.value}`;
  }
}

updateScore();

const controlsGuide = document.createElement('div');
controlsGuide.className = 'controls-guide';
controlsGuide.textContent = 'WASD / Arrow keys: hop | Space: attack | Esc: pause';
controlsGuide.hidden = true;

const combatFeedback = document.createElement('div');
combatFeedback.className = 'combat-feedback';
combatFeedback.setAttribute('role', 'status');
combatFeedback.hidden = true;
let combatFeedbackRemaining = 0;

const attackIndicator = document.createElement('div');
attackIndicator.className = 'attack-indicator';
attackIndicator.hidden = true;
const attackLabel = document.createElement('label');
attackLabel.htmlFor = 'attack-cooldown';
const attackProgress = document.createElement('progress');
attackProgress.id = 'attack-cooldown';
attackProgress.max = 1;
attackProgress.value = 1;
attackIndicator.append(attackLabel, attackProgress);

const chargeIndicator = document.createElement('div');
chargeIndicator.className = 'charge-indicator';
chargeIndicator.hidden = true;
const chargeLabel = document.createElement('label');
chargeLabel.htmlFor = 'charge-meter';
const chargeProgress = document.createElement('progress');
chargeProgress.id = 'charge-meter';
chargeProgress.max = 100;
chargeProgress.value = 0;
chargeIndicator.append(chargeLabel, chargeProgress);

const debugOverlay = document.createElement('div');
debugOverlay.className = 'debug-inspector';
debugOverlay.hidden = true;
hudStack.append(attackIndicator, chargeIndicator, powerUps.hud);
document.body.append(controlsGuide, combatFeedback, debugOverlay);

let debugEnabled = false;
let frameCount = 0;
let lastFpsUpdate = 0;
let currentFps = 60;

function updateDebugOverlay() {
  if (!debugEnabled) {
    debugOverlay.hidden = true;
    return;
  }
  debugOverlay.hidden = false;

  frameCount += 1;
  const now = performance.now();
  if (now - lastFpsUpdate >= 250) {
    currentFps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    frameCount = 0;
    lastFpsUpdate = now;
  }

  const pX = player ? player.position.x.toFixed(1) : '0';
  const pY = player ? player.position.y.toFixed(1) : '0';
  const hp = player ? `${player.health}/${player.maxHealth}` : 'N/A';
  const iFrames = player && player.isInvulnerable ? `${player.invulnerabilityTimer.toFixed(1)}s` : 'none';
  const activeEnemies = enemies.length;
  const spatialCells = enemyIndex.getCellCount();
  const charge = attack ? `${Math.floor(attack.charge)}%` : '0%';
  const cd = attack ? `${attack.cooldownRemaining.toFixed(1)}s` : '0s';

  debugOverlay.innerHTML = `
    <strong>[DEBUG INSPECTOR]</strong> (Toggle: \`)<br>
    FPS: ${currentFps}<br>
    State: ${gameState}<br>
    Player: (${pX}, ${pY}) | HP: ${hp} | i-frames: ${iFrames}<br>
    Wave: ${waves.number} (Pending: ${waves.pending})<br>
    Enemies: ${activeEnemies} | Spatial Cells: ${spatialCells}<br>
    Attack CD: ${cd} | Charge: ${charge}<br>
    Houses: ${houses.length}
  `;
}

const bossPanel = document.createElement('div');
bossPanel.className = 'boss-health';
bossPanel.hidden = true;
const bossLabel = document.createElement('label');
bossLabel.htmlFor = 'boss-health';
const bossHealth = document.createElement('progress');
bossHealth.id = 'boss-health';
bossPanel.append(bossLabel, bossHealth);
document.body.append(bossPanel);

const muteButton = document.createElement('button');
muteButton.type = 'button';
muteButton.className = 'mute-button';
muteButton.textContent = 'Mute sound';
muteButton.setAttribute('aria-pressed', 'false');
const audioWarning = document.createElement('div');
audioWarning.className = 'audio-warning';
audioWarning.setAttribute('role', 'status');
audioWarning.hidden = true;
audioWarning.textContent = 'Sound is unavailable. You can continue playing without audio.';
const sound = new Sound(() => {
  audioWarning.hidden = false;
  muteButton.disabled = true;
  muteButton.textContent = 'Sound unavailable';
});
muteButton.addEventListener('click', () => {
  sound.toggleMute();
  muteButton.setAttribute('aria-pressed', String(sound.muted));
  muteButton.textContent = sound.muted ? 'Unmute sound' : 'Mute sound';
  muteButton.blur();
});
document.body.append(muteButton, audioWarning);

const settings = new Settings({
  sound,
  renderer,
  hitEffects: attack.hitEffects,
  impact,
  onOpen: () => {
    pauseGame();
    sound.stop();
  },
});
settings.dialog.addEventListener('change', () => {
  if (!sound.failed) {
    muteButton.setAttribute('aria-pressed', String(sound.muted));
    muteButton.textContent = sound.muted ? 'Unmute sound' : 'Mute sound';
  }
});

const touchControls = new TouchControls(
  (key) => {
    if (gameState === 'playing') {
      player.enqueueMove(key);
    }
  },
  () => {
    if (gameState === 'playing') {
      void sound.enable();
      attackRequested = true;
    }
  },
);

const pauseButton = document.createElement('button');
pauseButton.type = 'button';
pauseButton.className = 'pause-button';
pauseButton.textContent = 'Pause (Esc)';
pauseButton.hidden = true;
pauseButton.addEventListener('click', pauseGame);

const menuOverlay = document.createElement('div');
menuOverlay.className = 'game-menu';
menuOverlay.setAttribute('role', 'dialog');
menuOverlay.setAttribute('aria-modal', 'true');
menuOverlay.setAttribute('aria-labelledby', 'menu-title');
const menuTitle = document.createElement('h1');
menuTitle.id = 'menu-title';
menuTitle.textContent = 'Loading Tode...';
const menuHint = document.createElement('p');
menuHint.textContent = 'Preparing the game world';
const menuButton = document.createElement('button');
menuButton.type = 'button';
menuButton.hidden = true;
menuButton.addEventListener('click', () => {
  if (gameState === 'ready') {
    void sound.enable();
    resetGame();
  } else if (gameState === 'paused') {
    resumeGame();
  }
});
menuOverlay.append(menuTitle, menuHint, menuHighScore, menuButton);
document.body.append(pauseButton, menuOverlay);

function closeMenu() {
  menuButton.blur();
  menuOverlay.hidden = true;
  clock.getDelta();
  updateGameplayHints();
}

function pauseGame() {
  if (gameState !== 'playing') {
    return;
  }

  gameState = 'paused';
  sound.stop();
  attackRequested = false;
  player.inputQueue.length = 0;
  menuTitle.textContent = 'Paused';
  menuHint.textContent = 'Your run is frozen. Press Escape or select Resume to continue.';
  menuButton.textContent = 'Resume';
  menuButton.hidden = false;
  menuOverlay.hidden = false;
  updateGameplayHints();

  if (document.hasFocus() && !document.hidden) {
    menuButton.focus();
  }
}

function resumeGame() {
  if (gameState !== 'paused' || document.hidden || !document.hasFocus()) {
    return;
  }

  gameState = 'playing';
  void sound.enable();
  closeMenu();
}

function updateGameplayHints() {
  const playing = gameState === 'playing';
  teaRun.updateHud(playing);
  powerUps.updateHud(playing);
  const boss = enemies.find((enemy) => enemy.isBoss);
  bossPanel.hidden = !boss || !playing;
  if (boss && playing) {
    const phase = boss.charge.state === 'warning'
      ? 'CHARGE INCOMING - move aside!'
      : boss.charge.state === 'charging' ? 'Charging!'
        : boss.charge.state === 'recovering' ? 'Recovering' : 'Chasing';
    const label = `Wave ${waves.number} boss: ${boss.health} / ${boss.maxHealth} HP | ${phase}`;
    if (bossLabel.textContent !== label) {
      bossLabel.textContent = label;
    }
    bossHealth.max = boss.maxHealth;
    bossHealth.value = boss.health;
  }
  const waveText = waves.intermissionRemaining > 0
    ? `Wave ${waves.number} cleared! Next in ${Math.ceil(waves.intermissionRemaining)}s`
    : `Wave ${waves.number} | ${enemies.length + waves.pending} enemies left`;

  if (waveDisplay.textContent !== waveText) {
    waveDisplay.textContent = waveText;
  }
  waveDisplay.hidden = gameState === 'loading' || gameState === 'ready' || gameState === 'error';
  touchControls.update(playing, attack.cooldownRemaining === 0);
  controlsGuide.hidden = !playing;
  attackIndicator.hidden = !playing;
  chargeIndicator.hidden = !playing;
  pauseButton.hidden = !playing;
  combatFeedback.hidden = !playing || combatFeedbackRemaining <= 0;

  if (playing) {
    attackProgress.value = 1 - attack.cooldownRemaining / attack.cooldownDuration;
    attackIndicator.dataset.ready = String(attack.cooldownRemaining === 0);
    const label = attack.cooldownRemaining === 0
      ? 'Attack ready - Space'
      : `Attack ready in ${attack.cooldownRemaining.toFixed(1)}s`;

    if (attackLabel.textContent !== label) {
      attackLabel.textContent = label;
    }

    chargeProgress.value = attack.charge;
    const superReady = attack.charge >= 100;
    chargeIndicator.dataset.ready = String(superReady);
    const chargeText = superReady
      ? '⚡ Super Croak Ready! (E / 2x Space)'
      : `Super Croak: ${Math.floor(attack.charge)}%`;

    if (chargeLabel.textContent !== chargeText) {
      chargeLabel.textContent = chargeText;
    }
  }
}

const gameOverOverlay = document.createElement('div');
gameOverOverlay.className = 'game-over';
gameOverOverlay.setAttribute('role', 'status');
gameOverOverlay.hidden = true;
const gameOverTitle = document.createElement('h1');
gameOverTitle.textContent = 'Game Over';
const finalScoreDisplay = document.createElement('p');
finalScoreDisplay.className = 'final-score';
const finalWaveDisplay = document.createElement('p');
const restartHint = document.createElement('p');
restartHint.textContent = 'Press Space to play again';
const restartButton = document.createElement('button');
restartButton.type = 'button';
restartButton.textContent = 'Play again';
restartButton.addEventListener('click', () => {
  if (gameState === 'game-over') {
    void sound.enable();
    restartRequested = true;
    restartButton.blur();
  }
});
gameOverOverlay.append(
  gameOverTitle, finalScoreDisplay, finalHighScore, finalWaveDisplay, restartHint, restartButton,
);
document.body.append(gameOverOverlay);

function endGame() {
  sound.gameOver();
  impact.trigger(IMPACTS.gameOver);
  gameState = 'game-over';
  player.model.visible = false;
  player.inputQueue.length = 0;
  attackRequested = false;
  superCroakRequested = false;
  attack.reset();
  updateHealthHud();
  for (const enemy of enemies) {
    if (enemy.charge) {
      enemy.charge.lane.visible = false;
    }
  }
  finalScoreDisplay.textContent = `Final score: ${Math.floor(score)}`;
  finalHighScore.textContent = `High score: ${highScore.value}`;
  finalWaveDisplay.textContent = `Wave reached: ${waves.number} | Waves cleared: ${waves.completed}`;
  finalWaveDisplay.textContent += ` | Teas brewed: ${teaRun.brews}`;
  gameOverOverlay.hidden = false;
}

function resetGame() {
  sound.stop();
  powerUps.reset();
  teaRun.reset();
  combatFeedbackRemaining = 0;
  combatFeedback.textContent = '';
  for (const enemy of enemies) {
    enemy.removeFromParent();
    enemy.dispose();
  }
  enemies.length = 0;
  enemyIndex.clear();
  impact.reset();
  player.reset();
  updateHealthHud();
  attack.reset();
  attackRequested = false;
  superCroakRequested = false;
  restartRequested = false;
  waves.reset();
  nextSpawnCorner = 0;
  survivalTime = 0;
  defeatedEnemies = 0;
  waveBonus = 0;
  updateScore();
  gameOverOverlay.hidden = true;

  waves.spawnInitial(spawnEnemy);

  gameState = 'playing';
  closeMenu();
}

function spawnEnemy(isBoss = false, wave = 1, type = 'regular') {
  const enemy = createEnemy(ENEMY_SPAWN_POSITIONS[nextSpawnCorner], isBoss, wave, type);

  for (let attempt = 0; attempt < ENEMY_SPAWN_POSITIONS.length; attempt += 1) {
    enemy.position.copy(ENEMY_SPAWN_POSITIONS[nextSpawnCorner]);
    nextSpawnCorner = (nextSpawnCorner + 1) % ENEMY_SPAWN_POSITIONS.length;

    if (isInsideMap(enemy, enemy.position, enemy.heading)
      && isMoveClear(enemy, enemy.position, enemy.heading, [player, ...enemies, ...houses])) {
      enemies.push(enemy);
      enemyIndex.update(enemy);
      scene.add(enemy);
      return true;
    }
  }
  enemy.dispose();
  return false;
}

const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(-100, -100, 200);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048);
directionalLight.shadow.camera.left = -450;
directionalLight.shadow.camera.right = 450;
directionalLight.shadow.camera.top = 450;
directionalLight.shadow.camera.bottom = -450;
directionalLight.shadow.camera.far = 1500;
directionalLight.shadow.normalBias = 0.5;

scene.add(ambientLight, directionalLight);
const sky = createSky(scene);
createBoundaryFlowers(scene);

Promise.all([createPlayer(), createEnemyFactory(), createHouseFactory()])
  .then(([loadedPlayer, enemyFactory, houseFactory]) => {
    const spawnEntities = ENEMY_SPAWN_POSITIONS.map((position) => enemyFactory(position));
    const world = createMap(houseFactory, [loadedPlayer, ...spawnEntities]);
    houses = world.houses;
    scene.add(world.map);
    player = loadedPlayer;
    createEnemy = enemyFactory;
    player.add(camera);
    scene.add(player);
    updateHealthHud();

    gameState = 'ready';
    menuTitle.textContent = 'Tode the Frog';
    menuHint.textContent = 'Defend Tode! Use WASD / arrow keys or tap the direction pad to hop. '
      + 'Press Space or tap Attack to fight. Clear each wave for bonus points. '
      + 'Cyan scouts are fast; purple armored enemies take two hits. '
      + 'Use Escape or Pause to take a break.';
    menuButton.textContent = 'Start game';
    menuButton.hidden = false;

    if (document.hasFocus() && !document.hidden) {
      menuButton.focus();
    }
  })
  .catch((error) => {
    console.error('Failed to initialize the game world.', error);
    gameState = 'error';
    menuTitle.textContent = 'Unable to start';
    menuHint.textContent = 'The game world could not be loaded. Please reload the page to try again.';

    const message = document.createElement('div');
    message.className = 'loading-error';
    message.setAttribute('role', 'alert');
    message.textContent = 'The game world could not be loaded. Please reload the page to try again.';
    document.body.append(message);
  });

window.addEventListener('keydown', (event) => {
  if (event.code === 'Backquote' || event.key === '`' || event.key === '~') {
    event.preventDefault();
    debugEnabled = !debugEnabled;
    return;
  }

  if (settings.open) {
    return;
  }

  if (event.code === 'Escape') {
    event.preventDefault();

    if (!event.repeat) {
      if (gameState === 'playing') {
        pauseGame();
      } else if (gameState === 'paused') {
        resumeGame();
      }
    }

    return;
  }

  if (event.target instanceof HTMLElement && event.target.closest('button')) {
    return;
  }

  if (gameState === 'playing' && (
    event.code === 'KeyE' || event.key === 'e' || event.key === 'E'
  )) {
    if (attack.charge >= 100) {
      event.preventDefault();
      void sound.enable();
      superCroakRequested = true;
      return;
    }
  }

  if (event.code === 'Space' && (gameState === 'playing' || gameState === 'game-over')) {
    event.preventDefault();

    if (!event.repeat) {
      if (gameState === 'game-over') {
        void sound.enable();
        restartRequested = true;
      } else if (gameState === 'playing') {
        const now = performance.now();
        if (attack.charge >= 100 && (now - lastSpaceTime < 350)) {
          superCroakRequested = true;
        } else {
          attackRequested = true;
        }
        lastSpaceTime = now;
      }
    }

    return;
  }

  if (gameState === 'playing' && (player.enqueueMove(event.code) || player.enqueueMove(event.key))) {
    event.preventDefault();
  }
});

window.addEventListener('blur', () => {
  sound.stop();
  pauseGame();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    sound.stop();
    pauseGame();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Separates enemies from Tode after a hit so contact cannot chain into repeated damage
// once invulnerability ends. Bosses mid-charge keep their locked lane.
function pushBackNearbyEnemies() {
  const playerRadius = getCollisionRadius(player.footprint);

  for (const enemy of enemies) {
    if (enemy.charge && enemy.charge.state !== 'chasing') {
      continue;
    }

    const reach = playerRadius + getCollisionRadius(enemy.footprint) + CONTACT_KNOCKBACK;
    const distance = Math.hypot(
      enemy.position.x - player.position.x,
      enemy.position.y - player.position.y,
    );

    if (distance <= reach) {
      knockback(enemy, player.position.x, player.position.y, CONTACT_KNOCKBACK, [
        houses, enemyIndex,
      ]);
      enemyIndex.update(enemy);
    }
  }
}

function updateGameplay(delta) {
  powerUps.update(delta);
  const difficulty = powerUps.apply(calculateDifficulty(score));

  let playerHit = false;
  if (!isMoveClear(player, player.position, player.heading, enemyIndex)
    || player.update(delta, enemyIndex, difficulty.playerSpeed, houses)) {
    playerHit = true;
  }

  for (const enemy of enemies) {
    if (enemy.update(delta, player, enemyIndex, difficulty.enemySpeed, houses)) {
      playerHit = true;
    }
    enemyIndex.update(enemy);
  }

  if (playerHit) {
    if (player.takeDamage(1)) {
      pushBackNearbyEnemies();
      impact.trigger(IMPACTS.playerHit);
      sound.hit();
      if (player.health === 1) {
        sound.lowHealth();
      }
      updateHealthHud();
      if (player.health <= 0) {
        endGame();
        return;
      }
    }
  }

  powerUps.collect(player);
  attack.update(delta, powerUps.apply(calculateDifficulty(score)));
  combatFeedbackRemaining = Math.max(0, combatFeedbackRemaining - delta);

  if (superCroakRequested) {
    const defeated = attack.triggerSuperCroak(player, enemies, enemyIndex, powerUps, teaRun, houses);
    sound.superCroak();
    impact.trigger(IMPACTS.superCroak);
    defeatedEnemies += defeated;

    if (defeated > 0) {
      sound.defeat();
      combatFeedback.textContent = `⚡ SUPER CROAK! +${defeated * SCORE_PER_KILL} points | ${defeated} defeated`;
      combatFeedbackRemaining = 2.5;
    } else {
      combatFeedback.textContent = '⚡ SUPER CROAK! Shockwave unleashed!';
      combatFeedbackRemaining = 1.5;
    }

    superCroakRequested = false;
  }

  if (attackRequested) {
    const attackReady = attack.cooldownRemaining === 0;
    const defeated = attack.trigger(player, enemies, enemyIndex, powerUps, teaRun);
    if (attackReady) {
      sound.attack();
    }
    defeatedEnemies += defeated;

    // Boss flags only describe accepted attacks; cooldown rejections leave them stale.
    if (attackReady && attack.lastBossDefeated) {
      impact.trigger(IMPACTS.bossDefeat);
    } else if (defeated > 0) {
      impact.trigger({
        ...IMPACTS.enemyDefeat,
        shake: IMPACTS.enemyDefeat.shake * Math.min(defeated, 3),
      });
    } else if (attackReady && attack.lastBossHit) {
      impact.trigger(IMPACTS.bossHit);
    }

    if (defeated > 0) {
      attack.addCharge(defeated * CHARGE_PER_KILL);
      sound.defeat();
      combatFeedback.textContent = `+${defeated * SCORE_PER_KILL} points | ${defeated} defeated`;
      combatFeedbackRemaining = 1;
    }

    attackRequested = false;
  }

  const teaBonus = teaRun.collect(player);
  if (teaBonus > 0) {
    attack.cooldownRemaining = 0;
    attack.addCharge(CHARGE_PER_TEA);
    sound.defeat();
    combatFeedback.textContent = `Tea time! +${teaBonus} points | Attack refreshed | +${CHARGE_PER_TEA}% Charge`;
    combatFeedbackRemaining = 3;
  }

  survivalTime += delta;
  updateScore();

  const { spawnDelay } = calculateDifficulty(score);
  const bonus = waves.update(delta, enemies.length, spawnDelay, spawnEnemy);

  if (bonus > 0) {
    waveBonus += bonus;
    updateScore();
    combatFeedback.textContent = `Wave ${waves.number} cleared! +${bonus} bonus points`;
    combatFeedbackRemaining = 3;
  }
}

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1);

  if (restartRequested) {
    resetGame();
  } else if (gameState === 'playing') {
    const gameplayDelta = impact.consumeHitStop(delta);
    if (gameplayDelta > 0) {
      updateGameplay(gameplayDelta);
    }
  }

  impact.update(gameState === 'paused' ? 0 : delta);

  sky.update(delta, camera);
  updateGameplayHints();
  updateDebugOverlay();
  minimap.update(delta, gameState === 'playing', player, enemies, houses, teaRun);
  renderer.render(scene, camera);
});
