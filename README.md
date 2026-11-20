# Vice Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/scriptstealer/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/scriptstealer/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn any photo into GTA-style multi-panel cover art — sunset-soaked, bold-lettered,
ready to post. Pick a layout, drop in your photos, crop each panel by dragging,
write your title, and export a PNG.

## What it does

- **4 layouts**: Hero + 3 panels, 9-panel grid, full-bleed hero, and tilted polaroid snapshots.
- **4 colour grades**: Sunset, Neon pink/teal, Golden hour, and Noir — plus film grain and vignette.
- **Any photo**: load your own photos from your machine (nothing is uploaded), or use the three built-in samples. Click a panel to assign a photo to it, drag to pan, scroll or use the slider to zoom, or fill every panel with one photo.
- **Big lettering**: your title in Anton (bold condensed, vendored under the SIL Open Font License), a script subtitle in Pacifico, and a ribbon badge.
- **Export PNG** in all three post sizes: 1080 × 1080, 1080 × 1350, and 1920 × 1080 — one size at a time or all three at once.
- **Undo / redo**, live preview, and it works fully offline — every script, font, and image is a file under `app/`, no network requests, no build step.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in desktop Chrome.

## Files

- `app/index.html` — the editor page
- `app/src/render.js` — the poster painter (layouts, grades, grain, lettering)
- `app/src/editor.js` — photo library, panel picking, drag/zoom, export
- `app/src/state.js` — cover state and undo/redo history
- `app/fonts/` — Anton and Pacifico, SIL Open Font License (see `OFL.txt`)
- `app/samples/` — three image-model sample photos, free to use
- `main.ts` — the make.fun hand-in program (copies `app/` + `screenshots/` to `/output`, writes `dossier.json`)

Everything here is original work — no Rockstar logo, artwork, character, or font.

<sub>Entered on [make.fun](https://make.fun/?ref=6rdgs9pm&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
