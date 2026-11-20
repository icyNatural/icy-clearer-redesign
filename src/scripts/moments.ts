import { createObservatory } from './moments-observatory';
const items = JSON.parse(document.querySelector('[data-moments-content]')?.textContent || '[]').filter((item: any) => item.kind === 'image' && !item.deleted);
const editing = new URLSearchParams(location.search).get('edit') === '1' && !!document.querySelector('[data-author-manifest]');
const dialog = document.querySelector<HTMLDialogElement>('.moment-detail')!;
const image = dialog.querySelector<HTMLImageElement>('img')!;
const metadata = dialog.querySelector<HTMLElement>('.moment-detail__metadata')!;
const value = (item: any, field: string) => item.overrides?.[field] ?? item[field] ?? item.metadata?.[field] ?? '';
let previousOverflow = '', current = 0, closing = false;
const orbit = !editing ? createObservatory(items, enter) : null;
if (editing) document.querySelectorAll<HTMLImageElement>('img[data-gallery-src]').forEach(img => { img.src = img.dataset.gallerySrc!; });
function appendCaptureCredit(el: HTMLElement, text: string) {
  for (const part of String(text).split(/(Photogression)/g)) {
    if (part !== 'Photogression') { el.append(document.createTextNode(part)); continue; }
    const link = document.createElement('a'); link.className = 'photogression-link';
    link.href = 'https://photogression.icynatural.now'; link.textContent = 'Photogression ↗'; el.append(link);
  }
}
function render() {
  const id = new URLSearchParams(location.hash.slice(1)).get('moment');
  const index = items.findIndex((item: any) => item.id === id);
  if (index < 0 || editing) {
    closing = false;
    if (dialog.open) { dialog.close(); document.body.style.overflow = previousOverflow; orbit?.select(current, false); orbit?.focus(); }
    return;
  }
  current = index; orbit?.select(index, false);
  const item = items[index];
  image.src = item.src; image.alt = value(item, 'alt') || value(item, 'title');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    image.getAnimations().forEach(animation => animation.cancel());
    image.animate([{ opacity: .2, transform: 'scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
  }
  metadata.replaceChildren();
  for (const [tag, text] of [['h2', value(item, 'title')], ['p', value(item, 'label')], ['p', value(item, 'description')], ['small', [item.date, item.group].filter(Boolean).join(' · ')], ['p', item.note]]) {
    if (!text) continue;
    const el = document.createElement(tag); appendCaptureCredit(el, text); metadata.append(el);
  }
  if (!metadata.querySelector('.photogression-link')) { const credit = document.createElement('p'); appendCaptureCredit(credit, 'Captured through Photogression'); metadata.append(credit); }
  if (item.href) { const a = document.createElement('a'); a.href = item.href; a.textContent = 'Explore ↗'; metadata.append(a); }
  dialog.querySelector('[data-detail-count]')!.textContent = `${index + 1} / ${items.length}`;
  dialog.querySelectorAll<HTMLButtonElement>('[data-detail="next"],[data-detail="previous"]').forEach(button => button.disabled = items.length < 2);
  if (!dialog.open) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; dialog.showModal(); }
  dialog.scrollTop = 0;
  for (const offset of [-1, 1]) { const neighbor = items[(index + offset + items.length) % items.length]; if (neighbor) { const preload = new Image(); preload.src = neighbor.displaySrc || neighbor.src; } }
}
function enter(index: number) {
  if (editing || !items[index] || dialog.open) return;
  orbit?.select(index, false);
  history.pushState({ ...history.state, momentOverlay: true }, '', `#moment=${encodeURIComponent(items[index].id)}`); render();
}
function close() {
  if (closing) return;
  if (history.state?.momentOverlay) { closing = true; history.back(); }
  else { history.replaceState(history.state, '', location.pathname + location.search); render(); }
}
function step(delta: number) {
  if (!items.length) return;
  history.replaceState(history.state, '', `#moment=${encodeURIComponent(items[(current + delta + items.length) % items.length].id)}`); render();
}
let gesture: { id: number; x: number; y: number; vertical: boolean } | null = null;
image.addEventListener('pointerdown', event => {
  if (editing || document.body.classList.contains('is-authoring') || !event.isPrimary || event.button !== 0) return;
  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, vertical: false };
  if (event.isTrusted) image.setPointerCapture(event.pointerId);
});
image.addEventListener('pointermove', event => {
  if (!gesture || gesture.id !== event.pointerId) return;
  const dx = Math.abs(event.clientX - gesture.x), dy = Math.abs(event.clientY - gesture.y);
  if (dy > 10 && dy >= dx) gesture.vertical = true;
});
image.addEventListener('pointerup', event => {
  const g = gesture; gesture = null;
  if (!g || g.id !== event.pointerId || g.vertical) return;
  const dx = event.clientX - g.x, dy = event.clientY - g.y;
  if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
});
image.addEventListener('pointercancel', () => { gesture = null; });
image.addEventListener('lostpointercapture', () => { gesture = null; });
dialog.addEventListener('click', event => {
  const action = (event.target as HTMLElement).closest<HTMLElement>('[data-detail]')?.dataset.detail;
  if (action === 'close' || event.target === dialog) close();
  if (action === 'next') step(1);
  if (action === 'previous') step(-1);
});
dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1); }
});
window.addEventListener('popstate', render); window.addEventListener('hashchange', render);
if (!editing && items.some((item: any) => item.id === new URLSearchParams(location.hash.slice(1)).get('moment')) && !history.state?.momentOverlay) {
  const hash = location.hash; history.replaceState(history.state, '', location.pathname + location.search);
  history.pushState({ ...history.state, momentOverlay: true }, '', hash);
}
render();