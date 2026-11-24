// M-03 · From Reaction to Pattern
// Twelve events exist the whole time. The study is a single camera move: it
// starts pressed up against one event at a time — each arrives alone and fills
// the view — and then pulls back until recurrence, interval, and finally the
// direction of the whole series can be seen. The loud spike never moves; what
// changes is how much of the series is in view around it.

import { PALETTE, clamp, ease, label, lerp, ramp, rgba, seg, type Frame, type SceneDef } from './engine';

// the same twelve frames as the original diagram (x in 0..620, y in 0..248)
const SERIES: [number, number][] = [
  [44, 162], [92, 174], [140, 144], [188, 158], [236, 128], [284, 148],
  [332, 70], [380, 124], [428, 104], [476, 112], [524, 88], [576, 80],
];
const SPIKE = 6;
const STEP = 48; // spacing between frames in source units
const MID_Y = 126;

const LABELS = [
  '1 FRAME · ISOLATED SPIKE FEELS LIKE THE WHOLE TRUTH',
  '4 FRAMES · RECURRENCE & INTERVAL START APPEARING',
  '12 FRAMES · DIRECTION & SLOPE BECOME THE SIGNAL',
];
const LABELS_NARROW = [
  ['1 FRAME', 'ISOLATED SPIKE FEELS LIKE THE WHOLE TRUTH'],
  ['4 FRAMES', 'RECURRENCE & INTERVAL START APPEARING'],
  ['12 FRAMES', 'DIRECTION & SLOPE BECOME THE SIGNAL'],
];

export const patternScene: SceneDef = {
  stateKey: 'window',
  buttonAttr: 'data-pat-win',
  aspect: { wide: 0.44, narrow: 0.98 },
  start: -1,
  stages: [
    {
      at: 0,
      value: '1',
      travel: 5.4,
      hold: 3,
      caption:
        'Inside a single frame, one sharp drop or spike looks dramatic and permanent. Widen the window before adding meaning.',
    },
    {
      at: 1,
      value: '4',
      travel: 3.8,
      hold: 3.4,
      caption:
        'Across four frames, the loud event stops standing alone — you start distinguishing an isolated incident from a recurring rhythm.',
    },
    {
      at: 2,
      value: '12',
      travel: 4.2,
      caption:
        'At full width, the intense spike sits on a clear upward trajectory. Single moments provoke reaction; direction supports choice.',
    },
  ],
  draw(f) {
    const { ctx, w, h, pos, time } = f;

    // ── prologue (pos −1 → 0): events arrive one at a time, each alone ──
    // focus walks 3 → 4 → 5 → 6 and rests on the spike
    const walk = seg(pos, -1, -0.12);
    const focusF = lerp(3, SPIKE, walk);
    const focusIdx = Math.min(SPIKE, Math.floor(focusF + 0.0001));
    const within = focusF - focusIdx; // 0..1 inside the current single frame
    const prologue = pos < -0.06;

    // ── camera ─────────────────────────────────────────────────────────
    // half-width of the visible window, in frames
    const half = pos <= 0 ? 0.5 : pos <= 1 ? lerp(0.5, 2.05, ease(pos)) : lerp(2.05, 5.9, ease(pos - 1));
    const centre = pos <= 0 ? (prologue ? focusIdx : SPIKE) : pos <= 1 ? SPIKE : lerp(SPIKE, 5.5, ease(pos - 1));
    const padX = f.narrow ? 26 : 44;
    const plotTop = f.narrow ? 54 : 30;
    const plotBottom = h - (f.narrow ? 74 : 52);
    const plotH = plotBottom - plotTop;
    const sxp = (w - padX * 2) / (half * 2 * STEP);
    // vertical exaggeration: one frame alone has nothing to be compared against
    const zoomY = lerp(f.narrow ? 2.5 : 2.1, 1, ramp(pos, 0, 2));
    const syp = (plotH / 186) * zoomY;
    // alone, an event has no reference level: the camera simply sits on it.
    // Only as more comes into view does it find its real height in the series.
    const aloneY = SERIES[prologue ? focusIdx : SPIKE][1];
    const centreY = lerp(aloneY, MID_Y, ramp(pos, 0.05, 1));
    const X = (x: number) => w / 2 + (x - (44 + centre * STEP)) * sxp;
    const Y = (y: number) => plotTop + plotH / 2 + (y - centreY) * syp;

    // guide lines belong to the world, so they move with the camera
    ctx.lineWidth = 1;
    [56, 126, 196].forEach((gy, i) => {
      const y = Y(gy);
      if (y < plotTop - 4 || y > plotBottom + 4) return;
      ctx.beginPath();
      ctx.setLineDash(i === 2 ? [] : [3, 4]);
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.strokeStyle = rgba('#a8c6cc', i === 2 ? 0.18 : 0.1);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, plotTop - 18, w, plotH + 36);
    ctx.clip();

    // direction of the whole series — only meaningful once enough is in view
    const slope = ramp(pos, 1.35, 1.95);
    if (slope > 0) {
      ctx.beginPath();
      ctx.setLineDash([6, 4]);
      ctx.moveTo(X(44), Y(166));
      ctx.lineTo(X(lerp(44, 576, slope)), Y(lerp(166, 82, slope)));
      ctx.strokeStyle = rgba(PALETTE.mint, 0.95 * slope);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // the connecting line exists only between events that are both in view
    const joined = ramp(pos, 0.05, 0.6);
    if (joined > 0) {
      ctx.beginPath();
      SERIES.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
      ctx.strokeStyle = rgba(PALETTE.ice, joined);
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    SERIES.forEach((p, i) => {
      let a = 1;
      if (prologue) {
        // a reaction has no memory: the previous frame is gone when the next arrives
        a = i === focusIdx ? Math.min(1, within * 5, focusIdx === SPIKE ? 1 : (1 - within) * 5) : 0;
      } else if (pos < 0.05) a = i === SPIKE ? 1 : 0;
      if (a <= 0) return;
      const x = X(p[0]);
      const y = Y(p[1]);
      const isSpike = i === SPIKE;
      const r = (isSpike ? 5.5 : 3.5) * lerp(1.7, 1, ramp(pos, 0, 1.2));
      if (isSpike) {
        // alarm: loud when alone, quieter with every frame of context
        const alarm = (1 - ramp(pos, 0.2, 1.7)) * a;
        if (alarm > 0.01) {
          for (let k = 0; k < 3; k++) {
            const ph = f.reduced ? (k + 1) / 3.4 : (time * 0.55 + k / 3) % 1;
            ctx.beginPath();
            ctx.arc(x, y, r + ph * lerp(70, 26, ramp(pos, 0, 1.4)), 0, Math.PI * 2);
            ctx.strokeStyle = rgba(PALETTE.gold, (1 - ph) * 0.55 * alarm);
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      } else if (prologue) {
        const ph = clamp(within * 2.2);
        ctx.beginPath();
        ctx.arc(x, y, r + ph * 30, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(PALETTE.ice, (1 - ph) * 0.5 * a);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(isSpike ? PALETTE.gold : PALETTE.ice, a);
      ctx.fill();
    });
    ctx.restore();

    // ── the observer's aperture: corner brackets, not a box drawn on the data
    const bx0 = padX - 10;
    const bx1 = w - padX + 10;
    const by0 = plotTop - 12;
    const by1 = plotBottom + 12;
    const c = 14;
    ctx.strokeStyle = rgba(PALETTE.gold, lerp(0.95, 0.4, ramp(pos, 1.2, 2)));
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(bx0, by0 + c); ctx.lineTo(bx0, by0); ctx.lineTo(bx0 + c, by0);
    ctx.moveTo(bx1 - c, by0); ctx.lineTo(bx1, by0); ctx.lineTo(bx1, by0 + c);
    ctx.moveTo(bx1, by1 - c); ctx.lineTo(bx1, by1); ctx.lineTo(bx1 - c, by1);
    ctx.moveTo(bx0 + c, by1); ctx.lineTo(bx0, by1); ctx.lineTo(bx0, by1 - c);
    ctx.stroke();

    // ── where the window sits in the whole series (overview strip) ─────
    const stripY = h - (f.narrow ? 44 : 22);
    const sx0 = padX;
    const sx1 = w - padX;
    const SX = (i: number) => lerp(sx0, sx1, i / 11);
    ctx.beginPath();
    ctx.moveTo(sx0, stripY);
    ctx.lineTo(sx1, stripY);
    ctx.strokeStyle = rgba('#a8c6cc', 0.2);
    ctx.lineWidth = 1;
    ctx.stroke();
    SERIES.forEach((_, i) => {
      ctx.beginPath();
      ctx.arc(SX(i), stripY, i === SPIKE ? 2.6 : 1.6, 0, Math.PI * 2);
      const inView = Math.abs(i - centre) <= half + 0.02;
      ctx.fillStyle = rgba(i === SPIKE ? PALETTE.gold : PALETTE.ice, inView ? 0.95 : 0.25);
      ctx.fill();
    });
    const wx0 = Math.max(sx0 - 4, SX(centre - half));
    const wx1 = Math.min(sx1 + 4, SX(centre + half));
    ctx.strokeStyle = rgba(PALETTE.gold, 0.9);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(wx0, stripY - 7, Math.max(8, wx1 - wx0), 14);

    // ── words ──────────────────────────────────────────────────────────
    const idx = pos < 0.62 ? 0 : pos < 1.62 ? 1 : 2;
    const fadeText = Math.min(1, Math.abs(pos - 0.62) * 6, Math.abs(pos - 1.62) * 6);
    if (f.narrow) {
      label(ctx, LABELS_NARROW[idx][0], w / 2, 20, { size: 10, color: rgba(PALETTE.gold, fadeText), align: 'center', spacing: 1.6 });
      label(ctx, LABELS_NARROW[idx][1], w / 2, 35, { size: 7.6, color: rgba(PALETTE.gold, fadeText * 0.9), align: 'center', spacing: 0.5 });
      label(ctx, 'WHAT IS IN VIEW', sx0, stripY + 22, { size: 7.5, color: PALETTE.faint, spacing: 1 });
    } else {
      label(ctx, LABELS[idx], w / 2, 18, { size: 9.5, color: rgba(PALETTE.gold, fadeText), align: 'center', spacing: 1.4 });
      label(ctx, 'WHAT IS IN VIEW', sx0, stripY - 12, { size: 7.5, color: PALETTE.faint, spacing: 1 });
    }
  },
};
