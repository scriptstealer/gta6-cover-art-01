// Paints the poster: panel geometry per layout, colour grades, grain, vignette
// and the big Anton title with a Pacifico script line. Pure canvas, no network.

export const LAYOUTS = {
  hero4: { label: 'Hero + 3', slots: 4 },
  grid9: { label: '9-grid', slots: 9 },
  fullbleed: { label: 'Full-bleed', slots: 1 },
  tilted: { label: 'Tilted snaps', slots: 4 },
};

export const GRADES = {
  sunset: { label: 'Sunset' },
  neon: { label: 'Neon' },
  golden: { label: 'Golden hour' },
  noir: { label: 'Noir' },
};

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** Panel rectangles for a layout, as fractions of the canvas. Tilted panels carry a rotation. */
export function panelRects(layout, w, h) {
  const g = Math.round(Math.min(w, h) * 0.014); // gutter
  switch (layout) {
    case 'grid9': {
      const cw = (w - g * 4) / 3, ch = (h - g * 4) / 3;
      const out = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
        out.push({ x: g + c * (cw + g), y: g + r * (ch + g), w: cw, h: ch, rot: 0 });
      return out;
    }
    case 'fullbleed':
      return [{ x: 0, y: 0, w, h, rot: 0 }];
    case 'tilted': {
      const bw = w * 0.52, bh = h * 0.66;
      return [
        { x: 0, y: 0, w, h, rot: 0, background: true },
        { x: (w - bw) / 2, y: h * 0.09, w: bw, h: bh, rot: -0.055 },
        { x: w * 0.045, y: h * 0.68, w: w * 0.27, h: h * 0.26, rot: 0.09 },
        { x: w * 0.685, y: h * 0.68, w: w * 0.27, h: h * 0.26, rot: -0.08 },
      ];
    }
    case 'hero4':
    default: {
      const heroW = w * 0.615;
      const sideX = heroW + g, sideW = w - sideX - g;
      const sideH = (h - g * 4) / 3;
      return [
        { x: g, y: g, w: heroW - g, h: h - g * 2, rot: 0 },
        { x: sideX, y: g, w: sideW, h: sideH, rot: 0 },
        { x: sideX, y: g * 2 + sideH, w: sideW, h: sideH, rot: 0 },
        { x: sideX, y: g * 3 + sideH * 2, w: sideW, h: sideH, rot: 0 },
      ];
    }
  }
}

/** Draws one photo into a rect, cover-fit, with the panel's zoom and pan offsets. */
function drawPhotoInto(ctx, img, rect, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  const r = Math.min(10, w * 0.02, h * 0.02);
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  if (grade === 'noir') ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.03)';
  else ctx.filter = 'saturate(1.18) contrast(1.06)';
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const zoom = panel?.zoom ?? 1;
  const pw = img.naturalWidth * base * zoom;
  const ph = img.naturalHeight * base * zoom;
  const ox = (panel?.ox ?? 0) * w, oy = (panel?.oy ?? 0) * h;
  ctx.drawImage(img, x + (w - pw) / 2 + ox, y + (h - ph) / 2 + oy, pw, ph);
  ctx.filter = 'none';
  // Grade wash over the photo.
  if (grade === 'sunset') wash(ctx, x, y, w, h, ['rgba(255,110,60,0.10)', 'rgba(255,45,149,0.28)']);
  else if (grade === 'neon') wash(ctx, x, y, w, h, ['rgba(0,229,255,0.16)', 'rgba(255,45,149,0.30)']);
  else if (grade === 'golden') wash(ctx, x, y, w, h, ['rgba(255,190,60,0.22)', 'rgba(255,120,20,0.20)']);
  else if (grade === 'noir') wash(ctx, x, y, w, h, ['rgba(10,10,20,0.05)', 'rgba(0,0,0,0.30)']);
  ctx.restore();
}

function wash(ctx, x, y, w, h, stops) {
  const grad = ctx.createLinearGradient(x, y, x + w * 0.25, y + h);
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(1, stops[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

/** A tileable static-noise pattern, built once per size. */
const grainCache = new Map();
function grainPattern(w, h) {
  const key = `${w}x${h}`;
  if (!grainCache.has(key)) {
    const tile = document.createElement('canvas');
    tile.width = 140; tile.height = 140;
    const tctx = tile.getContext('2d');
    const data = tctx.createImageData(140, 140);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = Math.random() * 255;
      data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v;
      data.data[i + 3] = Math.random() < 0.5 ? 0 : 26;
    }
    tctx.putImageData(data, 0, 0);
    grainCache.set(key, tile);
  }
  return grainCache.get(key);
}

/** Fits the title on one line, shrinking until it fits the band width. */
function fitTitle(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  while (size > 20 && ctx.measureText(text).width > maxWidth) {
    size -= Math.max(2, Math.round(size * 0.04));
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  }
  return size;
}

/**
 * Renders the whole poster onto `canvas`.
 * state: { layout, grade, caption, subtitle, badge, grain, vignette, panels }
 * photos: Map from photo id to an HTMLImageElement (or null).
 * selected: index of the panel the editor has selected (-1 for none).
 */
export function renderPoster(canvas, state, photos, selected = -1) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#160a20';
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(state.layout, w, h);
  const panelAt = (i) => state.panels[i] ?? { photo: null, zoom: 1, ox: 0, oy: 0 };
  const photoAt = (i) => photos.get(panelAt(i).photo) ?? null;

  if (state.layout === 'tilted') {
    // Slot 0 is the blurred backdrop; slots 1-3 are the tilted snapshots.
    const bg = photoAt(0);
    if (bg) {
      ctx.save();
      ctx.filter = 'blur(18px) brightness(0.55) saturate(1.3)';
      const s = Math.max(w / bg.naturalWidth, h / bg.naturalHeight) * 1.15;
      ctx.drawImage(bg, (w - bg.naturalWidth * s) / 2, (h - bg.naturalHeight * s) / 2, bg.naturalWidth * s, bg.naturalHeight * s);
      ctx.restore();
    }
    for (let i = 1; i < rects.length; i++) {
      const rect = rects[i];
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      const img = photoAt(i);
      if (img) drawPhotoInto(ctx, img, { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h }, panelAt(i), state.grade);
      else { ctx.fillStyle = '#2a1638'; ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h); }
      // White polaroid frame, with the drop shadow only on the frame itself.
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = w * 0.03;
      ctx.shadowOffsetY = w * 0.008;
      ctx.strokeStyle = '#fdf7ef';
      ctx.lineWidth = Math.max(3, w * 0.006);
      ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
      ctx.restore();
      if (i === selected) outlineRect(ctx, rect, w);
    }
  } else {
    rects.forEach((rect, i) => {
      const img = photoAt(i);
      if (img) drawPhotoInto(ctx, img, rect, panelAt(i), state.grade);
      else {
        ctx.fillStyle = '#2a1638';
        ctx.beginPath();
        ctx.roundRect(rect.x, rect.y, rect.w, rect.h, Math.min(10, rect.w * 0.02));
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = `${Math.max(14, w * 0.016)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('tap a photo, then this panel', rect.x + rect.w / 2, rect.y + rect.h / 2);
      }
      if (i === selected) outlineRect(ctx, rect, w);
    });
  }

  // Bottom title band.
  const bandH = h * (state.layout === 'fullbleed' ? 0.26 : 0.20);
  const bandY = h - bandH;
  const band = ctx.createLinearGradient(0, bandY - h * 0.05, 0, h);
  band.addColorStop(0, 'rgba(12,4,20,0)');
  band.addColorStop(0.45, 'rgba(12,4,20,0.72)');
  band.addColorStop(1, 'rgba(12,4,20,0.94)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY - h * 0.05, w, h - bandY + h * 0.05);

  const title = (state.caption || 'UNTITLED').trim().toUpperCase();
  const titleSize = fitTitle(ctx, title, w * 0.92, h * 0.115);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const titleY = h - h * 0.055;
  // Sunset fill with a dark outline so it pops off any photo.
  const fill = ctx.createLinearGradient(0, titleY - titleSize, 0, titleY);
  if (state.grade === 'neon') { fill.addColorStop(0, '#7df9ff'); fill.addColorStop(0.55, '#ffffff'); fill.addColorStop(1, '#ff2d95'); }
  else if (state.grade === 'noir') { fill.addColorStop(0, '#ffffff'); fill.addColorStop(1, '#cfcfcf'); }
  else if (state.grade === 'golden') { fill.addColorStop(0, '#fff3b0'); fill.addColorStop(0.55, '#ffffff'); fill.addColorStop(1, '#ffb347'); }
  else { fill.addColorStop(0, '#ffd319'); fill.addColorStop(0.55, '#ffffff'); fill.addColorStop(1, '#ff5e62'); }
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10,2,16,0.85)';
  ctx.lineWidth = Math.max(2, titleSize * 0.09);
  ctx.strokeText(title, w / 2, titleY);
  ctx.fillStyle = fill;
  ctx.fillText(title, w / 2, titleY);

  // Script subtitle, tucked right under the title.
  const sub = (state.subtitle || '').trim();
  if (sub) {
    const subSize = Math.max(16, h * 0.042);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.shadowColor = state.grade === 'neon' ? '#ff2d95' : '#ff7a18';
    ctx.shadowBlur = subSize * 0.45;
    ctx.fillStyle = state.grade === 'noir' ? '#ffffff' : '#ffe9f6';
    ctx.fillText(sub, w / 2, titleY + subSize * 1.05);
    ctx.shadowBlur = 0;
  }

  // Ribbon badge, top-left.
  const badge = (state.badge || '').trim();
  if (badge) {
    ctx.font = `${Math.max(13, h * 0.024)}px Anton, sans-serif`;
    const pad = w * 0.014;
    const bw = ctx.measureText(badge).width + pad * 2;
    const bh = Math.max(20, h * 0.042);
    ctx.save();
    ctx.translate(w * 0.03, h * 0.035);
    ctx.rotate(-0.02);
    ctx.fillStyle = state.grade === 'neon' ? '#ff2d95' : '#ff7a18';
    ctx.beginPath();
    ctx.roundRect(0, 0, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(badge, bw / 2, bh * 0.72);
    ctx.restore();
  }

  // Vignette + grain over everything.
  if (state.vignette) {
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(grainPattern(w, h), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  ctx.textAlign = 'left';
}

function outlineRect(ctx, rect, w) {
  ctx.save();
  if (rect.rot) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate(rect.rot);
    ctx.strokeStyle = '#ffd319';
    ctx.lineWidth = Math.max(3, w * 0.004);
    ctx.setLineDash([14, 8]);
    ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  } else {
    ctx.strokeStyle = '#ffd319';
    ctx.lineWidth = Math.max(3, w * 0.004);
    ctx.setLineDash([14, 8]);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}
