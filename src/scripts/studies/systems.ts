// M-02 · Replace Stories with Systems
// The mechanism is running the whole time: inputs arrive, attention splits,
// errors come out and feed back as more inputs. At first only the errors show
// through an opaque story. The story then thins out to expose the loop that was
// producing them, and one constraint is moved to show the same loop behaving
// differently — nothing about the person is changed.

import { DISPLAY, PALETTE, clamp, ease, label, lerp, ramp, rgba, type Frame, type SceneDef } from './engine';

type Leg = 'in' | 'wait' | 'cp' | 'po' | 'fo' | 'fc';
interface Token {
  leg: Leg;
  u: number;
  lane: number;
  err: boolean;
}
interface Burst {
  x: number;
  y: number;
  age: number;
  ok: boolean;
}

interface Layout {
  C: [number, number];
  P: [number, number];
  O: [number, number];
  F: [number, number];
  bw: number;
  bh: number;
  fw: number;
  entry: [number, number];
  vertical: boolean;
  /** x the vertical feedback return swings out to */
  edge: number;
}

function layout(f: Frame): Layout {
  const { w, h } = f;
  if (f.narrow) {
    const bw = Math.min(w * 0.56, 210);
    const x = w * 0.42;
    return {
      C: [x, h * 0.2],
      P: [x, h * 0.43],
      O: [x, h * 0.66],
      F: [x, h * 0.88],
      bw,
      bh: 50,
      fw: Math.min(w * 0.8, 280),
      entry: [x, -12],
      vertical: true,
      edge: w * 1.12,
    };
  }
  const bw = Math.min(w * 0.215, 150);
  return {
    C: [w * 0.165, h * 0.36],
    P: [w * 0.5, h * 0.36],
    O: [w * 0.835, h * 0.36],
    F: [w * 0.5, h * 0.82],
    bw,
    bh: 62,
    fw: Math.min(w * 0.36, 250),
    entry: [-14, h * 0.36],
    vertical: false,
    edge: w,
  };
}

/** point along the feedback return, outcome → badge → constraint */
function feedbackPoint(L: Layout, leg: 'fo' | 'fc', u: number): [number, number] {
  const t = clamp(u);
  const quad = (a: [number, number], c: [number, number], b: [number, number]): [number, number] => {
    const m = 1 - t;
    return [m * m * a[0] + 2 * m * t * c[0] + t * t * b[0], m * m * a[1] + 2 * m * t * c[1] + t * t * b[1]];
  };
  if (L.vertical) {
    if (leg === 'fo') return quad([L.O[0], L.O[1] + L.bh / 2], [L.O[0], (L.O[1] + L.F[1]) / 2], [L.F[0], L.F[1] - 18]);
    // swing out along the right edge and come back in at the constraint
    return quad([L.F[0] + L.fw / 2, L.F[1]], [L.edge, (L.F[1] + L.C[1]) / 2], [L.C[0] + L.bw / 2, L.C[1]]);
  }
  if (leg === 'fo') return quad([L.O[0], L.O[1] + L.bh / 2], [L.O[0], L.F[1]], [L.F[0] + L.fw / 2, L.F[1]]);
  return quad([L.F[0] - L.fw / 2, L.F[1]], [L.C[0], L.F[1]], [L.C[0], L.C[1] + L.bh / 2]);
}

function box(
  f: Frame,
  c: [number, number],
  bw: number,
  bh: number,
  stroke: string,
  kicker: string,
  kickerColor: string,
  textA: string,
  textB: string,
  mix: number,
  alpha: number,
  strokeWidth = 1.2
) {
  const { ctx } = f;
  ctx.fillStyle = rgba(PALETTE.panel, alpha);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  ctx.beginPath();
  ctx.rect(c[0] - bw / 2, c[1] - bh / 2, bw, bh);
  ctx.fill();
  ctx.stroke();
  label(ctx, kicker, c[0], c[1] - bh / 2 + 19, { size: f.narrow ? 7.5 : 8.5, color: kickerColor, align: 'center', spacing: 0.4 });
  const size = f.narrow ? 16 : Math.min(18, bw * 0.125);
  // the words change only when the constraint has actually been moved
  if (mix < 0.999)
    label(ctx, textA, c[0], c[1] + bh / 2 - 15, { size, font: DISPLAY, color: rgba(PALETTE.ink, alpha * (1 - mix)), align: 'center' });
  if (mix > 0.001)
    label(ctx, textB, c[0], c[1] + bh / 2 - 15, { size, font: DISPLAY, color: rgba(PALETTE.ink, alpha * mix), align: 'center' });
}

export function systemsScene(): SceneDef {
  let tokens: Token[] = [];
  let bursts: Burst[] = [];
  let spawnIn = 0.2;
  let pressure = 0;
  let lane = 0;
  let seededStill = false;

  const reset = () => {
    tokens = [];
    bursts = [];
    pressure = 0;
    spawnIn = 0.2;
  };

  const stepSim = (dt: number, gate: number) => {
    const gated = gate > 0.5;
    pressure = Math.max(0, pressure - dt * 0.22);
    spawnIn -= dt;
    if (spawnIn <= 0) {
      const rate = gated ? 0.62 : Math.min(3.4, 1.5 + pressure);
      spawnIn = 1 / rate;
      if (tokens.filter((t) => t.leg === 'in' || t.leg === 'wait').length < 9)
        tokens.push({ leg: 'in', u: 0, lane: (lane = (lane + 1) % 5), err: false });
    }
    const busy = () => tokens.filter((t) => t.leg === 'cp' || t.leg === 'po').length;
    for (const t of tokens) {
      if (t.leg === 'in') {
        t.u += dt * 1.25;
        if (t.u >= 1) {
          if (gated && busy() >= 1) {
            t.leg = 'wait';
            t.u = 0;
          } else {
            t.leg = 'cp';
            t.u = 0;
          }
        }
      } else if (t.leg === 'wait') {
        t.u += dt;
        if (!gated || busy() === 0) {
          t.leg = 'cp';
          t.u = 0;
        }
      } else if (t.leg === 'cp') {
        t.u += dt * 0.8;
        if (t.u >= 1) {
          t.leg = 'po';
          t.u = 0;
          t.err = busy() > 1; // attention was split while this one was handled
        }
      } else if (t.leg === 'po') {
        t.u += dt * 0.8;
        if (t.u >= 1) {
          bursts.push({ x: 0, y: 0, age: 0, ok: !t.err });
          if (t.err) {
            t.leg = 'fo';
            t.u = 0;
          } else t.u = 9;
        }
      } else if (t.leg === 'fo') {
        t.u += dt * 0.95;
        if (t.u >= 1) {
          t.leg = 'fc';
          t.u = 0;
        }
      } else if (t.leg === 'fc') {
        t.u += dt * 0.95;
        if (t.u >= 1) {
          t.u = 9;
          pressure = Math.min(2.2, pressure + 0.55); // frustration → more inputs
        }
      }
    }
    tokens = tokens.filter((t) => t.u < 5);
    if (tokens.length > 60) tokens.splice(0, tokens.length - 60);
    for (const b of bursts) b.age += dt;
    bursts = bursts.filter((b) => b.age < 1.1);
  };

  return {
    stateKey: 'mode',
    buttonAttr: 'data-sys-mode',
    aspect: { wide: 0.46, narrow: 1.22 },
    stages: [
      {
        at: 0,
        value: 'story',
        hold: 4.2,
        caption:
          'A story feels emotionally complete, yet leaves you nothing to test or move. Expose the system underneath to find the variable.',
      },
      {
        at: 1,
        value: 'system',
        travel: 4.4,
        hold: 5.2,
        caption:
          'Underneath the story sits a testable arrangement: open inputs split attention, creating errors that trigger frustration and even more inputs.',
      },
      {
        at: 2,
        value: 'leverage',
        travel: 3.6,
        caption:
          'Changing one constraint (capping open inputs) alters attention and breaks the feedback loop — without changing who you are or blaming a personality trait.',
      },
    ],
    step(f) {
      stepSim(f.dt, ramp(f.pos, 1.25, 1.75));
    },
    draw(f) {
      const { ctx, w, h, pos, time } = f;
      const L = layout(f);
      const veil = 1 - ramp(pos, 0.12, 0.92); // the story thinning out
      const gate = ramp(pos, 1.25, 1.75); // the one constraint being moved
      const shown = 1 - veil * 0.94;

      if (f.reduced && !seededStill) {
        // a still frame needs something in the loop to look at
        seededStill = true;
        reset();
        for (let i = 0; i < 90; i++) stepSim(0.05, 0);
      }
      if (f.reduced) {
        // regenerate deterministically for the stage being shown
        reset();
        for (let i = 0; i < 160; i++) stepSim(0.05, gate);
      }

      // ── connectors ──────────────────────────────────────────────────
      const hot = rgba(PALETTE.gold, lerp(0.85, 0.45, gate) * shown);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = hot;
      ctx.beginPath();
      if (L.vertical) {
        ctx.moveTo(L.C[0], L.C[1] + L.bh / 2);
        ctx.lineTo(L.P[0], L.P[1] - L.bh / 2);
        ctx.moveTo(L.P[0], L.P[1] + L.bh / 2);
        ctx.lineTo(L.O[0], L.O[1] - L.bh / 2);
      } else {
        ctx.moveTo(L.C[0] + L.bw / 2, L.C[1]);
        ctx.lineTo(L.P[0] - L.bw / 2, L.P[1]);
        ctx.moveTo(L.P[0] + L.bw / 2, L.P[1]);
        ctx.lineTo(L.O[0] - L.bw / 2, L.O[1]);
      }
      ctx.stroke();

      // feedback return: alive while the loop runs, cut once the constraint moves
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -time * 14 * (1 - gate);
      ctx.strokeStyle = rgba(PALETTE.coral, lerp(0.9, 0.14, gate) * shown);
      ctx.beginPath();
      for (const leg of ['fo', 'fc'] as const) {
        for (let i = 0; i <= 24; i++) {
          const p = feedbackPoint(L, leg, i / 24);
          if (i === 0 && leg === 'fo') ctx.moveTo(p[0], p[1]);
          else ctx.lineTo(p[0], p[1]);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;

      // ── nodes ───────────────────────────────────────────────────────
      const cStroke = gate > 0.02 ? rgba(PALETTE.mint, lerp(0.6, 1, gate) * shown) : rgba(PALETTE.ice, shown);
      box(f, L.C, L.bw, L.bh, cStroke, 'CONSTRAINT / TRIGGER', rgba(PALETTE.ice, shown), 'Too many inputs', '1 active input', gate, shown, lerp(1.3, 2, gate));
      box(f, L.P, L.bw, L.bh, rgba('#a8c6cc', 0.55 * shown), 'PROCESS', rgba(PALETTE.muted, shown), 'Attention splits', 'Focused attention', gate, shown);
      box(f, L.O, L.bw, L.bh, rgba(PALETTE.gold, 0.7 * shown), 'OUTCOME', rgba(PALETTE.gold, shown), 'Repeated error', 'Clean completion', gate, shown);

      // feedback badge
      ctx.fillStyle = rgba('#0b141b', shown);
      ctx.strokeStyle = rgba(PALETTE.coral, lerp(0.55, 0.2, gate) * shown);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(L.F[0] - L.fw / 2, L.F[1] - 18, L.fw, 36);
      ctx.fill();
      ctx.stroke();
      const fbSize = f.narrow ? 7.5 : 9;
      label(ctx, 'FEEDBACK: FRUSTRATION → MORE INPUTS', L.F[0], L.F[1] + 3, {
        size: fbSize,
        color: rgba(PALETTE.coral, shown * (1 - gate)),
        align: 'center',
      });
      label(ctx, 'FEEDBACK INTERRUPTED · ROOM TO MOVE', L.F[0], L.F[1] + 3, {
        size: fbSize,
        color: rgba(PALETTE.mint, shown * gate),
        align: 'center',
      });

      // the gate itself: a bar that closes across the entrance to the constraint
      if (gate > 0.01) {
        const gx = L.vertical ? L.C[0] : L.C[0] - L.bw / 2 - 12;
        const gy = L.vertical ? L.C[1] - L.bh / 2 - 12 : L.C[1];
        ctx.strokeStyle = rgba(PALETTE.mint, gate);
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (L.vertical) {
          ctx.moveTo(gx - 26 * gate, gy);
          ctx.lineTo(gx - 5, gy);
          ctx.moveTo(gx + 5, gy);
          ctx.lineTo(gx + 26 * gate, gy);
        } else {
          ctx.moveTo(gx, gy - 26 * gate);
          ctx.lineTo(gx, gy - 5);
          ctx.moveTo(gx, gy + 5);
          ctx.lineTo(gx, gy + 26 * gate);
        }
        ctx.stroke();
      }

      // ── the running loop ────────────────────────────────────────────
      const laneOff = (t: Token) => (t.lane - 2) * lerp(5, 0.5, gate);
      const place = (t: Token): [number, number] | null => {
        const along = (a: [number, number], b: [number, number], u: number): [number, number] => {
          const e = clamp(u);
          return L.vertical ? [lerp(a[0], b[0], e) + laneOff(t), lerp(a[1], b[1], e)] : [lerp(a[0], b[0], e), lerp(a[1], b[1], e) + laneOff(t)];
        };
        const edgeIn: [number, number] = L.vertical ? [L.C[0], L.C[1] - L.bh / 2 - 18] : [L.C[0] - L.bw / 2 - 18, L.C[1]];
        if (t.leg === 'in') return along(L.entry, edgeIn, t.u);
        if (t.leg === 'wait') {
          const q = tokens.filter((o) => o.leg === 'wait').indexOf(t);
          return L.vertical ? [edgeIn[0] - 34 - q * 9, edgeIn[1] - 2] : [edgeIn[0] - 6, edgeIn[1] - 30 - q * 9];
        }
        if (t.leg === 'cp') return along(L.C, L.P, t.u);
        if (t.leg === 'po') return along(L.P, L.O, t.u);
        if (t.leg === 'fo' || t.leg === 'fc') return feedbackPoint(L, t.leg, t.u);
        return null;
      };

      // attention: one beam per thing being handled. Many beams, each thinner.
      const handled = tokens.filter((t) => t.leg === 'cp' || t.leg === 'po');
      const eye: [number, number] = L.vertical ? [L.P[0] - L.bw / 2 - 16, L.P[1]] : [L.P[0], L.P[1] - L.bh / 2 - 18];
      ctx.beginPath();
      ctx.arc(eye[0], eye[1], 3, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(PALETTE.ice, 0.8 * shown);
      ctx.lineWidth = 1;
      ctx.stroke();
      handled.forEach((t) => {
        const p = place(t);
        if (!p) return;
        ctx.beginPath();
        ctx.moveTo(eye[0], eye[1]);
        ctx.lineTo(p[0], p[1]);
        ctx.strokeStyle = rgba(PALETTE.ice, (0.75 / Math.max(1, handled.length)) * shown + 0.04 * shown);
        ctx.lineWidth = Math.max(0.6, 2.4 / Math.max(1, handled.length));
        ctx.stroke();
      });

      for (const t of tokens) {
        const p = place(t);
        if (!p) continue;
        const isFb = t.leg === 'fo' || t.leg === 'fc';
        const color = isFb ? PALETTE.coral : t.leg === 'po' && t.err ? PALETTE.gold : t.leg === 'wait' ? PALETTE.muted : PALETTE.ice;
        const a = (isFb ? 1 - gate * 0.6 : 1) * shown * (t.leg === 'wait' ? 0.55 : 1);
        ctx.beginPath();
        if (isFb) {
          ctx.moveTo(p[0] - 3, p[1] - 3);
          ctx.lineTo(p[0] + 3, p[1] + 3);
          ctx.moveTo(p[0] + 3, p[1] - 3);
          ctx.lineTo(p[0] - 3, p[1] + 3);
          ctx.strokeStyle = rgba(color, a);
          ctx.lineWidth = 1.4;
          ctx.stroke();
        } else {
          ctx.arc(p[0], p[1], 2.6, 0, Math.PI * 2);
          ctx.fillStyle = rgba(color, a);
          ctx.fill();
        }
      }

      // ── the story: opaque at first, the errors are all that shows through
      if (veil > 0.002) {
        const vx = w * (f.narrow ? 0.04 : 0.075);
        const vy = h * (f.narrow ? 0.05 : 0.1);
        const vw = w - vx * 2;
        const vh = h - vy * 2;
        ctx.fillStyle = rgba('#070c10', 0.95 * veil);
        ctx.strokeStyle = rgba('#a8c6cc', 0.32 * veil);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(vx, vy, vw, vh);
        ctx.fill();
        ctx.stroke();
        const cy = h * (f.narrow ? 0.36 : 0.5);
        // as it thins, the sentence lifts off the mechanism it was covering
        const lift = (1 - veil) * -h * 0.16;
        label(ctx, f.narrow ? 'IDENTITY STORY' : 'IDENTITY STORY · NO MOVABLE VARIABLES', w / 2, cy - (f.narrow ? 44 : 44) + lift, {
          size: f.narrow ? 8.5 : 9.5,
          color: rgba(PALETTE.muted, veil),
          align: 'center',
          spacing: 2,
        });
        if (f.narrow)
          label(ctx, 'NO MOVABLE VARIABLES', w / 2, cy - 30 + lift, { size: 8.5, color: rgba(PALETTE.muted, veil), align: 'center', spacing: 2 });
        const storySize = f.narrow ? Math.min(25, w * 0.07) : Math.min(34, w * 0.055);
        label(ctx, '“I keep messing things up.”', w / 2, cy + 6 + lift, {
          size: storySize,
          font: DISPLAY,
          italic: true,
          color: rgba(PALETTE.ink, veil),
          align: 'center',
        });
        label(ctx, f.narrow ? 'FEELS COMPLETE' : 'FEELS COMPLETE · OFFERS ZERO LEVERAGE', w / 2, cy + (f.narrow ? 34 : 44) + lift, {
          size: f.narrow ? 8.5 : 9,
          color: rgba(PALETTE.faint, veil),
          align: 'center',
          spacing: 0.6,
        });
        if (f.narrow)
          label(ctx, 'OFFERS ZERO LEVERAGE', w / 2, cy + 48 + lift, { size: 8.5, color: rgba(PALETTE.faint, veil), align: 'center', spacing: 0.6 });
      }

      // outcome events are drawn last: under the story they are the only thing seen
      for (const b of bursts) {
        const k = b.age / 1.1;
        const col = b.ok ? PALETTE.mint : PALETTE.coral;
        ctx.beginPath();
        ctx.arc(L.O[0], L.O[1], 6 + k * (b.ok ? 16 : 26), 0, Math.PI * 2);
        ctx.strokeStyle = rgba(col, (1 - k) * 0.9);
        ctx.lineWidth = b.ok ? 1.2 : 1.8;
        ctx.stroke();
        if (!b.ok && veil > 0.4) {
          ctx.beginPath();
          ctx.arc(L.O[0], L.O[1], 3.5, 0, Math.PI * 2);
          ctx.fillStyle = rgba(col, 1 - k);
          ctx.fill();
        }
      }
    },
  };
}
