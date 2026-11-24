// M-01 · Seeing Before Naming
// One event — points of light moving along three strands — is on screen the
// whole time. Nothing about its motion ever changes. What changes is what is
// done with it: it is met raw, it organises into form, a label lands on it and
// closes observation, and finally the label is lifted to show the event still
// moving exactly as before.

import { Curve, DISPLAY, PALETTE, clamp, ease, label, lerp, ramp, rgba, seeded, seg, type Frame, type SceneDef } from './engine';

const VB_W = 620;
const VB_H = 248;

const STRANDS = [
  {
    color: PALETTE.ice,
    curve: Curve.bezier([
      [56, 154, 96, 72, 194, 64, 266, 124],
      [266, 124, 338, 184, 424, 188, 558, 84],
    ]),
  },
  {
    color: PALETTE.mint,
    curve: Curve.bezier([
      [68, 176, 126, 98, 212, 88, 286, 138],
      [286, 138, 362, 190, 444, 176, 548, 112],
    ]),
  },
  {
    color: PALETTE.gold,
    curve: Curve.bezier([
      [84, 126, 158, 58, 244, 82, 316, 146],
      [316, 146, 388, 208, 476, 164, 536, 134],
    ]),
  },
];

interface Mote {
  strand: number;
  u0: number;
  speed: number;
  jx: number;
  jy: number;
  flick: number;
  phase: number;
  size: number;
}

const rand = seeded(1101);
const MOTES: Mote[] = [];
for (let s = 0; s < STRANDS.length; s++) {
  for (let i = 0; i < 46; i++) {
    MOTES.push({
      strand: s,
      u0: rand(),
      speed: 0.035 + rand() * 0.03,
      jx: (rand() - 0.5) * 2,
      jy: (rand() - 0.5) * 2,
      flick: 0.6 + rand() * 2.4,
      phase: rand() * Math.PI * 2,
      size: 0.9 + rand() * 1.5,
    });
  }
}

// where perception finds structure: fixed places on the first strand
const MARKS = [
  { u: 0.2, text: 'EDGE A' },
  { u: 0.5, text: 'INFLECTION' },
  { u: 0.8, text: 'EDGE B' },
];

interface View {
  sx: number;
  sy: number;
  ox: number;
  oy: number;
}

function view(f: Frame): View {
  // the event keeps its proportions; narrow screens give it more height
  const sx = f.w / VB_W;
  const sy = f.narrow ? (f.h * 0.8) / VB_H : f.h / (VB_H + 22);
  return { sx, sy, ox: 0, oy: f.narrow ? f.h * 0.04 : 0 };
}

const px = (v: View, p: [number, number]): [number, number] => [v.ox + p[0] * v.sx, v.oy + p[1] * v.sy];

/**
 * Draws the event. `form` (0..1) is how far perception has organised it,
 * `presence` (0..1) is how much of it is still being attended to.
 */
function drawEvent(f: Frame, v: View, form: number, presence: number) {
  const { ctx, time } = f;
  const scatter = lerp(f.narrow ? 15 : 24, 2.2, ease(form));
  const trail = lerp(0, 0.085, ease(form));

  // contours emerge only as the motion becomes distinguishable
  if (form > 0.02) {
    STRANDS.forEach((s, i) => {
      ctx.beginPath();
      const n = 60;
      const reveal = ramp(form, 0.1 + i * 0.1, 0.75 + i * 0.1);
      for (let k = 0; k <= n * reveal; k++) {
        const p = px(v, s.curve.at(k / n));
        if (k === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      }
      ctx.strokeStyle = rgba(s.color, (i === 2 ? 0.45 : 0.7) * presence * reveal);
      ctx.lineWidth = i === 0 ? 1.5 : 1.1;
      if (i === 2) ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  // the motes: the event itself. Their paths and speeds never depend on the stage.
  for (const m of MOTES) {
    const s = STRANDS[m.strand];
    const u = (m.u0 + time * m.speed) % 1;
    const p = px(v, s.curve.at(u));
    const wob = Math.sin(time * 0.7 + m.phase);
    const x = p[0] + m.jx * scatter + wob * scatter * 0.25;
    const y = p[1] + m.jy * scatter * 0.8 + Math.cos(time * 0.9 + m.phase) * scatter * 0.2;
    const flicker = 0.45 + 0.55 * Math.sin(time * m.flick + m.phase) ** 2;
    const edge = Math.min(1, u * 12, (1 - u) * 12);
    const a = lerp(flicker, 0.55 + flicker * 0.45, form) * edge * presence;

    if (trail > 0.004) {
      const q = px(v, s.curve.at(Math.max(0, u - trail)));
      ctx.beginPath();
      ctx.moveTo(q[0] + m.jx * scatter, q[1] + m.jy * scatter * 0.8);
      ctx.lineTo(x, y);
      ctx.strokeStyle = rgba(s.color, 0.26 * a * form);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, m.size, 0, Math.PI * 2);
    ctx.fillStyle = rgba(s.color, a);
    ctx.fill();
  }
}

function drawStructure(f: Frame, v: View, amount: number) {
  if (amount <= 0.01) return;
  const { ctx } = f;
  const base = v.oy + 208 * v.sy;
  ctx.beginPath();
  ctx.moveTo(v.ox + 110 * v.sx, base);
  ctx.lineTo(v.ox + lerp(110, 510, ease(amount)) * v.sx, base);
  ctx.strokeStyle = rgba(PALETTE.ice, 0.34 * amount);
  ctx.lineWidth = 1;
  ctx.stroke();
  MARKS.forEach((m, i) => {
    const a = ramp(amount, 0.15 + i * 0.2, 0.6 + i * 0.2);
    if (a <= 0) return;
    const p = px(v, STRANDS[0].curve.at(m.u));
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[0], lerp(p[1], base, a));
    ctx.strokeStyle = rgba(PALETTE.ice, 0.3 * a);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(p[0], p[1], lerp(2, f.narrow ? 12 : 18, a), 0, Math.PI * 2);
    ctx.strokeStyle = rgba(PALETTE.ice, 0.4 * a);
    ctx.stroke();
    label(ctx, m.text, p[0], base + (f.narrow ? 14 : 17), {
      size: f.narrow ? 8 : 8.5,
      color: rgba(PALETTE.ice, a),
      align: 'center',
      spacing: 0.6,
    });
  });
}

export const seeingScene: SceneDef = {
  stateKey: 'stage',
  buttonAttr: 'data-sbn-mode',
  aspect: { wide: 0.44, narrow: 0.74 },
  extraButtons: [{ value: 'under', text: '04 Look Under' }],
  stages: [
    {
      at: 0,
      value: 'contact',
      hold: 3.4,
      caption:
        'Before naming: light, contour, interval, and relation remain intact. Nothing has been reduced to a verdict yet.',
    },
    {
      at: 1,
      value: 'perceived',
      travel: 4.2,
      hold: 3.2,
      caption:
        'Perceived form: edges, spacing, and inflection organize cleanly while keeping every original detail available.',
    },
    {
      at: 2,
      value: 'labeled',
      travel: 3.4,
      hold: 3.6,
      caption:
        'Premature label applied: one word stamps over the event and closes observation. Notice how the surrounding detail fades — even though the event itself did not change.',
    },
    {
      at: 3,
      value: 'under',
      travel: 4.6,
      caption: 'Look under the label: the same event is still moving. Move across the study to compare.',
    },
  ],
  draw(f) {
    const { ctx, w, h, pos, time } = f;
    const v = view(f);

    const form = ramp(pos, 0.05, 1); // raw contact → perceived form
    const labelIn = ramp(pos, 1.25, 1.95); // the word arriving
    const under = ramp(pos, 2.15, 2.75); // lifting it again
    const presence = lerp(1, 0.16, labelIn); // attention withdrawn by the label

    // header words name what is physically there, before any interpretation
    label(ctx, 'LIGHT · DURATION · RELATION · MOTION', v.ox + 58 * v.sx, v.oy + (f.narrow ? 20 : 34) * v.sy + (f.narrow ? 6 : 0), {
      size: f.narrow ? 8 : 9,
      color: rgba('#7c9aa5', lerp(1, 0.25, labelIn)),
      spacing: 0.8,
    });

    drawEvent(f, v, form, presence);
    drawStructure(f, v, ramp(pos, 0.45, 1) * lerp(1, 0.08, labelIn));

    // ── the label ──────────────────────────────────────────────────────
    if (labelIn > 0.001) {
      const cx = w / 2;
      const cy = v.oy + 124 * v.sy;
      const bw = Math.min(w * (f.narrow ? 0.78 : 0.37), 250);
      const bh = f.narrow ? 86 : 104 * Math.min(1, v.sy + 0.25);
      // it drops in from above and settles: a stamp, not a fade
      const drop = (1 - ease(labelIn)) * -h * 0.5;
      const lens = lensPosition(f, cx, cy, bw, under);

      ctx.save();
      ctx.translate(0, drop);
      ctx.globalAlpha = clamp(labelIn * 1.6);
      ctx.fillStyle = rgba('#070c10', lerp(0.9, 0.82, under));
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.rect(cx - bw / 2, cy - bh / 2, bw, bh);
      ctx.fill();
      ctx.stroke();
      label(ctx, 'FILE CLOSED · LABEL', cx, cy - bh / 2 + (f.narrow ? 24 : 30), {
        size: f.narrow ? 8.5 : 9.5,
        color: PALETTE.gold,
        align: 'center',
        spacing: 2,
      });
      label(ctx, '“Avoidance”', cx, cy + (f.narrow ? 20 : 24), {
        size: f.narrow ? 28 : 34,
        font: DISPLAY,
        color: PALETTE.ink,
        align: 'center',
      });
      ctx.restore();

      // ── looking under: a moving aperture shows the event at full richness
      if (under > 0.001) {
        const r = lerp(0, f.narrow ? 58 : 76, ease(under));
        ctx.save();
        ctx.beginPath();
        ctx.arc(lens.x, lens.y, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = '#0b1820';
        ctx.fillRect(lens.x - r, lens.y - r, r * 2, r * 2);
        drawEvent(f, v, 1, 1);
        drawStructure(f, v, 1);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(lens.x, lens.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(PALETTE.ice, 0.75 * under);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        label(ctx, 'THE EVENT · UNCHANGED', lens.x, lens.y - r - 8, {
          size: 8,
          color: rgba(PALETTE.ice, under),
          align: 'center',
          spacing: 1.2,
        });
      }
    }

    // reading aid along the bottom edge: which of the two things changed
    if (!f.narrow || pos > 1.2) {
      const a = ramp(pos, 1.6, 2);
      if (a > 0) {
        label(ctx, 'EVENT: SAME MOTION', v.ox + 58 * v.sx, h - 8, { size: 8, color: rgba(PALETTE.mint, a), spacing: 1 });
        label(ctx, 'ATTENTION: WITHDRAWN', w - 58 * v.sx, h - 8, {
          size: 8,
          color: rgba(PALETTE.gold, a * lerp(1, 0.35, under)),
          align: 'right',
          spacing: 1,
        });
      }
    }
    void time;
    void seg;
  },
};

function lensPosition(f: Frame, cx: number, cy: number, bw: number, under: number) {
  // the reader's pointer leads; otherwise the aperture sweeps slowly across the label
  if (f.pointer.inside && under > 0.5) return { x: f.pointer.x, y: f.pointer.y };
  const sweep = f.reduced ? 0.25 : Math.sin(f.time * 0.55) * 0.5 + 0.5;
  return { x: cx - bw * 0.55 + sweep * bw * 1.1, y: cy + Math.sin(f.time * 0.4) * 10 };
}
