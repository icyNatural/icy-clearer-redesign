// Content stays in the existing manifest; only a bounded neighborhood is mounted.
export function createObservatory(items: any[], enter: (index: number) => void) {
  const shell = document.querySelector<HTMLElement>('.observatory-shell')!;
  const stage = shell.querySelector<HTMLElement>('.observatory')!;
  const photos = shell.querySelector<HTMLElement>('.observatory-photos')!;
  const count = shell.querySelector<HTMLElement>('[data-orbit-count]')!;
  const title = shell.querySelector<HTMLElement>('[data-orbit-title]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const wrap = (n: number) => (n % items.length + items.length) % items.length;
  const value = (item: any, field: string) => item.overrides?.[field] ?? item[field] ?? item.metadata?.[field] ?? '';
  let position = 0, target = 0, frame = 0, active = -1, suppressClick = false, restorePhotoFocus = false;
  let drag: { id: number; x: number; y: number; start: number; last: number; time: number; velocity: number; horizontal: boolean; vertical: boolean } | null = null;
  const nodes = new Map<number, HTMLButtonElement>();
  const initial = items.findIndex(item => item.id === history.state?.momentSelection);
  position = target = initial >= 0 ? initial : Math.max(0, items.findIndex(item => item.featured));
  shell.hidden = !items.length; document.body.classList.add('has-observatory');
  shell.querySelector('[data-orbit-total]')!.textContent = `${String(items.length).padStart(2, '0')} CAPTURES`;
  shell.querySelectorAll<HTMLButtonElement>('[data-orbit]').forEach(button => {
    button.disabled = !items.length || (items.length < 2 && button.dataset.orbit !== 'enter');
    button.addEventListener('click', () => { if (button.dataset.orbit === 'enter') enter(wrap(Math.round(target))); else select(Math.round(target) + (button.dataset.orbit === 'next' ? 1 : -1)); });
  });
  function draw() {
    if (!items.length) return;
    const center = Math.round(position), selected = wrap(center), visible = new Map<number, number>();
    const slots = Math.min(items.length, 9), start = -Math.floor(slots / 2);
    for (let offset = start; offset < start + slots; offset++) visible.set(wrap(center + offset), center + offset);
    for (const [index, node] of nodes) if (!visible.has(index)) { node.remove(); nodes.delete(index); }
    const width = stage.clientWidth, height = stage.clientHeight, mobile = width < 700;
    const radius = width * (mobile ? .51 : .38), depth = height * .29, spacing = 2 * Math.PI / Math.max(7, slots);
    for (const [index, unwrapped] of visible) {
      const item = items[index]; let node = nodes.get(index);
      if (!node) {
        node = document.createElement('button'); node.type = 'button'; node.className = 'orbit-photo'; node.dataset.momentOpen = item.id;
        const img = new Image(); img.loading = index === selected ? 'eager' : 'lazy'; img.src = item.displaySrc || item.src; img.alt = value(item, 'alt') || value(item, 'title'); img.decoding = 'async'; img.draggable = false;
        node.append(img); photos.append(node); nodes.set(index, node);
        node.addEventListener('click', () => { if (suppressClick) return; if (index === wrap(Math.round(target))) enter(index); else select(Math.round(target) + shortest(index - wrap(Math.round(target)))); });
      }
      const angle = (unwrapped - position) * spacing, front = (Math.cos(angle) + 1) / 2, scale = .34 + .66 * Math.pow(front, 2);
      const aspect = item.metadata?.aspect || (item.pixelWidth / item.pixelHeight) || 1.5;
      const maxWidth = width * (mobile ? .68 : .36), maxHeight = height * .66;
      const h = Math.min(maxHeight, maxWidth / aspect), w = h * aspect;
      node.style.width = `${w}px`; node.style.height = `${h}px`;
      node.style.transform = `translate(-50%,-50%) translate(${Math.sin(angle) * radius}px,${Math.cos(angle) * depth}px) scale(${scale}) rotate(${Math.sin(angle) * -5}deg)`;
      node.style.zIndex = String(Math.round(front * 100)); node.style.filter = `brightness(${.5 + front * .5})`;
      node.setAttribute('aria-current', String(index === selected));
      node.setAttribute('aria-label', `${index === selected ? 'Enter' : 'Select'} moment ${index + 1} of ${items.length}${value(item, 'title') ? `: ${value(item, 'title')}` : ''}`);
      node.tabIndex = index === selected ? 0 : -1;
    }
    if (active !== selected) { active = selected; count.textContent = `${String(selected + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`; title.textContent = value(items[selected], 'title') || value(items[selected], 'label'); }
  }
  function shortest(delta: number) { return delta - Math.round(delta / items.length) * items.length; }
  function remember() { if (items.length) history.replaceState({ ...history.state, momentSelection: items[wrap(Math.round(target))].id }, ''); }
  function tick() {
    frame = 0; position += (target - position) * .16;
    if (Math.abs(target - position) < .001) position = target;
    draw();
    if (position !== target) frame = requestAnimationFrame(tick);
    else if (restorePhotoFocus) { nodes.get(wrap(Math.round(target)))?.focus({ preventScroll: true }); restorePhotoFocus = false; }
  }
  function select(index: number, animate = true) {
    if (!items.length) return;
    target = Math.round(target) + shortest(wrap(index) - wrap(Math.round(target)));
    if (!animate || reduced.matches) { cancelAnimationFrame(frame); frame = 0; position = target; draw(); }
    else if (!frame) frame = requestAnimationFrame(tick);
    remember();
  }
  stage.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      // Virtualization must not remove the keyboard's focused node mid-rotation.
      restorePhotoFocus = event.target !== stage || restorePhotoFocus;
      if (restorePhotoFocus) stage.focus({ preventScroll: true });
      select(Math.round(target) + (event.key === 'ArrowRight' ? 1 : -1));
      if (reduced.matches && restorePhotoFocus) { nodes.get(wrap(Math.round(target)))?.focus({ preventScroll: true }); restorePhotoFocus = false; }
    }
    if (event.key === 'Enter' && event.target === stage && items.length) enter(wrap(Math.round(target)));
  });
  stage.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || items.length < 2) return;
    cancelAnimationFrame(frame); frame = 0; suppressClick = false;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: position, last: event.clientX, time: performance.now(), velocity: 0, horizontal: false, vertical: false };
  });
  stage.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id || drag.vertical) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.horizontal && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag.vertical = true; return; }
    if (!drag.horizontal && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) { drag.horizontal = true; stage.setPointerCapture(event.pointerId); suppressClick = true; }
    if (!drag.horizontal) return;
    const now = performance.now(); drag.velocity = (event.clientX - drag.last) / Math.max(8, now - drag.time); drag.last = event.clientX; drag.time = now;
    position = target = drag.start - dx / Math.max(100, stage.clientWidth * .3); draw();
  });
  function release(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return;
    const g = drag; drag = null;
    if (g.horizontal) {
      const coast = reduced.matches || performance.now() - g.time > 100 ? 0 : Math.max(-.65, Math.min(.65, -g.velocity * .24));
      target = Math.round(position + coast); remember();
      if (reduced.matches) { position = target; draw(); } else if (!frame) frame = requestAnimationFrame(tick);
      setTimeout(() => { suppressClick = false; }, 0);
    }
  }
  stage.addEventListener('pointerup', release); stage.addEventListener('pointercancel', release);
  // Touch starts with implicit capture on the photo. Transferring it to the
  // stage emits a bubbling loss on that photo; it is not the end of the drag.
  stage.addEventListener('lostpointercapture', event => { if (event.target === stage) release(event); });
  let wheel = 0, wheelTime = 0;
  stage.addEventListener('wheel', event => {
    // Horizontal trackpad movement only: never hijack vertical page scrolling or zoom.
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || event.ctrlKey || items.length < 2) return;
    event.preventDefault(); const now = performance.now(); if (now - wheelTime > 180) wheel = 0;
    wheelTime = now; wheel += event.deltaX;
    if (Math.abs(wheel) > 50) { select(Math.round(target) + Math.sign(wheel)); wheel = 0; }
  }, { passive: false });
  new ResizeObserver(draw).observe(stage); draw();
  return { select, focus: () => nodes.get(wrap(Math.round(target)))?.focus({ preventScroll: true }) };
}