// Living studies for the Five Written Models & ConceptLayout interactions.

import { mountStudy, type SceneDef } from './studies/engine';
import { seeingScene } from './studies/seeing';
import { systemsScene } from './studies/systems';
import { patternScene } from './studies/pattern';
import { coherenceScene } from './studies/coherence';
import { clearAgainScene } from './studies/clear-again';

function initModelVisuals() {
  // ── 1–5. LIVING STUDIES FOR THE FIVE WRITTEN MODELS ────────────────────
  // Each study is one continuous scene (see ./studies/*). The markup in
  // ModelVisual.astro keeps the original static diagram as the no-canvas fallback.
  const scenes: Record<string, () => SceneDef> = {
    'seeing-before-naming': () => seeingScene,
    'replace-stories-with-systems': systemsScene,
    'from-reaction-to-pattern': () => patternScene,
    'coherence-vs-entropy': () => coherenceScene,
    'clear-again': clearAgainScene,
  };
  document.querySelectorAll<HTMLElement>('[data-mv]').forEach((plate) => {
    const make = scenes[plate.dataset.mv || ''];
    if (make) mountStudy(plate, make());
  });

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
