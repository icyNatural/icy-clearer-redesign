// ICY CLEARER — App World 3D Spatial Astrolabe & Geodesic Observatory
// Purely public interactive geometry using local Three.js; zero private telemetry.
import * as THREE from 'three';

type FieldMode = 'orbit' | 'wireframe' | 'still';

function initWorldField() {
  const host = document.getElementById('world-3d-stage');
  if (!host) return;

  const coordEl = document.querySelector<HTMLElement>('[data-world-coords]');
  const modeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-world-field-mode]'));
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  let mode: FieldMode = reduceMotion ? 'still' : 'orbit';
  try {
    const saved = localStorage.getItem('icy.world.fieldMode') as FieldMode | null;
    if (!reduceMotion && saved && ['orbit', 'wireframe', 'still'].includes(saved)) mode = saved;
  } catch {}

  let targetAccent = new THREE.Color('#8ad3ff');
  let currentAccent = new THREE.Color('#8ad3ff');
  let targetTiltX = 0;
  let targetTiltY = 0;
  let pointerX = 0;
  let pointerY = 0;

  function syncModeButtons() {
    modeButtons.forEach((btn) => {
      btn.setAttribute('aria-pressed', btn.dataset.worldFieldMode === mode ? 'true' : 'false');
    });
  }
  syncModeButtons();

  // Attempt WebGL2/WebGL Three.js renderer, cleanly falling back to 2D Canvas if unavailable
  let renderer: THREE.WebGLRenderer | null = null;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(host.clientWidth || window.innerWidth, host.clientHeight || window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'world-3d-canvas';
    host.replaceChildren(renderer.domElement);
  } catch {
    renderer = null;
  }

  if (!renderer) {
    mountCanvasFallback(host, modeButtons, coordEl, reduceMotion);
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    42,
    (host.clientWidth || window.innerWidth) / Math.max(1, host.clientHeight || window.innerHeight),
    0.1,
    100
  );
  camera.position.set(0, 0.2, 8.2);

  const root = new THREE.Group();
  scene.add(root);

  // Outer Dreamcast/astrolabe geodesic shell
  const icoGeo = new THREE.IcosahedronGeometry(2.75, 1);
  const icoEdges = new THREE.EdgesGeometry(icoGeo);
  const icoMat = new THREE.LineBasicMaterial({ color: 0x7bc8f6, transparent: true, opacity: 0.46 });
  const icoWire = new THREE.LineSegments(icoEdges, icoMat);
  root.add(icoWire);

  // Subtle translucent inner polyhedral glass core
  const coreMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.18, 0),
    new THREE.MeshBasicMaterial({ color: 0x1a3856, transparent: true, opacity: 0.22, wireframe: false })
  );
  root.add(coreMesh);

  // Inner faceted golden polyhedral wireframe
  const innerGeo = new THREE.OctahedronGeometry(1.42, 0);
  const innerEdges = new THREE.EdgesGeometry(innerGeo);
  const innerMat = new THREE.LineBasicMaterial({ color: 0xf4cf84, transparent: true, opacity: 0.64 });
  const innerWire = new THREE.LineSegments(innerEdges, innerMat);
  root.add(innerWire);

  // Nested Saturn/Meridian orbital rings
  const ringGroup = new THREE.Group();
  const ringA = new THREE.Mesh(
    new THREE.TorusGeometry(3.65, 0.016, 8, 128),
    new THREE.MeshBasicMaterial({ color: 0x8ad3ff, transparent: true, opacity: 0.56 })
  );
  ringA.rotation.x = Math.PI * 0.42;
  ringA.rotation.y = 0.22;

  const ringB = new THREE.Mesh(
    new THREE.TorusGeometry(4.45, 0.012, 8, 144),
    new THREE.MeshBasicMaterial({ color: 0xf0c97a, transparent: true, opacity: 0.42 })
  );
  ringB.rotation.x = Math.PI * 0.56;
  ringB.rotation.z = -0.34;

  const ringC = new THREE.Mesh(
    new THREE.TorusGeometry(2.15, 0.013, 8, 96),
    new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.46 })
  );
  ringC.rotation.y = Math.PI * 0.35;
  ringGroup.add(ringA, ringB, ringC);
  root.add(ringGroup);

  // Equatorial degree tick marks
  const tickPts: number[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r0 = 3.74;
    const r1 = i % 6 === 0 ? 4.08 : 3.90;
    tickPts.push(Math.cos(a) * r0, 0, Math.sin(a) * r0, Math.cos(a) * r1, 0, Math.sin(a) * r1);
  }
  const tickGeo = new THREE.BufferGeometry();
  tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(tickPts, 3));
  const tickMat = new THREE.LineBasicMaterial({ color: 0x99d6ff, transparent: true, opacity: 0.52 });
  const ticks = new THREE.LineSegments(tickGeo, tickMat);
  ticks.rotation.x = Math.PI * 0.42;
  ticks.rotation.y = 0.22;
  root.add(ticks);

  // Celestial coordinate star dust
  const starCount = 260;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 4.2 + Math.random() * 7.8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi) * 0.68;
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 2.0;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xd6eeff, size: 0.055, transparent: true, opacity: 0.72 });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  function applyModeVisibility() {
    if (mode === 'wireframe') {
      icoMat.opacity = 0.68;
      innerMat.opacity = 0.82;
      ringA.material.opacity = 0.72;
      ringB.material.opacity = 0.54;
      coreMesh.visible = false;
      starMat.opacity = 0.35;
    } else if (mode === 'still') {
      icoMat.opacity = 0.28;
      innerMat.opacity = 0.38;
      ringA.material.opacity = 0.32;
      ringB.material.opacity = 0.24;
      coreMesh.visible = true;
      starMat.opacity = 0.45;
    } else {
      icoMat.opacity = 0.46;
      innerMat.opacity = 0.64;
      ringA.material.opacity = 0.56;
      ringB.material.opacity = 0.42;
      coreMesh.visible = true;
      starMat.opacity = 0.72;
    }
  }
  applyModeVisibility();

  // Synchronize accent & gimbal with World node interactions
  window.addEventListener('icy-world-focus', ((ev: CustomEvent<{ accent?: string; x?: number; y?: number }>) => {
    const detail = ev.detail || {};
    if (detail.accent) {
      try { targetAccent = new THREE.Color(detail.accent); } catch {}
    } else {
      targetAccent = new THREE.Color('#8ad3ff');
    }
    if (typeof detail.x === 'number' && typeof detail.y === 'number') {
      targetTiltY = ((detail.x - 50) / 50) * 0.45;
      targetTiltX = ((detail.y - 50) / 50) * 0.32;
    } else {
      targetTiltX = 0;
      targetTiltY = 0;
    }
    if (mode === 'still' || reduceMotion) renderOnce();
  }) as EventListener);

  window.addEventListener('pointermove', (e) => {
    if (reduceMotion) return;
    pointerX = (e.clientX / Math.max(1, window.innerWidth)) - 0.5;
    pointerY = (e.clientY / Math.max(1, window.innerHeight)) - 0.5;
    if (coordEl) {
      const az = ((pointerX * 180) + 180).toFixed(1).padStart(5, '0');
      const elv = (-pointerY * 90).toFixed(1);
      const sign = Number(elv) >= 0 ? '+' : '';
      coordEl.textContent = `AZ ${az}° · EL ${sign}${elv}° · 3D ATLAS`;
    }
  }, { passive: true });

  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.worldFieldMode as FieldMode;
      if (!next) return;
      mode = next;
      try { localStorage.setItem('icy.world.fieldMode', mode); } catch {}
      syncModeButtons();
      applyModeVisibility();
      renderOnce();
    });
  });

  function onResize() {
    if (!renderer) return;
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderOnce();
  }
  window.addEventListener('resize', onResize, { passive: true });

  let t = 0;
  function renderOnce() {
    if (!renderer) return;
    currentAccent.lerp(targetAccent, 0.08);
    icoMat.color.copy(currentAccent);
    (ringA.material as THREE.MeshBasicMaterial).color.copy(currentAccent);
    tickMat.color.copy(currentAccent);
    renderer.render(scene, camera);
  }

  let raf = 0;
  function animate() {
    raf = requestAnimationFrame(animate);
    if (document.hidden) return;
    const active = mode !== 'still' && !reduceMotion;
    if (active) {
      t += 0.0055;
      icoWire.rotation.y = t * 0.55;
      icoWire.rotation.x = t * 0.24;
      innerWire.rotation.y = -t * 0.9;
      innerWire.rotation.z = t * 0.4;
      ringGroup.rotation.z = Math.sin(t * 0.5) * 0.12;
      ticks.rotation.z = t * 0.16;
      stars.rotation.y = t * 0.06;
    }
    const desiredX = targetTiltX + pointerY * 0.34;
    const desiredY = targetTiltY + pointerX * 0.42;
    root.rotation.x += (desiredX - root.rotation.x) * 0.05;
    root.rotation.y += (desiredY - root.rotation.y) * 0.05;
    renderOnce();
  }

  // Render an immediate crisp hero pose so static / reduced-motion snapshots look rich
  icoWire.rotation.set(0.32, 0.65, 0.12);
  innerWire.rotation.set(-0.24, 0.48, 0.35);
  renderOnce();
  if (!reduceMotion) animate();

  window.addEventListener('pagehide', () => {
    if (raf) cancelAnimationFrame(raf);
    renderer?.dispose();
  });
}

function mountCanvasFallback(
  host: HTMLElement,
  modeButtons: HTMLButtonElement[],
  coordEl: HTMLElement | null,
  reduceMotion: boolean
) {
  const canvas = document.createElement('canvas');
  canvas.className = 'world-3d-canvas';
  host.replaceChildren(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.48, r = Math.min(w, h) * 0.36;
    ctx.strokeStyle = 'rgba(138, 211, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.15, r * 0.45, -0.18, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(217, 194, 138, 0.18)';
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.92, r * 0.66, 0.26, 0, Math.PI * 2); ctx.stroke();
  }
  draw();
  window.addEventListener('resize', draw, { passive: true });
  if (coordEl && reduceMotion) coordEl.textContent = 'STATIC · 2D ATLAS';
  modeButtons.forEach((b) => { b.disabled = true; });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWorldField, { once: true });
} else {
  initWorldField();
}
