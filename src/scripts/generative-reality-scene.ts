import * as THREE from 'three';

export type StageId =
  | 'perception'
  | 'recognition'
  | 'simulation'
  | 'orchestration'
  | 'transformation'
  | 'generativity';

interface CameraPose {
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
}

const STAGE_IDS: StageId[] = [
  'perception',
  'recognition',
  'simulation',
  'orchestration',
  'transformation',
  'generativity',
];

const STAGE_META: Record<
  StageId,
  { number: string; badge: string; note: string; state: string }
> = {
  perception: {
    number: '01 / 06',
    badge: 'ACTUAL: PRESENT · PERCEIVED: UNSEEN',
    note: 'The passage is already carved into the stone. From this angle, it still looks like a wall.',
    state: 'Initial vantage · stone unchanged',
  },
  recognition: {
    number: '02 / 06',
    badge: 'PERCEIVED AFFORDANCE EXPANDED · WORLD UNCHANGED',
    note: 'The opening becomes visible. Zero stone moved — only resolution and angle shifted.',
    state: 'Camera orbits · hidden seam resolved',
  },
  simulation: {
    number: '03 / 06',
    badge: 'MODELLED ROUTES · NOT YET ACTUAL',
    note: 'Three crossings appear as translucent projections — weightless hypotheses, not yet facts.',
    state: 'Three imagined trajectories tested',
  },
  orchestration: {
    number: '04 / 06',
    badge: 'FROM MODEL TO REAL COORDINATION',
    note: 'One trajectory takes physical mass — piers anchor and stone spans the gap.',
    state: 'Load-bearing crossing assembled',
  },
  transformation: {
    number: '05 / 06',
    badge: 'ACTUAL AFFORDANCE CHANGED · NEW VANTAGE',
    note: 'Crossing onto the far ridge unlocks terrain and sightlines that did not exist from the near bank.',
    state: 'Far plateau reached · horizon opens',
  },
  generativity: {
    number: '06 / 06',
    badge: 'UNPLANNED POSSIBILITIES EMERGING',
    note: 'Secondary routes and distant thresholds emerge in directions the original crossing never planned.',
    state: 'Panoramic valley · branching futures',
  },
};

// Camera choreography tailored for wide desktop (framing world clearly right-of-center beside narrative)
// and centered mobile viewport (framing world symmetrically above narrative).
const DESKTOP_POSES: CameraPose[] = [
  // 01 Perception: oblique left vantage where the projecting monolith flank visually conceals the carved slot
  { pos: [-10.4, 2.25, 6.9], look: [-1.8, 2.1, 2.5], fov: 39 },
  // 02 Recognition: orbital shift aligns cleanly with the carved corridor — zero geometry moved!
  { pos: [-1.5, 2.65, 10.6], look: [-0.9, 1.85, -1.8], fov: 40 },
  // 03 Simulation: elevated surveyor vantage past the monolith rim looking across the open chasm & all 3 glowing ghost routes
  { pos: [-7.4, 5.8, -0.2], look: [0.2, 0.35, -3.5], fov: 45 },
  // 04 Orchestration: clear three-quarter engineering view past the monolith wing showing piers & golden deck slabs spanning the canyon
  { pos: [8.4, 4.5, -1.0], look: [-1.2, 0.15, -3.0], fov: 44 },
  // 05 Transformation: glides onto the Far Plateau revealing the bridge behind & previously hidden outer valley ahead
  { pos: [-3.8, 3.9, -5.6], look: [0.4, 1.15, -22.0], fov: 48 },
  // 06 Generativity: sweeping panoramic aerial revealing the whole valley, luminous branching viaducts & far arches
  { pos: [13.2, 12.6, 1.8], look: [-1.8, 0.9, -17.5], fov: 49 },
];

const MOBILE_POSES: CameraPose[] = [
  { pos: [-9.8, 2.25, 7.6], look: [-1.2, 2.0, 2.4], fov: 45 },
  { pos: [0.0, 2.6, 11.4], look: [0.0, 1.8, -2.0], fov: 46 },
  { pos: [-6.8, 6.4, -0.4], look: [0.0, 0.3, -3.5], fov: 50 },
  { pos: [8.6, 4.8, -1.2], look: [0.0, 0.15, -3.2], fov: 49 },
  { pos: [-0.6, 4.1, -5.4], look: [0.0, 1.2, -22.5], fov: 52 },
  { pos: [12.4, 13.6, 4.4], look: [0.0, 0.9, -16.5], fov: 53 },
];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function addEdgedBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  edgeMat?: THREE.LineBasicMaterial
) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  if (edgeMat) {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
    mesh.add(edges);
  }
  return mesh;
}

function initAffordancePlate() {
  const plate = document.querySelector<HTMLElement>('[data-affordance-plate]');
  if (!plate) return;
  const buttons = [...plate.querySelectorAll<HTMLButtonElement>('[data-aff-mode]')];
  const statusEl = plate.querySelector<HTMLElement>('[data-aff-status]');
  const physicalEl = plate.querySelector<HTMLElement>('[data-aff-physical]');
  const perceivedEl = plate.querySelector<HTMLElement>('[data-aff-perceived]');
  const descEl = plate.querySelector<HTMLElement>('[data-aff-desc]');

  const states: Record<
    string,
    { status: string; physical: string; perceived: string; desc: string }
  > = {
    unseen: {
      status: '00 · BEFORE RECOGNITION',
      physical: 'Carved opening present · Chasm unbridged',
      perceived: 'Reads as solid wall',
      desc: 'An actual opening already exists in the architecture, and a canyon lies beyond it — yet from this low-resolution view, neither possibility is perceived.',
    },
    perceived: {
      status: '01 · RESOLUTION SHIFTED (PERCEIVED AFFORDANCE)',
      physical: 'Identical stone · Zero physical change',
      perceived: 'Hidden passage recognized',
      desc: 'Notice that every stone wall coordinate stayed completely fixed. Only raking light and angle shifted — expanding your resolution of what was already there.',
    },
    actual: {
      status: '02 · ACTION TAKEN (ACTUAL AFFORDANCE CHANGED)',
      physical: 'Load-bearing bridge added · Far ridge linked',
      perceived: 'New territory now reachable',
      desc: 'Now acting on recognition alters the physical environment itself. A crossing carries weight, making actions feasible that genuinely could not happen before.',
    },
  };

  const apply = (mode: string) => {
    const info = states[mode] || states.perceived;
    plate.dataset.affState = mode;
    buttons.forEach((btn) => {
      const active = btn.dataset.affMode === mode;
      btn.setAttribute('aria-pressed', String(active));
      btn.classList.toggle('is-active', active);
    });
    if (statusEl) statusEl.textContent = info.status;
    if (physicalEl) physicalEl.textContent = info.physical;
    if (perceivedEl) perceivedEl.textContent = info.perceived;
    if (descEl) descEl.textContent = info.desc;
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => apply(btn.dataset.affMode || 'perceived'));
  });
  apply('perceived');
}

function initGenerativeReality() {
  initAffordancePlate();

  const stageHost = document.querySelector<HTMLElement>('[data-gr-stage]');
  const canvasWrap = document.querySelector<HTMLElement>('[data-gr-canvas-wrap]');
  const chapters = [...document.querySelectorAll<HTMLElement>('.gr-chapter')];
  const railButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-gr-jump]')];
  const stageNumEl = document.querySelector<HTMLElement>('[data-gr-stage-num]');
  const stageBadgeEl = document.querySelector<HTMLElement>('[data-gr-stage-badge]');
  const stageNoteEl = document.querySelector<HTMLElement>('[data-gr-stage-note]');
  const stageStateEl = document.querySelector<HTMLElement>('[data-gr-stage-state]');
  const progressBar = document.querySelector<HTMLElement>('[data-gr-progress-fill]');

  if (!stageHost || !chapters.length) return;

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeStageIndex = 0;
  let targetProgress = 0;
  let currentProgress = 0;
  let isStageVisible = true;
  let pointerX = 0;
  let pointerY = 0;
  let smoothPointerX = 0;
  let smoothPointerY = 0;

  // Update DOM HUD & active chapter markers
  const syncHud = (index: number, rawProgress: number) => {
    const clampedIndex = Math.max(0, Math.min(STAGE_IDS.length - 1, index));
    const stageId = STAGE_IDS[clampedIndex];
    const meta = STAGE_META[stageId];

    if (document.documentElement.dataset.scene !== stageId) {
      document.documentElement.dataset.scene = stageId;
      activeStageIndex = clampedIndex;
      if (stageNumEl) stageNumEl.textContent = meta.number;
      if (stageBadgeEl) stageBadgeEl.textContent = meta.badge;
      if (stageNoteEl) stageNoteEl.textContent = meta.note;
      if (stageStateEl) stageStateEl.textContent = meta.state;
      railButtons.forEach((btn) => {
        const isCurrent = Number(btn.dataset.grJump) === clampedIndex;
        btn.classList.toggle('is-active', isCurrent);
        btn.setAttribute('aria-current', isCurrent ? 'step' : 'false');
      });
      chapters.forEach((ch, idx) => {
        ch.classList.toggle('is-active', idx === clampedIndex);
      });
    }

    if (progressBar) {
      const pct = clamp01(rawProgress / (STAGE_IDS.length - 1)) * 100;
      progressBar.style.setProperty('--gr-pct', `${pct.toFixed(2)}%`);
    }
  };

  // Compute continuous scroll progress [0..5] across the 6 chapters
  const computeScrollProgress = () => {
    const isMobile = window.innerWidth <= 900;
    const anchorY = isMobile
      ? Math.min(390, Math.max(270, window.innerHeight * 0.44)) + 165
      : window.innerHeight * 0.48;
    const centers = chapters.map((ch) => {
      const r = ch.getBoundingClientRect();
      return r.top + (isMobile ? Math.min(120, r.height * 0.32) : r.height * 0.46);
    });

    if (centers[0] >= anchorY) return 0;
    const lastIdx = centers.length - 1;
    if (centers[lastIdx] <= anchorY) return lastIdx;

    for (let i = 0; i < lastIdx; i++) {
      const c0 = centers[i];
      const c1 = centers[i + 1];
      if (anchorY <= c0 && anchorY >= c1) {
        const span = c0 - c1 || 1;
        return i + clamp01((c0 - anchorY) / span);
      }
      if (anchorY >= c0 && anchorY <= c1) {
        const span = c1 - c0 || 1;
        return i + clamp01((anchorY - c0) / span);
      }
    }
    return activeStageIndex;
  };

  // Wire up jump buttons (desktop rail + mobile tap pills)
  const jumpToStage = (idx: number) => {
    const targetChapter = chapters[idx];
    if (!targetChapter) return;
    targetProgress = idx;
    syncHud(idx, idx);
    const isMobile = window.innerWidth <= 900;
    const rect = targetChapter.getBoundingClientRect();
    const targetScrollY = isMobile
      ? window.scrollY + rect.top - (Math.min(390, Math.max(270, window.innerHeight * 0.44)) + 74)
      : window.scrollY + rect.top + rect.height * 0.46 - window.innerHeight * 0.48;
    window.scrollTo({
      top: Math.max(0, targetScrollY),
      behavior: reducedMotionQuery.matches ? 'auto' : 'smooth',
    });
  };

  railButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.grJump);
      if (!Number.isNaN(idx)) jumpToStage(idx);
    });
  });

  // Keyboard shortcuts when user presses 1..6 while not typing in an input
  document.addEventListener('keydown', (event) => {
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || event.metaKey || event.ctrlKey || event.altKey) return;
    if (/^[1-6]$/.test(event.key) && isStageVisible) {
      jumpToStage(Number(event.key) - 1);
    }
  });

  // ── THREE.JS ARCHITECTURAL WORLD ─────────────────────────────────────────
  let renderer: THREE.WebGLRenderer | null = null;
  let renderSceneNow: ((prog: number, timeSec: number) => void) | null = null;

  if (canvasWrap) {
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      canvasWrap.appendChild(renderer.domElement);
      stageHost.dataset.webgl = 'active';
    } catch {
      renderer = null;
      stageHost.dataset.webgl = 'fallback';
    }
  }

  if (renderer && canvasWrap) {
    const scene = new THREE.Scene();
    const bgColor = new THREE.Color('#071016');
    const fogColor = new THREE.Color('#071016');
    scene.background = bgColor;
    const fog = new THREE.FogExp2(fogColor.getHex(), 0.028);
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.15, 160);
    const lookTarget = new THREE.Vector3();

    // ── LIGHTING RIG ───────────────────────────────────────────────────────
    const hemiLight = new THREE.HemisphereLight('#92c4d8', '#242b30', 1.65);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#f8e4bc', 2.25);
    keyLight.position.set(-10, 12, 8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#8dd5ea', 1.35);
    rimLight.position.set(12, 9, -14);
    scene.add(rimLight);

    // Warm gold interior light inside the pre-existing carved monolith opening
    const passageLight = new THREE.PointLight('#f7cf84', 0.1, 18, 1.3);
    passageLight.position.set(0.0, 2.0, 1.3);
    scene.add(passageLight);

    // Bridge construction amber work-light
    const buildLight = new THREE.PointLight('#f2c478', 0.0, 22, 1.25);
    buildLight.position.set(1.2, 3.2, -2.6);
    scene.add(buildLight);

    // Far plateau transformation glow
    const arrivalLight = new THREE.PointLight('#bcebd7', 0.0, 34, 1.15);
    arrivalLight.position.set(0.0, 5.2, -11.5);
    scene.add(arrivalLight);

    // Emergent valley horizon light
    const valleyLight = new THREE.PointLight('#b0e6ca', 0.0, 58, 1.1);
    valleyLight.position.set(0.0, 8.5, -24.0);
    scene.add(valleyLight);

    // ── SHARED MATERIALS ───────────────────────────────────────────────────
    const darkBasalt = new THREE.MeshStandardMaterial({
      color: '#253742',
      roughness: 0.78,
      metalness: 0.16,
    });
    const cliffStone = new THREE.MeshStandardMaterial({
      color: '#1d2d37',
      roughness: 0.84,
      metalness: 0.14,
    });
    const monolithStone = new THREE.MeshStandardMaterial({
      color: '#283d49',
      roughness: 0.68,
      metalness: 0.2,
    });
    const innerStoneMat = new THREE.MeshStandardMaterial({
      color: '#344d58',
      emissive: '#583f18',
      emissiveIntensity: 0.0,
      roughness: 0.56,
      metalness: 0.24,
    });
    const farTerraceMat = new THREE.MeshStandardMaterial({
      color: '#283f4a',
      emissive: '#14312d',
      emissiveIntensity: 0.08,
      roughness: 0.72,
      metalness: 0.18,
    });
    const valleyStoneMat = new THREE.MeshStandardMaterial({
      color: '#233843',
      emissive: '#13312b',
      emissiveIntensity: 0.08,
      roughness: 0.78,
      metalness: 0.15,
    });
    const stoneEdge = new THREE.LineBasicMaterial({
      color: '#88b6c4',
      transparent: true,
      opacity: 0.42,
    });
    const warmSeamEdge = new THREE.LineBasicMaterial({
      color: '#f5cf86',
      transparent: true,
      opacity: 0.05,
    });

    // ── 1. NEAR PLATEAU (z: 2.0 → 14.5) ────────────────────────────────────
    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    // Main near plateau deck
    addEdgedBox(terrainGroup, 19, 4.4, 12.5, 0, -2.2, 8.2, darkBasalt, stoneEdge);
    // Subtle lower architectural step along canyon lip
    addEdgedBox(terrainGroup, 17, 2.0, 2.2, 0, -1.25, 2.1, cliffStone, stoneEdge);
    // Flanking elevated near-side rock terraces
    addEdgedBox(terrainGroup, 4.6, 1.4, 9.5, -7.2, 0.7, 7.6, cliffStone, stoneEdge);
    addEdgedBox(terrainGroup, 4.2, 0.9, 8.0, 7.4, 0.45, 7.2, cliffStone, stoneEdge);

    // Engraved architectural coordinate survey lines on the near terrace
    const gridMat = new THREE.LineBasicMaterial({
      color: '#7da5b0',
      transparent: true,
      opacity: 0.14,
    });
    const gridPts: number[] = [];
    for (let x = -7; x <= 7; x += 1.4) {
      gridPts.push(x, 0.02, 2.5, x, 0.02, 13.5);
    }
    for (let z = 3; z <= 13; z += 1.5) {
      gridPts.push(-7, 0.02, z, 7, 0.02, z);
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3));
    terrainGroup.add(new THREE.LineSegments(gridGeo, gridMat));

    // ── 2. THE MONOLITH WALL WITH PRE-EXISTING CARVED PASSAGE ──────────────
    // Built as fixed static stone geometry from frame 1!
    // An angled doorway gap (x: -1.15 → +1.15) cuts straight through the stone mass.
    // From Stage 01's oblique camera angle, the projecting left wing and offset rear baffle
    // visually hide the opening; orbiting in Stage 02 reveals it with ZERO mesh movement.
    const monolithGroup = new THREE.Group();
    scene.add(monolithGroup);

    // Left massive stone wing (projects forward cleanly to occlude carved slot from oblique left Perception angle)
    addEdgedBox(monolithGroup, 5.2, 5.4, 3.2, -3.75, 2.7, 2.75, monolithStone, stoneEdge);
    // Right massive stone wing
    addEdgedBox(monolithGroup, 4.8, 5.2, 2.1, 3.55, 2.6, 1.85, monolithStone, stoneEdge);
    // Monumental overhanging lintel beam spanning the gap (leaves a crisp 3.7-unit tall passage)
    addEdgedBox(monolithGroup, 3.4, 1.45, 2.4, 0.0, 4.48, 2.05, monolithStone, stoneEdge);
    // Chamfered inner threshold reveals (catch the warm raking light in Stage 02!)
    addEdgedBox(monolithGroup, 0.24, 3.75, 2.35, -1.08, 1.88, 2.08, innerStoneMat, warmSeamEdge);
    addEdgedBox(monolithGroup, 0.24, 3.75, 2.35, 1.08, 1.88, 2.08, innerStoneMat, warmSeamEdge);
    // Floor threshold sill inside the carved passage
    addEdgedBox(monolithGroup, 2.1, 0.14, 2.5, 0.0, 0.07, 2.05, innerStoneMat, warmSeamEdge);
    // Subtle angled stone fin behind right flank (reinforces "solid wall" read from oblique left)
    addEdgedBox(monolithGroup, 1.6, 4.5, 0.85, 2.15, 2.25, 0.65, cliffStone, stoneEdge);

    // Luminous seam frame outlining the inner stone doorway (fades up in Recognition)
    const seamPts = [
      -0.96, 0.14, 3.22, -0.96, 3.74, 3.22,
      -0.96, 3.74, 3.22, 0.96, 3.74, 3.22,
      0.96, 3.74, 3.22, 0.96, 0.14, 3.22,
      -0.96, 0.14, 0.92, -0.96, 3.74, 0.92,
      -0.96, 3.74, 0.92, 0.96, 3.74, 0.92,
      0.96, 3.74, 0.92, 0.96, 0.14, 0.92,
    ];
    const seamGeo = new THREE.BufferGeometry();
    seamGeo.setAttribute('position', new THREE.Float32BufferAttribute(seamPts, 3));
    const seamGlowMat = new THREE.LineBasicMaterial({
      color: '#f5cf86',
      transparent: true,
      opacity: 0.0,
    });
    monolithGroup.add(new THREE.LineSegments(seamGeo, seamGlowMat));

    // Volumetric translucent gold light shaft pouring through the carved opening in Recognition
    const shaftGeo = new THREE.PlaneGeometry(2.1, 7.6);
    const shaftMat = new THREE.MeshBasicMaterial({
      color: '#f2c87e',
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const floorShaft = new THREE.Mesh(shaftGeo, shaftMat);
    floorShaft.rotation.x = -Math.PI / 2;
    floorShaft.position.set(0, 0.09, 5.2);
    monolithGroup.add(floorShaft);

    const beamGeo = new THREE.PlaneGeometry(1.9, 4.4);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#f6d28e',
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const verticalBeam = new THREE.Mesh(beamGeo, beamMat);
    verticalBeam.position.set(0, 1.9, 2.8);
    verticalBeam.rotation.y = Math.PI / 2;
    monolithGroup.add(verticalBeam);

    // ── 3. THE CANYON & MID-CHASM STONE PILLAR (z: -7.0 → 1.0) ─────────────
    // Abyss floor far below
    const abyssFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(75, 45),
      new THREE.MeshStandardMaterial({ color: '#050b10', roughness: 0.95 })
    );
    abyssFloor.rotation.x = -Math.PI / 2;
    abyssFloor.position.set(0, -6.4, -8);
    terrainGroup.add(abyssFloor);

    // Natural mid-canyon basalt pier outcrop (real latent affordance inside the chasm!)
    addEdgedBox(terrainGroup, 2.2, 5.6, 1.8, 0.0, -3.6, -2.8, cliffStone, stoneEdge);
    addEdgedBox(terrainGroup, 1.7, 0.5, 1.4, 0.0, -0.65, -2.8, monolithStone, stoneEdge);

    // ── 4. FAR PLATEAU (z: -16.0 → -6.8) ───────────────────────────────────
    const farPlateauGroup = new THREE.Group();
    scene.add(farPlateauGroup);

    // Main elevated far plateau
    addEdgedBox(farPlateauGroup, 21, 5.0, 9.2, 0, -2.1, -11.4, farTerraceMat, stoneEdge);
    // Landing apron receiving the bridge
    addEdgedBox(farPlateauGroup, 4.4, 0.6, 2.4, 0, 0.1, -7.2, farTerraceMat, stoneEdge);
    // Sculpted flanking ridges on Far Plateau (occlude the outer valley from the Near Plateau!)
    addEdgedBox(farPlateauGroup, 6.4, 3.2, 3.6, -6.4, 1.8, -9.8, farTerraceMat, stoneEdge);
    addEdgedBox(farPlateauGroup, 6.2, 2.8, 3.4, 6.6, 1.6, -10.2, farTerraceMat, stoneEdge);
    // Central arrival plinth / observatory ring on Far Plateau
    const arrivalRingMat = new THREE.MeshBasicMaterial({
      color: '#b9e4d2',
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const arrivalRing = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.72, 48), arrivalRingMat);
    arrivalRing.rotation.x = -Math.PI / 2;
    arrivalRing.position.set(0, 0.43, -11.2);
    farPlateauGroup.add(arrivalRing);

    const arrivalOuterRing = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.68, 56), arrivalRingMat);
    arrivalOuterRing.rotation.x = -Math.PI / 2;
    arrivalOuterRing.position.set(0, 0.43, -11.2);
    farPlateauGroup.add(arrivalOuterRing);

    // ── 5. CONCEALED OUTER VALLEY BEYOND FAR RIDGE (revealed in Stages 05–06)
    const valleyGroup = new THREE.Group();
    scene.add(valleyGroup);

    // Distant valley water/mist plane
    const valleyPlaneMat = new THREE.MeshStandardMaterial({
      color: '#0c1c24',
      emissive: '#0c2426',
      emissiveIntensity: 0.12,
      roughness: 0.35,
      metalness: 0.5,
    });
    const valleyPlane = new THREE.Mesh(new THREE.PlaneGeometry(84, 42), valleyPlaneMat);
    valleyPlane.rotation.x = -Math.PI / 2;
    valleyPlane.position.set(0, -2.4, -30);
    valleyGroup.add(valleyPlane);

    // Distant sculpted mesas & horizon islands waiting beyond the far ridge
    const distantMesas: [number, number, number, number, number, number][] = [
      [10, 4.6, 8, -11.5, -0.3, -24.5],
      [11, 5.2, 8.5, 11.2, 0.0, -25.8],
      [9, 4.0, 7.5, -0.8, -0.5, -31.5],
      [12, 6.0, 7, -18.5, 0.6, -34.0],
      [12, 5.6, 7.5, 18.8, 0.4, -35.0],
      [15, 6.8, 8, 1.5, 1.0, -42.0],
    ];
    distantMesas.forEach(([w, h, d, x, y, z]) => {
      addEdgedBox(valleyGroup, w, h, d, x, y, z, valleyStoneMat, stoneEdge);
    });

    // ── 6. STAGE 03 SIMULATION: THREE TRANSLUCENT PROJECTED ROUTES ─────────
    const simGroup = new THREE.Group();
    scene.add(simGroup);

    const makeGhostRoute = (
      points: THREE.Vector3[],
      colorHex: string,
      tubeRadius: number
    ) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const ribbonGeo = new THREE.TubeGeometry(curve, 44, tubeRadius, 6, false);
      const wireMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        wireframe: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const wireMesh = new THREE.Mesh(ribbonGeo, wireMat);

      const linePts = curve.getPoints(56);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const lineMat = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0,
      });
      const line = new THREE.Line(lineGeo, lineMat);

      const group = new THREE.Group();
      group.add(wireMesh, line);
      simGroup.add(group);
      return { group, wireMat, lineMat };
    };

    // Route A: High sweeping suspension arc (ambitious tension)
    const ghostA = makeGhostRoute(
      [
        new THREE.Vector3(0, 0.35, 1.1),
        new THREE.Vector3(-0.9, 2.35, -1.4),
        new THREE.Vector3(-0.6, 2.55, -4.4),
        new THREE.Vector3(0.0, 0.55, -7.0),
      ],
      '#8ad3ef',
      0.16
    );

    // Route B: Grounded direct crossing aligning with mid-canyon stone pier (selected in Stage 04!)
    const ghostB = makeGhostRoute(
      [
        new THREE.Vector3(0, 0.22, 1.1),
        new THREE.Vector3(0, 0.28, -2.8),
        new THREE.Vector3(0, 0.38, -7.0),
      ],
      '#f2ca82',
      0.22
    );

    // Route C: Wide flanking curve toward eastern far ridge
    const ghostC = makeGhostRoute(
      [
        new THREE.Vector3(0, 0.3, 1.1),
        new THREE.Vector3(3.1, 1.15, -1.7),
        new THREE.Vector3(4.5, 1.5, -5.4),
        new THREE.Vector3(4.8, 1.65, -8.8),
      ],
      '#9fd9c4',
      0.16
    );

    // Delicate surveying arc sweeping above the canyon during Simulation
    const surveyArcGeo = new THREE.TorusGeometry(4.6, 0.02, 8, 64, Math.PI * 0.72);
    const surveyArcMat = new THREE.MeshBasicMaterial({
      color: '#9dcfe4',
      transparent: true,
      opacity: 0,
    });
    const surveyArc = new THREE.Mesh(surveyArcGeo, surveyArcMat);
    surveyArc.position.set(0, 0.6, -2.8);
    surveyArc.rotation.y = Math.PI / 2;
    surveyArc.rotation.z = 0.42;
    simGroup.add(surveyArc);

    // ── 7. STAGE 04 ORCHESTRATION: REAL SOLID MODULAR BRIDGE ASSEMBLY ──────
    const bridgeGroup = new THREE.Group();
    scene.add(bridgeGroup);

    const bridgeStoneMat = new THREE.MeshStandardMaterial({
      color: '#344952',
      roughness: 0.58,
      metalness: 0.28,
      transparent: true,
      opacity: 0,
    });
    const bridgeTrimMat = new THREE.MeshStandardMaterial({
      color: '#d9b16c',
      emissive: '#6d4b18',
      emissiveIntensity: 0.42,
      roughness: 0.35,
      metalness: 0.65,
      transparent: true,
      opacity: 0,
    });
    const bridgeEdgeMat = new THREE.LineBasicMaterial({
      color: '#d4e2dc',
      transparent: true,
      opacity: 0,
    });

    // Twin heavy vertical structural piers anchoring onto the mid-canyon stone outcrop
    const pierLeft = addEdgedBox(bridgeGroup, 0.42, 1.85, 0.72, -0.78, -0.58, -2.8, bridgeStoneMat, bridgeEdgeMat);
    const pierRight = addEdgedBox(bridgeGroup, 0.42, 1.85, 0.72, 0.78, -0.58, -2.8, bridgeStoneMat, bridgeEdgeMat);
    // Near & far rock abutments
    const nearAbut = addEdgedBox(bridgeGroup, 2.3, 0.65, 0.85, 0, -0.08, 0.85, bridgeStoneMat, bridgeEdgeMat);
    const farAbut = addEdgedBox(bridgeGroup, 2.4, 0.75, 0.95, 0, 0.0, -6.95, bridgeStoneMat, bridgeEdgeMat);

    // 11 interlocking architectural bridge deck slabs spanning z = 0.55 → -6.55
    const deckSegments: { mesh: THREE.Mesh; trimL: THREE.Mesh; trimR: THREE.Mesh; targetY: number }[] = [];
    const segCount = 11;
    for (let i = 0; i < segCount; i++) {
      const t = i / (segCount - 1);
      const z = lerp(0.55, -6.55, t);
      const targetY = lerp(0.18, 0.38, t);
      const slabMat = bridgeStoneMat.clone();
      const slabGeo = new THREE.BoxGeometry(2.05, 0.24, 0.64);
      const mesh = new THREE.Mesh(slabGeo, slabMat);
      mesh.position.set(0, targetY, z);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(slabGeo), bridgeEdgeMat);
      mesh.add(edges);
      bridgeGroup.add(mesh);

      const trimGeo = new THREE.BoxGeometry(0.09, 0.36, 0.62);
      const trimL = new THREE.Mesh(trimGeo, bridgeTrimMat);
      trimL.position.set(-1.02, targetY + 0.18, z);
      const trimR = new THREE.Mesh(trimGeo, bridgeTrimMat);
      trimR.position.set(1.02, targetY + 0.18, z);
      bridgeGroup.add(trimL, trimR);

      deckSegments.push({ mesh, trimL, trimR, targetY });
    }

    // ── 8. STAGE 06 GENERATIVITY: EMERGENT UNPLANNED BRANCHES & ARCHES ─────
    const genGroup = new THREE.Group();
    scene.add(genGroup);

    const branchPaths: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; fullCount: number; delay: number }[] = [];
    const branchSpecs: { pts: THREE.Vector3[]; color: string; delay: number; radius: number }[] = [
      // Left curving botanical viaduct toward western distant mesa
      {
        pts: [
          new THREE.Vector3(-1.4, 0.45, -11.8),
          new THREE.Vector3(-5.8, 0.85, -15.6),
          new THREE.Vector3(-9.2, 1.35, -19.8),
          new THREE.Vector3(-11.4, 1.95, -24.0),
        ],
        color: '#a9dec7',
        delay: 0.0,
        radius: 0.24,
      },
      // Right sweeping arch toward eastern distant mesa
      {
        pts: [
          new THREE.Vector3(1.5, 0.45, -11.8),
          new THREE.Vector3(5.6, 1.05, -15.4),
          new THREE.Vector3(8.8, 1.55, -20.4),
          new THREE.Vector3(11.0, 2.2, -25.2),
        ],
        color: '#e6c280',
        delay: 0.12,
        radius: 0.24,
      },
      // Center forward elevated ribbon to the deep central mesa
      {
        pts: [
          new THREE.Vector3(0.0, 0.48, -13.0),
          new THREE.Vector3(-0.6, 1.25, -18.5),
          new THREE.Vector3(-0.9, 1.55, -25.0),
          new THREE.Vector3(-0.8, 1.6, -31.0),
        ],
        color: '#a4d6e8',
        delay: 0.18,
        radius: 0.22,
      },
      // Secondary recombination bridge connecting western mesa → outer northwest horizon
      {
        pts: [
          new THREE.Vector3(-11.4, 1.95, -24.5),
          new THREE.Vector3(-14.6, 2.55, -28.8),
          new THREE.Vector3(-17.8, 3.25, -33.2),
        ],
        color: '#a8d9b8',
        delay: 0.34,
        radius: 0.18,
      },
      // Secondary recombination bridge connecting eastern mesa → far central ridge
      {
        pts: [
          new THREE.Vector3(11.0, 2.2, -26.0),
          new THREE.Vector3(7.4, 3.1, -33.0),
          new THREE.Vector3(2.2, 3.85, -40.5),
        ],
        color: '#e5be78',
        delay: 0.42,
        radius: 0.18,
      },
    ];

    branchSpecs.forEach((spec) => {
      const curve = new THREE.CatmullRomCurve3(spec.pts);
      const geo = new THREE.TubeGeometry(curve, 64, spec.radius, 8, false);
      const mat = new THREE.MeshStandardMaterial({
        color: spec.color,
        emissive: spec.color,
        emissiveIntensity: 0.36,
        roughness: 0.4,
        metalness: 0.25,
        transparent: true,
        opacity: 0,
      });
      const fullCount = geo.index ? geo.index.count : geo.attributes.position.count;
      geo.setDrawRange(0, 0);
      const mesh = new THREE.Mesh(geo, mat);
      genGroup.add(mesh);
      branchPaths.push({ mesh, mat, fullCount, delay: spec.delay });
    });

    // Three distant sculpted threshold arches rising on the far mesas in Generativity
    const farGates: { group: THREE.Group; baseY: number; delay: number; mat: THREE.MeshStandardMaterial }[] = [];
    const gateDefs: [number, number, number, number, number, string][] = [
      [-11.2, 2.0, -24.2, 0.38, 0.18, '#a9dec7'],
      [11.0, 2.3, -25.4, -0.42, 0.28, '#e6c280'],
      [-0.8, 1.55, -31.2, 0.05, 0.36, '#a4d6e8'],
    ];

    gateDefs.forEach(([x, y, z, rotY, delay, col]) => {
      const g = new THREE.Group();
      g.position.set(x, y - 2.6, z);
      g.rotation.y = rotY;
      const mat = new THREE.MeshStandardMaterial({
        color: '#263a42',
        emissive: col,
        emissiveIntensity: 0.28,
        roughness: 0.55,
        metalness: 0.25,
        transparent: true,
        opacity: 0,
      });
      addEdgedBox(g, 0.65, 3.8, 0.7, -1.25, 1.9, 0, mat, stoneEdge);
      addEdgedBox(g, 0.65, 3.8, 0.7, 1.25, 1.9, 0, mat, stoneEdge);
      addEdgedBox(g, 3.15, 0.65, 0.78, 0, 3.9, 0, mat, stoneEdge);
      genGroup.add(g);
      farGates.push({ group: g, baseY: y, delay, mat });
    });

    // Subtle atmospheric horizon reference rings (never generic particle spam)
    const horizonGeo = new THREE.RingGeometry(24, 24.08, 96);
    const horizonMat = new THREE.MeshBasicMaterial({
      color: '#7da8b5',
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });
    const horizonRing = new THREE.Mesh(horizonGeo, horizonMat);
    horizonRing.rotation.x = -Math.PI / 2;
    horizonRing.position.set(0, -1.8, -14);
    scene.add(horizonRing);

    // ── RENDER EVALUATION FOR CONTINUOUS PROGRESS [0..5] ──────────────────
    const tmpPos = new THREE.Vector3();
    const tmpLook = new THREE.Vector3();
    const cBgStart = new THREE.Color('#060c11');
    const cBgMid = new THREE.Color('#09141b');
    const cBgLate = new THREE.Color('#0c1b22');

    const resize = () => {
      if (!renderer || !canvasWrap) return;
      const rect = canvasWrap.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    renderSceneNow = (prog: number, timeSec: number) => {
      if (!renderer) return;
      const p = Math.max(0, Math.min(5, prog));
      const poses = window.innerWidth <= 900 ? MOBILE_POSES : DESKTOP_POSES;

      // Interpolate camera smoothly across keyframes
      const i0 = Math.min(poses.length - 2, Math.floor(p));
      const i1 = i0 + 1;
      const localT = smoothstep(0, 1, p - i0);
      const a = poses[i0];
      const b = poses[i1];

      tmpPos.set(
        lerp(a.pos[0], b.pos[0], localT),
        lerp(a.pos[1], b.pos[1], localT),
        lerp(a.pos[2], b.pos[2], localT)
      );
      tmpLook.set(
        lerp(a.look[0], b.look[0], localT),
        lerp(a.look[1], b.look[1], localT),
        lerp(a.look[2], b.look[2], localT)
      );

      // Gentle breathing drift + subtle mouse parallax (zero under reduced motion)
      if (!reducedMotionQuery.matches) {
        tmpPos.x += smoothPointerX * 0.45 + Math.sin(timeSec * 0.35) * 0.08;
        tmpPos.y += smoothPointerY * 0.25 + Math.cos(timeSec * 0.28) * 0.06;
      }

      camera.position.copy(tmpPos);
      camera.fov = lerp(a.fov, b.fov, localT);
      camera.updateProjectionMatrix();
      lookTarget.copy(tmpLook);
      camera.lookAt(lookTarget);

      // Atmospheric background & fog evolution
      const lateAmt = smoothstep(3.2, 5.0, p);
      const midAmt = smoothstep(0.6, 2.5, p);
      bgColor.copy(cBgStart).lerp(cBgMid, midAmt).lerp(cBgLate, lateAmt);
      scene.background = bgColor;
      fog.color.copy(bgColor);
      fog.density = lerp(0.032, 0.014, smoothstep(2.8, 5.0, p));

      // ── STAGE 01 → 02: RECOGNITION (ZERO STONE MOVES, ONLY LIGHT & RESOLUTION) ──
      const recAmt = smoothstep(0.25, 1.0, p);
      const recPeak = recAmt * (1 - smoothstep(2.4, 3.6, p) * 0.45);
      passageLight.intensity = lerp(0.06, 5.8, recPeak);
      innerStoneMat.emissiveIntensity = lerp(0.0, 0.55, recPeak);
      warmSeamEdge.opacity = lerp(0.04, 0.85, recAmt);
      seamGlowMat.opacity = lerp(0.0, 0.92, recAmt);
      shaftMat.opacity = lerp(0.0, 0.16, recAmt * (1 - smoothstep(2.1, 3.2, p)));
      beamMat.opacity = lerp(0.0, 0.12, recAmt * (1 - smoothstep(2.1, 3.2, p)));

      // Key light sweeps from oblique twilight to raking golden clarity
      keyLight.position.set(
        lerp(-12, 6, smoothstep(0, 4.5, p)),
        lerp(9, 15, smoothstep(0, 5, p)),
        lerp(8, -10, smoothstep(0, 5, p))
      );
      keyLight.intensity = lerp(1.15, 2.35, smoothstep(0.2, 4.6, p));

      // ── STAGE 03: SIMULATION (THREE TRANSLUCENT HYPOTHETICAL ROUTES) ──
      const simIn = smoothstep(1.35, 2.05, p);
      const simFadeAlt = 1 - smoothstep(2.45, 3.15, p);
      const simFadeChosen = 1 - smoothstep(2.7, 3.35, p);
      const pulse = reducedMotionQuery.matches ? 1 : 0.88 + 0.12 * Math.sin(timeSec * 2.2);

      ghostA.wireMat.opacity = simIn * simFadeAlt * 0.34 * pulse;
      ghostA.lineMat.opacity = simIn * simFadeAlt * 0.85;
      ghostC.wireMat.opacity = simIn * simFadeAlt * 0.32 * pulse;
      ghostC.lineMat.opacity = simIn * simFadeAlt * 0.82;
      ghostB.wireMat.opacity = simIn * simFadeChosen * 0.46;
      ghostB.lineMat.opacity = simIn * simFadeChosen * 0.95;

      // Subtle vertical float on unchosen hypothetical routes to emphasize weightless simulation
      if (!reducedMotionQuery.matches) {
        ghostA.group.position.y = Math.sin(timeSec * 1.4) * 0.08 * simIn;
        ghostC.group.position.y = Math.cos(timeSec * 1.2) * 0.07 * simIn;
      }
      surveyArcMat.opacity = simIn * simFadeAlt * 0.32;
      surveyArc.rotation.z = 0.42 + (reducedMotionQuery.matches ? 0 : Math.sin(timeSec * 0.8) * 0.18);

      // ── STAGE 04: ORCHESTRATION (REAL MODULAR BRIDGE ASSEMBLES UNDER GRAVITY) ──
      const orchAmt = smoothstep(2.35, 3.15, p);
      bridgeStoneMat.opacity = orchAmt;
      bridgeTrimMat.opacity = orchAmt;
      bridgeEdgeMat.opacity = orchAmt * 0.45;
      buildLight.intensity = smoothstep(2.3, 3.0, p) * (1 - smoothstep(3.6, 4.5, p)) * 4.5;

      // Piers & abutments seat downward cleanly into rock
      const pierSeat = smoothstep(2.35, 2.85, p);
      pierLeft.position.y = lerp(0.9, -0.58, pierSeat);
      pierRight.position.y = lerp(0.9, -0.58, pierSeat);
      nearAbut.position.y = lerp(-0.8, -0.08, pierSeat);
      farAbut.position.y = lerp(-0.8, 0.0, pierSeat);

      // Sequential slab placement from near bank → far bank
      deckSegments.forEach((seg, idx) => {
        const segStart = 2.45 + (idx / segCount) * 0.48;
        const segT = smoothstep(segStart, segStart + 0.22, p);
        const dropOffset = (1 - segT) * 1.15;
        seg.mesh.position.y = seg.targetY + dropOffset;
        seg.trimL.position.y = seg.targetY + 0.18 + dropOffset;
        seg.trimR.position.y = seg.targetY + 0.18 + dropOffset;
        (seg.mesh.material as THREE.MeshStandardMaterial).opacity = segT;
        seg.mesh.visible = segT > 0.01;
        seg.trimL.visible = segT > 0.01;
        seg.trimR.visible = segT > 0.01;
      });
      bridgeGroup.visible = orchAmt > 0.01;

      // ── STAGE 05: TRANSFORMATION (ARRIVAL ON FAR PLATEAU & NEW HORIZON) ──
      const transAmt = smoothstep(3.35, 4.25, p);
      arrivalLight.intensity = lerp(0.0, 5.2, transAmt);
      arrivalRingMat.opacity = lerp(0.06, 0.72, transAmt);
      farTerraceMat.emissiveIntensity = lerp(0.04, 0.28, transAmt);
      valleyLight.intensity = lerp(0.0, 6.2, smoothstep(3.6, 4.9, p));
      valleyStoneMat.emissiveIntensity = lerp(0.03, 0.24, smoothstep(3.7, 5.0, p));

      // ── STAGE 06: GENERATIVITY (EMERGENT UNPLANNED PATHWAYS & DISTANT ARCHES) ──
      const genAmt = smoothstep(4.05, 5.0, p);
      genGroup.visible = genAmt > 0.01;
      branchPaths.forEach((branch) => {
        const localGrow = smoothstep(branch.delay, Math.min(1, branch.delay + 0.56), genAmt);
        const drawCount = Math.floor(branch.fullCount * localGrow);
        branch.mesh.geometry.setDrawRange(0, drawCount);
        branch.mat.opacity = localGrow * 0.92;
        branch.mat.emissiveIntensity = 0.28 + localGrow * 0.24;
      });

      farGates.forEach((gate) => {
        const gT = smoothstep(gate.delay, Math.min(1, gate.delay + 0.52), genAmt);
        gate.group.position.y = lerp(gate.baseY - 2.6, gate.baseY, gT);
        gate.mat.opacity = gT;
      });

      horizonMat.opacity = lerp(0.06, 0.26, smoothstep(3.6, 5.0, p));
      renderer.render(scene, camera);
    };

    // Initial crisp render
    renderSceneNow(0, 0);
  }

  // Subtle mouse parallax on desktop
  window.addEventListener(
    'pointermove',
    (e) => {
      if (window.innerWidth <= 900) return;
      pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerY = -(e.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true }
  );

  // Scroll sync
  const onScroll = () => {
    targetProgress = computeScrollProgress();
    const nearest = Math.round(targetProgress);
    syncHud(nearest, targetProgress);
    if (reducedMotionQuery.matches && renderSceneNow) {
      currentProgress = targetProgress;
      renderSceneNow(currentProgress, 0);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Pause RAF when stage scrolled away or tab hidden
  const stageObserver = new IntersectionObserver(
    (entries) => {
      isStageVisible = entries[0]?.isIntersecting ?? true;
    },
    { threshold: 0.02 }
  );
  stageObserver.observe(stageHost);

  const startTime = performance.now();
  let lastTime = startTime;
  let rafId = 0;

  const tick = (now: number) => {
    rafId = requestAnimationFrame(tick);
    const dt = Math.min(0.1, Math.max(0.004, (now - lastTime) * 0.001));
    lastTime = now;
    if (!renderSceneNow || document.hidden || !isStageVisible) return;
    if (reducedMotionQuery.matches) return;

    // Frame-rate independent critically damped spring toward scroll progress
    const alpha = 1 - Math.exp(-dt * 9.0);
    const ptrAlpha = 1 - Math.exp(-dt * 5.0);
    currentProgress += (targetProgress - currentProgress) * alpha;
    smoothPointerX += (pointerX - smoothPointerX) * ptrAlpha;
    smoothPointerY += (pointerY - smoothPointerY) * ptrAlpha;

    renderSceneNow(currentProgress, (now - startTime) * 0.001);
  };

  onScroll();
  if (!reducedMotionQuery.matches) {
    rafId = requestAnimationFrame(tick);
  } else if (renderSceneNow) {
    renderSceneNow(targetProgress, 0);
  }

  window.addEventListener('pagehide', () => {
    if (rafId) cancelAnimationFrame(rafId);
    renderer?.dispose();
  });
}

initGenerativeReality();
