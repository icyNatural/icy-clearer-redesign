import '../styles/local-author.css';
import { applyNative, nativeTextNodes, naturalTemplate, renderNaturalObjects } from './natural-objects';
import { homeContent, homeParts } from './home-scene';

// This module is requested only by the dev-only author component branch.
if (new URLSearchParams(location.search).get('edit') === '1') start();
function start() {
  const canvas = document.querySelector<HTMLElement>('[data-media-room]');
  if (!canvas) return;
  const room = canvas.dataset.mediaRoom!;
  const source = document.querySelector(`[data-author-manifest="${room}"]`);
  let items: any[] = JSON.parse(source?.textContent || '[]');
  if (room === 'natural') renderNaturalObjects(items);
  let selected: HTMLElement | null = null;
  let dirty = false;
  let replacing = false;
  let saving = false;
  let uploading = false;
  let breakpoint = innerWidth <= 700 ? 'mobile' : 'desktop';
  let pending: any = null;
  let insertion: { x: number; y: number } | null = null;
  const history: string[] = [JSON.stringify(items)];
  let historyIndex = 0;
  let inputStart: string | null = null;
  document.body.classList.add('is-authoring');
  const panel = document.createElement('aside');
  panel.className = 'author-panel';
  panel.setAttribute('aria-label', 'Local media editor');
  panel.innerHTML = `<div class="author-top"><strong>LOCAL STUDIO</strong><a href="${location.pathname}">Exit</a></div>
    <nav aria-label="Edit room"><a href="/?edit=1">Home</a><a href="/natural.html?edit=1">Natural</a><a href="/worlds.html?edit=1">Two Worlds</a><a href="/clear.html?edit=1">Clear</a></nav>
    <div class="author-actions"><button data-action="add">+ ADD MEDIA</button><button data-action="text">+ TEXT</button><button data-action="save">SAVE</button></div>
    <div class="author-actions"><button data-action="undo" disabled>Undo</button><button data-action="redo" disabled>Redo</button></div>
    <div class="author-source-flow" hidden><div class="author-actions"><button data-action="file">FILE</button><button data-action="url">URL</button><button data-action="cancel-source">Cancel</button></div><div class="author-url-flow" hidden><label>MEDIA SOURCE <input data-source-url placeholder="https://… or /media/…" /></label><button data-action="fetch">FETCH</button><div class="author-source-preview" aria-live="polite"></div><button data-action="accept-source" hidden>ADD</button></div></div>
    <p class="author-status" role="status" aria-live="polite">Select a piece or add a file · ${breakpoint} layout</p>
    <div class="author-selection" hidden><div class="author-actions"><button data-action="replace">Replace</button><button data-action="duplicate">Duplicate</button><button data-action="delete">Delete</button><button data-action="back">Back ↓</button><button data-action="front">Front ↑</button></div>
    <div class="author-text-controls" hidden><label>Text <textarea data-field="text" maxlength="500"></textarea></label><label>Text size <input data-field="textSize" type="range" min="12" max="120" /></label><div class="author-row"><select data-field="font" aria-label="Text font"><option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option><option value="handwriting">Handwriting-style</option></select><select data-field="color" aria-label="Text color"><option value="dark">Dark</option><option value="light">Light</option><option value="icy">Icy</option></select><select data-field="align" aria-label="Text alignment"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div></div>
    <label>Image fitting <select data-field="fit"><option value="cover">FILL</option><option value="contain">FIT</option></select></label>
    <label>Size <input data-field="size" type="range" min="5" max="100" /></label>
    <div class="author-row"><label>Shape <select data-field="shape"><option value="rectangle">Rectangle</option><option value="arch">Arch</option><option value="round">Round</option><option value="organic">Organic</option></select></label><label>Aspect <select data-field="aspect"><option value="free">Free</option><option value="1">Square</option><option value="0.75">Portrait</option><option value="1.7778">Wide</option></select></label></div>
    <label>Crop ↔ <input data-field="cropX" type="range" min="0" max="100" /></label><label>Crop ↕ <input data-field="cropY" type="range" min="0" max="100" /></label>
    <label>Tilt <input data-field="rotation" type="range" min="-30" max="30" /></label>
    <label>SOURCE <input data-field="source" placeholder="URL or /media/…" /></label><div class="author-actions"><button data-action="apply-source">FETCH SOURCE</button><button data-action="refresh-metadata">REFRESH METADATA</button></div>
    ${['title','description','alt','label'].map(field => `<label>${field.toUpperCase()} <button type="button" data-auto="${field}" aria-label="Reset ${field} to auto">AUTO</button><input data-field="${field}" maxlength="${field === 'description' ? 5000 : 500}" /></label>`).join('')}
    <label>LINK <input data-field="href" placeholder="Optional click destination" /></label><label>CATEGORY / ROLE <input data-field="group" maxlength="200" placeholder="hero, highlight, process…" /></label></div>
    <small>Drag to move · corner to resize · arrows to nudge.<br>Phone and desktop positions save separately. Files ≤23 MB.</small>`;
  document.body.append(panel);
  const picker = document.createElement('input');
  picker.type = 'file'; picker.accept = '.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm'; picker.multiple = true; picker.hidden = true;
  document.body.append(picker);
  const addSpot = document.createElement('button');
  addSpot.className = 'author-add-spot'; addSpot.textContent = '+ ADD MEDIA';
  addSpot.addEventListener('click', () => { if (saving || uploading) return; replacing = false; openSource(); });
  canvas.append(addSpot);
  const status = (text: string) => { panel.querySelector('.author-status')!.textContent = text; };
  const mark = () => { dirty = true; status(`Unsaved · ${breakpoint} layout`); };
  function checkpoint() {
    const snapshot = JSON.stringify(items);
    if (snapshot === history[historyIndex]) return;
    history.splice(historyIndex + 1); history.push(snapshot);
    if (history.length > 80) history.shift();
    historyIndex = history.length - 1;
    updateHistory();
  }
  function updateHistory() {
    (panel.querySelector('[data-action="undo"]') as HTMLButtonElement).disabled = historyIndex === 0;
    (panel.querySelector('[data-action="redo"]') as HTMLButtonElement).disabled = historyIndex === history.length - 1;
  }
  function restoreHistory(direction: number) {
    checkpointInput();
    const next = historyIndex + direction;
    if (next < 0 || next >= history.length) return;
    const id = selected?.dataset.authorId;
    historyIndex = next; items = JSON.parse(history[historyIndex]);
    canvas.querySelectorAll('[data-author-id]').forEach(el => el.remove()); selected = null;
    if (room === 'natural') renderNaturalObjects(items);
    for (const item of items.filter(i => !i.deleted && i.kind !== 'native')) {
      const el = document.createElement('figure'); el.className = 'room-piece'; el.dataset.authorId = item.id;
      canvas.append(el); draw(item, el); apply(item, el);
    }
    panel.querySelector<HTMLElement>('.author-selection')!.hidden = true;
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-author-id]'));
    const active = elements.find(el => el.dataset.authorId === id && items.some(item => !item.deleted && item.id === id)) || (room === 'natural' ? elements.find(el => items.some(item => !item.deleted && item.id === el.dataset.authorId)) : elements[elements.length - 1]);
    if (active && (room !== 'natural' || items.some(item => item.id === active.dataset.authorId))) select(active);
    updateHistory(); mark();
  }
  function checkpointInput() { if (inputStart !== null) { inputStart = null; checkpoint(); } }
  panel.addEventListener('focusin', () => { if (inputStart === null) inputStart = JSON.stringify(items); });
  panel.addEventListener('change', checkpointInput);
  panel.addEventListener('focusout', checkpointInput);
  const container = (el: HTMLElement) => el.closest('.piece') ? el.parentElement! : canvas;
  const current = () => items.find(i => i.id === selected?.dataset.authorId);
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const value = (item: any, field: string) => item.overrides?.[field] ?? item[field] ?? ((field === 'label' || field === 'alt') ? item.metadata?.title : item.metadata?.[field]) ?? '';
  function openSource() {
    pending = null;
    panel.querySelector<HTMLElement>('.author-source-flow')!.hidden = false;
    panel.querySelector<HTMLElement>('.author-url-flow')!.hidden = true;
    panel.querySelector<HTMLElement>('[data-action="accept-source"]')!.hidden = true;
    panel.querySelector('.author-source-preview')!.replaceChildren();
  }
  function draw(item: any, el: HTMLElement) {
    if (item.kind === 'native') { applyNative(item, el); return; }
    el.replaceChildren();
    if (room === 'home' && item.sceneStyle) { el.innerHTML = homeContent(item); return; }
    if (room === 'home' && item.parts) el.insertAdjacentHTML('beforeend', homeParts(item));
    if (item.kind === 'text') {
      const text = document.createElement('div'); text.className = `source-text text-font-${item.font || 'sans'} text-color-${item.color || 'dark'}`;
      text.textContent = item.text || ''; text.style.fontSize = `${item.textSize || 32}px`; text.style.textAlign = item.align || 'left'; el.append(text); return;
    }
    const wrap = document.createElement('div'); wrap.className = item.kind === 'youtube' ? 'source-youtube' : item.kind === 'placeholder' ? 'source-paper' : 'source-fragment';
    wrap.style.borderRadius = 'inherit'; wrap.style.width = '100%'; wrap.style.height = '100%';
    if (item.kind === 'video') { const video = document.createElement('video'); video.src = item.src || item.source; video.controls = true; video.playsInline = true; video.setAttribute('aria-label', value(item,'alt')); wrap.append(video); }
    else if (item.kind === 'image' || item.src || item.metadata?.thumbnail) { const img = document.createElement('img'); img.src = item.src || item.metadata?.thumbnail || item.source; img.alt = value(item,'alt'); img.draggable = false; wrap.append(img); }
    if (item.kind === 'youtube') { const play = document.createElement('span'); play.className = 'source-play'; play.textContent = '▶'; wrap.append(play); }
    if (item.kind === 'unavailable' || item.kind === 'link') { const text = document.createElement('span'); text.textContent = item.kind === 'unavailable' ? 'Media unavailable locally' : value(item,'title') || item.source; wrap.append(text); }
    el.append(wrap);
    if (value(item,'label') && item.kind !== 'placeholder') { const caption = document.createElement('figcaption'); caption.textContent = value(item,'label'); el.append(caption); }
  }
  function install(media: any) {
    if (media.kind === 'native') {
      items.push(media); renderNaturalObjects(items);
      const native = document.querySelector<HTMLElement>(`[data-author-id="${media.id}"]`);
      if (native) select(native);
      mark(); checkpoint(); return;
    }
    const isNew = !(replacing && selected);
    let item: any; let el: HTMLElement;
    if (replacing && selected) { item = current(); el = selected; for (const key of ['src','source','provider','videoId','metadata','kind','title','description','alt','label']) delete item[key]; }
    else { item = { id: `media-${crypto.randomUUID()}`, desktop: { x:10,y:10,width:35,height:30 }, mobile: { x:5,y:8,width:85,height:23 }, z:3,shape:'rectangle' }; items.push(item); el = document.createElement('figure'); el.className = 'room-piece'; el.dataset.authorId = item.id; canvas.append(el); }
    Object.assign(item, media);
    el.dataset.authorId = item.id;
    if (isNew && media.metadata?.aspect && !media.desktop) {
      item.fit = 'contain';
      const bounds = canvas.getBoundingClientRect();
      const ratio = media.metadata.aspect;
      for (const key of ['desktop','mobile']) {
        const p = item[key];
        const w = key === breakpoint ? bounds.width : key === 'mobile' ? 390 : 1440;
        const h = key === breakpoint ? bounds.height : key === 'mobile' ? 844 : 900;
        p.width = key === 'mobile' ? 38 : 22;
        p.height = p.width * w / h / ratio;
        if (p.height > 55) { p.width *= 55 / p.height; p.height = 55; }
        p.height = Math.max(5,p.height);
      }
    }
    if (!replacing && insertion) {
      const p = item[breakpoint];
      if (!media.metadata?.aspect) { p.width = breakpoint === 'mobile' ? 45 : 24; p.height = 18; }
      p.x = clamp(insertion.x - p.width / 2, 0, 100 - p.width); p.y = clamp(insertion.y - p.height / 2, 0, 100 - p.height);
    }
    draw(item, el); select(el); apply(item,el); mark(); checkpoint();
    panel.querySelector<HTMLElement>('.author-source-flow')!.hidden = true;
  }
  function capture(el: HTMLElement) {
    const parent = container(el).getBoundingClientRect();
    const p = { x: clamp(el.offsetLeft / parent.width * 100, 0, 95), y: clamp(el.offsetTop / parent.height * 100, 0, 95), width: clamp(el.offsetWidth / parent.width * 100, 5, 100), height: clamp(el.offsetHeight / parent.height * 100, 5, 100) };
    p.width = Math.min(p.width, 100 - p.x); p.height = Math.min(p.height, 100 - p.y);
    return p;
  }
  function ensure(el: HTMLElement) {
    let item = items.find(i => i.id === el.dataset.authorId);
    if (!item && room === 'natural' && naturalTemplate(el.dataset.authorId!)) {
      item = { id: el.dataset.authorId, kind: 'native', nativeId: el.dataset.authorId, z: 1, desktop: {x:50,y:50,width:100,height:100}, mobile: {x:50,y:50,width:100,height:100} };
      items.push(item);
    }
    if (!item) {
      const media = el.querySelector<HTMLImageElement | HTMLVideoElement>('img,video');
      item = { id: el.dataset.authorId, src: media ? new URL(media.src).pathname : '/intro/primary.jpg', kind: media?.tagName === 'VIDEO' ? 'video' : 'image', label: media?.getAttribute('alt') || '', shape: 'rectangle', objectPosition: '50% 50%', z: 1 };
      items.push(item);
    }
    if (!item[breakpoint]) item[breakpoint] = capture(el);
    if (!item.desktop) item.desktop = { ...item[breakpoint] };
    if (!item.mobile) item.mobile = { ...item[breakpoint] };
    return item;
  }
  function apply(item: any, el: HTMLElement) {
    if (item.kind === 'native') { applyNative(item, el); return; }
    // HOME's material surrounds follow their media through replace/duplicate/undo.
    if (room === 'home') { el.dataset.role = item.group || ''; el.dataset.sceneStyle = item.sceneStyle || ''; el.classList.toggle('home-scene-text', !!item.sceneStyle); el.style.setProperty('--media-fit', item.fit || 'cover'); el.style.setProperty('--crop', item.objectPosition || '50% 50%'); }
    const p = item[breakpoint] || item.desktop || item.mobile;
    if (p) for (const [key, value] of Object.entries({ left: p.x, top: p.y, width: p.width, height: p.height })) el.style.setProperty(key, `${value}%`, 'important');
    el.style.setProperty('transform', `rotate(${item.rotation || 0}deg)`, 'important');
    el.style.setProperty('z-index', String(el === selected && room !== 'home' ? 1000 : (item.z || 1)), 'important');
    el.style.animation = 'none';
    const inside = el.querySelector<HTMLElement>('.piece__in'); if (inside) inside.style.setProperty('transform', 'none', 'important');
    const radius = ({ rectangle: '2px', arch: '48% 48% 2px 2px', round: '50%', organic: '43% 57% 61% 39% / 56% 37% 63% 44%' } as any)[item.shape] || '2px';
    (inside || el).style.borderRadius = radius;
    el.querySelectorAll<HTMLElement>('img,video').forEach(m => m.style.setProperty('object-position', item.objectPosition || '50% 50%', 'important'));
    el.querySelectorAll<HTMLElement>('img,video').forEach(m => m.style.setProperty('object-fit', item.fit || 'cover', 'important'));
    if (el === selected && !el.querySelector('.author-handle')) { const handle = document.createElement('button'); handle.className = 'author-handle'; handle.setAttribute('aria-label', 'Drag to resize'); el.append(handle); }
  }
  function select(el: HTMLElement) {
    const previous = selected;
    selected?.classList.remove('author-selected'); selected?.querySelector('.author-handle')?.remove();
    selected = null;
    if (previous) { const oldItem = items.find(i => i.id === previous.dataset.authorId); if (oldItem) apply(oldItem, previous); }
    selected = el; selected.classList.add('author-selected'); selected.tabIndex = 0;
    const item = ensure(el); apply(item, el);
    if (!el.querySelector('.author-handle')) { const handle = document.createElement('button'); handle.className = 'author-handle'; handle.setAttribute('aria-label', 'Drag to resize'); el.append(handle); }
    panel.querySelector<HTMLElement>('.author-selection')!.hidden = false;
    const crop = (item.objectPosition || '50% 50%').split(' ').map(parseFloat);
    for (const [field, entry] of Object.entries({ size: item[breakpoint].width, shape: item.shape || 'rectangle', rotation: item.rotation || 0, cropX: crop[0], cropY: crop[1], source: item.source || item.src || '', title:value(item,'title'),description:value(item,'description'),alt:value(item,'alt'),label:value(item,'label'), href: item.href || '', group: item.group || '', fit:item.fit || 'cover', text:item.text || '', textSize:item.textSize || 32, font:item.font || 'sans', color:item.color || 'dark', align:item.align || 'left' })) panel.querySelector<HTMLInputElement>(`[data-field="${field}"]`)!.value = String(entry);
    panel.querySelector<HTMLElement>('.author-text-controls')!.hidden = item.kind !== 'text';
    panel.querySelectorAll<HTMLElement>('.author-text-controls > label:not(:first-child), .author-text-controls > .author-row').forEach(control => { control.hidden = !!item.sceneStyle; });
    panel.querySelector('.author-part-controls')?.remove();
    if (room === 'home' && item.parts) {
      const controls = document.createElement('div'); controls.className = 'author-part-controls';
      item.parts.forEach((part: string, index: number) => {
        const label = document.createElement('label'); label.textContent = `Group caption / arrow ${index + 1}`;
        const input = document.createElement('textarea'); input.maxLength = 500; input.dataset.partIndex = String(index); input.value = part;
        label.append(input); controls.append(label);
      });
      panel.querySelector('.author-selection')!.prepend(controls);
    }
    panel.querySelector('.author-native-controls')?.remove();
    if (item.kind === 'native') {
      const controls = document.createElement('div'); controls.className = 'author-native-controls';
      nativeTextNodes(el).forEach((node, index) => {
        const label = document.createElement('label'); label.textContent = `Text ${index + 1}`;
        const input = document.createElement('textarea'); input.maxLength = 500; input.dataset.nativeIndex = String(index);
        input.value = node.innerText; label.append(input); controls.append(label);
      });
      panel.querySelector('.author-selection')!.prepend(controls);
    }
    panel.querySelectorAll<HTMLElement>('.author-selection > label, .author-selection > .author-row').forEach(control => { control.hidden = item.kind === 'native'; });
    panel.querySelector<HTMLButtonElement>('[data-action="replace"]')!.hidden = item.kind === 'native' || !!item.sceneStyle;
    for (const field of ['title','description','alt','label']) panel.querySelector<HTMLElement>(`[data-auto="${field}"]`)!.dataset.active = String(item.overrides?.[field] === undefined);
    status(`${item.id} · ${breakpoint}${dirty ? ' · unsaved' : ''}`);
  }
  document.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    if (target.closest('.author-panel')) return;
    const el = target.closest<HTMLElement>('[data-author-id]');
    if (!el) return;
    event.preventDefault(); event.stopImmediatePropagation(); select(el);
  }, true);
  let drag: any = null;
  document.addEventListener('pointerdown', event => {
    const target = event.target as HTMLElement;
    if (target.closest('.author-panel')) return;
    const el = target.closest<HTMLElement>('[data-author-id]'); if (!el) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (selected !== el) select(el);
    const item = ensure(el); const bounds = container(el).getBoundingClientRect();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, p: { ...item[breakpoint] }, bounds, elementBounds: el.getBoundingClientRect(), resize: !!target.closest('.author-handle') };
    el.setPointerCapture(event.pointerId);
  }, true);
  document.addEventListener('pointermove', event => {
    if (!drag || !selected) return;
    const item = current(); const dx = (event.clientX - drag.x) / drag.bounds.width * 100; const dy = (event.clientY - drag.y) / drag.bounds.height * 100;
    const p = item[breakpoint];
    if (item.kind === 'native') {
      if (drag.resize) {
        p.width = clamp(drag.p.width * (1 + (event.clientX - drag.x) / drag.elementBounds.width), 5, 200);
        p.height = clamp(drag.p.height * (1 + (event.clientY - drag.y) / drag.elementBounds.height), 5, 200);
      } else {
        p.x = clamp(drag.p.x + (event.clientX - drag.x) / innerWidth * 100, 0, 100);
        p.y = clamp(drag.p.y + (event.clientY - drag.y) / innerHeight * 100, 0, 100);
      }
      apply(item, selected); mark(); return;
    }
    if (drag.resize) {
      if (item.metadata?.aspect && !event.shiftKey) {
        const ratio = drag.p.height / drag.p.width;
        p.width = clamp(drag.p.width + dx, Math.max(5,5 / ratio), Math.min(100 - p.x,(100 - p.y) / ratio)); p.height = p.width * ratio;
      } else { p.width = clamp(drag.p.width + dx, 5, 100 - p.x); p.height = clamp(drag.p.height + dy, 5, 100 - p.y); }
    }
    else { p.x = clamp(drag.p.x + dx, 0, 100 - p.width); p.y = clamp(drag.p.y + dy, 0, 100 - p.height); }
    apply(item, selected); mark();
  });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) document.addEventListener(event, () => { if (drag) { drag = null; checkpoint(); if (selected) select(selected); } });
  document.addEventListener('keydown', event => {
    if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]') || saving || uploading) return;
    if ((event.ctrlKey || event.metaKey) && ['z','y'].includes(event.key.toLowerCase())) { event.preventDefault(); restoreHistory(event.key.toLowerCase() === 'y' || event.shiftKey ? 1 : -1); return; }
    if (selected && ['Delete','Backspace'].includes(event.key)) { event.preventDefault(); panel.querySelector<HTMLButtonElement>('[data-action="delete"]')!.click(); return; }
    if (!selected || (event.target as HTMLElement).closest('.author-panel') || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault(); const item = current(); const p = item[breakpoint]; const step = event.shiftKey ? 2 : .25;
    p.x = clamp(p.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0), 0, item.kind === 'native' ? 100 : 100 - p.width);
    p.y = clamp(p.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0), 0, item.kind === 'native' ? 100 : 100 - p.height);
    apply(item, selected); mark(); checkpoint();
  });
  panel.addEventListener('input', event => {
    if (!selected) return; const input = event.target as HTMLInputElement; const item = current(); const p = item[breakpoint]; const field = input.dataset.field;
    if (room === 'home' && input.dataset.partIndex !== undefined) { item.parts[Number(input.dataset.partIndex)] = input.value; draw(item, selected); apply(item, selected); mark(); return; }
    if (item.kind === 'native' && input.dataset.nativeIndex !== undefined) {
      item.nativeText ||= nativeTextNodes(selected).map(node => node.innerText);
      item.nativeText[Number(input.dataset.nativeIndex)] = input.value;
      apply(item, selected); mark(); return;
    }
    if (!field || field === 'source') return;
    if (['text','textSize','font','color','align'].includes(field)) { item[field] = field === 'textSize' ? +input.value : input.value; draw(item, selected); apply(item, selected); mark(); return; }
    if (['title','description','alt','label'].includes(field)) {
      item.overrides ||= {}; if (input.value) item.overrides[field] = input.value; else { delete item.overrides[field]; delete item[field]; }
      if (!input.value) input.value = value(item,field);
      panel.querySelector<HTMLElement>(`[data-auto="${field}"]`)!.dataset.active = String(item.overrides[field] === undefined);
      draw(item,selected); apply(item,selected); mark(); return;
    }
    if (field === 'size') { const ratio = p.height / p.width; p.width = clamp(+input.value, 5, 100 - p.x); p.height = clamp(p.width * ratio, 5, 100 - p.y); }
    else if (field === 'aspect' && input.value !== 'free') p.height = clamp(p.width * container(selected).clientWidth / container(selected).clientHeight / +input.value, 5, 100 - p.y);
    else if (field === 'cropX' || field === 'cropY') item.objectPosition = `${panel.querySelector<HTMLInputElement>('[data-field="cropX"]')!.value}% ${panel.querySelector<HTMLInputElement>('[data-field="cropY"]')!.value}%`;
    else if (field === 'rotation') item.rotation = +input.value;
    else if (field && field !== 'aspect') item[field] = input.value;
    if (field === 'label') { const media = selected.querySelector('img'); media?.setAttribute('alt', input.value); let caption = selected.querySelector('figcaption'); if (!caption && input.value) { caption = document.createElement('figcaption'); selected.append(caption); } if (caption) caption.textContent = input.value; }
    apply(item, selected); mark();
  });
  async function post(endpoint: string, body: any) {
    const response = await fetch(`/__author/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Icy-Author': '1' }, body: JSON.stringify({ room, ...body }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Save failed.'); return result;
  }
  panel.addEventListener('click', async event => {
    const auto = (event.target as HTMLElement).closest<HTMLElement>('[data-auto]')?.dataset.auto;
    if (auto && selected && !saving && !uploading) { const item = current(); delete item.overrides?.[auto]; delete item[auto]; draw(item,selected); select(selected); mark(); checkpoint(); return; }
    const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
    if (saving || uploading) return;
    checkpointInput();
    if (action === 'undo' || action === 'redo') { restoreHistory(action === 'undo' ? -1 : 1); return; }
    if (action === 'text') { replacing = false; insertion = visibleCenter(); install({kind:'text',text:'Your words',textSize:32,font:'sans',color:'dark',align:'left'}); insertion = null; panel.querySelector<HTMLTextAreaElement>('[data-field="text"]')!.focus(); }
    if (action === 'duplicate' && selected) {
      const copy = structuredClone(current()); copy.id = `media-${crypto.randomUUID()}`;
      for (const key of ['desktop','mobile']) if (copy[key]) { const p = copy[key]; p.x = clamp(p.x + 2, 0, copy.kind === 'native' ? 100 : 100 - p.width); p.y = clamp(p.y + 2, 0, copy.kind === 'native' ? 100 : 100 - p.height); }
      replacing = false; insertion = null; install(copy);
    }
    if (action === 'add' || action === 'replace') { insertion = null; replacing = action === 'replace'; openSource(); }
    if (action === 'file') { picker.multiple = !replacing; picker.value = ''; picker.click(); }
    if (action === 'url') { panel.querySelector<HTMLElement>('.author-url-flow')!.hidden = false; panel.querySelector<HTMLInputElement>('[data-source-url]')!.focus(); }
    if (action === 'cancel-source') panel.querySelector<HTMLElement>('.author-source-flow')!.hidden = true;
    if (action === 'fetch' || action === 'apply-source' || action === 'refresh-metadata') {
      const sourceUrl = action === 'fetch' ? panel.querySelector<HTMLInputElement>('[data-source-url]')!.value : panel.querySelector<HTMLInputElement>('[data-field="source"]')!.value;
      uploading = true; status('Fetching public metadata…'); pending = null;
      panel.querySelector<HTMLElement>('[data-action="accept-source"]')!.hidden = true;
      try {
        const media = await measureMedia(await post('resolve',{source:sourceUrl}));
        if (action === 'fetch') {
          pending = media;
          const preview = panel.querySelector<HTMLElement>('.author-source-preview')!; preview.replaceChildren();
          if (media.metadata?.thumbnail || media.kind === 'image') { const img = document.createElement('img'); img.src = media.metadata?.thumbnail || media.src || media.source; img.alt = ''; preview.append(img); }
          const text = document.createElement('p'); text.textContent = `${media.provider || media.kind}: ${media.metadata?.title || (media.kind === 'unavailable' ? 'Media unavailable locally — attach a FILE after adding.' : media.source)}`; preview.append(text);
          const accept = panel.querySelector<HTMLElement>('[data-action="accept-source"]')!; accept.hidden = false; accept.textContent = replacing ? 'REPLACE' : 'ADD'; status('Preview ready. Confirm to add.');
        } else if (selected) { replacing = true; install(media); }
      } catch(error) { status((error as Error).message); } finally { uploading = false; }
    }
    if (action === 'accept-source' && pending) { install(pending); pending = null; }
    if (action === 'delete' && selected) { const item = current(); if (item.id.startsWith('intro-') || item.kind === 'native') { item.deleted = true; selected.style.setProperty('display', 'none', 'important'); } else { items = items.filter(i => i !== item); selected.remove(); } selected?.classList.remove('author-selected'); selected?.querySelector('.author-handle')?.remove(); selected = null; panel.querySelector<HTMLElement>('.author-selection')!.hidden = true; mark(); checkpoint(); }
    if ((action === 'front' || action === 'back') && selected) { const item = current(); item.z = clamp((item.z || 1) + (action === 'front' ? 1 : -1), 0, 100); apply(item, selected); mark(); checkpoint(); }
    if (action === 'save') {
      saving = true; status('Saving to source…');
      try { await post('save', { items, revision: canvas.dataset.revision }); dirty = false; location.reload(); } catch (error) { status((error as Error).message); } finally { saving = false; }
    }
  });
  function visibleCenter() {
    const bounds = canvas.getBoundingClientRect();
    const top = Math.max(0, bounds.top); const bottom = Math.min(innerHeight, bounds.bottom);
    return { x:50, y:clamp(((top + Math.max(top, bottom)) / 2 - bounds.top) / bounds.height * 100, 0, 100) };
  }
  async function measureMedia(media: any, previewSource?: string) {
    if (!['image','video'].includes(media.kind)) return media;
    const asset = media.kind === 'video' ? document.createElement('video') : new Image();
    const aspect = await new Promise<number | null>(resolve => {
      const timer = window.setTimeout(() => resolve(null), 8000);
      const done = () => { clearTimeout(timer); const w = asset instanceof HTMLVideoElement ? asset.videoWidth : asset.naturalWidth; const h = asset instanceof HTMLVideoElement ? asset.videoHeight : asset.naturalHeight; resolve(w && h ? w/h : null); };
      asset.addEventListener(media.kind === 'video' ? 'loadedmetadata' : 'load',done,{once:true});
      asset.addEventListener('error',()=>{clearTimeout(timer);resolve(null);},{once:true});
      if (asset instanceof HTMLVideoElement) asset.preload = 'metadata';
      asset.src = previewSource || media.src || media.source;
    });
    if (aspect && aspect >= .01 && aspect <= 20) media.metadata = {...media.metadata,aspect};
    return media;
  }
  async function uploadFiles(files: File[], point?: {x:number;y:number}) {
    if (saving || uploading || !files.length) return;
    checkpointInput();
    uploading = true;
    try {
      for (const [index, file] of files.entries()) {
      if (!/\.(jpe?g|png|webp|gif|mp4|webm)$/i.test(file.name)) { status(`Skipped unsupported file: ${file.name}`); continue; }
      if (file.size > 23 * 1024 * 1024) { status(`Skipped ${file.name}: choose a file under 23 MB.`); continue; }
      status(`Copying ${index + 1}/${files.length} to project…`);
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
      const uploaded = await post('upload', { name: file.name, data });
      const attribution = replacing && selected && current().provider === 'instagram' ? {source:current().source,provider:'instagram',metadata:current().metadata} : {};
      if (point) insertion = {x:point.x + index * 2,y:point.y + index * 2};
      const preview = URL.createObjectURL(file);
      try { install(await measureMedia({...uploaded, source:uploaded.src, ...attribution}, preview)); }
      finally { URL.revokeObjectURL(preview); }
      }
    } catch (error) { status((error as Error).message); } finally { uploading = false; insertion = null; }
  }
  picker.addEventListener('change', () => uploadFiles(Array.from(picker.files || [])));
  const fileDrag = (event: DragEvent) => Array.from(event.dataTransfer?.types || []).includes('Files');
  document.addEventListener('dragover', event => {
    if (!fileDrag(event)) return; event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    document.body.classList.add('author-file-over');
  });
  document.addEventListener('dragleave', event => { if (!event.relatedTarget) document.body.classList.remove('author-file-over'); });
  document.addEventListener('drop', event => {
    if (!fileDrag(event)) return;
    event.preventDefault(); document.body.classList.remove('author-file-over');
    if ((event.target as HTMLElement).closest('.author-panel')) return status('Drop files onto the page, outside this panel.');
    const bounds = canvas.getBoundingClientRect();
    replacing = false;
    uploadFiles(Array.from(event.dataTransfer?.files || []), {x:clamp((event.clientX-bounds.left)/bounds.width*100,0,100),y:clamp((event.clientY-bounds.top)/bounds.height*100,0,100)});
  });
  document.addEventListener('paste', event => {
    if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]')) return;
    const files = Array.from(event.clipboardData?.items || []).filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => !!file).map(file => new File([file], `clipboard.${({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'} as Record<string,string>)[file.type] || 'png'}`, {type:file.type}));
    if (!files.length) return;
    event.preventDefault(); replacing = false; uploadFiles(files, visibleCenter());
  });
  window.addEventListener('beforeunload', event => { if (dirty && !saving) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('resize', () => { const next = innerWidth <= 700 ? 'mobile' : 'desktop'; if (next === breakpoint) return; breakpoint = next; document.querySelectorAll<HTMLElement>('[data-author-id]').forEach(el => { const item = items.find(i => i.id === el.dataset.authorId); if (item && !item.deleted) { if (!item[breakpoint]) item[breakpoint] = capture(el); apply(item, el); } }); if (selected) select(selected); });
}