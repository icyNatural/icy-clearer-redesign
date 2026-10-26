import { homeMirrorIdleLabel, homeMirrorWorlds } from './home-scene';

// The existing CSS glass effect remains autonomous. Only a resolved world
// becomes an entrance; no router, storage, video or extra network work.
const mirrors = Array.from(document.querySelectorAll<HTMLElement>('[data-living-mirror]'));
const editing = new URLSearchParams(location.search).get('edit') === '1';
if (editing) {
  // Also covers links redrawn by Studio and the interval before it initializes.
  // Let the event propagate so Studio can still select the scene object.
  document.addEventListener('click', event => {
    if ((event.target as Element).closest('[data-living-mirror]')) event.preventDefault();
  }, true);
} else if (mirrors.length) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set<Element>();
  const resets: Array<() => void> = [];
  const update = () => mirrors.forEach(mirror => { mirror.dataset.running = String(visible.has(mirror) && !document.hidden && !reduced.matches); });
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target);
    update();
  }, { threshold: .06 });
  mirrors.forEach(mirror => {
    let next = 0;
    let locked: typeof homeMirrorWorlds[number] | undefined;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    let readoutTimer: ReturnType<typeof setTimeout> | undefined;
    const readout = mirror.querySelector<HTMLElement>('.living-mirror__readout')!;
    const announcement = mirror.querySelector<HTMLElement>('.living-mirror__announcement')!;
    // Studio can pin a matching visual by linking one of the five worlds.
    // Preserve other authored links in the scene; only known worlds enter the cycle.
    const authoredHref = mirror.getAttribute('href');
    const authoredWorld = homeMirrorWorlds.find(world => authoredHref === world.href);
    const reset = () => {
      clearTimeout(resetTimer); clearTimeout(readoutTimer);
      locked = undefined;
      delete mirror.dataset.resolved; delete mirror.dataset.destination;
      readout.textContent = ''; announcement.textContent = '';
      mirror.setAttribute('aria-label', homeMirrorIdleLabel);
    };
    const activate = () => {
      if (locked) {
        // Full document navigation preserves native browser Back behavior.
        location.assign(locked.href);
        return;
      }
      locked = authoredWorld || homeMirrorWorlds[next++ % homeMirrorWorlds.length];
      mirror.dataset.reflection = locked.signal;
      mirror.dataset.destination = locked.href;
      mirror.dataset.resolved = 'true';
      readout.textContent = `SIGNAL FOUND\n${locked.name.toUpperCase()}`;
      mirror.setAttribute('aria-label', `Living portal — current destination ${locked.name}. Activate to enter.`);
      announcement.textContent = `${locked.name} found. Activate again to enter.`;
      const showEntrance = () => { if (locked) readout.textContent = `${locked.name.toUpperCase()}\nENTER →`; };
      if (reduced.matches) showEntrance();
      else readoutTimer = setTimeout(showEntrance, 900);
      resetTimer = setTimeout(reset, 15000);
    };
    mirror.addEventListener('click', event => { event.preventDefault(); activate(); });
    mirror.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      // Buttons and Studio-authored anchors use the same two stages. Prevent
      // native synthetic clicks, repeated-key navigation and Space scrolling.
      event.preventDefault();
      if (!event.repeat) activate();
    });
    resets.push(reset);
    observer.observe(mirror);
    mirror.dataset.portalReady = 'true';
  });
  reduced.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  addEventListener('pagehide', () => { resets.forEach(reset => reset()); mirrors.forEach(mirror => { mirror.dataset.running = 'false'; }); });
  addEventListener('pageshow', event => { if (event.persisted) resets.forEach(reset => reset()); update(); });
}
