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

## Attribution

This project is based on the course *Build a Game with an AI Coding Agent* by
[JetBrains Academy](https://github.com/jetbrains-academy/game-course), released under
the MIT License (Copyright (c) 2025 JetBrains Academy). The original copyright and
permission notice is kept in [LICENSE](../LICENSE).

## Third-party assets

| Asset | Source | License |
| --- | --- | --- |
| Tode the Frog model (`public/models/tode.glb`) and icon (`public/tode.svg`) | [JetBrains Academy game course](https://github.com/jetbrains-academy/game-course) | MIT |
| Enemy model (`public/models/enemy.glb`) | [JetBrains Academy game course](https://github.com/jetbrains-academy/game-course) | MIT |
| Small House model (`public/models/small_house.glb`) by Jarlan Perez | [Poly Pizza](https://poly.pizza/m/053kskrV4U_) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) |
| [Three.js](https://threejs.org/) (3D engine) | npm package `three` | MIT |
| [Vite](https://vite.dev/) (build tool) | npm package `vite` | MIT |

All sound effects are generated in code with the Web Audio API; the game uses no
audio files, music, or recordings.

## AI tools used

| Tool | Used for |
| --- | --- |
| **Junie** (JetBrains) | Following the course tasks: the game skeleton, core loop, visuals, and the extension plan (waves and bosses, enemy types, power-ups, Tea Run, Super Croak, minimap, settings, touch controls). |
| **Claude Code** (Anthropic) | Reviewing the project and polishing it: blue sky with drifting clouds, endless meadow with a soft boundary, screen shake and hit-stop, contact knockback, central config cleanup, layout fixes, this README, the GitHub Pages deployment, and the gameplay video. |
| **GitHub Copilot** | Inline code completions while editing. |

All AI-generated code was reviewed, tested by playing the game, and directed by the author.

## License

MIT. See [LICENSE](../LICENSE).
