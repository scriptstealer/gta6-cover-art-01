// Entry point: loads the fonts and the three sample photos, builds the editor,
// and hands ?shot= scenes to shots.js for screenshots.

import { renderPoster, SIZES } from './render.js';
import { freshState, fitPanels } from './state.js';
import { createEditor, loadImage, SAMPLES } from './editor.js';
import { runShot } from './shots.js';

const els = {
  stage: document.getElementById('stage'),
  sampleRow: document.getElementById('sampleRow'),
  fileInput: document.getElementById('fileInput'),
  fillAll: document.getElementById('fillAll'),
  layoutRow: document.getElementById('layoutRow'),
  gradeRow: document.getElementById('gradeRow'),
  sizeRow: document.getElementById('sizeRow'),
  captionInput: document.getElementById('captionInput'),
  subtitleInput: document.getElementById('subtitleInput'),
  badgeInput: document.getElementById('badgeInput'),
  grainToggle: document.getElementById('grainToggle'),
  vignetteToggle: document.getElementById('vignetteToggle'),
  zoomSlider: document.getElementById('zoomSlider'),
  panelHint: document.getElementById('panelHint'),
  undoBtn: document.getElementById('undoBtn'),
  redoBtn: document.getElementById('redoBtn'),
  resetBtn: document.getElementById('resetBtn'),
  exportBtn: document.getElementById('exportBtn'),
  exportAllBtn: document.getElementById('exportAllBtn'),
  status: document.getElementById('status'),
};

/** Loads the two vendored display fonts so canvas lettering uses them. */
async function warmFonts() {
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch {
    // Canvas falls back to system fonts; the app still works.
  }
}

/** Loads every sample photo into the photo map. */
async function loadSamples(photos) {
  for (const sample of SAMPLES) {
    try {
      photos.set(sample.id, await loadImage(sample.file));
    } catch {
      // A missing sample just leaves its panels empty.
    }
  }
}

async function boot() {
  const photos = new Map();
  await warmFonts();
  await loadSamples(photos);

  const state = freshState();
  const editor = createEditor(els, state, photos);

  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (!shot) return;

  await runShot(shot, query, async ({ photo, caption, layout, grade, size }) => {
    const next = freshState();
    next.caption = caption;
    next.layout = ['hero4', 'grid9', 'fullbleed', 'tilted'].includes(layout) ? layout : 'hero4';
    next.grade = ['sunset', 'neon', 'golden', 'noir'].includes(grade) ? grade : 'sunset';
    next.size = size in SIZES ? size : '1920x1080';
    fitPanels(next);
    // The shot photo fills every panel; the other samples vary the side panels.
    // Tilted: the shot photo is both the blurred backdrop and the centre snap.
    const others = SAMPLES.map((s) => s.id).filter((id) => id !== photo);
    const pool = layout === 'tilted' ? [photo, photo, ...others] : [photo, ...others];
    const seen = new Map();
    next.panels.forEach((panel, i) => {
      const id = pool[i % pool.length];
      panel.photo = id;
      // A photo that repeats gets a different crop, so no two panels match.
      const times = seen.get(id) ?? 0;
      seen.set(id, times + 1);
      panel.zoom = 1 + 0.3 * times;
      panel.ox = 0.07 * times;
      panel.oy = -0.05 * times;
    });
    next.selected = -1;
    editor.setState(next);

    if (shot === 'cover') {
      // Full-frame cover: canvas sized to the viewport, aspect of the export size.
      const [w, h] = SIZES[size] ?? SIZES['1920x1080'];
      const scale = Math.min(window.innerWidth / w, window.innerHeight / h);
      els.stage.width = Math.max(2, Math.round(w * scale));
      els.stage.height = Math.max(2, Math.round(h * scale));
      renderPoster(els.stage, editor.state, photos, -1);
    }
  });
}

boot();
