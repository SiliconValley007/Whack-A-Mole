# Whack-A-Mole (AAA Arcade Edition)

A polished, single-file arcade Whack-A-Mole game built with pure Vanilla JavaScript, Canvas, and CSS. No libraries, no CDNs, no external assets. Everything (graphics + audio) is generated procedurally at runtime.

Built for a fast, addictive loop: instant hit response, tight timing windows, combo multipliers, and 60 FPS on mobile and desktop.

## Play

Open `index.html` in any modern browser, or deploy it to GitHub Pages (see below).

## Controls

Desktop
- Mouse click: hit a mole
- `ESC` or `P`: pause / resume
- On-screen `II` button: pause

Mobile / Tablet
- Tap: hit a mole
- On-screen `II` button: pause

## Features

- Grid-based holes with automatic responsive layout (portrait + landscape)
- Random mole spawning with no unfair overlaps (one mole per hole)
- Combo multiplier (up to x9) that scales with consecutive hits
- Timer-based round (60s) combined with a lives system (3 lives)
- Progressive difficulty: faster spawns, shorter up-time, more concurrent moles
- Bombs: hitting one costs a life and 2 seconds
- Squash & stretch hit animation, floating score popups, screen shake
- Procedural Web Audio SFX for hit, miss, combo, bomb, and game over
- Full pause menu: Resume, Restart, Sound toggle, Title
- Auto-pause on tab hidden and window blur
- High score persisted in `localStorage`
- Safe-area / notch support, zero input lag via Pointer Events

## Gameplay Rules

- Hit a mole: `+10 x multiplier` points and the combo increases
- Let a mole escape: lose a life and reset the combo
- Hit a bomb: lose a life and 2 seconds
- Round ends at 0 lives or 0 time
- Multiplier increases every 3 consecutive hits, capped at x9

## Tech Stack

- Vanilla ES6 JavaScript (no frameworks)
- Canvas 2D rendering with devicePixelRatio scaling
- Web Audio API for synthesized SFX
- CSS for UI, overlays, and responsive layout
- `requestAnimationFrame` game loop with delta-time clamping

## Deploy to GitHub Pages

1. Create a repository and add `index.html` (and optionally `README.md`).

```bash
git init
git add index.html README.md
git commit -m "feat: add whack-a-mole game"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

2. On GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, set `Source` to `Deploy from a branch`.
4. Select branch `main` and folder `/ (root)`, then save.
5. Your game will be live at `https://<your-user>.github.io/<your-repo>/`.

Because the game is a single static HTML file with no dependencies, it also works from any static host (Netlify, Vercel, S3, or a local file).

## Tuning

Key constants live near the top of the script in `index.html`:

- `COLS`, `ROWS`: grid size
- `ROUND`: round length in seconds
- `lives` (in `startGame`): starting lives
- `diff()`: difficulty ramp
- `spawnInt()`: spawn interval
- `spawn()`: concurrent mole cap and bomb chance

## Browser Support

Chrome, Edge, Firefox, and Safari (desktop and mobile). Requires Pointer Events, Canvas 2D, and Web Audio API.

## License

MIT
