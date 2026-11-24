// M-04 · Coherence vs. Entropy
// One bundle of strands flows left to right through a moment of contact. The
// same bundle is bent between two futures by a single parameter:
//   direct truth      → rough at contact, then the strands line up and stay lined up
//   smooth avoidance  → calm at contact, then the strands wander further apart
// Light moving along the strands shows where the system is still coordinated
// (evenly spaced, same pace) and where it is spending itself.

import { PALETTE, clamp, ease, label, lerp, ramp, rgba, seeded, type Frame, type SceneDef } from './engine';

const N = 9;
const rand = seeded(404);
const STR = Array.from({ length: N }, (_, i) => ({
  phase: rand() * Math.PI * 2,
  freq: 0.8 + rand() * 0.9,
  drift: (rand() - 0.5) * 2, // direction and strength of wandering
  wander: 0.6 + rand() * 1.4,
  pace: 0.75 + rand() * 0.6, // only matters once coordination is lost
  color: i % 3 === 0 ? PALETTE.mint : i % 3 === 1 ? PALETTE.ice : '#b9d8d0',
}));

export const coherenceScene: SceneDef = {
  stateKey: 'scenario',
  buttonAttr: 'data-coh-mode',
  aspect: { wide: 0.44, narrow: 0.98 },
  stages: [
    {
      at: 0,
      value: 'coherence',
      hold: 5.4,
      caption:
        'Uncomfortable at contact, coherent afterwards: confusion clears and the next step takes less energy to coordinate.',
    },
    {
      at: 1,
      value: 'entropy',
      travel: 4.6,
      caption:
        'Smooth at contact, entropic afterwards: avoiding the tension borrows short-term comfort while scattering the system later.',
    },
  ],
  draw(f) {
    const { ctx, w, h, pos, time } = f;
    const k = ease(clamp(pos)); // 0 direct truth … 1 smooth avoidance
    const padX = f.narrow ? 14 : 30;
    const top = f.narrow ? 46 : 40;
    const bottom = h - (f.narrow ? 56 : 44);
    const midY = (top + bottom) / 2;
    const span = bottom - top;
    const xC = lerp(padX, w - padX, f.narrow ? 0.3 : 0.32); // moment of contact
    const xEnd = w - padX;
    const gap = (span * 0.56) / (N - 1);

    const yAt = (i: number, x: number) => {
      const s = STR[i];
      const base = midY + (i - (N - 1) / 2) * gap;
      const before = clamp((xC - x) / (xC - padX));
      const after = clamp((x - xC) / (xEnd - xC));
      // ordinary unevenness before anything is decided
      const approach = Math.sin(x * 0.018 * s.freq + s.phase) * gap * 0.38 * ease(before);
      // direct truth: a rough patch right at contact that dies away quickly
      const rough = Math.exp(-Math.pow((x - xC - span * 0.12) / (span * 0.2), 2));
      const turbulence =
        (Math.sin(x * 0.09 * s.freq + s.phase * 3 + (f.reduced ? 0 : time * 2.2)) * gap * 0.95 +
          Math.sin(x * 0.21 + s.phase) * gap * 0.4) *
        rough *
        (1 - k);
      // smooth avoidance: nothing at contact, then compounding drift
      const grow = Math.pow(after, 1.7);
      const drift =
        (s.drift * span * 0.34 * grow +
          Math.sin(after * 5.2 * s.wander + s.phase + (f.reduced ? 0 : time * 0.5 * s.wander)) * span * 0.11 * grow) *
        k;
      // avoidance also irons the approach flat: it looks calmer than it is
      return base + approach * lerp(1, 0.25, k * (1 - before * 0.4)) + turbulence + drift;
    };

    // contact plane
    ctx.beginPath();
    ctx.setLineDash([3, 4]);
    ctx.moveTo(xC, top - 16);
    ctx.lineTo(xC, bottom + 14);
    ctx.strokeStyle = rgba(PALETTE.gold, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // the felt quality AT contact — the thing surface tone gets judged by
    const roughGlow = (1 - k) * 0.16;
    if (roughGlow > 0.005) {
      const g = ctx.createRadialGradient(xC + span * 0.12, midY, 0, xC + span * 0.12, midY, span * 0.62);
      g.addColorStop(0, rgba(PALETTE.gold, roughGlow));
      g.addColorStop(1, rgba(PALETTE.gold, 0));
      ctx.fillStyle = g;
      ctx.fillRect(xC - span * 0.5, top - 10, span * 1.3, span + 20);
    }

    // strands
    for (let i = 0; i < N; i++) {
      const s = STR[i];
      ctx.beginPath();
      for (let x = padX; x <= xEnd; x += 4) {
        const y = yAt(i, x);
        if (x === padX) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const tint = k > 0.5 && i % 2 === 0 ? PALETTE.coral : k > 0.5 && i % 3 === 0 ? PALETTE.gold : s.color;
      const grad = ctx.createLinearGradient(xC, 0, xEnd, 0);
      grad.addColorStop(0, rgba(s.color, 0.72));
      grad.addColorStop(1, rgba(tint, lerp(0.85, 0.7, k)));
      ctx.strokeStyle = grad;
      ctx.lineWidth = lerp(1.6, 1.25, k);
      ctx.stroke();
    }

    // light travelling along the strands: in step while coordinated, out of step once not
    for (let i = 0; i < N; i++) {
      const s = STR[i];
      const count = 5;
      for (let j = 0; j < count; j++) {
        const t = f.reduced ? 0 : time;
        // before contact every strand keeps the same pace; after it, pace diverges with k
        const u0 = (t * 0.085 + j / count) % 1;
        const u1 = (t * 0.085 * lerp(1, s.pace, k) + j / count + k * s.phase * 0.15) % 1;
        const x0 = lerp(padX, xEnd, u0);
        const x = x0 < xC ? x0 : lerp(padX, xEnd, lerp(u0, u1, clamp((x0 - xC) / (xEnd - xC)) * 1));
        const y = yAt(i, x);
        const edge = Math.min(1, (x - padX) / 30, (xEnd - x) / 30);
        ctx.beginPath();
        ctx.arc(x, y, 2.1, 0, Math.PI * 2);
        ctx.fillStyle = rgba(PALETTE.ink, 0.85 * clamp(edge));
        ctx.fill();
      }
    }

    // ── words (all from the original study) ────────────────────────────
    const s1 = f.narrow ? 7.6 : 8.5;
    label(ctx, 'BEFORE ACTION', (padX + xC) / 2, top - 22, { size: s1, color: PALETTE.faint, align: 'center', spacing: 0.6 });
    label(ctx, f.narrow ? 'AFTERWARDS' : 'WHAT HAPPENS AFTERWARDS', (xC + xEnd) / 2, top - 22, {
      size: s1,
      color: PALETTE.muted,
      align: 'center',
      spacing: 0.6,
    });
    label(ctx, 'MOMENT OF CONTACT', f.narrow ? Math.max(xC, 62) : xC, bottom + 30, { size: s1, color: PALETTE.gold, align: 'center', spacing: 0.6 });

    const aCo = 1 - ramp(pos, 0.25, 0.6);
    const aEn = ramp(pos, 0.45, 0.85);
    const endY = h - (f.narrow ? 8 : 10);
    if (f.narrow) {
      if (aCo > 0) {
        label(ctx, 'NEXT STEP CLEARER', xEnd, endY - 12, { size: 8, color: rgba(PALETTE.mint, aCo), align: 'right', spacing: 0.6 });
        label(ctx, 'LOWER REPAIR COST', xEnd, endY, { size: 8, color: rgba(PALETTE.mint, aCo), align: 'right', spacing: 0.6 });
      }
      if (aEn > 0) {
        label(ctx, 'NEXT STEP MURKIER', xEnd, endY - 12, { size: 8, color: rgba(PALETTE.coral, aEn), align: 'right', spacing: 0.6 });
        label(ctx, 'DRIFT COMPOUNDS', xEnd, endY, { size: 8, color: rgba(PALETTE.coral, aEn), align: 'right', spacing: 0.6 });
      }
    } else {
      if (aCo > 0)
        label(ctx, 'NEXT STEP CLEARER · LOWER REPAIR COST', xEnd, endY, { size: 9, color: rgba(PALETTE.mint, aCo), align: 'right', spacing: 0.6 });
      if (aEn > 0)
        label(ctx, 'NEXT STEP MURKIER · DRIFT COMPOUNDS', xEnd, endY, { size: 9, color: rgba(PALETTE.coral, aEn), align: 'right', spacing: 0.6 });
    }
  },
};
