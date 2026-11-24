// Interactive essay studies for /clear.html — Life as Continuous Development.
// Lightweight, keyboard & touch friendly, zero fake telemetry, reduced-motion safe.

interface EcoRecord {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  supports: string[];
  relationNote: string;
}

function initClearEssay() {
  // ── 1. SIX-PART NON-HIERARCHICAL ECOLOGY MAP ───────────────────────────
  const ecoHost = document.querySelector<HTMLElement>('[data-cl-ecology]');
  const ecoPayload = document.querySelector<HTMLScriptElement>('[data-cl-elements-json]');
  if (ecoHost && ecoPayload) {
    const records: EcoRecord[] = JSON.parse(ecoPayload.textContent || '[]');
    const nodes = [...ecoHost.querySelectorAll<SVGGElement>('[data-eco-node]')];
    const chords = [...ecoHost.querySelectorAll<SVGLineElement>('[data-eco-chord]')];
    const pills = [...ecoHost.querySelectorAll<HTMLButtonElement>('[data-eco-pill]')];
    const titleEl = ecoHost.querySelector<HTMLElement>('[data-eco-title]');
    const subEl = ecoHost.querySelector<HTMLElement>('[data-eco-sub]');
    const relEl = ecoHost.querySelector<HTMLElement>('[data-eco-rel]');
    const jumpEl = ecoHost.querySelector<HTMLAnchorElement>('[data-eco-jump]');

    const select = (id: string) => {
      const rec = records.find((r) => r.id === id) || records[0];
      if (!rec) return;

      nodes.forEach((node) => {
        const nid = node.dataset.ecoNode || '';
        const isActive = nid === rec.id;
        const isLinked = rec.supports.includes(nid);
        node.classList.toggle('is-active', isActive);
        node.classList.toggle('is-linked', isLinked);
        node.setAttribute('aria-pressed', String(isActive));
      });

      chords.forEach((chord) => {
        const pair = (chord.dataset.ecoChord || '').split(':');
        const touches = pair.includes(rec.id) && pair.some((p) => p !== rec.id && rec.supports.includes(p));
        chord.classList.toggle('is-lit', touches);
      });

      pills.forEach((pill) => {
        const active = pill.dataset.ecoPill === rec.id;
        pill.classList.toggle('is-active', active);
        pill.setAttribute('aria-pressed', String(active));
      });

      if (titleEl) titleEl.textContent = rec.title;
      if (subEl) subEl.textContent = `${rec.number} / ${rec.subtitle}`;
      if (relEl) relEl.textContent = rec.relationNote;
      if (jumpEl) {
        jumpEl.href = `#element-${rec.id}`;
        jumpEl.textContent = `Read ${rec.title} ↓`;
      }
    };

    nodes.forEach((node) => {
      const id = node.dataset.ecoNode || '';
      node.addEventListener('click', () => select(id));
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select(id);
        }
      });
    });

    pills.forEach((pill) => {
      pill.addEventListener('click', () => select(pill.dataset.ecoPill || ''));
    });

    select('resources');
  }

  // ── 2. BESPOKE MICRO-STUDIES FOR INDIVIDUAL CONCEPTS ───────────────────
  // 01 Resources: toggle Accumulated vs Directed
  const resStudy = document.querySelector<HTMLElement>('[data-study-resources]');
  if (resStudy) {
    const btn = resStudy.querySelector<HTMLButtonElement>('[data-res-toggle]');
    const label = resStudy.querySelector<HTMLElement>('[data-res-state]');
    btn?.addEventListener('click', () => {
      const next = resStudy.dataset.mode === 'directed' ? 'accumulated' : 'directed';
      resStudy.dataset.mode = next;
      if (btn) btn.textContent = next === 'directed' ? 'Compare: accumulated' : 'Compare: directed';
      if (label) label.textContent = next === 'directed' ? 'Capacity flowing into possibilities' : 'Closed accumulation';
    });
  }

  // 02 Security: tap to test shock absorption
  const secStudy = document.querySelector<HTMLElement>('[data-study-security]');
  if (secStudy) {
    const btn = secStudy.querySelector<HTMLButtonElement>('[data-sec-pulse]');
    const label = secStudy.querySelector<HTMLElement>('[data-sec-state]');
    let timer = 0;
    btn?.addEventListener('click', () => {
      secStudy.dataset.shock = 'true';
      if (label) label.textContent = 'Setback absorbed — keel holds steady';
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        secStudy.dataset.shock = 'false';
        if (label) label.textContent = 'Continuity beneath open sky';
      }, 1400);
    });
  }

  // 03 Freedom: cycle which door / sightline holds attention
  const freeStudy = document.querySelector<HTMLElement>('[data-study-freedom]');
  if (freeStudy) {
    const btn = freeStudy.querySelector<HTMLButtonElement>('[data-free-shift]');
    const label = freeStudy.querySelector<HTMLElement>('[data-free-state]');
    const doors = [
      'Door 01 · Study & deep attention',
      'Door 02 · Unhurried creation',
      'Door 03 · Time with people & places',
    ];
    let idx = 1;
    btn?.addEventListener('click', () => {
      idx = (idx + 1) % doors.length;
      freeStudy.dataset.door = String(idx);
      if (label) label.textContent = doors[idx];
    });
  }

  // ── 3. WHAT IS ENOUGH? INTERACTIVE BALANCE FULCRUM ─────────────────────
  const fulcrum = document.querySelector<HTMLElement>('[data-cl-fulcrum]');
  if (fulcrum) {
    const buttons = [...fulcrum.querySelectorAll<HTMLButtonElement>('[data-balance-pick]')];
    const noteEl = fulcrum.querySelector<HTMLElement>('[data-balance-note]');
    const notes: Record<string, string> = {
      fragile:
        'Below real continuity: responsibilities press in, setbacks feel existential, and attention shrinks to immediate survival.',
      living:
        'Living equilibrium: responsibilities and future shocks are protected while time, energy, and curiosity remain free to participate in life right now.',
      hoarding:
        'Past the turning point: chasing an arbitrary larger number starts consuming the exact attention, freedom, and living it was supposed to protect.',
    };

    const apply = (state: string) => {
      fulcrum.dataset.balance = state;
      buttons.forEach((btn) => {
        const active = btn.dataset.balancePick === state;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
      if (noteEl) noteEl.textContent = notes[state] || notes.living;
    };

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => apply(btn.dataset.balancePick || 'living'));
    });
    apply('living');
  }
}

initClearEssay();

// Motion layer: loaded after the controls above exist, because it drives them.
import('./clear-living');
