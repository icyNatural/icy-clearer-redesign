// Native objects retain their original DOM, typography, and flow footprint.
const templates = new Map<string, HTMLElement>();
export function naturalTemplate(id: string) { return templates.get(id); }
export function nativeTextNodes(el: HTMLElement) {
  return el.matches('[data-native-text]') ? [el] : Array.from(el.querySelectorAll<HTMLElement>('[data-native-text]'));
}
export function applyNative(item: any, el: HTMLElement) {
  const p = item[innerWidth <= 700 ? 'mobile' : 'desktop'];
  el.hidden = !!item.deleted;
  if (item.deleted) el.style.setProperty('display', 'none', 'important');
  if (p) {
    if (!el.closest('[data-native-copy]')) el.style.position = 'relative';
    el.style.transformOrigin = 'top left';
    el.style.transform = `translate(${p.x - 50}vw, ${p.y - 50}vh) rotate(${item.rotation || 0}deg) scale(${p.width / 100}, ${p.height / 100})`;
    el.style.zIndex = String(item.z ?? 1);
  }
  if (Array.isArray(item.nativeText)) nativeTextNodes(el).forEach((node, index) => {
    if (typeof item.nativeText[index] === 'string') {
      node.textContent = item.nativeText[index]; node.style.whiteSpace = 'pre-line';
    }
  });
}
export function renderNaturalObjects(items: any[]) {
  if (!document.querySelector('.natural-shell')) return;
  if (!templates.size) document.querySelectorAll<HTMLElement>('[data-author-id^="natural-"][data-native-text]').forEach(el => templates.set(el.dataset.authorId!, el.cloneNode(true) as HTMLElement));
  document.querySelectorAll('[data-native-copy]').forEach(el => el.remove());
  for (const [id, template] of templates) {
    const old = document.querySelector<HTMLElement>(`[data-author-id="${id}"]`);
    if (old) old.replaceWith(template.cloneNode(true));
  }
  for (const item of items.filter(item => item.kind === 'native')) {
    let el = document.querySelector<HTMLElement>(`[data-author-id="${item.id}"]`);
    if (!el && item.nativeId && templates.has(item.nativeId)) {
      const original = document.querySelector<HTMLElement>(`[data-author-id="${item.nativeId}"]`)!;
      // Copies are out of flow; the original layout never gains an extra grid row.
      const parent = original.parentElement!;
      parent.style.position = 'relative';
      const slot = document.createElement('div'); slot.dataset.nativeCopy = '';
      slot.style.cssText = `position:absolute;left:${original.offsetLeft}px;top:${original.offsetTop}px;width:${original.offsetWidth}px;height:${original.offsetHeight}px;pointer-events:none`;
      el = templates.get(item.nativeId)!.cloneNode(true) as HTMLElement;
      el.dataset.authorId = item.id;
      slot.append(el); parent.append(slot);
      el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;margin:0;pointer-events:auto';
    }
    if (el) applyNative(item, el);
  }
}