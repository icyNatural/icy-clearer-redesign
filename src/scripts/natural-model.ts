// Shared by static rendering, the visitor field, and Local Studio.
export const signals = [
  { id: 'PLAY', label: 'PLAY', note: 'gaming · basketball · movement · compete' },
  { id: 'VOICE', label: 'VOICE', note: 'music · rap · bars · lyrics · sound' },
  { id: 'OBSERVE', label: 'OBSERVE', note: 'photography · nature · moments · notice' },
  { id: 'ARCHIVE', label: 'ARCHIVE', note: 'childhood · diaries · notes · early versions' },
  { id: 'MAKE', label: 'MAKE', note: 'drawing · clothing · software · experiments' },
  { id: 'NOW', label: 'NOW', note: 'current work · recent media · in progress' },
];
export const isNaturalArtifact = (item: any) => !item.deleted && item.kind !== 'native';
export const publicArtifact = (item: any) => isNaturalArtifact(item) && item.kind !== 'placeholder' && item.curated !== false && (!item.visibility || item.visibility === 'public');
export function artifactSignals(item: any): string[] {
  const fallback = item.group === 'play-other' ? ['OBSERVE', 'NOW'] : item.group?.startsWith('play-') ? ['PLAY', 'NOW'] : ['NOW'];
  return [...new Set<string>(Array.isArray(item.signals) && item.signals.length ? item.signals.map((id: string) => String(id).toUpperCase()).filter((id: string) => signals.some(signal => signal.id === id)) : fallback)];
}
export const artifactTitle = (item: any) => item.overrides?.title || item.metadata?.title || item.title || item.text || 'Untitled signal';
export const orderedArtifacts = (items: any[]) => [...items].sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || (a.playOrder ?? 1000) - (b.playOrder ?? 1000));
const escape = (value: any) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const safeUrl = (value: any) => typeof value === 'string' && (/^\/(?!\/)/.test(value) || /^https?:\/\//i.test(value)) ? escape(value) : '';
export function artifactAspect(item: any): number {
  const ratio = Number(item.metadata?.aspect || (item.pixelWidth && item.pixelHeight ? item.pixelWidth / item.pixelHeight : 0));
  return Number.isFinite(ratio) && ratio > 0 && ratio <= 20 ? ratio : item.kind === 'video' || item.kind === 'youtube' ? 16 / 9 : 1;
}
export function artifactMarkup(item: any, signal: string) {
  const tags = artifactSignals(item);
  const primary = tags[0] === signal;
  const title = escape(artifactTitle(item));
  const alt = escape(item.overrides?.alt || item.metadata?.title || item.overrides?.title || 'Natural artifact');
  const poster = safeUrl(item.metadata?.thumbnail);
  const src = safeUrl(item.kind === 'image' ? item.displaySrc || item.src || item.source : item.metadata?.thumbnail);
  const href = safeUrl(item.href || (item.kind === 'youtube' ? item.metadata?.canonicalUrl || item.source : item.kind === 'video' ? item.src || item.source : ''));
  const link = (content: string) => href ? `<a href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${content}</a>` : content;
  const aspect = artifactAspect(item);
  const preview = src ? `<img src="${src}" alt="${alt}" loading="lazy" decoding="async" draggable="false" />` : `<span class="artifact-video-label">${title}</span>`;
  const play = '<span class="artifact-play" aria-hidden="true">▶</span>';
  let media = '';
  if (item.kind === 'text') media = `<div class="artifact-text"><span>${escape(item.text || artifactTitle(item))}</span></div>`;
  else if (item.kind === 'placeholder') media = `<div class="signal-empty"><small>${title}</small></div>`;
  // Contextual appearances are previews, including the primary appearance.
  // Native playback is mounted only by a deliberate press. YouTube retains
  // its existing canonical-link behavior instead of loading six embed players.
  else if (item.kind === 'video') media = `<div class="artifact-preview"><button type="button" class="artifact-video-preview" data-play-natural-video="${safeUrl(item.src || item.source)}"${poster ? ` data-poster="${poster}"` : ''} aria-label="Play ${title}">${preview}${play}</button></div>`;
  else if (item.kind === 'youtube') media = `<div class="artifact-preview"><a class="artifact-video-preview" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="Play ${title}">${preview}${play}</a></div>`;
  else if (src) media = `<div class="artifact-preview">${link(preview)}</div>`;
  else media = link(`<div class="artifact-text"><span>${title}</span></div>`);
  const note = escape(item.overrides?.description || item.description || item.metadata?.description || '');
  const time = escape(item.temporal || item.date || item.era || '');
  return `<figure class="signal-artifact${item.kind === 'text' ? ' signal-artifact--text' : ''}${!publicArtifact(item) ? ' signal-artifact--private' : ''}" ${primary ? 'data-author-id' : 'data-artifact-ref'}="${escape(item.id)}" data-signals="${tags.join(' ')}" data-artifact-kind="${escape(item.kind)}" data-media-shape="${aspect < .9 ? 'portrait' : aspect > 1.1 ? 'landscape' : 'square'}" style="--artifact-aspect:${aspect}">${media}<figcaption><details><summary><strong>${title}</strong><span>${tags.join(' · ')}</span></summary><div class="artifact-depth">${note ? `<p>${note}</p>` : ''}${time ? `<p>${time}</p>` : ''}${href ? `<a href="${href}">Open artifact ↗</a>` : ''}</div></details></figcaption></figure>`;
}
