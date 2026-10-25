// HOME presentation presets, not a second scene/editor. All content lives in home.json.
export const homeTextStyles = ['handle','archive','title','signature','intro-heading','intro-body','sky-note','ideas','portal-note','interest-heading'];
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));
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
  if (!item.parts || item.sceneStyle) return '';
  return `<div class="scene-caption">${item.parts.map((part: string, index: number) => `<span data-part="${index}">${escape(part)}</span>`).join('')}</div>`;
}