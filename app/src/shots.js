// Fixed scenes for screenshots. ?shot=cover paints the cover alone, full-frame;
// ?shot=editor opens the editor with a sample photo loaded. `photo` picks a sample
// (samples/<photo>.jpg), `caption` the title, `layout` / `grade` / `size` the look.
// window.__shotReady is set once the frame is painted.

export async function runShot(shot, query, setup) {
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const layout = query.get('layout') ?? 'hero4';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? '1920x1080';
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await setup({ photo, caption, layout, grade, size, shot });
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
