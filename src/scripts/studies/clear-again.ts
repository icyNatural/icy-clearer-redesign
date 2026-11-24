// M-05 · Clear Again
// A pen draws a life under pressure in real time. Clarity is a baseline that
// is never perfectly flat. Pressure arrives three times. Drawn first: trying to
// HOLD clarity — the trace fights, rings, and is still swinging when the next
// pressure lands. Drawn over it: PRACTISING THE RETURN — drift still happens
// every time, but it is noticed sooner and the way back gets shorter.

import { PALETTE, clamp, ease, label, lerp, ramp, rgba, type Frame, type SceneDef, type StudyApi } from './engine';

const PRESS = [0.149, 0.479, 0.77]; // where pressure arrives, as a fraction of the width
const RETURN_SPAN = [0.2, 0.153, 0.092]; // how long the way back takes: long → shorter → quick
const RETURN_AMP = [0.86, 0.62, 0.36];
const BRACKETS = ['LONG RETURN', 'SHORTER', 'QUICK RETURN'];
const PHASES = ['DRIFT', 'NOTICE', 'ADJUST', 'RETURN'];
const PHASE_AT = [0.22, 0.42, 0.7, 1];

/** displacement from baseline, −1..1, at horizontal fraction x */
function returning(x: number, boost: number) {
  let y = 0;
  for (let j = 0; j < 3; j++) {
    const d = x - PRESS[j];
    if (d <= 0 || d >= RETURN_SPAN[j]) continue;
    const u = d / RETURN_SPAN[j];
    y += -Math.sin(u * Math.PI * 2) * RETURN_AMP[j] * (1 - u * 0.35) * (1 + boost * 0.45);
  }
  return y;
}
function holding(x: number, boost: number) {
  let y = 0;
  for (let j = 0; j < 3; j++) {
    const d = x - PRESS[j];
    if (d <= 0) continue;
    // resisted, so it rings: slow to decay and still moving when the next one lands
    y += -Math.sin((d / 0.27) * Math.PI * 2) * 0.72 * Math.exp(-d / 0.42) * (1 + boost * 0.5);
  }
  return clamp(y, -1.25, 1.25);
}

export function clearAgainScene(): SceneDef {
  let boost = 0;
  let api: StudyApi | null = null;

  return {
    stateKey: 'strategy',
    buttonAttr: 'data-ca-mode',
    aspect: { wide: 0.44, narrow: 0.96 },
    start: 0,
    lead: 0.985,
    replayInto: true,
    stages: [
      {
        at: 1,
        value: 'hold',
        travel: 6,
        hold: 2.2,
        caption:
          'Trying to hold clarity rigidly: when real pressure arrives, fighting the drift amplifies oscillation and delays settlement.',
      },
      {
        at: 2,
        value: 'return',
        travel: 7,
        caption:
          'Drift still arrives under pressure — nobody stays permanently clear. Noticing sooner shortens the route back: drift → notice → adjust → return.',
      },
    ],
    setup(a) {
      api = a;
      a.root.querySelector<HTMLButtonElement>('[data-ca-pulse]')?.addEventListener('click', () => {
        boost = 1;
        a.wake();
        a.requestDraw();
      });
    },
    step(f) {
      if (boost > 0) boost = Math.max(0, boost - f.dt / 1.5);
    },
    draw(f) {
      const { ctx, w, h, pos, time } = f;
      const padX = f.narrow ? 14 : 28;
      const x0 = padX;
      const x1 = w - padX;
      const top = f.narrow ? 40 : 34;
      const bottom = h - (f.narrow ? 46 : 40);
      const midY = (top + bottom) / 2;
      const amp = (bottom - top) * 0.36;
      const X = (u: number) => lerp(x0, x1, u);
      const b = f.reduced ? 0 : ease(boost);

      const holdDrawn = clamp(pos); // 0..1 of the first passage
      const retDrawn = clamp(pos - 1); // 0..1 of the second
      const inReturn = pos > 1;

      // clarity is a baseline that breathes; it is never a perfect line
      const breathe = (u: number) => (f.reduced ? 0 : Math.sin(u * 38 + time * 0.8) * 0.012 + Math.sin(u * 91 - time * 0.5) * 0.007);

      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x0, midY);
      ctx.lineTo(x1, midY);
      ctx.strokeStyle = rgba(PALETTE.mint, 0.34);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, 'CLEAR BASELINE', x0 + 4, f.narrow ? 13 : midY - 9, { size: f.narrow ? 7.6 : 8.5, color: PALETTE.mint, spacing: 0.5 });

      // pressure arriving
      const pen = inReturn ? retDrawn : holdDrawn;
      PRESS.forEach((p, j) => {
        const x = X(p);
        const hit = clamp(1 - Math.abs(pen - p) * 14);
        ctx.beginPath();
        ctx.moveTo(x, top - 4);
        ctx.lineTo(x, bottom + 4);
        ctx.strokeStyle = rgba(PALETTE.gold, 0.22 + hit * 0.6);
        ctx.lineWidth = 1 + hit;
        ctx.stroke();
        label(ctx, f.narrow ? `P${j + 1}` : `PRESSURE ${j + 1}`, x, top - 12, {
          size: 8,
          color: rgba(PALETTE.gold, 0.75 + hit * 0.25),
          align: 'center',
          spacing: 0.5,
        });
      });

      const trace = (fn: (u: number, b: number) => number, upto: number, color: string, alpha: number, width: number) => {
        if (upto <= 0) return;
        ctx.beginPath();
        const n = Math.max(2, Math.round((x1 - x0) / 2));
        for (let i = 0; i <= n * upto; i++) {
          const u = i / n;
          const y = midY + (fn(u, b) + breathe(u)) * amp;
          if (i === 0) ctx.moveTo(X(u), y);
          else ctx.lineTo(X(u), y);
        }
        ctx.strokeStyle = rgba(color, alpha);
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      };

      // first passage: holding. It stays on the page as a ghost for comparison.
      trace(holding, holdDrawn, PALETTE.coral, inReturn ? lerp(0.95, 0.26, ramp(pos, 1, 1.25)) : 0.95, inReturn ? 1.4 : 2.1);
      // second passage: returning
      trace(returning, retDrawn, '#98c7b8', 1, 2.2);

      // the pen
      if (pen > 0 && pen < 1 && !f.reduced) {
        const fn = inReturn ? returning : holding;
        const y = midY + (fn(pen, b) + breathe(pen)) * amp;
        ctx.beginPath();
        ctx.arc(X(pen), y, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE.ink;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(X(pen), y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(inReturn ? PALETTE.mint : PALETTE.coral, 0.4);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (inReturn) {
        // the four moments of one return, named as the pen passes through them
        if (w > 290) {
          PHASES.forEach((word, i) => {
            const u = PRESS[0] + RETURN_SPAN[0] * PHASE_AT[i];
            const a = ramp(retDrawn, u - 0.01, u + 0.035);
            if (a <= 0) return;
            const y = midY + returning(Math.min(u, PRESS[0] + RETURN_SPAN[0] - 0.001), 0) * amp;
            const above = i === 0 || i === 3;
            ctx.beginPath();
            ctx.arc(X(u), y, 2.4, 0, Math.PI * 2);
            ctx.fillStyle = rgba(PALETTE.ink, a);
            ctx.fill();
            label(ctx, word, X(u) + (i === 3 ? 6 : 0), y + (above ? -10 : 17), {
              size: f.narrow ? 7 : 8,
              color: rgba(PALETTE.ink, a * 0.9),
              align: i === 3 ? 'left' : 'center',
              spacing: 0.8,
            });
          });
        }
        // each way back is measured once it has been completed
        PRESS.forEach((p, j) => {
          const end = p + RETURN_SPAN[j];
          const a = ramp(retDrawn, end - 0.01, end + 0.04);
          if (a <= 0) return;
          const y = bottom + 12;
          const col = j === 2 ? PALETTE.gold : '#98c7b8';
          ctx.beginPath();
          ctx.moveTo(X(p), y);
          ctx.lineTo(lerp(X(p), X(end), a), y);
          ctx.strokeStyle = rgba(col, a);
          ctx.lineWidth = j === 2 ? 1.5 : 1.3;
          ctx.stroke();
          label(ctx, BRACKETS[j], (X(p) + X(end)) / 2, y + 16, {
            size: f.narrow ? 7 : 8.5,
            color: rgba(j === 2 ? PALETTE.gold : PALETTE.muted, a),
            align: 'center',
            spacing: 0.4,
          });
        });
      }
      void api;
    },
  };
}
