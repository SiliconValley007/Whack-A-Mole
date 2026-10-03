# Whack-A-Mole

Fast arcade reflex game. Vanilla JS + Canvas 2D + Web Audio, no libraries or CDNs. Runs on Android, Windows, iOS, and desktop browsers. Installable PWA with offline play. All assets are procedural (no binary game art). Scores, settings, cosmetics, and achievements live in per-device `localStorage` (GitHub Pages is static; no accounts). Live at `https://siliconvalley007.github.io/Whack-A-Mole/`.

## Features

- 60fps target on low-end Android; fixed 1/120s simulation step (max 12 steps, leftover accu dumped if > 2 steps); adaptive quality (rolling-median frame time + hysteresis, particle caps, DPR 1.5 on lowQ, skip frames while hidden)
- Multi-touch hitting, custom mallet cursor (desktop) and swing FX on every tap
- Keyboard (1-9 / numpad / QWEASDZXC / arrows) and gamepad (d-pad/stick + A/X, B/Start pause); hole selector ring appears only after keyboard/gamepad input and fades out on pointer/touch
- Combo chain with 1.5s decay bar and x3 / x6 / x9 milestone banners
- Frenzy wave every 20s (more spawns, 2x points) except Zen
- 3x3 field that expands to 4x3 after 1500 points (column fade-in)
- Power-ups: gold mole (5x), heart (+life), freeze (timer halt + icy vignette), Double Score (x2 for 6s, gold HUD ring)
- Helmet mole (2 hits, 2x score, after 25s, at most one)
- Boss Mole at 40s on NORMAL/HARD (5 HP, 500 points, banner + music duck; never Zen/tutorial; daily-deterministic)
- Bombs, life-lost red vignette, low-time warning ticks at <=10s
- Daily Challenge with two date-seeded PRNGs (timing + content); identical spawn sequence regardless of input or refresh rate
- Zen mode: no timer, 5 lives, no bombs, capped spawn, own best (`wam_best_zen`)
- Interactive first-run practice (20s, no lives lost), skippable (`wam_tut`); Replay Tutorial in Settings; `?mode=play|daily|weekly` waits for tutorial first
- Achievements screen, lifetime stats, Settings (theme, colorblind, cosmetics, volumes, backup, reset data)
- Cosmetic unlocks: 4 mallet skins + 2 board themes, persisted (`wam_skin` / `wam_board`)
- PWA: SW (`wam-v10`), core assets cache-first (no background put), non-core stale-while-revalidate, skipWaiting / clients.claim, guarded update toast, Install button, shortcuts
- Accessibility: aria-live HUD, polite live-region for score/life/frenzy/boss/game-over (max 1 per 2s), focus trap, canvas label, focus rings, colorblind palette + shapes, reduced-motion
- Share score card PNG (Web Share files / download / text clipboard); Daily share adds date, accuracy bar, streak
- Fullscreen, haptics / per-event vibration patterns, shake toggles, high-contrast theme, screen Wake Lock during play
- Backup: Export / Import `wam-save.json` (whitelist keys, clamp/shape checks, unknown keys ignored, confirm, >200KB rejected; export blob URL revoked)
- End-of-run grades S–D (not tutorial); stamp on recap and share text/PNG
- Weekly Challenge: ISO-week seeded modifiers, best `wam_wk_<week>`, last 4 weeks kept
- Debug overlay `?fps=1` (frame ms, steps/frame, particle count; off by default)
- Layered lookahead music (bass / hats at x3 / lead at x6 or Frenzy), duck on bombs and boss
- Resume grace (1.5s frozen targets). Hit-stop and camera punch on bomb / x9
- Adaptive assist on NORMAL if 2 lives are lost in the first 15s (never on Daily or Zen)
- Global error overlay; Reset Data clears only `wam_*` keys

## Controls

| Input                     | Action                                            |
| ------------------------- | ------------------------------------------------- |
| Tap / click / multi-touch | Whack the nearest risen target                    |
| 1-9 / Numpad 1-9          | Hit the matching 3x3 hole (numpad layout)         |
| Q W E / A S D / Z X C     | Alternate 3x3 layout                              |
| Gamepad d-pad / stick     | Move hole cursor                                  |
| Gamepad A or X            | Whack highlighted hole                            |
| Gamepad B or Start        | Pause / resume                                    |
| Esc / P                   | Pause / resume (works during the 3-2-1 countdown) |
| Enter / Space             | Activate the primary button on a menu             |
| Pause button              | Pause during play or countdown (hidden on menus)  |

## Modes

| Mode                 | Rules                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| Easy / Normal / Hard | 60s, 3 lives, bombs, frenzy, grid unlock; Boss on Normal/Hard                                        |
| Daily Challenge      | Same as the selected difficulty, date-seeded spawns, own daily best                                  |
| Weekly Challenge     | ISO-week seeded Daily-style modifiers, 60s, own weekly best (`wam_wk_<YYYYWW>`), last 4 weeks kept   |
| Zen                  | No timer, 5 lives, no bombs, spawn capped at Normal mid-rate, own best, only First Whack achievement |

Query shortcuts: `?mode=play`, `?mode=daily`, and `?mode=weekly` (PWA shortcuts). First-run tutorial still shows if `wam_tut` is unset, then the requested mode starts.

## Targets and scoring

Round length: 60 seconds (except Zen / tutorial). Missed brown/helmet/boss moles cost a life. Game ends at 0 lives or 0 time.

| Target       | Shape (colorblind-safe) | Effect                                         |
| ------------ | ----------------------- | ---------------------------------------------- |
| Brown mole   | Round head + ears       | +10 x combo multiplier                         |
| Gold mole    | Star burst body         | 5x points, short-lived; one SFX                |
| Bomb         | Spiked circle + fuse    | -1 life, -2s, combo reset, red flash           |
| Green heart  | Heart                   | +1 life (max 5)                                |
| Blue freeze  | Hex crystal + snowflake | Freeze timer 3s, icy vignette                  |
| Helmet mole  | Round head + visor      | 2 hits (clang then 2x score)                   |
| Double Score | Diamond + ring          | x2 points for 6s, gold HUD ring                |
| Boss Mole    | Large mole + HP bar     | 5 hits, 500 points, once at 40s on Normal/Hard |

Combo: each hit raises the chain. Multiplier is `min(1 + floor(combo / 3), 9)`. No hit for 1.5s decays the combo to 0. During Frenzy, points are doubled. Double Score stacks with Frenzy. Grid unlocks at score > 1500.

## Cosmetics

Settings > Cosmetics. Locked items show the unlock hint. High contrast remains usable.

| Item           | Unlock            |
| -------------- | ----------------- |
| Mallet Classic | Default           |
| Mallet Steel   | 100 lifetime hits |
| Mallet Gold    | Play 10 games     |
| Mallet Ice     | Best combo 15     |
| Board Night    | Default           |
| Board Dusk     | Daily streak 3    |

Stored in `wam_skin` (0-3) and `wam_board` (0-1); invalid values fall back to 0.

## Settings

Persisted in `localStorage` (all reads/writes wrapped in try/catch; values validated; schema `wam_ver`):

- Music volume, SFX volume
- Haptics on/off
- Screen shake on/off
- Reduced motion: Auto (OS) / Force on / Force off
- Theme: Default / High contrast
- Colorblind: Off / On (blue/orange palette plus distinct shapes)
- Cosmetics picker
- Fullscreen toggle (where the browser allows)
- Export Save: downloads `wam-save.json` (known `wam_*` keys plus schema version 8); blob URL revoked after click
- Import Save: file picker, whitelist + type/range/shape checks, ignores unknown keys, rejects the file if any known key fails, files over 200KB rejected, confirm, then reload. Errors toast; never throw
- Replay Tutorial: reopens How to Play from Settings
- Reset Data: two-step confirm, clears only `wam_*` keys and reloads

## Achievements

Sixteen goals. Toasts pop once. Full list with descriptions is on the Achievements screen. Zen only unlocks First Whack.

1. First Whack — land a hit
2. On a Roll — reach x3 multiplier
3. On Fire — reach x6
4. Unstoppable — reach x9
5. Half Grand — score 500 in one game
6. Grid Unlocked — score 1500 and expand the field
7. Frenzy Hit — score during a Frenzy wave
8. Lifesaver — catch a heart
9. Ice Cold — catch a freeze
10. Daily Grind — finish a Daily Challenge
11. Sharpshooter — finish with 80%+ accuracy and 20+ hits
12. Untouchable — finish with 3+ lives
13. Helmet Breaker — finish a helmet mole
14. Perfect Frenzy — 8 or more hits in one Frenzy
15. Daily Streak 3 — finish Daily 3 days in a row
16. Marathon — play 25 games

Stats screen: games, hits, shots, lifetime accuracy, best combo, play time, per-difficulty bests, zen best, daily best, daily streak, weekly best.

End-of-run grade (not tutorial): S / A / B / C / D from score, accuracy, and max combo (Zen uses score-only thresholds). Shown as a stamp on the recap overlay and included in share text/PNG.

## Daily Challenge

Seed = `YYYYMMDD`. Two PRNGs (timing and content) always consume a fixed number of samples per spawn tick, even when the tick is skipped. Particles use `Math.random`. Simulation uses a fixed 1/120s step so 60Hz and 144Hz produce the same sequence. A separate daily best is stored per date. Data is per-device `localStorage`. Daily share text includes date, score, a 10-square accuracy bar, and streak.

Debug: append `?fps=1` to show frame ms, simulation steps per frame, and particle count. Zero cost when off.

## Run locally

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`. The service worker needs http(s). Opening the file directly works without offline caching.

## SW versioning

Cache name is `VERSION` in `sw.js` (currently `wam-v10`). Core assets (everything in `ASSETS`: `./`, `index.html`, `style.css?v=10`, `game.js?v=10`, the manifest, and icons) are served **cache-first** from the `VERSION` cache with no background `cache.put`; only `install`'s `addAll` writes them, so core files can never mix versions. `index.html` loads `style.css?v=10` and `game.js?v=10`, and the same `?v=` strings live in `ASSETS`. Non-core same-origin GET uses stale-while-revalidate with `ignoreSearch`, caching only `res.ok && res.type === "basic"`. Navigation failure falls back to `index.html`. Non-navigation cache miss with the network down returns `Response.error()`. A waiting worker shows **Update ready - reload**; clicking it posts `SKIP_WAITING` and reloads exactly once on `controllerchange` (guarded against reload loops).

## Release checklist

1. Bump `VERSION` in `sw.js` (for example `wam-v10` -> `wam-v11`).
2. Bump the `?v=` suffix in `index.html` (`style.css?v=`, `game.js?v=`) and in `sw.js` `ASSETS` to the same number: bump `VERSION` in `sw.js` and the `?v=` suffix on every release.
3. Keep every `ASSETS` entry present on disk (query strings are ignored by static hosting).
4. Update this README (version references, structure, changelog).
5. Verify: `node --check sw.js game.js`, `JSON.parse` the manifest, HTTP 200 for all assets, and run the offline/cache + jsdom smoke checks.

## Structure

```
index.html                 shell, overlays, defer game.js
style.css                  layout, HUD, overlays, grade stamp
game.js                    one IIFE, "use strict"
manifest.webmanifest       PWA manifest (any + maskable PNGs, shortcuts)
sw.js                      offline cache (wam-v10)
icon.svg / icon-192.png / icon-512.png
icon-maskable-192.png / icon-maskable-512.png
og-image.png               Open Graph 1200x630
404.html                   redirect to /Whack-A-Mole/
.nojekyll
LICENSE                    MIT
README.md
```

## Changelog

### v10

- Input-aware hole selector: hidden until keyboard/gamepad hole input; fades ~120ms; hides on pointer/touch; reset on start/menu/game over
- Moon sits below the HUD safe zone (cached HUD rect on resize) so it never clips behind HUD cards
- Input-aware tutorial hints: touch-only devices see tap wording and skip the keys slide
- UI audit: `:focus-visible` only, canvas/HUD no tap-highlight or selection, cursor hidden on canvas

### v9

- SW `wam-v9`: core assets (`ASSETS`) served cache-first with no background `cache.put`; only `install`'s `addAll` writes them, preventing cross-version mixes
- Non-core same-origin GET stays stale-while-revalidate; offline navigation still falls back to `index.html`
- `index.html` loads `style.css?v=9` / `game.js?v=9`; the same `?v=` strings live in `ASSETS`
- Update toast: clicking posts `SKIP_WAITING` and reloads exactly once on `controllerchange`, guarded against reload loops
- Release checklist: bump `VERSION` in `sw.js` and the `?v=` suffix on every release

### v8

- Split CSS/JS: `style.css` + `game.js` (defer); SW `wam-v8` precaches both
- Hardened save import: whitelist known keys, clamp/shape checks, ignore unknown, reject on any known-key failure; export blob URL revoked
- Replay Tutorial in Settings
- End-of-run grades S–D (not tutorial); stamp + share text/PNG
- Weekly Challenge: ISO-week Daily-style modifiers, `wam_wk_<week>`, prune to last 4 weeks; `?mode=weekly`

### v7

- Absolute OG/canonical URLs at `https://siliconvalley007.github.io/Whack-A-Mole/`
- 404.html redirects to `/Whack-A-Mole/`; screenshots omitted (no real capture available)
- SW `wam-v7`; Export/Import save; Daily share summary; `?fps=1`; SR announcements; vibration patterns

### v6

- Accu dump after the fixed-step loop; accu reset on resume and visibility return
- 404.html computes Pages root in JS; removed from SW precache
- Absolute OG/canonical URLs (placeholder until a GitHub remote exists)
- SW `wam-v6`: non-navigation offline miss returns `Response.error()`
- `?mode=` waits for first-run tutorial
- Cosmetics (4 mallets, 2 boards), Boss Mole, Double Score, colorblind palette
- Manifest screenshots; 10fps catch-up stays real-time (max 12 steps)

### v5

- Fixed 1/120s timestep; Daily identical at 60/144Hz
- Real maskable 192/512 PNGs; OG image; shortcuts; display_override; 404.html; .nojekyll
- Wake Lock, error overlay, wam_ver + Reset Data
- Keyboard / gamepad; layered music; score-card PNG share; Zen; tutorial

### v4

- Two seeded PRNGs for Daily; skip-safe spawn sampling
- Resume grace, pointercancel/blur pause, game-over FX clear
- 4th column fade-in; single layout() path
- Lookahead music scheduler; combo-pitched hits; miss thud
- Helmet mole, confetti, hit-stop, camera punch
- Achievements screen + 4 new goals; stats play time / per-diff bests
- Install button, high-contrast theme, adaptive assist

## Known limitations

- No online scores or accounts (static GitHub Pages; data is per-device localStorage)
- Web Share, Fullscreen, Install, Wake Lock, and Gamepad depend on the browser / user gesture
- iOS may ignore the `vibrate` API
- First audio note can still be delayed until the OS unlocks AudioContext
- Adaptive quality lowers particle counts and DPR on slow devices rather than changing rules
- Manifest screenshots omitted: no headless browser was available to capture a real mid-game frame
