// Shared engine for the "living studies" on the philosophy pages.
//
// A study is ONE continuous visual system driven by a single timeline position
// (`pos`). Stages are places on that timeline, not separate pictures: moving
// between them transforms the same scene. The engine provides
//   · a guided demonstration that plays once when the study scrolls into view
//   · direct stage selection (the existing buttons), a scrubber, pause, replay
//   · a running clock for the scene's own motion that stops when the study is
//     off-screen, the tab is hidden, the reader pauses, or a short while after
//     the demonstration has finished (nothing loops forever beside the text)
//   · prefers-reduced-motion: no autoplay, no ambient motion; stages are drawn
//     as still frames and every control still works.

export const PALETTE = {
  bg: '#070c10',
  panel: '#0d1820',
  ink: '#eee9de',
  soft: '#cfd8d4',
  muted: '#98a9aa',
  faint: '#677a7d',
  ice: '#9dcfe4',
  mint: '#a8d5c2',
  gold: '#e4ba75',
  coral: '#df886a',
};

export const MONO = 'ClearMono, ui-monospace, monospace';
export const DISPLAY = 'BodoniClear, Georgia, serif';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0 before a, 1 after b, linear in between. */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const ease = (t: number) => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};
/** eased ramp between a and b */
export const ramp = (t: number, a: number, b: number) => ease(seg(t, a, b));

export function rgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(alpha).toFixed(3)})`;
}

/** Small deterministic generator so every visit shows the same event. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: { size?: number; color?: string; align?: CanvasTextAlign; font?: string; spacing?: number; italic?: boolean } = {}
) {
  const size = opts.size ?? 9;
  ctx.font = `${opts.italic ? 'italic ' : ''}${size}px ${opts.font ?? MONO}`;
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = opts.color ?? PALETTE.muted;
  const anyCtx = ctx as any;
  if ('letterSpacing' in anyCtx) anyCtx.letterSpacing = `${opts.spacing ?? 0}px`;
  ctx.fillText(text, x, y);
  if ('letterSpacing' in anyCtx) anyCtx.letterSpacing = '0px';
}

/** Cubic bezier chain sampled into a polyline with arc-length lookup. */
export class Curve {
  pts: [number, number][] = [];
  len: number[] = [];
  total = 0;
  constructor(points: [number, number][]) {
    this.pts = points;
    let acc = 0;
    this.len = [0];
    for (let i = 1; i < points.length; i++) {
      acc += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
      this.len.push(acc);
    }
    this.total = acc || 1;
  }
  static bezier(segments: number[][], steps = 28) {
    const out: [number, number][] = [];
    for (const s of segments) {
      const [x0, y0, x1, y1, x2, y2, x3, y3] = s;
      for (let i = out.length ? 1 : 0; i <= steps; i++) {
        const t = i / steps;
        const m = 1 - t;
        out.push([
          m * m * m * x0 + 3 * m * m * t * x1 + 3 * m * t * t * x2 + t * t * t * x3,
          m * m * m * y0 + 3 * m * m * t * y1 + 3 * m * t * t * y2 + t * t * t * y3,
        ]);
      }
    }
    return new Curve(out);
  }
  /** point at normalised arc length u (0..1) */
  at(u: number): [number, number] {
    const d = clamp(u) * this.total;
    let lo = 0;
    let hi = this.len.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.len[mid] <= d) lo = mid;
      else hi = mid;
    }
    const span = this.len[hi] - this.len[lo] || 1;
    const t = (d - this.len[lo]) / span;
    return [lerp(this.pts[lo][0], this.pts[hi][0], t), lerp(this.pts[lo][1], this.pts[hi][1], t)];
  }
}

export interface Frame {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** continuous timeline position */
  pos: number;
  /** seconds of scene clock (frozen under reduced motion / pause) */
  time: number;
  dt: number;
  narrow: boolean;
  reduced: boolean;
  pointer: { x: number; y: number; inside: boolean; down: boolean };
}

export interface StageDef {
  /** timeline position of this stage */
  at: number;
  /** caption shown while this stage is nearest */
  caption: string;
  /** value written to the plate's data attribute (keeps existing CSS hooks alive) */
  value: string;
  /** seconds the guided demonstration rests here */
  hold?: number;
  /** seconds the guided demonstration takes to arrive here from the previous stage */
  travel?: number;
}

export interface SceneDef {
  /** dataset key on the plate that mirrors the current stage, e.g. "stage" */
  stateKey: string;
  /** selector attribute on existing buttons, e.g. "data-sbn-mode" */
  buttonAttr: string;
  stages: StageDef[];
  /** timeline start for the guided demonstration (defaults to first stage) */
  start?: number;
  /** canvas height / width for wide and narrow layouts */
  aspect?: { wide: number; narrow: number };
  /** how far before a stage's position it counts as current (default 0.38) */
  lead?: number;
  /** when true a stage button replays the passage that leads INTO that stage */
  replayInto?: boolean;
  /** optional extra stage buttons the scene needs (short navigation labels only) */
  extraButtons?: { value: string; text: string }[];
  /** called once the scene has a canvas */
  setup?(api: StudyApi): void;
  /** advance any simulation; only called while the clock runs */
  step?(f: Frame): void;
  draw(f: Frame): void;
}

export interface StudyApi {
  root: HTMLElement;
  requestDraw(): void;
  wake(): void;
  getPos(): number;
}

const REST_AFTER_DEMO = 9; // seconds of ambient motion after a demonstration, then stillness

export function mountStudy(root: HTMLElement, def: SceneDef) {
  const stageHost = root.querySelector<HTMLElement>('.mv-stage');
  const controls = root.querySelector<HTMLElement>('.mv-controls');
  const captionEl = root.querySelector<HTMLElement>('.mv-caption');
  const oldSvg = root.querySelector<SVGElement>('.mv-svg');
  if (!stageHost) return;

  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stages = def.stages;
  const first = def.start ?? stages[0].at;
  const last = stages[stages.length - 1].at;

  // ── canvas ────────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.className = 'mv-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', oldSvg?.getAttribute('aria-label') ?? 'Animated study');
  const ctx = canvas.getContext('2d');
  if (!ctx) return; // keep the original static diagram
  if (oldSvg) {
    oldSvg.setAttribute('hidden', '');
    oldSvg.setAttribute('aria-hidden', 'true');
    oldSvg.parentNode?.insertBefore(canvas, oldSvg);
  } else stageHost.prepend(canvas);
  root.classList.add('mv-live');

  // ── extra buttons (short labels only) ─────────────────────────────────
  const attrKey = def.buttonAttr;
  def.extraButtons?.forEach((b) => {
    if (!controls) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mv-btn';
    btn.setAttribute(attrKey, b.value);
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = b.text;
    const pulse = controls.querySelector('.mv-btn--pulse');
    controls.insertBefore(btn, pulse);
  });
  const buttons = [...root.querySelectorAll<HTMLButtonElement>(`[${attrKey}]`)];

  // ── transport: play / scrub / replay ──────────────────────────────────
  const transport = document.createElement('div');
  transport.className = 'mv-transport';
  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'mv-transport__play';
  const scrub = document.createElement('input');
  scrub.type = 'range';
  scrub.className = 'mv-transport__scrub';
  scrub.min = String(Math.round(first * 1000));
  scrub.max = String(Math.round(last * 1000));
  scrub.step = '1';
  scrub.setAttribute('aria-label', 'Move through the study');
  const ticks = document.createElement('div');
  ticks.className = 'mv-transport__ticks';
  ticks.setAttribute('aria-hidden', 'true');
  stages.forEach((s) => {
    const tick = document.createElement('i');
    tick.style.left = `${((s.at - first) / (last - first || 1)) * 100}%`;
    ticks.appendChild(tick);
  });
  const track = document.createElement('div');
  track.className = 'mv-transport__track';
  track.append(ticks, scrub);
  const replayBtn = document.createElement('button');
  replayBtn.type = 'button';
  replayBtn.className = 'mv-transport__replay';
  replayBtn.textContent = 'Replay';
  transport.append(playBtn, track, replayBtn);
  (captionEl ?? canvas).insertAdjacentElement(captionEl ? 'beforebegin' : 'afterend', transport);

  // ── state ─────────────────────────────────────────────────────────────
  let w = 0;
  let h = 0;
  let pos = reducedQuery.matches ? last : first;
  let time = 0;
  let playing = false; // guided demonstration or a travel toward `goal`
  let goal = pos;
  let queue: number[] = []; // remaining stage stops for the guided demonstration
  let holdLeft = 0;
  let speed = 1; // timeline units per second for the current travel
  let visible = false;
  let demoDone = false;
  let restLeft = 0; // ambient seconds remaining after a demonstration
  let userPaused = false;
  let raf = 0;
  let lastTs = 0;
  let stageIndex = -1;
  const pointer = { x: 0, y: 0, inside: false, down: false };

  const nearestStage = (p: number) => {
    let best = 0;
    for (let i = 1; i < stages.length; i++) if (Math.abs(stages[i].at - p) < Math.abs(stages[best].at - p)) best = i;
    // a stage only "arrives" once the timeline is most of the way there
    for (let i = stages.length - 1; i >= 0; i--) if (p >= stages[i].at - (def.lead ?? 0.38)) return i;
    return best;
  };

  const syncStage = () => {
    const idx = nearestStage(pos);
    if (idx === stageIndex) return;
    stageIndex = idx;
    const st = stages[idx];
    root.dataset[def.stateKey] = st.value;
    buttons.forEach((b) => {
      const on = b.getAttribute(attrKey) === st.value;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (captionEl) captionEl.textContent = st.caption;
  };

  const syncTransport = () => {
    scrub.value = String(Math.round(pos * 1000));
    const pct = ((pos - first) / (last - first || 1)) * 100;
    track.style.setProperty('--mv-progress', `${clamp(pct, 0, 100)}%`);
    const active = playing && !userPaused;
    playBtn.textContent = active ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-label', active ? 'Pause the demonstration' : 'Play the demonstration');
    root.classList.toggle('is-playing', active);
  };

  const frame = (dt: number): Frame => ({
    ctx,
    w,
    h,
    pos,
    time,
    dt,
    narrow: w < 520,
    reduced: reducedQuery.matches,
    pointer,
  });

  const render = (dt = 0) => {
    if (!w) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    def.draw(frame(dt));
  };

  const clockRuns = () =>
    !reducedQuery.matches && visible && !document.hidden && !userPaused && (playing || restLeft > 0 || pointer.inside);

  const tick = (ts: number) => {
    raf = 0;
    const dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 0.016);
    lastTs = ts;
    if (!clockRuns()) {
      lastTs = 0;
      syncTransport();
      render(0);
      return;
    }
    time += dt;
    if (playing) {
      if (holdLeft > 0) {
        holdLeft -= dt;
      } else if (Math.abs(goal - pos) > 0.0005) {
        const dir = Math.sign(goal - pos);
        pos += dir * speed * dt;
        if ((dir > 0 && pos >= goal) || (dir < 0 && pos <= goal)) {
          pos = goal;
          const st = stages.find((s) => Math.abs(s.at - goal) < 0.001);
          holdLeft = queue.length ? st?.hold ?? 2.4 : 0;
        }
      } else if (queue.length) {
        const next = queue.shift() as number;
        const st = stages.find((s) => Math.abs(s.at - next) < 0.001);
        speed = Math.abs(next - pos) / (st?.travel ?? 3);
        goal = next;
      } else {
        playing = false;
        demoDone = true;
        restLeft = REST_AFTER_DEMO;
      }
    } else if (restLeft > 0 && !pointer.inside) {
      restLeft -= dt;
    }
    def.step?.(frame(dt));
    syncStage();
    syncTransport();
    render(dt);
    raf = requestAnimationFrame(tick);
  };

  const wake = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const startDemo = (from = first) => {
    userPaused = false;
    pos = from;
    goal = from;
    queue = stages.map((s) => s.at).filter((a) => a > from + 0.001);
    const here = stages.find((s) => Math.abs(s.at - from) < 0.001);
    holdLeft = here ? here.hold ?? 2.4 : 0.4;
    playing = true;
    stageIndex = -1;
    wake();
  };

  const travelTo = (target: number, from?: number) => {
    userPaused = false;
    if (reducedQuery.matches) {
      pos = target;
      playing = false;
      syncStage();
      syncTransport();
      render();
      return;
    }
    if (from !== undefined) pos = from;
    queue = [];
    holdLeft = 0;
    goal = target;
    const st = stages.find((s) => Math.abs(s.at - target) < 0.001);
    const dist = Math.abs(target - pos);
    speed = dist / Math.max(1.1, (st?.travel ?? 3) * Math.min(1.6, Math.max(0.45, dist)));
    playing = dist > 0.001;
    restLeft = REST_AFTER_DEMO;
    wake();
  };

  // ── controls ──────────────────────────────────────────────────────────
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      const value = b.getAttribute(attrKey);
      const idx = stages.findIndex((s) => s.value === value);
      if (idx < 0) return;
      const prevAt = idx > 0 ? stages[idx - 1].at : first;
      if (def.replayInto) travelTo(stages[idx].at, idx === 0 ? def.start ?? prevAt : prevAt);
      else travelTo(stages[idx].at);
    })
  );

  playBtn.addEventListener('click', () => {
    if (reducedQuery.matches) {
      // still frames: step to the next stage
      const idx = nearestStage(pos);
      pos = stages[(idx + 1) % stages.length].at;
      syncStage();
      syncTransport();
      render();
      return;
    }
    if (playing && !userPaused) {
      userPaused = true;
      syncTransport();
      return;
    }
    if (playing && userPaused) {
      userPaused = false;
      wake();
      return;
    }
    startDemo(pos >= last - 0.01 ? first : pos);
  });

  replayBtn.addEventListener('click', () => {
    if (reducedQuery.matches) {
      pos = first;
      syncStage();
      syncTransport();
      render();
      return;
    }
    startDemo(first);
  });

  scrub.addEventListener('input', () => {
    playing = false;
    queue = [];
    userPaused = false;
    pos = Number(scrub.value) / 1000;
    goal = pos;
    restLeft = REST_AFTER_DEMO;
    syncStage();
    syncTransport();
    render();
    wake();
  });

  const toLocal = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  };
  canvas.addEventListener('pointerenter', (e) => {
    pointer.inside = true;
    toLocal(e);
    wake();
  });
  canvas.addEventListener('pointermove', (e) => {
    pointer.inside = true;
    toLocal(e);
    if (reducedQuery.matches) render();
    else wake();
  });
  canvas.addEventListener('pointerdown', (e) => {
    pointer.down = true;
    pointer.inside = true;
    toLocal(e);
    wake();
  });
  const release = () => {
    pointer.down = false;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => {
    release();
    pointer.inside = false;
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.inside = false;
    release();
  });

  // ── sizing ────────────────────────────────────────────────────────────
  const resize = () => {
    const width = Math.min(stageHost.clientWidth - parseFloat(getComputedStyle(stageHost).paddingLeft) * 2, 860);
    if (width <= 0) return;
    const narrow = width < 520;
    const aspect = def.aspect ?? { wide: 0.42, narrow: 0.86 };
    w = Math.round(width);
    h = Math.round(width * (narrow ? aspect.narrow : aspect.wide));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    render();
  };
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stageHost);
  else window.addEventListener('resize', resize);

  // ── visibility: play the demonstration once, never run off-screen ─────
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        visible = entry.isIntersecting;
        if (visible && entry.intersectionRatio >= 0.55 && !demoDone && !playing && !reducedQuery.matches) startDemo(first);
        if (visible) wake();
      },
      { threshold: [0, 0.55] }
    ).observe(canvas);
  } else {
    visible = true;
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) wake();
  });
  reducedQuery.addEventListener?.('change', () => {
    if (reducedQuery.matches) {
      playing = false;
      pos = stages[nearestStage(pos)].at;
    }
    syncStage();
    syncTransport();
    render();
  });

  const api: StudyApi = {
    root,
    requestDraw: () => (reducedQuery.matches || !clockRuns() ? render() : wake()),
    wake: () => {
      restLeft = Math.max(restLeft, 4);
      wake();
    },
    getPos: () => pos,
  };
  def.setup?.(api);

  resize();
  syncStage();
  syncTransport();
  render();
  (document as any).fonts?.ready?.then(() => render());
}
