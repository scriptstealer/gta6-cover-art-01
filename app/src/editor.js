// Wires the sidebar to the canvas: photo library, panel picking, drag-to-pan,
// wheel zoom, undo/redo and PNG export at the three post sizes.

import { renderPoster, panelRects, SIZES, LAYOUTS, GRADES } from './render.js';
import { fitPanels, snapshot, History } from './state.js';

export const SAMPLES = [
  { id: 'pier', file: 'samples/pier.jpg', label: 'Pier' },
  { id: 'boulevard', file: 'samples/boulevard.jpg', label: 'Boulevard' },
  { id: 'neon', file: 'samples/neon.jpg', label: 'Neon night' },
];

/** Loads an image element from a URL. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/**
 * Builds the editor around the page's elements.
 * `photos` starts with the loaded samples; `onState` runs after every change.
 */
export function createEditor(els, state, photos) {
  const history = new History(state);
  let current = snapshot(state);
  let pickedPhoto = 'pier';
  let uploadCount = 0;

  const canvas = els.stage;

  function draw() {
    const [w, h] = SIZES[current.size];
    const scale = Math.min(1, 980 / w, 620 / h);
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    renderPoster(canvas, current, photos, current.selected);
    syncControls();
  }

  function syncControls() {
    els.zoomSlider.value = String(current.panels[current.selected]?.zoom ?? 1);
    els.panelHint.textContent = `Panel ${current.selected + 1} of ${current.panels.length} selected — drag it to pan, scroll to zoom.`;
    els.undoBtn.disabled = !history.canUndo;
    els.redoBtn.disabled = !history.canRedo;
    document.querySelectorAll('#layoutRow .choice').forEach((b) =>
      b.classList.toggle('is-active', b.dataset.layout === current.layout));
    document.querySelectorAll('#gradeRow .choice').forEach((b) =>
      b.classList.toggle('is-active', b.dataset.grade === current.grade));
    document.querySelectorAll('#sizeRow .choice').forEach((b) =>
      b.classList.toggle('is-active', b.dataset.size === current.size));
    document.querySelectorAll('#sampleRow img').forEach((img) =>
      img.classList.toggle('is-active', img.dataset.photo === pickedPhoto));
  }

  /** Records a state change for undo, then repaints. */
  function commit(next, repaint = true) {
    current = snapshot(next);
    history.commit(current);
    if (repaint) draw();
    return current;
  }
  function apply(next) {
    current = snapshot(next);
    draw();
    return current;
  }

  // --- photo library -------------------------------------------------------
  function buildSamples() {
    els.sampleRow.innerHTML = '';
    for (const sample of SAMPLES) {
      const img = document.createElement('img');
      img.src = sample.file;
      img.alt = sample.label;
      img.title = sample.label;
      img.dataset.photo = sample.id;
      img.addEventListener('click', () => {
        pickedPhoto = sample.id;
        assignPhoto(sample.id, current.selected);
      });
      els.sampleRow.appendChild(img);
    }
  }

  function assignPhoto(photoId, panelIndex) {
    const next = snapshot(current);
    next.panels[panelIndex].photo = photoId;
    commit(next);
    els.status.textContent = `Panel ${panelIndex + 1} now shows ${photoId}.`;
  }

  els.fileInput.addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      uploadCount += 1;
      const id = `upload-${uploadCount}`;
      try {
        const img = await loadImage(URL.createObjectURL(file));
        photos.set(id, img);
        pickedPhoto = id;
        assignPhoto(id, current.selected);
      } catch {
        els.status.textContent = `Could not read ${file.name}.`;
      }
    }
    e.target.value = '';
  });

  els.fillAll.addEventListener('click', () => {
    const next = snapshot(current);
    next.panels.forEach((p) => { p.photo = pickedPhoto; });
    commit(next);
    els.status.textContent = `Every panel now shows ${pickedPhoto}.`;
  });

  // --- layout / grade / size ----------------------------------------------
  els.layoutRow.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-layout]');
    if (!btn || !LAYOUTS[btn.dataset.layout]) return;
    const next = snapshot(current);
    next.layout = btn.dataset.layout;
    fitPanels(next);
    commit(next);
  });
  els.gradeRow.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-grade]');
    if (!btn || !GRADES[btn.dataset.grade]) return;
    const next = snapshot(current);
    next.grade = btn.dataset.grade;
    commit(next);
  });
  els.sizeRow.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-size]');
    if (!btn || !SIZES[btn.dataset.size]) return;
    const next = snapshot(current);
    next.size = btn.dataset.size;
    commit(next);
  });

  // --- words ----------------------------------------------------------------
  els.captionInput.addEventListener('input', () => {
    const next = snapshot(current);
    next.caption = els.captionInput.value;
    apply(next);
  });
  els.subtitleInput.addEventListener('input', () => {
    const next = snapshot(current);
    next.subtitle = els.subtitleInput.value;
    apply(next);
  });
  els.badgeInput.addEventListener('input', () => {
    const next = snapshot(current);
    next.badge = els.badgeInput.value;
    apply(next);
  });
  els.grainToggle.addEventListener('change', () => {
    const next = snapshot(current);
    next.grain = els.grainToggle.checked;
    commit(next);
  });
  els.vignetteToggle.addEventListener('change', () => {
    const next = snapshot(current);
    next.vignette = els.vignetteToggle.checked;
    commit(next);
  });

  // --- selected panel: zoom slider, undo/redo, reset -----------------------
  els.zoomSlider.addEventListener('input', () => {
    const next = snapshot(current);
    next.panels[next.selected].zoom = Number(els.zoomSlider.value);
    apply(next);
  });
  els.zoomSlider.addEventListener('change', () => commit(current, false));
  els.undoBtn.addEventListener('click', () => {
    const back = history.undo();
    if (back) { current = back; draw(); }
  });
  els.redoBtn.addEventListener('click', () => {
    const fwd = history.redo();
    if (fwd) { current = fwd; draw(); }
  });
  els.resetBtn.addEventListener('click', async () => {
    const next = snapshot(current);
    next.panels.forEach((p) => { p.zoom = 1; p.ox = 0; p.oy = 0; });
    commit(next);
    els.status.textContent = 'Panel crops reset.';
  });

  // --- pointer: click to select a panel, drag to pan, wheel to zoom --------
  function panelAtPoint(clientX, clientY) {
    const box = canvas.getBoundingClientRect();
    const px = (clientX - box.left) * (canvas.width / box.width);
    const py = (clientY - box.top) * (canvas.height / box.height);
    const rects = panelRects(current.layout, canvas.width, canvas.height);
    // Tilted panels: test the rotated rects last-drawn first.
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (r.rot) {
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        const dx = px - cx, dy = py - cy;
        const lx = dx * Math.cos(-r.rot) - dy * Math.sin(-r.rot);
        const ly = dx * Math.sin(-r.rot) + dy * Math.cos(-r.rot);
        if (Math.abs(lx) <= r.w / 2 && Math.abs(ly) <= r.h / 2) return i;
      } else if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
        return i;
      }
    }
    return -1;
  }

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const hit = panelAtPoint(e.clientX, e.clientY);
    if (hit < 0) return;
    if (hit !== current.selected) {
      const next = snapshot(current);
      next.selected = hit;
      apply(next);
    }
    drag = { x: e.clientX, y: e.clientY, index: hit };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const box = canvas.getBoundingClientRect();
    const dx = (e.clientX - drag.x) * (canvas.width / box.width);
    const dy = (e.clientY - drag.y) * (canvas.height / box.height);
    drag.x = e.clientX; drag.y = e.clientY;
    const rects = panelRects(current.layout, canvas.width, canvas.height);
    const rect = rects[drag.index];
    const next = snapshot(current);
    const panel = next.panels[drag.index];
    panel.ox = Math.max(-0.5, Math.min(0.5, panel.ox + dx / rect.w));
    panel.oy = Math.max(-0.5, Math.min(0.5, panel.oy + dy / rect.h));
    apply(next);
  });
  canvas.addEventListener('pointerup', () => {
    if (drag) { commit(current, false); drag = null; }
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const hit = panelAtPoint(e.clientX, e.clientY);
    if (hit < 0) return;
    const next = snapshot(current);
    const panel = next.panels[hit];
    panel.zoom = Math.max(1, Math.min(2.5, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
    apply(next);
  }, { passive: false });

  // --- export ---------------------------------------------------------------
  function exportSize(sizeKey) {
    const [w, h] = SIZES[sizeKey];
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    renderPoster(off, current, photos, -1);
    return new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  }

  async function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  els.exportBtn.addEventListener('click', async () => {
    const blob = await exportSize(current.size);
    const name = `vice-cover-${current.size}.png`;
    await download(blob, name);
    els.status.textContent = `Saved ${name} (${current.size.replace('x', ' × ')}).`;
  });
  els.exportAllBtn.addEventListener('click', async () => {
    for (const sizeKey of Object.keys(SIZES)) {
      await download(await exportSize(sizeKey), `vice-cover-${sizeKey}.png`);
    }
    els.status.textContent = 'Saved all 3 sizes: 1080 × 1080, 1080 × 1350, 1920 × 1080.';
  });

  buildSamples();
  draw();
  return {
    draw,
    get state() { return current; },
    setState(next) {
      current = snapshot(next);
      fitPanels(current);
      // Keep the sidebar in step with the state (matters for ?shot=editor).
      els.captionInput.value = current.caption;
      els.subtitleInput.value = current.subtitle;
      els.badgeInput.value = current.badge;
      els.grainToggle.checked = current.grain;
      els.vignetteToggle.checked = current.vignette;
      draw();
    },
    photos,
    exportSize,
  };
}
