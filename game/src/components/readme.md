This directory will contain `Three.js` components used by the game, such as player, enemies, camera, renderer, map, and obstacles.
Each component will be responsible for creating and configuring a single part of the scene and can be imported into `main.js`.

Creative twist - Tode's Tea Run: every four defeats drops a golden tea leaf at
the defeated enemy's position when no leaf is already waiting or being carried.
Move within 22 units to collect it, then return within 30 units of the origin's
golden kettle ring. Brewing awards 50 points and refreshes the current attack
cooldown, without resetting difficulty or other attack settings. Only one leaf
can be active; brewing resets the defeat counter. Leaves do not expire, and
brewing can happen during wave intermissions. Contact checks retain priority.
`TeaRun.js` builds the kettle, ring, and leaf procedurally from Three.js geometry;
these decorative objects do not block movement. The HUD explains the objective,
the minimap marks home and a waiting leaf in gold, and game over reports teas
brewed. Existing synthesized audio celebrates brewing. Pause preserves the quest,
restart clears its rewards/progress, and tea points contribute to high scores
and difficulty. No external visual or sound assets are added.

`Settings.js` provides a native modal dialog with mute, sound volume (0-100%),
shadows, and hit-particle controls. Opening it pauses an active run; closing it
or pressing Escape returns to the previous screen without resuming gameplay.
Resume remains explicit. The dialog traps keyboard focus, blocks underlying
touch controls, and prevents gameplay keyboard handlers from handling settings
input. Mute stays synchronized with the existing mute button. Volume zero
silences new tones; changing volume stops existing/scheduled voices. Disabling
particles clears live bursts immediately; device reduced-motion preferences still
override particle enablement. Shadows toggle without changing physics or lighting.
Attack circles and boss warnings cannot be disabled. Settings survive restarts
but are session-only and return to defaults on reload.

`EnemyTypes.js` defines regular enemies, scouts, and armored enemies. Starting
at wave 2, every third regular-wave spawn (index 1 modulo 3) is a cyan scout:
80% size, 150% current enemy speed, 1 HP. Starting at wave 3, spawn index 2
modulo 4 is a purple armored enemy: 120% size, 60% speed, 2 HP. Armored selection
takes priority if both patterns match. Spawn indices advance only on successful
non-boss spawns and reset each wave, so occupied corners do not change the mix.
Regular wave budgets and every-fifth-wave bosses are unchanged. All types share
navigation, floor boundaries, contact rules, and score-based speed scaling.
Each type has a separately scaled/grounded model and footprint, with shared,
cached tinted materials that do not alter other types. The minimap uses cyan
triangles for scouts and purple squares for armored enemies with matching legend
entries. Each accepted attack deals 1 damage; only a final defeat awards points,
rolls a power-up drop, and removes the enemy from the scene/index. Scouts remain
one-hit enemies because the baseline attack already deals one whole damage.
Pause and restart preserve/reset these enemies through the existing lifecycle.

`PowerUps.js` gives defeated regular enemies a 25% drop chance and defeated bosses
a guaranteed drop. Each drop is randomly a cyan speed crystal or pink rapid-attack
crystal. Move within 22 world units of its ground position to collect it, including
during a hop. Crystals expire after 15 seconds of active gameplay. Speed boosts
multiply current difficulty-based hop speed by 1.35; rapid attack multiplies current
cooldown by 0.65. Each lasts 8 seconds. Different boosts can coexist; collecting
the same kind refreshes its duration without stacking strength or duration.
The HUD shows the color legend and active countdowns. Movement boosts apply on
the next movement update; cooldown boosts apply on collection and preserve
completed cooldown progress through the existing Attack update. Collision and
game-over checks still take priority over collecting/attacking. Boosts do not
change enemy speed, attack range, points, or wave budgets. Pausing freezes pickup
expiry and boost durations; intermissions continue them. Restart clears pickups
and boosts while preserving the high score. Pickup meshes share reusable geometry
and materials; removing a pickup detaches only its mesh.

`Minimap.js` displays a top-down SVG map during active gameplay, using the floor
dimensions from `WorldBounds.js` with +Y pointing up (independent of the camera).
Tode is a green, white-outlined circle; houses use their actual rotated footprints;
enemies are pink circles; bosses are larger gold diamonds. A shape/color legend
is shown except on very short viewports. Positions refresh at most ten times per
second; static house polygons are cached and enemy marker nodes are reused.
Defeated/restarted enemies lose their markers on the next refresh. The map hides
on pause, game over, loading, and start menus and refreshes immediately when shown.
It does not intercept clicks or taps and sits above touch Attack controls.

`BossCharge.js` adds a repeating boss pattern: chase for 3 seconds, lock direction
toward Tode and show a stationary orange ground lane for 1.2 seconds, then charge
up to 240 units at 300 units/second. Tode can dodge after direction locks; warning
lanes themselves cause no damage. The boss recovers for 1.5 seconds before chasing
again. The health-bar label announces warning, charge, chase, and recovery phases.
Charge movement uses the same swept collision checks and spatial-index updates
as normal movement, cannot tunnel through Tode, and stops on houses or enemies.
The warning lane is conservative (full body width plus clearance); blockers can
shorten the actual charge. Pausing freezes all phase timers and the lane, game
over hides warnings, and defeat/restart/failed spawn disposes owned lane resources
without disposing shared enemy model assets. Bosses remain attackable in all phases.

Boss waves: every fifth wave adds one boss alongside the unchanged regular enemy
budget. The boss spawns first, retrying occupied corners without losing its place
in the wave budget. It uses the enemy model at 1.4 times normal size, a matching
model-derived footprint, and 70% of the current enemy speed. Wave 5's boss has
5 HP; each subsequent boss wave adds 1 HP. Each accepted attack deals 1 damage
once to each enemy in the existing center-based attack radius. Regular enemies
still die in one hit. Boss hits emit particles; only a defeated boss is removed
from the spatial index and earns the standard 10-point kill reward.
The labeled boss-health progress bar shows exact remaining/max HP during play
and hides during menus, pause, or after defeat. Bosses use the same navigation,
contact game-over, and collision rules as regular enemies. Completing a wave
requires defeating its boss as well as every regular enemy. Restart removes the
boss and returns to wave 1; pause freezes the entire encounter.

Crowd performance: `SpatialIndex.js` keeps enemy footprints in an 80-unit spatial
grid. Player/enemy movement queries only cells along its swept path, then uses
the existing swept separating-axis collision checks. Bounds include rotated
footprints and collision clearance, including sharp-corner margins; they are only
a broad phase, not replacement hitboxes. Membership updates immediately after
each enemy moves and on spawn, defeat, and restart, preserving sequential movement.
`Collision.js` caches transformed footprints by position, heading, and geometry
reference and rejects distant candidates before polygon projection. Enemy updates
reuse their next-position vector. `Navigation.js` shares static house waypoints
and lazily cached directed visibility edges across enemies with the same footprint;
live start/target connections are still checked on every route refresh.
House positions/footprints must remain static for the lifetime of their houses
array; a changed layout must use a new array to invalidate the navigation cache.
No enemy limits, wave-budget changes, or reduced collision-update rates are used.
Browser frame times and real-device crowd performance have not been measured.

`Waves.js` replaces endless spawning with finite waves. Wave 1 starts with four
enemies at the corners. Each subsequent wave has two more enemies, starts with
one spawn, and staggers the rest using the existing score-based spawn delay.
A wave completes only when all scheduled enemies have spawned and all living
enemies have been defeated. Completing wave N awards 25 * N bonus points once,
then starts a three-second intermission. Movement, attacks, cooldowns, and
survival scoring continue during the break, but enemy spawning waits.
Occupied corners retain pending enemies and are retried without consuming the
wave budget. HUD progress includes both living enemies and pending spawns.
Game over shows waves reached and cleared. Pausing freezes wave timers; restarting
clears wave bonuses and pending spawns and begins wave 1. Wave bonuses contribute
to the score, high score, and existing difficulty scaling.

`TouchControls.js` adds a directional pad and Attack button on devices with a
coarse pointer, including touch-capable hybrid devices. Each direction tap queues
one hop; holding does not repeat. Attack uses the same request and cooldown as
Space, and the button is disabled and labeled "Wait" while recharging. Controls
hide outside active gameplay and do not create held-input timers or pointer state.
Buttons have accessible names and at least 44-pixel targets. Keyboard controls
remain available. Game over includes a Play again button for touch users.
The viewport supports device safe areas without disabling zoom; touch controls
use safe-area insets and feedback messages sit above them. Start, Pause, Resume,
and mute remain tappable. Real-device touch/layout behavior needs manual checking.

`Sound.js` synthesizes quiet attack, defeat, and game-over tones with Web Audio;
no downloaded audio assets are required. Audio initializes/resumes only from
Start, Resume, restart, or unmute user interactions. Cooldown-rejected attacks
make no sound, and a multi-kill plays one defeat cue. The Mute sound toggle is
available on menus and during gameplay and retains its setting across restarts
(not page reloads). Muting, pausing, restarting, or leaving the tab stops active
and scheduled tones. Finished voices disconnect their audio nodes. Unsupported
or blocked audio reports a console warning and visible notice without blocking
gameplay. Browser/device audio output still requires a manual listening check.

Visual polish: the HUD separates current score and best score, highlights a ready
attack, and displays a one-second points/defeated notification after successful
hits. Notifications use gameplay time, freeze while paused, hide behind menus,
and clear on restart. `HitEffects.js` creates short, fading particle bursts at
defeated enemies' positions without changing damage, collision, or scoring.
Bursts freeze while paused and are removed at game over/restart; their geometry
and materials are disposed when finished. Reduced-motion preferences disable
these decorative bursts. Menus use a high-contrast green theme and responsive titles.

- `Camera.js` creates the Z-up perspective camera looking at the scene origin.
- `Attack.js` manages the initially one-second attack cooldown and a yellow XY circle at
  Z = 0.25 that fades over 0.2 seconds. The initial range is 80 world
  units. `trigger(player, enemies)` removes enemies whose XY centers are in
  range from both the scene and tracking array, returning the defeated count.
  Shared enemy geometry and materials are preserved for other enemies.
- `Collision.js` builds convex XY footprints from transformed model vertices,
  rather than using raw bounding boxes. Swept separating-axis checks prevent
  characters from passing through each other between frames. Adjust
  `COLLISION_DISTANCE` to change the minimum clearance in world units.
- `Enemy.js` loads `public/models/enemy.glb` once and provides a factory that
  clones it for each enemy, including skinned meshes. Enemies use scale 5,
  are grounded at Z = 0, and turn and move toward the player in `update(delta, player, enemies)`.
  The difficulty settings control their speed in world units per second.
- `Player.js` loads `public/models/tode.glb` into a group at the origin, rotates it
  into the Z-up coordinate system, scales it by 20, and grounds its lowest point at Z = 0.
  It queues arrow-key directions and processes hops through `update(delta, enemies)`.
  Base movement speed (hops per second) is configured in `Difficulty.js`;
  jump height and jump distance are constants in `Player.js`.
  Only the model turns and hops; the group moves along the XY plane so the
  attached camera follows without rotating or bobbing.
- `Renderer.js` creates the transparent, antialiased WebGL renderer for `canvas.game`.
- `Map.js` creates a 600-by-600 XY checkerboard with 30-unit tiles alternating
  `#228B22` and `#90EE90`, and places exactly three houses. Candidate locations
  are jittered and shuffled, then checked against the map edges, other houses,
  and protected areas around Tode's starting position and the four spawn corners.
  Invalid placement raises a visible initialization error rather than overlapping
  objects or looping indefinitely.
- `House.js` loads `small_house.glb` once and clones it at scale 65. Each house
  gets a random local Y quarter-turn after X-axis Z-up alignment. Its transformed
  bounding box centers it horizontally and grounds its lowest point at Z = 0.
  Its model-derived footprint uses the shared collision helper.
- `Difficulty.js` defines the base speeds, spawn delay, attack cooldown, and range,
  and calculates score-based settings through `calculateDifficulty(score)`.
- `Navigation.js` finds shortest routes through a visibility graph using
  Dijkstra's algorithm. Waypoints surround house bounds with enough clearance
  for the enemy's footprint. Every route segment is checked with the same swept,
  model-derived collision helper used by movement.

`main.js` sets up the scene, lighting, render loop, and window resizing.
Once the player loads, it is added to the scene with the camera attached to its group.
Model-loading failures are logged to the console and displayed on the page.

After the character and house models load and the world is placed, the start
screen waits for the Start game button (mouse, Enter, or Space when focused).
No enemies spawn and no score or gameplay timers advance before starting.
Four enemies spawn initially, one at each corner of the planned map.
Later waves stagger their finite enemy budgets, initially every two seconds,
cycling through the corners. `ENEMY_SPAWN_DELAY` in `Difficulty.js` and
`MAP_HALF_SIZE` in `main.js` control the base interval and corner positions.
Enemies are tracked in the `enemies`
array and updated using the same frame delta as the player. Occupied spawn corners
are skipped; if all corners are occupied, pending spawns retry on later frames.

Player and enemy moves are checked before changing position or facing. Enemies
blocked by other enemies stay put. Player-enemy contact ends the run before
overlapping coordinates are applied. Hopping does not bypass ground-plane collisions. Convex
footprints conservatively fill concavities in the models' silhouettes.
Enemies cannot overlap each other or the player.

`main.js` manages loading, ready, playing, paused, game-over, and error states. Current contact is
checked each gameplay frame, and both character update methods return whether
their attempted movement would hit the other character type. These checks run
before attacks, so contact takes priority even if Space is pressed that frame.
Contact uses the same footprint and `COLLISION_DISTANCE` clearance as movement.
Game over hides only Tode's model (not the camera's parent group), freezes
movement, spawning, and timers, clears attack feedback, and shows `.game-over`.
Arrow inputs are ignored while the run is over.

Escape or the Pause button pauses an active run. Escape or the Resume button
continues it. Losing window focus or hiding the tab also pauses, but returning
does not automatically resume. Pausing freezes movement, routes, spawning,
survival score, attack cooldown, and attack effects without resetting them.
Pending movement inputs and attack requests are cleared; a hop already in progress
continues after resume. The frame clock is drained on start/resume so paused time
is not added to gameplay. Gameplay hints and the Pause button are hidden behind
menus. Buttons support keyboard activation without also triggering an attack.

Press Space again to restart. Restart clears all enemies and pending inputs,
resets Tode's position, facing, visibility, and hop state, resets attack and spawn
timers, and spawns four fresh enemies at the corners. The restart key does not
also attack. Survival time, defeated-enemy count, and score reset to zero.
The map and house layout remain unchanged on restart; reloading the page generates
a new layout. Houses block both player and enemy movement, including hops, but
do not trigger game over. Enemies recompute routes toward Tode every 0.5 seconds,
walking directly when clear or following waypoints around houses. Enemies still
respect each other's space; crowd congestion can make them wait. If no route is
available, an enemy waits and retries on its next route refresh. House layouts
are static during a run, and a restart creates enemies with fresh route state.
`WorldBounds.js` shares the checkerboard dimensions with map generation and
keeps each character's full rotated collision footprint inside the floor.
Blocked edge hops stop without game over, and enemies only choose route segments
inside the floor. Boss charges stop and recover when they would cross an edge.
Spawns are also checked against the floor boundary. Keyboard and touch movement
use the same boundary checks.
The floor receives shadows from characters and houses.

The house asset is Small House by Jarlan Perez, licensed under
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), via
[Poly Pizza](https://poly.pizza/m/053kskrV4U_). Runtime changes apply scale,
rotation, and ground alignment.

The `.score` display stays at the top of the screen, including during game over.
`SCORE_PER_SECOND = 0.1` awards one point per ten seconds of active gameplay;
`SCORE_PER_KILL = 10` awards ten points per defeated enemy. Both constants live
in `main.js`. The score retains fractional survival points internally and is
rounded down for display. The UI updates only when the displayed integer changes.
Survival time uses the animation loop's clock delta and stops at game over.
Attack kill counts are applied immediately in the same frame as enemy removal;
cooldown-rejected attacks award no points.

`HighScore.js` stores the best whole-number score under `tode.highScore` in
`localStorage`. New records are saved as soon as the displayed score increases,
so finishing a run is not required. Restart resets only the current score.
The HUD shows "Best", and the start/pause menu and game-over screen show the
high score. Saved values must be nonnegative safe integers; invalid values or
blocked/full storage produce a console warning and a visible session-only notice.
Gameplay continues with an in-memory record, without further storage attempts
for that page load. Records belong to this browser profile and site origin;
clearing site data removes them, and different localhost ports have separate records.

Gameplay hints show the arrow-key and Space controls at the bottom of the screen.
The labeled attack progress bar fills as the current cooldown completes and shows
the remaining seconds or "Attack ready - Space". It reads the attack's actual
timers, so score-based cooldown changes and restarts stay synchronized.
These hints are hidden during loading and game over. The game-over overlay shows
the final rounded-down score from the completed run alongside the restart hint;
the top-left score remains visible. Restart clears the score and restores a ready
attack indicator without triggering an attack.

Difficulty is recalculated each gameplay frame from the unrounded score.
With `factor = score * COMPLEXITY_GROWTH_RATE` (default growth rate 0.002),
enemy speed increases by `factor` and spawn delay decreases by `factor` of their
base values. Player speed increases and attack cooldown decreases by only
`0.25 * factor`, while attack radius increases by `0.15 * factor`.
All changes are linear until these safety limits are reached:

| Setting | Initial value | Limit |
| --- | --- | --- |
| Enemy spawn delay | 2 seconds | Minimum 0.4 seconds |
| Enemy speed | 25 units/second | Maximum 100 units/second |
| Player speed | 4 hops/second | Maximum 8 hops/second |
| Attack cooldown | 1 second | Minimum 0.4 seconds |
| Attack radius | 80 units | Maximum 120 units |

Existing enemies receive the new speed, not just newly spawned enemies.
Cooldown changes preserve the fraction already completed. Each attack's circle
matches its actual damage radius and retains that size while fading.
Spawning continues to use the accumulated clock delta, including after
score changes. Restart resets the score and attack settings to baseline.

Use the arrow keys to move. Inputs received during a hop are queued in order;
holding a key queues additional hops through the browser's keyboard repeat.
Press Space to attack at Tode's current ground position, including during a hop.
Each press requests one attack; holding Space does not repeat it, and presses
during cooldown are ignored rather than saved for later. Attack timing and
feedback update in the animation loop. The circle stays at the attack location
while fading, and damage is applied once when the attack triggers.
The animation loop uses elapsed seconds and caps frame time at 0.1 seconds to
avoid large movement jumps after a browser pause.

Contact knockback: when Tode takes damage, nearby enemies (within both collision
radii plus `contactKnockback`) are pushed straight away from Tode by up to 45 units.
`Knockback.js` uses the same swept floor, house, and enemy collision checks as
movement and tries shorter pushes when blocked, so enemies never end up inside
houses, each other, or off the floor. Super Croak knockback on surviving enemies uses the
same helper. Bosses are only pushed while chasing, so a locked charge lane stays accurate.
Super Croak is triggered with E or by double-tapping Space.

Tuning values for health, combat, charge, and scoring live in `GAME_CONFIG` in
`Difficulty.js`; other modules import them instead of redefining constants.

`Sky.js` sets a sky-blue background and distance fog and extends the checkerboard
to the horizon with one large textured plane just below the floor. Its tiles match
the meadow's colors and grid, so the plain looks endless. This is visual only: the
600-by-600 play area still has an invisible edge that blocks movement as before.
`Boundary.js` marks that edge with a two-row hedge of small, randomly colored
flowers placed 3-14 units outside the floor. Stems and heads are two instanced
meshes (one draw call each); the flowers are decorative and never block movement.
The camera looks down too steeply to see the horizon, so 60 procedural white
clouds (flattened spheres sharing one geometry) drift on the wind below the camera
around the meadow. Clouds fade out over the play area and near the camera so they never
hide Tode or enemies, and they keep drifting while paused.

`Impact.js` adds screen shake and hit-stop. Events add "trauma" (0-1) that decays
at 1.6 per second; the camera's offset from its resting spot is trauma squared times 9 units,
driven by layered sine waves for a smooth wobble. Hit-stop freezes gameplay updates
(not rendering or input) for a few hundredths of a second; overlapping stops take the
longest one, capped at 0.2 seconds. Strengths are in `IMPACTS`: enemy defeats
(scaled up to triple for multi-kills), boss hits and defeats, Tode taking damage,
Super Croak, and game over. Cooldown-rejected attacks cause no impact. Shake can
be switched off in Settings and is disabled by the device reduced-motion preference;
hit-stop is always on because it is too short to cause motion discomfort. Pausing
freezes the shake and restart clears it.
