// HOME presentation presets, not a second scene/editor. All content lives in home.json.
export const homeTextStyles = ['handle','archive','title','signature','intro-heading','intro-body','sky-note','ideas','portal-note','interest-heading'];
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));
const value = (item: any, field: string) => item.overrides?.[field] ?? item[field] ?? (field === 'label' || field === 'alt' ? item.metadata?.title : item.metadata?.[field]) ?? '';

// Derived from existing room manifests, never a second media collection.
export function homeReflectionSources(home: any[], moments: any[]) {
  const photos = moments.filter(item => !item.deleted && item.kind === 'image');
  // The tree beside the water, already part of Moments. Fall back to another
  // current photo when that observation has been removed from the collection.
  const organic = photos.find(item => item.src === '/media/moments/8ab1211304f32cabe911.jpg') || photos[2] || photos[0];
  const game = home.find(item => !item.deleted && item.group === 'games');
  const image = (item: any) => item?.displaySrc || item?.src || item?.metadata?.thumbnail || (item?.kind === 'image' ? item.source : '') || '';
  // Reuse the HOME background's cached lake photograph rather than loading a
  // second large water image just for this small glass surface.
  return { water: '/media/home/life/19781-lake-poster.jpg', organic: image(organic), gaming: game?.metadata?.thumbnail || '' };
}
export const homeMirror = (item: any) => item.group === 'portal' && !item.sceneStyle;
// Every resolved signal leads to an existing world. Shared by the rendered
// mirror and its interaction; this is not another scene or route system.
export const homeMirrorWorlds = [
  { signal: 'moments', name: 'Moments', href: '/moments.html' },
  { signal: 'natural', name: 'Natural', href: '/natural.html' },
  { signal: 'apps', name: 'App World', href: '/world.html' },
  { signal: 'clear', name: 'Clear', href: '/clear.html' },
  { signal: 'gaming', name: 'Gaming', href: '/gaming/' },
] as const;
export const homeMirrorIdleLabel = 'Living portal — reveal a world. Activate again to enter.';
export function homeMirrorContent(item: any, reflections: ReturnType<typeof homeReflectionSources>) {
  const water = item.kind === 'image' ? item.src || item.source || reflections.water : reflections.water;
  const photo = (src: string, name: string) => src ? `<img class="living-mirror__photo living-mirror__photo--${name}" src="${escape(src)}" alt="" loading="lazy" decoding="async" draggable="false" />` : '';
  const tag = item.href ? 'a' : 'button';
  // The reticle is a fragment of CLEAR's perception instrument; the three
  // orbits are the same geometry used by the HOME App World entrance.
  return `<${tag} class="living-mirror" data-living-mirror${item.href ? ` href="${escape(item.href)}"` : ' type="button"'} aria-label="${escape(homeMirrorIdleLabel)}" data-running="false" data-reflection="moments"><span class="living-mirror__depth" aria-hidden="true">${photo(water, 'water')}${photo(reflections.organic, 'organic')}${photo(reflections.gaming, 'gaming')}<span class="living-mirror__geometry living-mirror__geometry--apps"><i class="world-orbit world-orbit--one"></i><i class="world-orbit world-orbit--two"></i><i class="world-orbit world-orbit--three"></i><i class="world-orbit__core"></i></span><svg class="living-mirror__geometry living-mirror__geometry--clear" viewBox="0 0 340 330" fill="none"><circle cx="170" cy="165" r="110" /><path d="M170 35V65M170 265V295M40 165H70M270 165H300" /><circle cx="170" cy="165" r="46" /><path d="M164 154h12m-20 18h12m8 0h12" /></svg></span><span class="living-mirror__silver" aria-hidden="true"></span><span class="living-mirror__glint" aria-hidden="true"></span><span class="living-mirror__readout" aria-hidden="true"></span><span class="living-mirror__announcement" role="status" aria-live="polite" aria-atomic="true"></span></${tag}>`;
}

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
  if (!item.parts || item.sceneStyle || homeWorld(item) || homeMirror(item)) return '';
  return `<div class="scene-caption">${item.parts.map((part: string, index: number) => `<span data-part="${index}">${escape(part)}</span>`).join('')}</div>`;
}
