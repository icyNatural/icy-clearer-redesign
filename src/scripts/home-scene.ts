// HOME presentation presets, not a second scene/editor. All content lives in home.json.
export const homeTextStyles = ['handle','archive','title','signature','intro-heading','intro-body','sky-note','ideas','portal-note','interest-heading'];
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));
const value = (item: any, field: string) => item.overrides?.[field] ?? item[field] ?? (field === 'label' || field === 'alt' ? item.metadata?.title : item.metadata?.[field]) ?? '';

// An entrance is an ordinary media scene object with a HOME presentation preset.
// Both Astro and Local Studio use this renderer, including during undo/replace.
export function homeWorld(item: any) {
  return /^world-(natural|apps|clear)$/.exec(item.group || '')?.[1];
}
export function homeEntrance(item: any) {
  const world = homeWorld(item);
  if (!world) return '';
  const label = value(item, 'label') || value(item, 'title');
  const description = value(item, 'description');
  const image = (src: string, alt: string, primary = false) => `<img class="${primary ? 'world-preview__primary' : 'world-preview__detail'}" src="${escape(src)}" alt="${escape(alt)}" loading="lazy" draggable="false" />`;
  const src = item.kind === 'video' ? '' : item.src || item.metadata?.thumbnail || (item.kind === 'image' ? item.source : '');
  const details = src ? (item.previewImages || []).map((preview: any) => image(preview.src, preview.alt || '')).join('') : '';
  const hasMedia = !!src || item.kind === 'video';
  const signal = `<div class="world-signal" aria-hidden="true"><i class="world-orbit world-orbit--one"></i><i class="world-orbit world-orbit--two"></i><i class="world-orbit world-orbit--three"></i><i class="world-orbit__core"></i><div class="world-signal__text">${(item.parts || []).map((part: string) => `<span>${escape(part)}</span>`).join('')}</div></div>`;
  const media = item.kind === 'video' ? `<video src="${escape(item.src || item.source || '')}" muted playsinline preload="metadata" aria-label="${escape(value(item, 'alt'))}"></video>` : src ? image(src, value(item, 'alt'), true) + details : signal;
  return `<div class="world-preview${details ? ' world-preview--collage' : ''}" data-has-media="${hasMedia}">${media}</div><figcaption class="world-entrance__caption"><h3>${escape(label)}</h3><p>${escape(description)}</p><span class="world-entrance__arrow" aria-hidden="true">⟶</span></figcaption>${item.href ? `<a class="room-piece__link world-entrance__link" href="${escape(item.href)}" aria-label="${escape(label)}"></a>` : ''}`;
}
export function homeContent(item: any) {
  const text = escape(item.text || '');
  const parts = (item.parts || []).map((part: string) => escape(part));
  switch (item.sceneStyle) {
    case 'handle': return `<a class="scrap-handle" href="${escape(item.href || '')}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    case 'archive': return `<p class="scrap-archive">${text}</p>`;
    case 'title': return `<h1 class="scrap-title">${text.split('\n').map(line => `<span>${line}</span>`).join('')}</h1>`;
    case 'signature': return `<div class="scrap-signature">${text}<svg viewBox="0 0 240 48" aria-hidden="true"><path d="M3 39 Q100 8 232 5 M57 38 Q91 27 115 26" /></svg></div>`;
    case 'intro-heading': return `<h2 class="scene-intro-heading">${text}</h2>`;
    case 'intro-body': return `<p class="scene-intro-body">${text}</p>`;
    case 'interest-heading': return `<section class="scrap-interest-heading"><h2>${text}</h2><span>${parts[0] || ''}<b>${parts[1] || ''}</b></span></section>`;
    default: return `<div class="scrap-${item.sceneStyle}">${text}<span>${parts[0] || ''}</span></div>`;
  }
}
export function homeParts(item: any) {
  if (!item.parts || item.sceneStyle || homeWorld(item)) return '';
  return `<div class="scene-caption">${item.parts.map((part: string, index: number) => `<span data-part="${index}">${escape(part)}</span>`).join('')}</div>`;
}
