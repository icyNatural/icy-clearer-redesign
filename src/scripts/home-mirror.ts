import { homeMirrorIdleLabel, homeMirrorWorlds } from './home-scene';

const editing = new URLSearchParams(location.search).get('edit') === '1';
const mirrors = Array.from(document.querySelectorAll<HTMLElement>('[data-living-mirror]'));
if (editing) {
  // Cover Studio redraws without consuming its selection/manipulation events.
  document.addEventListener('click', event => {
    if ((event.target as Element).closest('[data-living-mirror]')) event.preventDefault();
  }, true);
  document.addEventListener('keydown', event => {
    if (['Enter', ' '].includes(event.key) && (event.target as Element).closest('[data-living-mirror]')) event.preventDefault();
  }, true);
} else if (mirrors.length) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  mirrors.forEach(mirror => {
    const readout = mirror.querySelector<HTMLElement>('.living-mirror__readout')!;
    const announcement = mirror.querySelector<HTMLElement>('.living-mirror__announcement')!;
    // An authored known link chooses the starting world, not a permanent lock.
    const authored = homeMirrorWorlds.findIndex(world => world.href === mirror.getAttribute('href'));
    let index = Math.max(0, authored);
    let stable = false;
    let visible = false;
    let away = false;
    let hovered = false;
    let focused = false;
    let pointer: number | null = null;
    let pressDestination: string | null = null;
    let suppressClick = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let remaining = 1300;
    let deadline = 0;
    const world = () => homeMirrorWorlds[index];
    const held = () => hovered || focused || pointer !== null;
    const blocked = () => away || !visible || document.hidden || (stable && held());
    const stop = () => {
      if (timer !== undefined) {
        remaining = Math.max(0, deadline - performance.now());
        clearTimeout(timer); timer = undefined;
      }
    };
    const schedule = () => {
      stop();
      mirror.dataset.running = String(!blocked() && !held() && !reduced.matches);
      if (blocked()) return;
      deadline = performance.now() + remaining;
      timer = setTimeout(() => {
        timer = undefined;
        if (stable) { index = (index + 1) % homeMirrorWorlds.length; resolve(); }
        else settle();
      }, remaining);
    };
    const settle = () => {
      stable = true;
      mirror.dataset.phase = 'stable';
      mirror.dataset.destination = world().href;
      mirror.removeAttribute('aria-disabled');
      mirror.setAttribute('aria-label', `Living portal — ${world().name} — enter`);
      readout.textContent = `${world().name.toUpperCase()}\nENTER →`;
      // Avoid announcing an endless carousel to screen readers while unfocused.
      announcement.textContent = focused ? `${world().name}. Enter to visit.` : '';
      remaining = 5500;
      schedule();
    };
    const resolve = () => {
      stable = false;
      mirror.dataset.resolved = 'true';
      mirror.dataset.phase = 'resolving';
      mirror.dataset.reflection = world().signal;
      delete mirror.dataset.destination;
      mirror.setAttribute('aria-disabled', 'true');
      mirror.setAttribute('aria-label', homeMirrorIdleLabel);
      readout.textContent = 'RESOLVING';
      announcement.textContent = '';
      remaining = reduced.matches ? 0 : 1300;
      schedule();
    };
    const activate = (href: string | null = stable ? world().href : null) => {
      if (stable && href === world().href) location.assign(href);
    };
    mirror.addEventListener('click', event => {
      event.preventDefault();
      if (!suppressClick) activate(pressDestination || (stable ? world().href : null));
      suppressClick = false; pressDestination = null;
    });
    mirror.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; schedule(); } });
    mirror.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') { hovered = false; schedule(); } });
    mirror.addEventListener('focus', () => { focused = true; schedule(); });
    mirror.addEventListener('blur', () => { focused = false; announcement.textContent = ''; schedule(); });
    mirror.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      pointer = event.pointerId;
      pressDestination = stable ? world().href : null;
      suppressClick = !stable;
      schedule();
    });
    const release = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      pointer = null;
      if (event.type === 'pointercancel') { suppressClick = true; pressDestination = null; }
      // Give the associated click and the visitor a complete hold after release.
      if (stable) { stop(); remaining = 5500; }
      schedule();
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    mirror.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      if (!event.repeat) activate();
    });
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      schedule();
    }, { threshold: .06 });
    observer.observe(mirror);
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', () => { stop(); if (!stable && reduced.matches) settle(); else schedule(); });
    addEventListener('pagehide', () => { away = true; schedule(); });
    addEventListener('pageshow', event => {
      away = false;
      if (event.persisted) { stop(); pointer = null; pressDestination = null; suppressClick = false; remaining = stable ? 5500 : 1300; }
      schedule();
    });
    resolve();
    mirror.dataset.portalReady = 'true';
  });
}