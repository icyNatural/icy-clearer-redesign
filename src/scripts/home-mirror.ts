// No canvas, video, frame loop, storage or network requests. CSS moves a few
// existing images; the observer stops that work outside the viewport.
const mirrors = Array.from(document.querySelectorAll<HTMLElement>('[data-living-mirror]'));
const editing = new URLSearchParams(location.search).get('edit') === '1';
if (mirrors.length && !editing) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set<Element>();
  const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
  const signals = ['moments', 'natural', 'apps', 'clear', 'gaming'];
  const names: Record<string, string> = { moments: 'MOMENTS', natural: 'NATURAL', apps: 'APP WORLD', clear: 'CLEAR', gaming: 'GAMING' };
  const update = () => mirrors.forEach(mirror => { mirror.dataset.running = String(visible.has(mirror) && !document.hidden && !reduced.matches); });
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target);
    update();
  }, { threshold: .06 });
  mirrors.forEach(mirror => {
    let next = 0;
    mirror.addEventListener('click', () => {
      // A configured Studio destination is an ordinary link. The default
      // mirror has no destination: a tap only resolves a reflection in place.
      const reflection = signals[next++ % signals.length];
      mirror.dataset.reflection = reflection;
      mirror.dataset.resolved = 'true';
      mirror.querySelector<HTMLElement>('.living-mirror__readout')!.textContent = `SIGNAL FOUND / ${names[reflection]}`;
      mirror.querySelector<HTMLElement>('.living-mirror__announcement')!.textContent = `Reflecting ${names[reflection]}.`;
      clearTimeout(timers.get(mirror));
      timers.set(mirror, setTimeout(() => { delete mirror.dataset.resolved; timers.delete(mirror); }, 2600));
    });
    observer.observe(mirror);
  });
  reduced.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  addEventListener('pagehide', () => { timers.forEach(clearTimeout); timers.clear(); mirrors.forEach(mirror => { mirror.dataset.running = 'false'; delete mirror.dataset.resolved; }); });
  addEventListener('pageshow', update);
}
