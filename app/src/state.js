// Cover state: one plain object, plus a small undo/redo stack over snapshots of it.

import { LAYOUTS } from './render.js';

/** A fresh cover: hero layout, sunset grade, the pier sample in every panel. */
export function freshState() {
  return {
    layout: 'hero4',
    grade: 'sunset',
    size: '1920x1080',
    caption: 'Sunset Heist',
    subtitle: 'one last ride',
    badge: 'SUNSET STRIP',
    grain: true,
    vignette: true,
    selected: 0,
    panels: [
      { photo: 'pier', zoom: 1, ox: 0, oy: 0 },
      { photo: 'boulevard', zoom: 1, ox: 0, oy: 0 },
      { photo: 'neon', zoom: 1, ox: 0, oy: 0 },
      { photo: 'pier', zoom: 1, ox: 0, oy: 0 },
    ],
  };
}

/** Grows or trims the panel list to the layout's slot count, keeping existing crops. */
export function fitPanels(state) {
  const want = LAYOUTS[state.layout].slots;
  while (state.panels.length < want) {
    const last = state.panels[state.panels.length - 1] ?? { photo: 'pier', zoom: 1, ox: 0, oy: 0 };
    state.panels.push({ ...last });
  }
  state.panels.length = want;
  if (state.selected >= want) state.selected = 0;
  return state;
}

/** A deep copy of a state object, safe to stash in history. */
export function snapshot(state) {
  return JSON.parse(JSON.stringify(state));
}

/** Undo/redo over state snapshots. */
export class History {
  constructor(first) {
    this.past = [];
    this.future = [];
    this.current = snapshot(first);
  }
  commit(next) {
    this.past.push(this.current);
    if (this.past.length > 60) this.past.shift();
    this.future.length = 0;
    this.current = snapshot(next);
  }
  undo() {
    if (!this.past.length) return null;
    this.future.push(this.current);
    this.current = this.past.pop();
    return snapshot(this.current);
  }
  redo() {
    if (!this.future.length) return null;
    this.past.push(this.current);
    this.current = this.future.pop();
    return snapshot(this.current);
  }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}
