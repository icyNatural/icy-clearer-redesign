// Clearance for the authored canvas, not another layout or Studio scene.
// Font floors stop scaling before the artwork does. Measure that difference
// rather than compensating with unrelated heights at individual breakpoints.
const paper = document.querySelector<HTMLElement>('.home-scrapbook');
if (paper) {
  const scene = paper.querySelector<HTMLElement>('[data-media-room="home"]')!;
  const mobile = matchMedia('(max-width:700px)');
  const properties = ['--home-hero-clearance', '--home-media-clearance', '--home-card-height', '--home-card-growth', '--home-archive-width'];
  let scheduled = false;
  const layout = () => {
    scheduled = false;
    if (!mobile.matches || document.body.classList.contains('is-authoring')) {
      properties.forEach(name => paper.style.removeProperty(name));
      return;
    }
    const archive = scene.querySelector<HTMLElement>('.scrap-archive');
    const title = scene.querySelector<HTMLElement>('.scrap-title');
    const body = scene.querySelector<HTMLElement>('.scene-intro-body');
    const games = scene.querySelector<HTMLElement>('[data-role="games"]');
    const sky = scene.querySelector<HTMLElement>('[data-role="sky"]');
    const cards = [...scene.querySelectorAll<HTMLElement>('.home-world-entrance')];
    if (!archive || !title || !body || !games || !cards.length) return;
    const previous = (name: string) => parseFloat(paper.style.getPropertyValue(name)) || 0;
    const heroBefore = previous(properties[0]);
    const mediaBefore = previous(properties[1]);
    const gap = Math.max(14, paper.clientWidth * .035);
    if (sky) {
      const available = sky.getBoundingClientRect().left - archive.getBoundingClientRect().left - gap / 2;
      paper.style.setProperty('--home-archive-width', `${Math.max(paper.clientWidth * .25, Math.min(paper.clientWidth * .33, available))}px`);
    }
    const hero = Math.max(0, archive.getBoundingClientRect().bottom + gap - (title.getBoundingClientRect().top - heroBefore));
    const media = Math.max(0, body.getBoundingClientRect().bottom - heroBefore + gap - (games.getBoundingClientRect().top - heroBefore - mediaBefore));
    // The shared desktop component allocates 58% to media / 42% to caption.
    // Give every caption enough room for its actual wrapping, then solve the
    // total card height from that ratio. Titles, copy and arrow cannot collide.
    const captionHeight = Math.max(...cards.map(card => {
      const caption = card.querySelector<HTMLElement>('.world-entrance__caption')!;
      const style = getComputedStyle(caption);
      return caption.querySelector('h3')!.getBoundingClientRect().height
        + caption.querySelector('p')!.getBoundingClientRect().height
        + parseFloat(style.rowGap) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    }));
    const height = Math.ceil(captionHeight / .42);
    const growth = Math.max(0, ...cards.map(card => height - parseFloat(card.style.getPropertyValue('--dh')) / 100 * scene.clientHeight));
    [hero, media, height, growth].forEach((value, i) => paper.style.setProperty(properties[i], `${Math.ceil(value)}px`));
  };
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(layout); } };
  new ResizeObserver(schedule).observe(paper);
  new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener('loadingdone', schedule);
  mobile.addEventListener('change', schedule);
  layout();
}
