type Highlight = { id: string; title: string; thumbnail: string; url: string; aspect: number };
type Player = { getCurrentTime(): number; pauseVideo(): void; playVideo(): void; destroy(): void; getIframe(): HTMLIFrameElement };
const data = document.querySelector('[data-gaming-highlights]');
if (data) initGaming(JSON.parse(data.textContent || '[]'));

function initGaming(items: Highlight[]) {
  const rail = document.querySelector<HTMLElement>('[data-highlight-rail]')!;
  const cards = [...rail.querySelectorAll<HTMLElement>('[data-highlight]')];
  const railControls = document.querySelector<HTMLElement>('[data-rail-controls]')!;
  const dialog = document.querySelector<HTMLDialogElement>('[data-highlight-viewer]')!;
  const stage = dialog.querySelector<HTMLElement>('[data-viewer-stage]')!;
  const media = dialog.querySelector<HTMLElement>('[data-viewer-media]')!;
  const title = dialog.querySelector<HTMLElement>('#viewer-title')!;
  const status = dialog.querySelector<HTMLElement>('[data-viewer-status]')!;
  const source = dialog.querySelector<HTMLAnchorElement>('[data-viewer-source]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const positions = new Map<string, number>();
  let active = 0, railIndex = 0, player: Player | undefined, ready = false, generation = 0;
  let api: Promise<any> | undefined;
  let opener: HTMLElement | null = null, savedScroll = 0, savedRail = 0, bodyOverflow = '';
  let timer: ReturnType<typeof setInterval> | undefined;

  function loadAPI() {
    if ((window as any).YT?.Player) return Promise.resolve((window as any).YT);
    if (api) return api;
    api = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const previous = (window as any).onYouTubeIframeAPIReady;
      const fail = () => { clearTimeout(timeout); script.remove(); api = undefined; reject(new Error('YouTube unavailable')); };
      const timeout = setTimeout(fail, 12000);
      (window as any).onYouTubeIframeAPIReady = () => {
        clearTimeout(timeout); previous?.(); resolve((window as any).YT);
      };
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = fail;
      document.head.append(script);
    });
    return api;
  }
  function remember() {
    if (!player || !ready) return;
    const time = player.getCurrentTime();
    if (Number.isFinite(time)) positions.set(items[active].id, time);
  }
  function pause() { remember(); if (ready) player?.pauseVideo(); }
  function stop() {
    generation++; pause(); ready = false;
    player?.destroy(); player = undefined;
    if (timer) clearInterval(timer); timer = undefined;
    media.replaceChildren();
  }
  function resize() {
    const aspect = items[active].aspect;
    const width = Math.min(stage.clientWidth, stage.clientHeight * aspect);
    media.style.width = `${width}px`;
    media.style.height = `${width / aspect}px`;
  }
  new ResizeObserver(resize).observe(stage);

  async function render(index: number) {
    stop(); active = index;
    const token = generation, item = items[active];
    title.textContent = item.title;
    dialog.querySelector('[data-viewer-position]')!.textContent = `${active + 1} / ${items.length}`;
    source.href = item.url;
    dialog.querySelectorAll<HTMLButtonElement>('[data-viewer-step]').forEach(button => {
      button.disabled = Number(button.dataset.viewerStep) < 0 ? active === 0 : active === items.length - 1;
    });
    media.style.backgroundImage = `url("${item.thumbnail}")`;
    media.dataset.aspect = String(item.aspect);
    status.textContent = 'Loading video…'; resize();
    try {
      const YT = await loadAPI();
      if (token !== generation || !dialog.open) return;
      const mount = document.createElement('div'); media.append(mount);
      player = new YT.Player(mount, {
        host: 'https://www.youtube-nocookie.com', width: '100%', height: '100%', videoId: item.id,
        playerVars: { playsinline: 1, autoplay: 1, rel: 0, origin: location.origin, start: Math.floor(positions.get(item.id) || 0) },
        events: {
          onReady: (event: { target: Player }) => {
            if (token !== generation || !dialog.open) { event.target.destroy(); return; }
            ready = true;
            event.target.getIframe().title = item.title;
            status.textContent = '';
            if (document.hidden) event.target.pauseVideo(); else event.target.playVideo();
            timer = setInterval(remember, 500);
          },
          onError: () => { if (token === generation) status.textContent = 'This video can’t play here. Open it on YouTube below.'; },
          onAutoplayBlocked: () => { if (token === generation) status.textContent = 'Tap the video to play.'; }
        }
      });
      const iframe = player!.getIframe();
      iframe.title = item.title;
      iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    } catch {
      if (token === generation && dialog.open) status.textContent = 'YouTube is unavailable here. Use the direct video link below.';
    }
  }
  function indexFromURL() { return items.findIndex(item => item.id === new URL(location.href).searchParams.get('highlight')); }
  function viewerURL(index: number) { const url = new URL(location.href); url.searchParams.set('highlight', items[index].id); return url; }
  function open(index: number, trigger: HTMLElement | null, push = true) {
    if (!dialog.open) {
      opener = trigger || document.activeElement as HTMLElement;
      savedScroll = scrollY; savedRail = rail.scrollLeft; bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden'; dialog.showModal();
    }
    if (push) history.pushState({ ...history.state, gamingViewer: true }, '', viewerURL(index));
    void render(index);
  }
  function closeUI() {
    if (!dialog.open) return;
    stop(); dialog.close(); document.body.style.overflow = bodyOverflow;
    rail.scrollLeft = savedRail;
    opener?.focus({ preventScroll: true });
    window.scrollTo({ top: savedScroll, behavior: 'instant' });
  }
  function close() {
    closeUI();
    if (history.state?.gamingViewer) history.back();
    else { const url = new URL(location.href); url.searchParams.delete('highlight'); history.replaceState(history.state, '', url); }
  }
  function step(delta: number) {
    const next = Math.max(0, Math.min(items.length - 1, active + delta));
    if (next === active) return;
    // One history entry per viewer session; Back always closes it in one step.
    history.replaceState(history.state, '', viewerURL(next));
    void render(next);
  }
  document.querySelectorAll<HTMLAnchorElement>('[data-highlight]').forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); open(Number(link.dataset.highlight), link);
  }));
  dialog.querySelector('[data-viewer-close]')!.addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.querySelectorAll<HTMLElement>('[data-viewer-step]').forEach(button => button.addEventListener('click', () => step(Number(button.dataset.viewerStep))));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  // Narrow touch-only video edges extend the existing matte gesture surface.
  // Cross-origin iframe events cannot bubble; center and bottom stay uncovered.
  let drag: { x: number; y: number; id: number; time: number; vertical: boolean } | undefined;
  dialog.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest('a,button,iframe')) return;
    drag = { x: event.clientX, y: event.clientY, id: event.pointerId, time: performance.now(), vertical: false };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  });
  dialog.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = Math.abs(event.clientX - drag.x), dy = Math.abs(event.clientY - drag.y);
    if (dy > 12 && dy > dx) drag.vertical = true;
  });
  dialog.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.vertical || performance.now() - drag.time > 1000) { drag = undefined; return; }
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y; drag = undefined;
    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
  });
  dialog.addEventListener('pointercancel', () => { drag = undefined; });
  dialog.addEventListener('lostpointercapture', () => { drag = undefined; });
  window.addEventListener('popstate', () => { const index = indexFromURL(); if (index < 0) closeUI(); else open(index, null, false); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', event => { if (event.persisted && dialog.open) void render(active); });

  function updateRail() {
    const left = rail.scrollLeft;
    railIndex = cards.reduce((nearest, card, i) => Math.abs(card.offsetLeft - cards[0].offsetLeft - left) < Math.abs(cards[nearest].offsetLeft - cards[0].offsetLeft - left) ? i : nearest, 0);
    document.querySelector('[data-rail-position]')!.textContent = `${railIndex + 2} / ${items.length}`;
    const fits = rail.scrollWidth <= rail.clientWidth + 1;
    railControls.hidden = fits;
    railControls.querySelectorAll<HTMLButtonElement>('[data-rail-step]').forEach(button => {
      button.disabled = fits || (Number(button.dataset.railStep) < 0 ? left <= 1 : left + rail.clientWidth >= rail.scrollWidth - 1);
    });
  }
  function scrollRail(delta: number, focus = false) {
    const next = cards[Math.max(0, Math.min(cards.length - 1, railIndex + delta))];
    if (focus) next.focus({ preventScroll: true });
    rail.scrollTo({ left: next.offsetLeft - cards[0].offsetLeft, behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  railControls.hidden = false;
  railControls.querySelectorAll<HTMLElement>('[data-rail-step]').forEach(button => button.addEventListener('click', () => scrollRail(Number(button.dataset.railStep))));
  rail.addEventListener('scroll', updateRail, { passive: true });
  new ResizeObserver(updateRail).observe(rail);
  rail.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); scrollRail(event.key === 'ArrowLeft' ? -1 : 1, true); }
  });
  updateRail();
  const initial = indexFromURL();
  if (initial >= 0) {
    // A shared/deep viewer link also gets a same-page base entry, so Back
    // closes the viewer before leaving Gaming. Reload keeps that one entry.
    if (history.state?.gamingViewer) open(initial, null, false);
    else {
      const base = new URL(location.href); base.searchParams.delete('highlight');
      history.replaceState(history.state, '', base); open(initial, null);
    }
  }
}
