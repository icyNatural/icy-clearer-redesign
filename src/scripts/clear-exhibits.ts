// CLEAR's visitor instruments. Local Studio remains an independent author layer.
const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const $$ = <T extends Element = HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)];
const ns = 'http://www.w3.org/2000/svg';
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const mark = (id: string) => { const status = $(`[data-status-for="${id}"]`); status.textContent = 'INSPECTED'; status.classList.add('is-inspected'); };

function perception() {
  const host = $('[data-ambiguity]');
  let phase = 0, frozen = false, named = false;
  const render = () => {
    let d = '';
    for (let i = 0; i < 100; i++) {
      const a = i / 100 * Math.PI * 2;
      const r = 68 + Math.sin(a * 3 + phase) * 19 + Math.cos(a * 5 - phase * .7) * 11;
      d += `${i ? 'L' : 'M'}${(170 + Math.cos(a) * r).toFixed(2)},${(165 + Math.sin(a) * r).toFixed(2)}`;
    }
    $('[data-form]').setAttribute('d', d + 'Z'); $('[data-form-ghost]').setAttribute('d', d + 'Z');
  };
  const state = () => { $('[data-observe-state]').textContent = named ? 'LABEL APPLIED' : frozen ? 'SIGNAL FROZEN' : 'OBSERVING'; $('[data-freeze]').setAttribute('aria-pressed', String(frozen)); $('[data-freeze]').textContent = frozen ? 'Resume signal' : 'Freeze signal'; };
  $('[data-freeze]').addEventListener('click', () => { frozen = !frozen; state(); mark('perception'); });
  $('[data-label-form]').addEventListener('submit', event => {
    event.preventDefault(); const label = $<HTMLInputElement>('#event-label').value.trim(); if (!label) return;
    named = true; host.classList.add('is-named'); state();
    $('[data-form-label]').textContent = label.toUpperCase();
    $('[data-commit-log]').textContent = `${new Date().toISOString().slice(11,23)} UTC / LABEL APPLIED: “${label}”. 3 alternate interpretations discarded from view; the event is unchanged.`;
    $('[data-possibility-text]').textContent = '1 chosen interpretation / 3 possibilities discarded';
    $('[data-label-form] button').textContent = 'Rename ↵'; mark('perception');
  });
  $('[data-release]').addEventListener('click', () => {
    named = false; frozen = false; host.classList.remove('is-named'); state();
    $('[data-form-label]').textContent = 'EVENT ≠ LABEL'; $('[data-commit-log]').textContent = 'LABEL RELEASED / Alternate interpretations restored. The event never belonged to the name.';
    $('[data-possibility-text]').textContent = '4 illustrative interpretations / unresolved'; $('[data-label-form] button').textContent = 'Apply label ↵'; mark('perception');
  });
  render();
  return (dt: number) => { if (!frozen && !motion.matches) { phase += dt * .0005; render(); } };
}

function systems() {
  const host = $('#systems');
  $$<HTMLButtonElement>('[data-frame-choice]').forEach(button => button.addEventListener('click', () => {
    const mode = button.dataset.frameChoice!;
    host.dataset.frame = mode; document.body.dataset.worldFrame = mode;
    $$<HTMLButtonElement>('[data-frame-choice]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $('.frame-unresolved').hidden = true; $('.story-space').hidden = mode !== 'story'; $('.system-space').hidden = mode !== 'system';
    $('[data-frame-verdict]').textContent = mode === 'story' ? 'CONTEXT REMOVED / A single culprit fills the frame. Certainty is narrative, not verified.' : 'CONTEXT RESTORED / Actors + incentives + capacity + timing + signals + feedback. Responsibility remains; the causal field expands.';
    mark('systems');
  }));
}

function timeInstrument() {
  const windowInput = $<HTMLInputElement>('[data-time-window]'), scrub = $<HTMLInputElement>('[data-time-scrub]');
  const sample = (t: number) => 180 - (t % 24) * .35 - (Math.pow(Math.max(0, Math.cos(t / 24 * Math.PI * 2)), 9) * 65) - t * .075 + Math.sin(t * 2.7) * 5;
  const draw = () => {
    const count = Number(windowInput.value), end = Number(scrub.value), start = end - count + 1;
    const point = (i: number) => [count === 1 ? 180 : 20 + i / (count - 1) * 320, clamp(sample(start + i), 35, 235)];
    let path = ''; const dots: SVGCircleElement[] = [];
    for (let i = 0; i < count; i++) { const [x,y] = point(i); path += `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; if (count < 32 || i % 4 === 0) { const dot = document.createElementNS(ns,'circle'); dot.setAttribute('cx', String(x)); dot.setAttribute('cy', String(y)); dot.setAttribute('r', count === 1 ? '6' : '2'); dot.classList.add('time-point'); dots.push(dot); } }
    $('[data-time-path]').setAttribute('d',path); $('[data-time-points]').replaceChildren(...dots);
    $('[data-time-trend]').setAttribute('d',count > 65 ? `M20 ${180-start*.075-13}L340 ${180-end*.075-13}` : '');
    $('[data-time-count]').textContent = `${count} EVENT${count === 1 ? '' : 'S'}`; $('[data-window-output]').textContent = `${count} event${count === 1 ? '' : 's'}`;
    $('[data-scrub-output]').textContent = `T + ${end}`;
    const level = count === 1 ? 0 : count < 24 ? 1 : count < 70 ? 2 : 3;
    $('[data-time-kind]').textContent = ['ISOLATED REACTION','REPETITION EMERGES','CYCLE / 24 INTERVALS','FEEDBACK SIGNATURE / BASELINE DRIFT'][level];
    $('[data-time-readout]').textContent = ['One event. No recurrence can yet be established.','Multiple events enter the window. An apparent exception starts acquiring context.','Load spikes recur every 24 intervals. The same reaction has a rhythm.','Cycles persist while the baseline rises. Investigate accumulation and delayed feedback; the trace alone does not establish the cause.'][level];
  };
  windowInput.addEventListener('input', () => { draw(); mark('time'); }); scrub.addEventListener('input', () => { draw(); mark('time'); });
  const guides = $('[data-time-guides]'); for(let y = 50;y<250;y+=40) { const line = document.createElementNS(ns,'path'); line.setAttribute('d',`M20 ${y}H340`); line.classList.add('time-guideline'); guides.append(line); }
  draw();
}

function evidence() {
  const buttons = $$<HTMLButtonElement>('[data-evidence-toggle]');
  const peel = $<HTMLInputElement>('[data-peel]');
  const update = () => {
    const value = Number(peel.value); let interpretations = 0, observed = false;
    buttons.forEach(b => {
      const name = b.dataset.evidenceToggle!; const layer = $(`[data-evidence-layer="${name}"]`);
      const enabled = b.getAttribute('aria-pressed') === 'true'; layer.hidden = !enabled;
      const threshold: Record<string,number> = {unknown:25,speculative:50,inferred:80,observed:101};
      const peeled = value >= threshold[name]; layer.classList.toggle('is-peeled',peeled);
      if(enabled && !peeled) { if(name === 'observed') observed = true; else interpretations++; }
    });
    $('[data-peel-output]').textContent = `${value}% / ${value >= 80 ? 'RECORD EXPOSED' : 'PEEL DEPTH'}`;
    $('[data-evidence-verdict]').textContent = `${interpretations} interpretive layer${interpretations === 1 ? '' : 's'} over ${observed ? '1 observed record' : 'no visible observed record'}.${!observed ? ' Interpretation is now detached from its visible evidence.' : value >= 80 ? ' Transmissions remain. Intent does not.' : ''}`;
  };
  buttons.forEach(b => b.addEventListener('click', () => { b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed') !== 'true')); update(); mark('evidence'); }));
  peel.addEventListener('input', () => { update(); mark('evidence'); });
  $('[data-redaction]').addEventListener('click', () => { const b = $('[data-redaction]'); const open = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded',String(open)); $('[data-missing]').hidden = !open; mark('evidence'); });
  update();
}

function coherence() {
  const svg = $<SVGSVGElement>('[data-coherence-svg]'), host = $('.coherence-instrument');
  const strength = $<HTMLInputElement>('[data-strength]');
  let held = false, latched = false, pointer: number | null = null, order = 0, cx = 180, cy = 160, phase = 0, lastMetric = -1;
  const particles = Array.from({length:90},(_,i) => { const el = document.createElementNS(ns,'circle'); el.classList.add('particle'); if(i>=54) el.classList.add('is-outer'); el.setAttribute('r', i%4===0 ? '2.6' : '1.6'); $('[data-particles]').append(el); return {el,seed:i*.732+1}; });
  const update = () => { const active = held || latched; host.classList.toggle('is-held',active); $('[data-hold]').setAttribute('aria-pressed',String(held)); $('[data-lock]').setAttribute('aria-pressed',String(latched)); $('[data-lock]').textContent = latched ? 'Remove constraint' : 'Latch constraint'; $('[data-field-state]').textContent = active ? 'LOCAL CONSTRAINT ACTIVE' : 'UNCONSTRAINED'; mark('coherence'); };
  const locate = (event: PointerEvent) => { const p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY; const matrix = svg.getScreenCTM(); if(matrix) { const local = p.matrixTransform(matrix.inverse()); cx = clamp(local.x,95,265); cy = clamp(local.y,95,225); } };
  const begin = (event: PointerEvent) => { if(event.button !== 0 || pointer !== null) return; pointer = event.pointerId; held = true; (event.currentTarget as Element).setPointerCapture(event.pointerId); if(event.currentTarget === svg) locate(event); update(); };
  const end = (event: PointerEvent) => { if(event.pointerId !== pointer) return; pointer = null; held = false; update(); };
  for(const el of [svg,$('[data-hold]')]) { el.addEventListener('pointerdown',begin as EventListener); el.addEventListener('pointerup',end as EventListener); el.addEventListener('pointercancel',end as EventListener); el.addEventListener('lostpointercapture',end as EventListener); }
  svg.addEventListener('pointermove', event => { if(held && pointer === event.pointerId) locate(event); });
  $('[data-hold]').addEventListener('keydown', event => { if([' ','Enter'].includes(event.key)) { event.preventDefault(); held = true; update(); } });
  $('[data-hold]').addEventListener('keyup', event => { if([' ','Enter'].includes(event.key)) { event.preventDefault(); held = false; update(); } });
  const release = () => { held = false; pointer = null; update(); };
  $('[data-hold]').addEventListener('blur',release); window.addEventListener('blur',release);
  document.addEventListener('visibilitychange', () => { if(document.hidden) release(); });
  $('[data-lock]').addEventListener('click', () => { latched = !latched; update(); });
  strength.addEventListener('input', () => { $('[data-strength-output]').textContent = `${strength.value}%`; mark('coherence'); if(motion.matches) paint(0); });
  function paint(dt: number) {
    const target = held || latched ? Number(strength.value) / 100 : 0;
    order += (target - order) * (motion.matches ? 1 : Math.min(1,dt / 650));
    phase += motion.matches ? 0 : dt * .00022;
    particles.forEach(({el,seed},i) => {
      const freeX = 180 + Math.sin(seed*3.1 + phase*(.6+i%3*.2))*159;
      const freeY = 160 + Math.cos(seed*2.3 - phase*(.8+i%4*.1))*132;
      const angle = (i%18)/18*Math.PI*2, radius = 22 + Math.floor(i/18)*21;
      const mix = i < 54 ? order : 0;
      el.setAttribute('cx', String(freeX*(1-mix)+(cx+Math.cos(angle)*radius)*mix));
      el.setAttribute('cy', String(freeY*(1-mix)+(cy+Math.sin(angle)*radius)*mix));
    });
    $('[data-constraint-ring]').setAttribute('cx',String(cx)); $('[data-constraint-ring]').setAttribute('cy',String(cy));
    const metric = Math.round(order*100);
    if(metric !== lastMetric) { lastMetric = metric; $('[data-coherence-value]').textContent = `${metric}%`; $('[data-entropy-value]').textContent = `${Math.round(100-metric*.6)}%`; $('[data-order-bar]').style.width = `${metric}%`; $('[data-disorder-bar]').style.width = `${100-metric*.6}%`; }
  }
  paint(0); return paint;
}

const animatePerception = perception(); systems(); timeInstrument(); evidence(); const animateCoherence = coherence();
// A single, throttled loop. Offscreen instruments and hidden tabs do not animate.
const visible = new Set<string>();
const observer = new IntersectionObserver(entries => entries.forEach(entry => { entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id); }), {rootMargin:'80px'});
observer.observe($('#perception')); observer.observe($('#coherence'));
let previous = performance.now();
function tick(now: number) { const dt = Math.min(50,now-previous); if(dt >= 30) { previous = now; if(!document.hidden) { if(visible.has('perception')) animatePerception(dt); if(visible.has('coherence')) animateCoherence(dt); } } requestAnimationFrame(tick); }
requestAnimationFrame(tick);