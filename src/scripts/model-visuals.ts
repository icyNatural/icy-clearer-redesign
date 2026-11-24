// Interactive studies for the Five Written Models & ConceptLayout interactions.

function initModelVisuals() {
  // ── 1. M-01 SEEING BEFORE NAMING ───────────────────────────────────────
  const sbn = document.querySelector<HTMLElement>('[data-mv="seeing-before-naming"]');
  if (sbn) {
    const btns = [...sbn.querySelectorAll<HTMLButtonElement>('[data-sbn-mode]')];
    const cap = sbn.querySelector<HTMLElement>('[data-sbn-caption]');
    const copy: Record<string, string> = {
      contact:
        'Before naming: light, contour, interval, and relation remain intact. Nothing has been reduced to a verdict yet.',
      perceived:
        'Perceived form: edges, spacing, and inflection organize cleanly while keeping every original detail available.',
      labeled:
        'Premature label applied: one word stamps over the event and closes observation. Notice how the surrounding detail fades — even though the event itself did not change.',
    };
    const setStage = (stage: string) => {
      sbn.dataset.stage = stage;
      btns.forEach((b) => {
        const on = b.dataset.sbnMode === stage;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      if (cap) cap.textContent = copy[stage] || copy.contact;
    };
    btns.forEach((b) => b.addEventListener('click', () => setStage(b.dataset.sbnMode || 'contact')));
  }

  // ── 2. M-02 REPLACE STORIES WITH SYSTEMS ───────────────────────────────
  const sys = document.querySelector<HTMLElement>('[data-mv="replace-stories-with-systems"]');
  if (sys) {
    const btns = [...sys.querySelectorAll<HTMLButtonElement>('[data-sys-mode]')];
    const cap = sys.querySelector<HTMLElement>('[data-sys-caption]');
    const triggerTxt = sys.querySelector<SVGTextElement>('.sys-trigger-txt');
    const procTxt = sys.querySelector<SVGTextElement>('.sys-proc-txt');
    const outTxt = sys.querySelector<SVGTextElement>('.sys-out-txt');
    const fbTxt = sys.querySelector<SVGTextElement>('.sys-fb-txt');

    const copy: Record<string, string> = {
      story:
        'A story feels emotionally complete, yet leaves you nothing to test or move. Expose the system underneath to find the variable.',
      system:
        'Underneath the story sits a testable arrangement: open inputs split attention, creating errors that trigger frustration and even more inputs.',
      leverage:
        'Changing one constraint (capping open inputs) alters attention and breaks the feedback loop — without changing who you are or blaming a personality trait.',
    };

    const setMode = (mode: string) => {
      sys.dataset.mode = mode;
      btns.forEach((b) => {
        const on = b.dataset.sysMode === mode;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      if (mode === 'leverage') {
        if (triggerTxt) triggerTxt.textContent = '1 active input';
        if (procTxt) procTxt.textContent = 'Focused attention';
        if (outTxt) outTxt.textContent = 'Clean completion';
        if (fbTxt) fbTxt.textContent = 'FEEDBACK INTERRUPTED · ROOM TO MOVE';
      } else {
        if (triggerTxt) triggerTxt.textContent = 'Too many inputs';
        if (procTxt) procTxt.textContent = 'Attention splits';
        if (outTxt) outTxt.textContent = 'Repeated error';
        if (fbTxt) fbTxt.textContent = 'FEEDBACK: FRUSTRATION → MORE INPUTS';
      }
      if (cap) cap.textContent = copy[mode] || copy.story;
    };
    btns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.sysMode || 'story')));
  }

  // ── 3. M-03 FROM REACTION TO PATTERN ───────────────────────────────────
  const pat = document.querySelector<HTMLElement>('[data-mv="from-reaction-to-pattern"]');
  if (pat) {
    const btns = [...pat.querySelectorAll<HTMLButtonElement>('[data-pat-win]')];
    const cap = pat.querySelector<HTMLElement>('[data-pat-caption]');
    const leftC = pat.querySelector<SVGRectElement>('.pat-curtain-left');
    const rightC = pat.querySelector<SVGRectElement>('.pat-curtain-right');
    const box = pat.querySelector<SVGRectElement>('.pat-frame-box');
    const lbl = pat.querySelector<SVGTextElement>('.pat-label');

    const states: Record<string, { lx: number; lw: number; rx: number; rw: number; bx: number; bw: number; label: string; cap: string }> = {
      '1': {
        lx: 0, lw: 292, rx: 372, rw: 248, bx: 292, bw: 80,
        label: '1 FRAME · ISOLATED SPIKE FEELS LIKE THE WHOLE TRUTH',
        cap: 'Inside a single frame, one sharp drop or spike looks dramatic and permanent. Widen the window before adding meaning.',
      },
      '4': {
        lx: 0, lw: 210, rx: 454, rw: 166, bx: 210, bw: 244,
        label: '4 FRAMES · RECURRENCE & INTERVAL START APPEARING',
        cap: 'Across four frames, the loud event stops standing alone — you start distinguishing an isolated incident from a recurring rhythm.',
      },
      '12': {
        lx: 0, lw: 0, rx: 620, rw: 0, bx: 28, bw: 564,
        label: '12 FRAMES · DIRECTION & SLOPE BECOME THE SIGNAL',
        cap: 'At full width, the intense spike sits on a clear upward trajectory. Single moments provoke reaction; direction supports choice.',
      },
    };

    const setWin = (win: string) => {
      const s = states[win] || states['1'];
      pat.dataset.window = win;
      btns.forEach((b) => {
        const on = b.dataset.patWin === win;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      leftC?.setAttribute('width', String(s.lw));
      rightC?.setAttribute('x', String(s.rx));
      rightC?.setAttribute('width', String(s.rw));
      box?.setAttribute('x', String(s.bx));
      box?.setAttribute('width', String(s.bw));
      if (lbl) lbl.textContent = s.label;
      if (cap) cap.textContent = s.cap;
    };
    btns.forEach((b) => b.addEventListener('click', () => setWin(b.dataset.patWin || '1')));
  }

  // ── 4. M-04 COHERENCE VS ENTROPY ───────────────────────────────────────
  const coh = document.querySelector<HTMLElement>('[data-mv="coherence-vs-entropy"]');
  if (coh) {
    const btns = [...coh.querySelectorAll<HTMLButtonElement>('[data-coh-mode]')];
    const cap = coh.querySelector<HTMLElement>('[data-coh-caption]');
    const copy: Record<string, string> = {
      coherence:
        'Uncomfortable at contact, coherent afterwards: confusion clears and the next step takes less energy to coordinate.',
      entropy:
        'Smooth at contact, entropic afterwards: avoiding the tension borrows short-term comfort while scattering the system later.',
    };
    const setScenario = (sc: string) => {
      coh.dataset.scenario = sc;
      btns.forEach((b) => {
        const on = b.dataset.cohMode === sc;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      if (cap) cap.textContent = copy[sc] || copy.coherence;
    };
    btns.forEach((b) => b.addEventListener('click', () => setScenario(b.dataset.cohMode || 'coherence')));
  }

  // ── 5. M-05 CLEAR AGAIN ────────────────────────────────────────────────
  const ca = document.querySelector<HTMLElement>('[data-mv="clear-again"]');
  if (ca) {
    const btns = [...ca.querySelectorAll<HTMLButtonElement>('[data-ca-mode]')];
    const pulseBtn = ca.querySelector<HTMLButtonElement>('[data-ca-pulse]');
    const pathEl = ca.querySelector<SVGPathElement>('[data-ca-path]');
    const brackets = ca.querySelector<SVGGElement>('[data-ca-brackets]');
    const cap = ca.querySelector<HTMLElement>('[data-ca-caption]');

    let mode: 'hold' | 'return' = 'return';
    let ampBoost = 0;

    const buildPath = () => {
      if (!pathEl) return;
      const b = ampBoost * 24;
      if (mode === 'hold') {
        pathEl.setAttribute(
          'd',
          `M28 128 L112 128 C126 ${38 - b * 0.5}, 180 ${214 + b * 0.3}, 272 152 C286 144, 292 138, 298 128 C316 ${34 - b * 0.6}, 376 ${222 + b * 0.3}, 448 164 C454 152, 458 140, 462 128 C480 ${42 - b * 0.5}, 538 ${212 + b * 0.3}, 592 158`
        );
        pathEl.setAttribute('stroke', '#df886a');
        if (brackets) brackets.style.opacity = '0.2';
      } else {
        pathEl.setAttribute(
          'd',
          `M28 128 L112 128 C126 ${52 - b * 0.5}, 166 ${196 + b * 0.4}, 224 128 L298 128 C310 ${74 - b * 0.35}, 342 ${164 + b * 0.3}, 384 128 L462 128 C472 ${96 - b * 0.2}, 492 ${146 + b * 0.2}, 514 128 L592 128`
        );
        pathEl.setAttribute('stroke', '#98c7b8');
        if (brackets) brackets.style.opacity = '1';
      }
    };

    const setStrategy = (next: 'hold' | 'return') => {
      mode = next;
      ca.dataset.strategy = next;
      btns.forEach((b) => {
        const on = b.dataset.caMode === next;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      if (cap) {
        cap.textContent =
          next === 'hold'
            ? 'Trying to hold clarity rigidly: when real pressure arrives, fighting the drift amplifies oscillation and delays settlement.'
            : 'Drift still arrives under pressure — nobody stays permanently clear. Noticing sooner shortens the route back: drift → notice → adjust → return.';
      }
      buildPath();
    };

    btns.forEach((b) =>
      b.addEventListener('click', () => setStrategy((b.dataset.caMode as 'hold' | 'return') || 'return'))
    );

    let decayTimer = 0;
    pulseBtn?.addEventListener('click', () => {
      ampBoost = 1;
      buildPath();
      window.clearTimeout(decayTimer);
      decayTimer = window.setTimeout(() => {
        ampBoost = 0;
        buildPath();
      }, 900);
    });
  }

  // ── 6. CONCEPT LAYOUT INTERACTIONS (FLOW, LENSES, EXPERIMENT) ──────────
  document.querySelectorAll<HTMLElement>('[data-flow]').forEach((flow) => {
    const stages = [...flow.querySelectorAll<HTMLButtonElement>('[data-stage]')];
    stages.forEach((stage) => {
      stage.addEventListener('click', () => {
        const isOpen = stage.classList.contains('is-open');
        stages.forEach((o) => {
          o.classList.remove('is-open');
          o.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          stage.classList.add('is-open');
          stage.setAttribute('aria-expanded', 'true');
        }
      });
    });
  });

  document.querySelectorAll<HTMLElement>('[data-lenses] .cx-lens').forEach((lens) => {
    const btn = lens.querySelector<HTMLButtonElement>('.cx-lens__btn');
    btn?.addEventListener('click', () => {
      const open = lens.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      const sign = lens.querySelector('.cx-lens__sign');
      if (sign) sign.textContent = open ? '−' : '+';
    });
  });

  document.querySelectorAll<HTMLElement>('[data-exp]').forEach((exp) => {
    const btn = exp.querySelector<HTMLButtonElement>('.cx-exp__btn');
    btn?.addEventListener('click', () => {
      const revealed = exp.classList.toggle('is-revealed');
      btn.setAttribute('aria-expanded', String(revealed));
      btn.textContent = revealed ? 'Hide distinction' : 'Reveal the distinction';
    });
  });
}

initModelVisuals();
