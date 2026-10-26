const items = JSON.parse(document.querySelector('[data-moments-content]')?.textContent || '[]').filter((item: any) => item.kind === 'image');
const dialog = document.querySelector<HTMLDialogElement>('.moment-detail')!;
const image = dialog.querySelector<HTMLImageElement>('img')!;
const metadata = dialog.querySelector<HTMLElement>('.moment-detail__metadata')!;
let opener: HTMLElement | null = null;
let previousOverflow = '';
const value = (item: any, field: string) => item.overrides?.[field] ?? item[field] ?? item.metadata?.[field] ?? '';
function appendCaptureCredit(el: HTMLElement, text: string) {
  const parts = text.split(/(Photogression)/g);
  for (const part of parts) {
    if (part !== 'Photogression') { el.append(document.createTextNode(part)); continue; }
    const link = document.createElement('a');
    link.className = 'photogression-link';
    link.href = 'https://photogression.icynatural.now';
    link.textContent = 'Photogression ↗';
    el.append(link);
  }
}
function render() {
  const id = new URLSearchParams(location.hash.slice(1)).get('moment');
  const index = items.findIndex((item: any) => item.id === id);
  if (index < 0 || document.body.classList.contains('is-authoring')) {
    if (dialog.open) { dialog.close(); document.body.style.overflow = previousOverflow; opener?.focus({preventScroll:true}); }
    return;
  }
  const item = items[index];
  image.src = item.src; image.alt = value(item,'alt') || value(item,'title');
  metadata.replaceChildren();
  for (const [tag, text] of [['h2',value(item,'title')],['p',value(item,'label')],['p',value(item,'description')],['small',[item.date,item.group].filter(Boolean).join(' · ')],['p',item.note]]) {
    if (!text) continue;
    const el = document.createElement(tag); appendCaptureCredit(el, text); metadata.append(el);
  }
  if (!metadata.querySelector('.photogression-link')) {
    const credit = document.createElement('p');
    appendCaptureCredit(credit, 'Taken with Photogression');
    metadata.append(credit);
  }
  if (item.href) { const a = document.createElement('a'); a.href = item.href; a.textContent = 'Explore ↗'; metadata.append(a); }
  dialog.querySelector('[data-detail-count]')!.textContent = `${index + 1} / ${items.length}`;
  dialog.querySelectorAll<HTMLButtonElement>('[data-detail="next"],[data-detail="previous"]').forEach(button => button.disabled = items.length < 2);
  if (!dialog.open) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; dialog.showModal(); }
  dialog.scrollTop = 0;
}
function close() {
  if (history.state?.momentOverlay) history.back();
  else { history.replaceState(null, '', location.pathname + location.search); render(); }
}
function step(direction: number) {
  const id = new URLSearchParams(location.hash.slice(1)).get('moment');
  const index = items.findIndex((item: any) => item.id === id);
  const next = items[(index + direction + items.length) % items.length];
  if (!next) return;
  history.replaceState(history.state, '', `#moment=${encodeURIComponent(next.id)}`); render();
}
document.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLElement>('[data-moment-open]');
  if (!button || document.body.classList.contains('is-authoring')) return;
  opener = button; history.pushState({momentOverlay:true}, '', `#moment=${encodeURIComponent(button.dataset.momentOpen!)}`); render();
});
dialog.addEventListener('click', event => {
  const action = (event.target as HTMLElement).closest<HTMLElement>('[data-detail]')?.dataset.detail;
  if (action === 'close' || event.target === dialog) close();
  if (action === 'next') step(1);
  if (action === 'previous') step(-1);
});
dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
dialog.addEventListener('keydown', event => { if (event.key === 'ArrowRight') step(1); if (event.key === 'ArrowLeft') step(-1); });
window.addEventListener('popstate', render);
window.addEventListener('hashchange', render);
render();