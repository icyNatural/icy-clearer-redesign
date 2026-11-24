// Motion layer for /clear.html — Life as Continuous Development.
// Works on top of the existing markup and controls from clear-essay.ts:
//   · the six-part ecology carries visible flow between the parts and takes the
//     reader through each relation once
//   · each study demonstrates itself once when it comes into view
// Every sequence runs once, can be interrupted by using the control it belongs
// to, never runs off-screen, and is skipped under prefers-reduced-motion (the
// page then shows the same resting states it always had).

const SVGNS = 'http://www.w3.org/2000/svg';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const ease = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

function svgEl<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number>) {
  const el = document.createElementNS(SVGNS, name);
  for (const k in attrs) el.setAttribute(k, String(attrs[k]));
  return el;
}

/** Calls `enter` the first time `el` is properly on screen, and reports visibility after that. */
function whenSeen(el: Element, enter: () => void, onVisible?: (v: boolean) => void, ratio = 0.5) {
  if (!('IntersectionObserver' in window)) return;
  let done = false;
  new IntersectionObserver(
    (entries) => {
      const e = entries[0];
      onVisible?.(e.isIntersecting);
      if (!done && e.isIntersecting && e.intersectionRatio >= ratio) {
        done = true;
        enter();
      }
    },
    { threshold: [0, ratio] }
  ).observe(el);
}

/** A cancellable sequence of timed steps. */
function sequence(steps: [number, () => void][]) {
  const timers: number[] = [];
  let t = 0;
  for (const [delay, fn] of steps) {
    t += delay;
    timers.push(window.setTimeout(fn, t));
  }
  return () => timers.forEach((id) => window.clearTimeout(id));
}

interface EcoRecord {
  id: string;
  x: number;
  y: number;
  accent: string;
  supports: string[];
}

// ── 1. THE ECOLOGY: capacity visibly moving between the six parts ─────────
function initEcologyFlow() {
  const host = document.querySelector<HTMLElement>('[data-cl-ecology]');
  const svg = host?.querySelector<SVGSVGElement>('.cl-ecology__svg');
  const payload = document.querySelector<HTMLScriptElement>('[data-cl-elements-json]');
  if (!host || !svg || !payload) return;
  let records: EcoRecord[] = [];
  try {
    records = JSON.parse(payload.textContent || '[]');
  } catch {
    return;
  }
  const byId = new Map(records.map((r) => [r.id, r]));
  const pills = [...host.querySelectorAll<HTMLButtonElement>('[data-eco-pill]')];
  const firstNode = svg.querySelector('[data-eco-node]');
  const layer = svgEl('g', { class: 'cl-eco-flow', 'aria-hidden': 'true' });
  svg.insertBefore(layer, firstNode);

  interface Flow {
    from: EcoRecord;
    to: EcoRecord;
    cx: number;
    cy: number;
    dots: SVGCircleElement[];
    offset: number;
  }
  const flows: Flow[] = [];
  records.forEach((from) =>
    from.supports.forEach((id, k) => {
      const to = byId.get(id);
      if (!to) return;
      // bow each route slightly so a→b and b→a are two visible currents, not one line
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const flow: Flow = { from, to, cx: mx - (dy / len) * 16, cy: my + (dx / len) * 16, dots: [], offset: (k * 0.37 + flows.length * 0.13) % 1 };
      for (let i = 0; i < 2; i++) {
        const dot = svgEl('circle', { r: 2.2, fill: from.accent, opacity: 0 });
        layer.appendChild(dot);
        flow.dots.push(dot);
      }
      flows.push(flow);
    })
  );

  const selected = () => pills.find((p) => p.classList.contains('is-active'))?.dataset.ecoPill || '';
  let focus = ''; // '' = the whole ecology at once
  let visible = false;
  let running = false;
  let restAt = 0;
  let clock = 0;
  let last = 0;

  const place = (staticFrame = false) => {
    for (const f of flows) {
      const lit = !focus || f.from.id === focus;
      f.dots.forEach((dot, i) => {
        const u = staticFrame ? 0.34 + i * 0.32 : (clock * 0.16 + f.offset + i * 0.5) % 1;
        const m = 1 - u;
        // stay outside the node rings (r = 28) at both ends
        const x = m * m * f.from.x + 2 * m * u * f.cx + u * u * f.to.x;
        const y = m * m * f.from.y + 2 * m * u * f.cy + u * u * f.to.y;
        const edge = Math.min(1, u * 5, (1 - u) * 5);
        dot.setAttribute('cx', x.toFixed(1));
        dot.setAttribute('cy', y.toFixed(1));
        dot.setAttribute('opacity', (edge * (lit ? 0.95 : 0.1)).toFixed(2));
        dot.setAttribute('r', lit && focus ? '2.8' : '2.1');
      });
    }
  };

  const tick = (ts: number) => {
    if (!running) return;
    const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
    last = ts;
    clock += dt;
    place();
    if (!visible || document.hidden || (restAt && ts > restAt)) {
      running = false;
      last = 0;
      return;
    }
    requestAnimationFrame(tick);
  };
  const run = (seconds: number) => {
    if (reduced.matches) return;
    restAt = performance.now() + seconds * 1000;
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  };

  // following the reader's own selection
  let cancelTour: (() => void) | null = null;
  const userPicked = () => {
    cancelTour?.();
    cancelTour = null;
    window.setTimeout(() => {
      focus = selected();
      if (reduced.matches) place(true);
      else run(14);
    }, 0);
  };
  pills.forEach((p) => p.addEventListener('click', (e) => e.isTrusted && userPicked()));
  svg.querySelectorAll('[data-eco-node]').forEach((n) => {
    n.addEventListener('click', (e) => e.isTrusted && userPicked());
    n.addEventListener('keydown', (e) => ['Enter', ' '].includes((e as KeyboardEvent).key) && userPicked());
  });

  if (reduced.matches) {
    focus = selected();
    place(true);
    return;
  }

  // the guided pass: everything flowing, then each part's relations in turn, then everything again
  whenSeen(
    host,
    () => {
      focus = '';
      run(60);
      const steps: [number, () => void][] = [];
      records.forEach((r, i) =>
        steps.push([
          i === 0 ? 2600 : 3400,
          () => {
            pills.find((p) => p.dataset.ecoPill === r.id)?.click(); // existing handler updates the readout
            focus = r.id;
          },
        ])
      );
      steps.push([
        3600,
        () => {
          pills[0]?.click();
          focus = '';
          run(10);
        },
      ]);
      cancelTour = sequence(steps);
    },
    (v) => {
      visible = v;
      if (v && restAt > performance.now()) run((restAt - performance.now()) / 1000);
    },
    0.45
  );
}

// ── 2. STUDIES THAT DEMONSTRATE THEMSELVES ONCE ───────────────────────────
function initResources() {
  const study = document.querySelector<HTMLElement>('[data-study-resources]');
  const btn = study?.querySelector<HTMLButtonElement>('[data-res-toggle]');
  const svg = study?.querySelector<SVGSVGElement>('svg');
  if (!study || !btn || !svg) return;
  const routes = [...svg.querySelectorAll<SVGPathElement>('.res-directed path')];
  if (!routes.length) return;
  const colors = routes.map((p) => p.getAttribute('stroke') || '#e2b872');
  const lens = routes.map((p) => p.getTotalLength());
  // the same units of capacity either sit in the store or travel out along the routes
  const grains = Array.from({ length: 12 }, (_, i) => {
    const el = svgEl('circle', { r: 2.4, fill: colors[i % routes.length], opacity: 0 });
    svg.appendChild(el);
    return { el, route: i % routes.length, phase: i / 12, sx: 44 + ((i * 37) % 68), sy: 66 + ((i * 53) % 84) };
  });
  let mix = study.dataset.mode === 'directed' ? 1 : 0; // 0 stored … 1 directed
  let clock = 0;
  let visible = false;
  let running = false;
  let last = 0;
  let until = 0;

  const draw = () => {
    const m = ease(mix);
    grains.forEach((g) => {
      const u = (clock * 0.22 + g.phase) % 1;
      const p = routes[g.route].getPointAtLength(u * lens[g.route]);
      const jig = Math.sin(clock * 1.3 + g.phase * 20) * 1.5;
      g.el.setAttribute('cx', (g.sx + jig + (p.x - g.sx) * m).toFixed(1));
      g.el.setAttribute('cy', (g.sy + (p.y - g.sy) * m).toFixed(1));
      g.el.setAttribute('opacity', (0.9 * (m > 0.5 ? Math.min(1, u * 6, (1 - u) * 6) * m + (1 - m) : 1)).toFixed(2));
    });
  };
  const tick = (ts: number) => {
    const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
    last = ts;
    clock += dt;
    const goal = study.dataset.mode === 'directed' ? 1 : 0;
    mix += Math.sign(goal - mix) * Math.min(Math.abs(goal - mix), dt / 1.4);
    draw();
    if (!visible || document.hidden || ts > until) {
      running = false;
      last = 0;
      return;
    }
    requestAnimationFrame(tick);
  };
  const run = (s: number) => {
    until = performance.now() + s * 1000;
    if (!running && !reduced.matches) {
      running = true;
      requestAnimationFrame(tick);
    }
  };
  draw();
  let cancel: (() => void) | null = null;
  btn.addEventListener('click', (e) => {
    if (e.isTrusted) cancel?.();
    if (reduced.matches) {
      window.setTimeout(() => {
        mix = study.dataset.mode === 'directed' ? 1 : 0;
        draw();
      }, 0);
    } else run(9);
  });
  if (reduced.matches) return;
  whenSeen(
    study,
    () => {
      // begin from the store, then let the same capacity move out into the routes
      if (study.dataset.mode === 'directed') btn.click();
      mix = 0;
      run(12);
      cancel = sequence([[2400, () => study.dataset.mode !== 'directed' && btn.click()]]);
    },
    (v) => {
      visible = v;
      if (v && until > performance.now()) run((until - performance.now()) / 1000);
    }
  );
}

function initSecurity() {
  const study = document.querySelector<HTMLElement>('[data-study-security]');
  const btn = study?.querySelector<HTMLButtonElement>('[data-sec-pulse]');
  const wave = study?.querySelector<SVGPathElement>('.sec-wave-top');
  const under = study?.querySelector<SVGPathElement>('.sec-wave:not(.sec-wave-top)');
  if (!study || !btn || !wave) return;
  let shockAt = -10;
  let clock = 0;
  let running = false;
  let last = 0;
  let visible = false;
  // a setback is a disturbance that travels across the surface; the keel below does not move
  const shape = (base: number, depth: number) => {
    const since = clock - shockAt;
    let d = '';
    for (let x = 20; x <= 400; x += 5) {
      const front = 20 + since * 240;
      const hit = Math.exp(-Math.pow((x - front) / 46, 2)) * Math.max(0, 1 - since / 2.2);
      const y = base + Math.sin(x * 0.045 + clock * 1.1) * 5 * depth - hit * 30 * depth + Math.sin(x * 0.085 - clock * 7) * hit * 7 * depth;
      d += `${x === 20 ? 'M' : 'L'}${x} ${y.toFixed(1)} `;
    }
    return d;
  };
  const tick = (ts: number) => {
    const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
    last = ts;
    clock += dt;
    wave.setAttribute('d', shape(102, 1));
    under?.setAttribute('d', shape(116, 0.45));
    if (!visible || document.hidden || clock - shockAt > 3.2) {
      running = false;
      last = 0;
      return;
    }
    requestAnimationFrame(tick);
  };
  const shock = () => {
    if (reduced.matches) return;
    shockAt = clock;
    wave.style.transform = 'none'; // the travelling disturbance replaces the old 6px nudge
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  };
  btn.addEventListener('click', shock);
  if (reduced.matches) return;
  whenSeen(study, () => window.setTimeout(() => btn.click(), 900), (v) => (visible = v));
}

function initFreedom() {
  const study = document.querySelector<HTMLElement>('[data-study-freedom]');
  const btn = study?.querySelector<HTMLButtonElement>('[data-free-shift]');
  if (!study || !btn || reduced.matches) return;
  let cancel: (() => void) | null = null;
  btn.addEventListener('click', (e) => e.isTrusted && cancel?.());
  // attention moves from door to door and comes back: choosing is not a one-way exit
  whenSeen(study, () => {
    cancel = sequence([
      [1300, () => btn.click()],
      [1700, () => btn.click()],
      [1700, () => btn.click()],
    ]);
  });
}

function initFulcrum() {
  const fulcrum = document.querySelector<HTMLElement>('[data-cl-fulcrum]');
  if (!fulcrum || reduced.matches) return;
  const pick = (state: string) => fulcrum.querySelector<HTMLButtonElement>(`[data-balance-pick="${state}"]`);
  let cancel: (() => void) | null = null;
  fulcrum.querySelectorAll('[data-balance-pick]').forEach((b) => b.addEventListener('click', (e) => e.isTrusted && cancel?.()));
  // too little, then too much, then the balance between them
  whenSeen(fulcrum, () => {
    cancel = sequence([
      [900, () => pick('fragile')?.click()],
      [3400, () => pick('hoarding')?.click()],
      [3400, () => pick('living')?.click()],
    ]);
  });
}

/** Static drawings (Creation, Renewal) are drawn in front of the reader, once. */
function initDrawnStudies() {
  if (reduced.matches) return;
  document.querySelectorAll<SVGSVGElement>('#element-creation .cl-study svg, #element-renewal .cl-study svg').forEach((svg) => {
    const shapes = [...svg.querySelectorAll<SVGGeometryElement>('path, circle, line, rect, polygon, ellipse')].filter(
      (s) => typeof s.getTotalLength === 'function' && (s.getAttribute('stroke') || '') !== ''
    );
    const prepared = shapes.map((s) => {
      const len = s.getTotalLength();
      const dash = s.getAttribute('stroke-dasharray');
      if (dash) return { s, len: 0, dash };
      s.style.strokeDasharray = `${len}`;
      s.style.strokeDashoffset = `${len}`;
      return { s, len, dash };
    });
    const isRenewal = !!svg.closest('#element-renewal');
    whenSeen(svg, () => {
      prepared.forEach(({ s, len, dash }, i) => {
        if (dash) {
          s.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 500 + i * 160, fill: 'backwards' });
          return;
        }
        const duration = isRenewal ? 4200 : 1100 + Math.min(1600, len * 3);
        const anim = s.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
          duration,
          delay: isRenewal ? 200 : i * 220,
          easing: isRenewal ? 'cubic-bezier(.3,.1,.3,1)' : 'ease-in-out',
          fill: 'forwards',
        });
        anim.onfinish = () => {
          s.style.strokeDasharray = '';
          s.style.strokeDashoffset = '';
        };
      });
    });
  });
}

/** The cadence is walked through once and comes back to its beginning. */
function initCadence() {
  const row = document.querySelector<HTMLElement>('.cl-cadence');
  if (!row || reduced.matches) return;
  const steps = [...row.querySelectorAll<HTMLElement>('.cl-cadence__step')];
  if (!steps.length) return;
  whenSeen(row, () => {
    const order = [...steps, steps[0]];
    order.forEach((step, i) => {
      window.setTimeout(() => {
        steps.forEach((s) => s.classList.remove('is-passing'));
        step.classList.add('is-passing');
        if (i === order.length - 1) window.setTimeout(() => step.classList.remove('is-passing'), 1600);
      }, 500 + i * 620);
    });
  }, undefined, 0.8);
}

initEcologyFlow();
initResources();
initSecurity();
initFreedom();
initFulcrum();
initDrawnStudies();
initCadence();
