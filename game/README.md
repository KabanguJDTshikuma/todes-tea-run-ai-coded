# Tode's Tea Run

A 3D browser game built with [Three.js](https://threejs.org/). Help Tode the Frog
survive waves of enemies on an endless meadow: hop around houses, croak them away,
and brew golden tea for bonus points.

Built step by step with an AI coding agent as part of the JetBrains Academy course
*Build a Game with an AI Coding Agent*.

## Features

- **Wave-based combat.** Each wave brings more enemies; clearing one awards bonus points.
- **Boss fights every fifth wave.** Bosses have more health and a telegraphed charge
  attack: watch for the orange warning lane and hop aside.
- **Three enemy types.** Regular enemies, fast cyan scouts (from wave 2), and tough
  purple armored enemies that take two hits (from wave 3).
- **Health and recovery.** Tode has three hearts, a short invulnerability window after
  being hit, and knocks nearby enemies back on contact.
- **Super Croak.** Defeating enemies and brewing tea fill a charge meter; at 100%,
  unleash a wide shockwave that damages and pushes back everything around Tode.
- **Tea Run side quest.** Every fourth defeat drops a golden tea leaf. Carry it back
  to the kettle at the centre to brew it for +50 points and an instant attack refresh.
- **Power-ups.** Defeated enemies can drop cyan speed crystals and pink rapid-attack
  crystals.
- **Game feel.** Screen shake, hit-stop, and particle bursts on impacts; synthesized
  sound effects with no audio files.
- **Rising difficulty.** Enemies, spawns, and Tode's own abilities scale with your score.
- **Smart enemies.** Enemies path-find around houses and never overlap each other.
- **Minimap, high score, and settings.** Your best score is saved in the browser; sound,
  volume, shadows, particles, and screen shake can all be adjusted.
- **Touch support.** An on-screen direction pad and Attack button appear on touch devices.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Hop | WASD or arrow keys | Direction pad |
| Attack | Space | Attack button |
| Super Croak (when charged) | E, or double-tap Space | — |
| Pause / resume | Escape | Pause button |
| Restart after game over | Space | Play again button |
| Debug inspector | <code>`</code> (backquote) | — |

## Getting started

Requires [Node.js](https://nodejs.org/) 20.19 or newer.

```bash
cd game
npm install
npm run dev
```

Then open the local URL Vite prints (usually http://localhost:5173).

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Build an optimized static site into `dist/` |
| `npm run preview` | Serve the built `dist/` folder locally |

The build output in `dist/` is a static site and can be hosted on any static host,
such as GitHub Pages, Netlify, or Vercel.

## Project structure

```
game/
├── index.html            # Page shell and canvas
├── public/               # 3D models (.glb) and icon, served as-is
└── src/
    ├── main.js           # Scene setup, game states, HUD, and the main loop
    ├── style.css         # HUD, menus, and responsive layout
    └── components/       # One module per game system
        ├── Player.js, Enemy.js, EnemyTypes.js, BossCharge.js
        ├── Attack.js, HitEffects.js, Impact.js, Knockback.js
        ├── Waves.js, PowerUps.js, TeaRun.js, Difficulty.js
        ├── Collision.js, SpatialIndex.js, Navigation.js, WorldBounds.js
        ├── Map.js, House.js, Sky.js, Boundary.js, Camera.js, Renderer.js
        ├── Minimap.js, Settings.js, Sound.js, HighScore.js, TouchControls.js
        └── readme.md     # Detailed notes on how each system behaves
```

Gameplay tuning values (health, speeds, cooldowns, scoring) live in `GAME_CONFIG`
in `src/components/Difficulty.js`. See `src/components/readme.md` for detailed
behaviour notes on every system.

## Credits

- Game code written with the help of an AI coding agent, following the
  [JetBrains Academy game course](https://github.com/jetbrains-academy/game-course).
- **Small House** model by Jarlan Perez, licensed under
  [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), via
  [Poly Pizza](https://poly.pizza/m/053kskrV4U_).
- Built with [Three.js](https://threejs.org/) and [Vite](https://vite.dev/).

## License

MIT. See [LICENSE](../LICENSE).
