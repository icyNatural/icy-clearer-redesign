import { homeMirrorIdleLabel, homeMirrorWorlds } from './home-scene';

const editing = new URLSearchParams(location.search).get('edit') === '1';
const mirrors = Array.from(document.querySelectorAll<HTMLElement>('[data-living-mirror]'));

if (editing) {
  // Local Studio owns selection/manipulation while authoring.
  document.addEventListener('click', event => {
    if ((event.target as Element).closest('[data-living-mirror]')) event.preventDefault();
  }, true);
  document.addEventListener('keydown', event => {
    if (['Enter', ' '].includes(event.key) && (event.target as Element).closest('[data-living-mirror]')) event.preventDefault();
  }, true);
} else if (mirrors.length) {
  const destination = homeMirrorWorlds[0];

  mirrors.forEach(mirror => {
    const readout = mirror.querySelector<HTMLElement>('.living-mirror__readout')!;
    const announcement = mirror.querySelector<HTMLElement>('.living-mirror__announcement')!;

    mirror.dataset.running = 'false';
    mirror.dataset.resolved = 'true';
    mirror.dataset.phase = 'stable';
    mirror.dataset.reflection = destination.signal;
    mirror.dataset.destination = destination.href;
    mirror.dataset.portalReady = 'true';
    mirror.removeAttribute('aria-disabled');
    mirror.setAttribute('href', destination.href);
    mirror.setAttribute('aria-label', homeMirrorIdleLabel);
    readout.textContent = `${destination.name.toUpperCase()}\nENTER →`;

    mirror.addEventListener('focus', () => {
      announcement.textContent = `${destination.name}. Enter to visit.`;
    });
    mirror.addEventListener('blur', () => {
      announcement.textContent = '';
    });

    mirror.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      if (!event.repeat) location.assign(destination.href);
    });
  });
}
