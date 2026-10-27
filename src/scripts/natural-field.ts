import { signals, artifactSignals, publicArtifact, isNaturalArtifact, orderedArtifacts, artifactMarkup } from './natural-model';
export { artifactSignals, isNaturalArtifact } from './natural-model';
let fieldItems: any[] = [];
let active = 'ALL';
let limit = 24;
function renderField() {
  const root = document.querySelector<HTMLElement>('[data-natural-field]');
  if (!root) return;
  const editing = document.body.classList.contains('is-authoring');
  const items = orderedArtifacts(fieldItems.filter(editing ? isNaturalArtifact : publicArtifact));
  root.dataset.activeSignal = active;
  root.querySelectorAll<HTMLElement>('[data-signal-select]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.signalSelect === active)));
  root.querySelectorAll<HTMLElement>('[data-signal-cluster]').forEach(cluster => {
    const signal = cluster.dataset.signalCluster!;
    cluster.hidden = !editing && active !== 'ALL' && active !== signal;
    cluster.classList.toggle('is-active', active === signal);
    const members = items.filter(item => artifactSignals(item).includes(signal));
    const count = editing ? members.length : active === signal ? limit : 4;
    const stream = cluster.querySelector<HTMLElement>('.signal-artifacts')!;
    stream.innerHTML = members.slice(0, count).map(item => artifactMarkup(item, signal)).join('') || `<div class="signal-empty"><span>${signal}</span><small>FORMING</small></div>`;
    cluster.querySelector('.signal-more')?.remove();
    if (!editing && active === signal && members.length > count) {
      const more = document.createElement('button'); more.type = 'button'; more.className = 'signal-more'; more.textContent = 'Surface more ↓';
      more.addEventListener('click', () => { limit += 24; renderField(); }); cluster.append(more);
    }
  });
  const count = root.querySelector('[data-natural-count]');
  if (count) count.textContent = `${items.filter(publicArtifact).length} artifacts`;
}
// Studio renders the same field, including draft/private pieces. No overlay copy.
export function layoutNaturalField(_canvas: HTMLElement, items: any[]) { fieldItems = items; renderField(); }
const root = document.querySelector<HTMLElement>('[data-natural-field]');
if (root) {
  fieldItems = JSON.parse(document.querySelector('[data-natural-content]')?.textContent || '[]');
  const activate = (requested: string, push = true) => {
    active = requested === 'ALL' || signals.some(signal => signal.id === requested) ? requested : 'ALL';
    limit = 24; renderField();
    if (push) {
      const url = new URL(location.href);
      if (active === 'ALL') url.searchParams.delete('signal'); else url.searchParams.set('signal', active.toLowerCase());
      history.pushState({ naturalSignal: active }, '', url);
    }
  };
  root.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLElement>('[data-signal-select]');
    if (button) { event.stopPropagation(); activate(button.dataset.signalSelect || 'ALL'); return; }
    if (document.body.classList.contains('is-authoring') || target.closest('a,button,video,figure')) return;
    const cluster = target.closest<HTMLElement>('[data-signal-cluster]');
    if (cluster) activate(cluster.dataset.signalCluster || 'ALL');
  });
  window.addEventListener('popstate', () => activate(new URL(location.href).searchParams.get('signal')?.toUpperCase() || 'ALL', false));
  document.addEventListener('visibilitychange', () => { if (document.hidden) root.querySelectorAll('video').forEach(video => video.pause()); });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) (entry.target as HTMLVideoElement).pause(); }), { threshold: .05 });
  const observeVideos = () => { observer.disconnect(); root.querySelectorAll('video').forEach(video => observer.observe(video)); };
  new MutationObserver(observeVideos).observe(root.querySelector('.signal-grid')!, { childList: true, subtree: true });
  activate(new URL(location.href).searchParams.get('signal')?.toUpperCase() || 'ALL', false);
  observeVideos();
}
