export const playGroups = ['play-gaming', 'play-basketball', 'play-other'];
export const isPlay = (item: any) => item.kind !== 'native' && playGroups.includes(item.group);
export const playAspect = (item: any) => Math.max(.15, Math.min(4, item.metadata?.aspect || 16 / 9));
const value = (item: any, field: string) => item.overrides?.[field] ?? item[field] ?? item.metadata?.[field] ?? '';

// PLAY slots are flowing mini-canvases; Studio's percentage frames remain intact.
export function layoutPlay(canvas: HTMLElement, items: any[]) {
  const ordered = items.filter(item => !item.deleted && isPlay(item)).sort((a, b) => (a.playOrder ?? 1000) - (b.playOrder ?? 1000));
  for (const item of items.filter(item => !item.deleted)) {
    const el = document.querySelector<HTMLElement>(`[data-author-id="${item.id}"]`);
    if (!el || item.kind === 'native') continue;
    if (!isPlay(item)) { if (el.closest('.play-slot')) canvas.append(el); continue; }
    const stream = document.querySelector<HTMLElement>(`[data-play-stream="${item.group}"]`);
    if (!stream) continue;
    let slot = el.closest<HTMLElement>('.play-slot');
    if (!slot) {
      slot = document.createElement('article'); slot.className = 'play-slot';
      const frame = document.createElement('div'); frame.className = 'play-frame';
      frame.append(el); slot.append(frame);
      const copy = document.createElement('div'); copy.className = 'play-copy'; slot.append(copy);
    }
    stream.append(slot);
    slot.style.order = String(ordered.indexOf(item));
    slot.style.setProperty('--play-aspect', String(playAspect(item)));
    slot.classList.toggle('play-slot--wide', playAspect(item) > 1.2);
    slot.classList.toggle('play-slot--reserve', item.curated === false || item.kind === 'placeholder');
    const copy = slot.querySelector<HTMLElement>('.play-copy')!; copy.replaceChildren();
    for (const [tag, text] of [['h4',item.kind === 'placeholder' ? '' : value(item,'title')], ['p',value(item,'label')], ['p',value(item,'description')], ['small',item.metadata?.author]]) {
      if (!text) continue;
      const node = document.createElement(tag); node.textContent = text; copy.append(node);
    }
    if (item.kind === 'youtube') {
      const link = document.createElement('a'); link.href = item.source; link.textContent = 'Open on YouTube ↗'; copy.append(link);
    }
    if (item.kind === 'placeholder') {
      const paper = el.querySelector('.source-paper');
      if (paper) paper.textContent = value(item,'title') || 'ADD PLAY MOMENT';
    }
  }
  document.querySelectorAll('.play-slot').forEach(slot => { if (!slot.querySelector('[data-author-id]')) slot.remove(); });
}