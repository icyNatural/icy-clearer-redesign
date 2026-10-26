// Each flowing gallery slot is a small canvas for the existing Studio controls.
// Percentage placements stay independent of the number of photos in the stream.
export function layoutMoments(canvas: HTMLElement, items: any[]) {
  for (const item of items.filter(item => !item.deleted)) {
    const el = canvas.querySelector<HTMLElement>(`[data-author-id="${item.id}"]`);
    if (!el) continue;
    let slot = el.closest<HTMLElement>('.moment-slot');
    if (!slot) {
      slot = document.createElement('div'); slot.className = 'moment-slot';
      el.before(slot); slot.append(el);
    }
    slot.style.setProperty('--moment-aspect', String(Math.max(.6, Math.min(1.8, item.metadata?.aspect || 1.5))));
    slot.classList.toggle('moment-slot--featured', !!item.featured);
  }
  canvas.querySelectorAll('.moment-slot').forEach(slot => { if (!slot.querySelector('[data-author-id]')) slot.remove(); });
  canvas.classList.toggle('moments-empty', !items.some(item => !item.deleted));
}