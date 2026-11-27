// ICY CLEARER — Living Home Optical Horizon & Interactive Ripple Instrument
// Subtle poetic computational layer over the lakeside threshold; respects prefers-reduced-motion.

interface Ripple {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
}

function initHomeRenaissance() {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-threshold-optics]');
  const toggleBtn = document.querySelector<HTMLButtonElement>('[data-optics-toggle]');
  const coordReadout = document.querySelector<HTMLElement>('[data-threshold-coord]');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let enabled = true;
  const ripples: Ripple[] = [];
  let px = 0.52;
  let py = 0.44;
  let raf = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(rect.width, 320);
    const h = Math.max(rect.height, 320);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  let dims = resize();
  window.addEventListener('resize', () => {
    dims = resize();
    draw(performance.now());
  }, { passive: true });

  const section = canvas.closest('section');
  if (section) {
    let lastSpawn = 0;
    section.addEventListener('pointermove', (e) => {
      const rect = section.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      px = x / rect.width;
      py = y / rect.height;
      if (coordReadout) {
        const deg = (px * 360).toFixed(0).padStart(3, '0');
        const alt = ((1 - py) * 90).toFixed(0).padStart(2, '0');
        coordReadout.textContent = `MERIDIAN ${deg}° · ELEV ${alt}°`;
      }
      const now = performance.now();
      if (!reduceMotion && enabled && now - lastSpawn > 160 && ripples.length < 14) {
        lastSpawn = now;
        ripples.push({ x, y, r: 8, maxR: 88 + Math.random() * 54, alpha: 0.28 });
      }
    }, { passive: true });

    section.addEventListener('pointerdown', (e) => {
      if (reduceMotion || !enabled) return;
      const rect = section.getBoundingClientRect();
      ripples.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        r: 10,
        maxR: 150,
        alpha: 0.42,
      });
    }, { passive: true });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      enabled = !enabled;
      toggleBtn.setAttribute('aria-pressed', String(enabled));
      toggleBtn.textContent = enabled ? '◈ OPTICS ON' : '◇ OPTICS OFF';
      canvas.style.opacity = enabled ? '1' : '0';
    });
  }

  function draw(now: number) {
    const { w, h } = dims;
    ctx.clearRect(0, 0, w, h);
    if (!enabled) return;

    const t = reduceMotion ? 0.6 : now * 0.00045;
    const horizonY = h * 0.245;

    // Subtle astronomical horizon ruler in warm archival slate-ink
    ctx.save();
    ctx.strokeStyle = 'rgba(24, 45, 40, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.04, horizonY);
    ctx.lineTo(w * 0.96, horizonY);
    ctx.stroke();

    // Fine degree ticks across the horizon
    const ticks = 36;
    for (let i = 0; i <= ticks; i++) {
      const tx = w * (0.04 + (i / ticks) * 0.92);
      const major = i % 6 === 0;
      const th = major ? 7 : 3;
      ctx.beginPath();
      ctx.moveTo(tx, horizonY - th);
      ctx.lineTo(tx, horizonY + th);
      ctx.stroke();
    }

    // Translucent orbital meridian arc framing the lakeside stage
    const arcCx = w * 0.68 + (px - 0.5) * 18;
    const arcCy = h * 0.56 + (py - 0.5) * 12;
    const arcR = Math.min(w, h) * 0.42;
    ctx.setLineDash([3, 7]);
    ctx.strokeStyle = 'rgba(24, 45, 40, 0.14)';
    ctx.beginPath();
    ctx.arc(arcCx, arcCy, arcR, -Math.PI * 0.85, Math.PI * 0.15);
    ctx.stroke();
    ctx.setLineDash([]);

    // Gentle sunlit phase dot riding the meridian arc
    const dotAngle = -Math.PI * 0.52 + Math.sin(t) * 0.24;
    const dx = arcCx + Math.cos(dotAngle) * arcR;
    const dy = arcCy + Math.sin(dotAngle) * arcR;
    ctx.fillStyle = 'rgba(181, 118, 42, 0.58)';
    ctx.beginPath();
    ctx.arc(dx, dy, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(181, 118, 42, 0.28)';
    ctx.beginPath();
    ctx.arc(dx, dy, 9, 0, Math.PI * 2);
    ctx.stroke();

    // Expanding water-surface ripples from pointer / touch
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += 1.05;
      rp.alpha *= 0.975;
      if (rp.r >= rp.maxR || rp.alpha < 0.015) {
        ripples.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = `rgba(24, 45, 40, ${rp.alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Subtle corner registration brackets
    ctx.strokeStyle = 'rgba(24, 45, 40, 0.2)';
    const m = 18, b = 12;
    [[m, h - 54, 1, -1], [w - m, h - 54, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * b);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * b, y);
      ctx.stroke();
    });
    ctx.restore();

    if (!reduceMotion && !document.hidden) {
      raf = requestAnimationFrame(draw);
    }
  }

  draw(performance.now());
  window.addEventListener('pagehide', () => {
    if (raf) cancelAnimationFrame(raf);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomeRenaissance, { once: true });
} else {
  initHomeRenaissance();
}
