// Client interactions for the Living Homepage.
// Zero autoplay audio, reduced-motion safe, full keyboard + touch support.

const root = document.querySelector<HTMLElement>('.living-home');
if (root) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // ── 1. CLIMATE-AWARE NAV + ACTIVE WORLD TRACKING ───────────────────────
  const nav = document.querySelector<HTMLElement>('[data-living-nav]');
  const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-nav-world]')];
  const sections = [...root.querySelectorAll<HTMLElement>('[data-world-climate]')];

  if (nav && sections.length) {
    const updateNav = () => {
      const marker = window.innerHeight * 0.24;
      let activeSection = sections[0];
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= marker && rect.bottom > marker * 0.4) {
          activeSection = section;
          break;
        }
      }
      nav.dataset.climate = activeSection.dataset.worldClimate || 'light';
      const activeId = activeSection.id;
      navLinks.forEach((link) => {
        const match = link.dataset.navWorld === activeId;
        link.classList.toggle('is-current', match);
        if (match) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        updateNav();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateNav();
  }

  // Close the handmade 3-line drawer on click outside, link click, or Escape
  const menu = document.querySelector<HTMLDetailsElement>('.living-menu');
  if (menu) {
    document.addEventListener('click', (event) => {
      if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary')?.focus();
      }
    });
    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        menu.open = false;
      });
    });
  }

  // ── 2. AMBIENT SILENT VIDEO LIFECYCLE (lake & court) ───────────────────
  const ambientVideos = [...root.querySelectorAll<HTMLVideoElement>('video[data-ambient-video]')];
  if (ambientVideos.length && !reducedMotion.matches) {
    const syncVideo = (video: HTMLVideoElement, visible: boolean) => {
      if (visible && !document.hidden && !reducedMotion.matches) {
        if (!video.src && video.dataset.src) {
          video.src = video.dataset.src;
          video.load();
        }
        video.play().then(() => video.classList.add('is-ready')).catch(() => {});
      } else {
        video.pause();
      }
    };
    const visibleSet = new Set<HTMLVideoElement>();
    const videoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) visibleSet.add(video);
          else visibleSet.delete(video);
          syncVideo(video, entry.isIntersecting);
        });
      },
      { threshold: 0.15 }
    );
    ambientVideos.forEach((video) => {
      video.addEventListener('playing', () => video.classList.add('is-ready'), { once: true });
      videoObserver.observe(video);
    });
    document.addEventListener('visibilitychange', () => {
      ambientVideos.forEach((video) => syncVideo(video, visibleSet.has(video)));
    });
  }

  // ── 3. LIGHTWEIGHT CLIP THEATER DIALOG (Venom 1v6 archive clip) ────────
  const theater = document.querySelector<HTMLDialogElement>('[data-clip-theater]');
  if (theater) {
    const stage = theater.querySelector<HTMLElement>('[data-theater-stage]')!;
    const titleEl = theater.querySelector<HTMLElement>('[data-theater-title]')!;
    const extLink = theater.querySelector<HTMLAnchorElement>('[data-theater-link]')!;
    let opener: HTMLElement | null = null;

    const closeTheater = () => {
      stage.replaceChildren();
      if (theater.open) theater.close();
      opener?.focus({ preventScroll: true });
      opener = null;
    };

    root.querySelectorAll<HTMLElement>('[data-open-clip]').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const videoId = trigger.dataset.openClip || '';
        const title = trigger.dataset.clipTitle || 'Gameplay clip';
        const url = trigger.dataset.clipUrl || `https://www.youtube.com/watch?v=${videoId}`;
        if (!/^[\w-]{11}$/.test(videoId)) return;
        opener = trigger;
        titleEl.textContent = title;
        extLink.href = url;
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`;
        iframe.title = title;
        iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        stage.replaceChildren(iframe);
        theater.showModal();
      });
    });

    theater.querySelector('[data-theater-close]')?.addEventListener('click', closeTheater);
    theater.addEventListener('click', (event) => {
      if (event.target === theater) closeTheater();
    });
    theater.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeTheater();
    });
    window.addEventListener('pagehide', closeTheater);
  }

  const STATE_KEY = 'icy-living-home-state';
  const readState = (): Record<string, any> => {
    try { return JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}'); } catch { return {}; }
  };
  const writeState = (patch: Record<string, any>) => {
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify({ ...readState(), ...patch })); } catch {}
  };
  const savedState = readState();

  // ── 3B. LIVE GAMING RATINGS TASTE SWITCHER ─────────────────────────────
  const ratingsPayload = document.querySelector('[data-gaming-ratings]');
  const ratingsBox = root.querySelector<HTMLElement>('[data-gaming-ratings-box]');
  if (ratingsPayload && ratingsBox) {
    const ratings: any[] = JSON.parse(ratingsPayload.textContent || '[]');
    const pills = [...ratingsBox.querySelectorAll<HTMLButtonElement>('[data-rating-pick]')];
    const linkEl = ratingsBox.querySelector<HTMLAnchorElement>('[data-rating-link]')!;
    const scoreEl = ratingsBox.querySelector<HTMLElement>('[data-rating-score]')!;
    const nameEl = ratingsBox.querySelector<HTMLElement>('[data-rating-name]')!;
    const verdictEl = ratingsBox.querySelector<HTMLElement>('[data-rating-verdict]')!;
    const ctaEl = ratingsBox.querySelector<HTMLElement>('[data-rating-cta]')!;
    const glyphHost = ratingsBox.querySelector<HTMLElement>('[data-gaming-glyph]');

    const selectRating = (id: string, persist = true) => {
      const record = ratings.find((r) => r.id === id) || ratings[0];
      if (!record) return;
      pills.forEach((pill) => {
        const active = pill.dataset.ratingPick === record.id;
        pill.setAttribute('aria-selected', String(active));
        pill.tabIndex = active ? 0 : -1;
      });
      linkEl.href = record.href;
      linkEl.setAttribute('aria-label', `${record.gameName} rated ${Number(record.score).toFixed(1)} out of 10 — view full evaluation in Gaming OS`);
      scoreEl.textContent = Number(record.score).toFixed(1);
      nameEl.textContent = `/ 10 · ${String(record.gameName).toUpperCase()}`;
      verdictEl.textContent = record.verdict;
      ctaEl.textContent = `OPEN ${String(record.gameName).toUpperCase()} IN GAMING OS ↗`;
      if (glyphHost && (window as any).GOS?.glyph?.mount) {
        (window as any).GOS.glyph.mount(glyphHost, record, { size: 'sm', labels: false, label: record.gameName });
      }
      if (persist) writeState({ ratingId: record.id });
    };

    pills.forEach((pill, idx) => {
      pill.addEventListener('click', () => selectRating(pill.dataset.ratingPick!));
      pill.addEventListener('keydown', (event) => {
        if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
        event.preventDefault();
        const next = pills[(idx + (event.key === 'ArrowRight' ? 1 : -1) + pills.length) % pills.length];
        next.focus();
        selectRating(next.dataset.ratingPick!);
      });
    });

    if (savedState.ratingId) selectRating(savedState.ratingId, false);
  }

  // ── 3C. MOMENTS FIELD SHIFTER (cycles all real moments.json captures) ──
  const momentsPayload = document.querySelector('[data-moments-pool]');
  const shiftBtn = root.querySelector<HTMLButtonElement>('[data-moments-shift]');
  const momentSlots = [...root.querySelectorAll<HTMLAnchorElement>('.moment-float')];
  if (momentsPayload && shiftBtn && momentSlots.length) {
    const pool: any[] = JSON.parse(momentsPayload.textContent || '[]');
    const windowEl = shiftBtn.querySelector<HTMLElement>('[data-moments-window]');
    let offset = Number(savedState.momentsOffset || 0) % pool.length;

    const applyWindow = (persist = true) => {
      momentSlots.forEach((slot, i) => {
        const photo = pool[(offset + i) % pool.length];
        if (!photo) return;
        slot.href = photo.href;
        slot.setAttribute('aria-label', `Enter photograph in Moments Observatory: ${photo.label}`);
        const img = slot.querySelector<HTMLImageElement>('img');
        if (img) { img.src = photo.src; img.alt = photo.alt; }
        const label = slot.querySelector<HTMLElement>('.moment-float__caption span');
        if (label) label.textContent = photo.label;
      });
      if (windowEl) windowEl.textContent = `${offset + 1}–${((offset + momentSlots.length - 1) % pool.length) + 1} of ${pool.length}`;
      if (persist) writeState({ momentsOffset: offset });
    };

    if (offset > 0) applyWindow(false);
    shiftBtn.addEventListener('click', () => {
      offset = (offset + 3) % pool.length;
      applyWindow(true);
    });
  }

  // ── 4. MUSIC ACOUSTIC WAVE RIBBON + OPTIONAL SOFT TONE ─────────────────
  const waveHost = root.querySelector<HTMLElement>('[data-music-wave]');
  const primaryWave = root.querySelector<SVGPathElement>('[data-wave-primary]');
  const ghostWave = root.querySelector<SVGPathElement>('[data-wave-ghost]');
  const toneBtn = root.querySelector<HTMLButtonElement>('[data-music-tone]');

  if (waveHost && primaryWave && ghostWave) {
    let phase = 0.6;
    let energy = 0.42;
    let focusX = 0.5;
    let waveRaf = 0;
    let waveVisible = false;

    const buildPath = (offset: number, ampScale: number, freq: number) => {
      const width = 1200;
      const mid = 90;
      let d = '';
      for (let x = 0; x <= width; x += 10) {
        const nx = x / width;
        const dist = Math.abs(nx - focusX);
        const envelope = Math.sin(nx * Math.PI) * (0.45 + Math.exp(-dist * dist * 8) * 0.75);
        const y =
          mid +
          (Math.sin(nx * Math.PI * freq + phase + offset) * 0.65 +
            Math.sin(nx * Math.PI * (freq * 1.9) - phase * 1.3 + offset) * 0.35) *
            62 *
            energy *
            ampScale *
            envelope;
        d += (x === 0 ? 'M' : 'L') + x + ',' + y.toFixed(1);
      }
      return d;
    };

    const drawWave = () => {
      primaryWave.setAttribute('d', buildPath(0, 1, 6));
      ghostWave.setAttribute('d', buildPath(1.2, 0.58, 9));
    };

    const tickWave = () => {
      waveRaf = 0;
      phase += 0.028;
      energy += (0.42 - energy) * 0.04;
      drawWave();
      if (waveVisible && !document.hidden && !reducedMotion.matches) {
        waveRaf = requestAnimationFrame(tickWave);
      }
    };

    drawWave();

    if (!reducedMotion.matches) {
      const waveObserver = new IntersectionObserver(
        (entries) => {
          waveVisible = entries[0]?.isIntersecting ?? false;
          if (waveVisible && !waveRaf) waveRaf = requestAnimationFrame(tickWave);
        },
        { threshold: 0.05 }
      );
      waveObserver.observe(waveHost);
    }

    waveHost.addEventListener('pointermove', (event) => {
      const rect = waveHost.getBoundingClientRect();
      focusX = Math.max(0.08, Math.min(0.92, (event.clientX - rect.left) / rect.width));
      energy = Math.min(1.08, energy + 0.12);
      if (reducedMotion.matches) drawWave();
    });

    // Strictly user-triggered warm acoustic triad pulse (Web Audio API)
    let audioCtx: AudioContext | null = null;
    const notes = [220, 261.63, 293.66, 329.63, 392.0, 440.0]; // A minor pentatonic
    let noteCursor = 0;

    const pluckTone = () => {
      energy = 1.15;
      if (reducedMotion.matches) drawWave();
      try {
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtor) return;
        audioCtx ||= new AudioCtor();
        if (audioCtx.state === 'suspended') void audioCtx.resume();
        const now = audioCtx.currentTime;
        const base = notes[noteCursor % notes.length];
        noteCursor++;
        [base, base * 1.5].forEach((freq, idx) => {
          const osc = audioCtx!.createOscillator();
          const gain = audioCtx!.createGain();
          osc.type = idx === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(idx === 0 ? 0.075 : 0.028, now + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
          osc.connect(gain);
          gain.connect(audioCtx!.destination);
          osc.start(now);
          osc.stop(now + 1.3);
        });
        if (toneBtn) {
          const label = toneBtn.querySelector<HTMLElement>('[data-tone-label]');
          if (label) {
            label.textContent = `Resonating · ${Math.round(base)} Hz`;
            window.setTimeout(() => {
              label.textContent = 'Hear a tone';
            }, 1300);
          }
        }
      } catch {
        // Silent graceful degradation when Web Audio is unavailable.
      }
    };

    toneBtn?.addEventListener('click', (event) => {
      event.stopPropagation();
      pluckTone();
    });
    waveHost.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('button,a')) return;
      pluckTone();
    });
  }

  // ── 5. CREATIONS INTERACTIVE PIGMENT PALETTE ───────────────────────────
  const creationsSection = root.querySelector<HTMLElement>('[data-creations-section]');
  const palettePayload = document.querySelector('[data-creations-manifest]');
  if (creationsSection && palettePayload) {
    const works: any[] = JSON.parse(palettePayload.textContent || '[]');
    const swatches = [...creationsSection.querySelectorAll<HTMLButtonElement>('[data-pigment-id]')];
    const visuals = [...creationsSection.querySelectorAll<HTMLElement>('[data-work-visual]')];
    const metaEl = creationsSection.querySelector<HTMLElement>('[data-creation-meta]')!;
    const titleEl = creationsSection.querySelector<HTMLElement>('[data-creation-title]')!;
    const philEl = creationsSection.querySelector<HTMLElement>('[data-creation-philosophy]')!;
    const descEl = creationsSection.querySelector<HTMLElement>('[data-creation-desc]')!;
    const launchEl = creationsSection.querySelector<HTMLAnchorElement>('[data-creation-launch]')!;
    const studioEl = creationsSection.querySelector<HTMLAnchorElement>('[data-creation-studio]')!;

    const selectWork = (id: string) => {
      const work = works.find((item) => item.id === id) || works[0];
      if (!work) return;
      creationsSection.style.setProperty('--active-pigment', work.pigmentHex);
      creationsSection.style.setProperty('--active-surface', work.pigmentSurface);
      swatches.forEach((btn) => {
        const active = btn.dataset.pigmentId === work.id;
        btn.setAttribute('aria-selected', String(active));
        btn.tabIndex = active ? 0 : -1;
      });
      visuals.forEach((vis) => {
        vis.classList.toggle('is-active', vis.dataset.workVisual === work.id);
      });
      metaEl.textContent = `${work.pigmentName} · ${work.kind} · ${work.status}`;
      titleEl.textContent = work.title;
      philEl.textContent = `“${work.philosophy}”`;
      descEl.textContent = work.description;
      launchEl.href = work.href;
      if (work.external) {
        launchEl.target = '_blank';
        launchEl.rel = 'noopener noreferrer';
      } else {
        launchEl.removeAttribute('target');
        launchEl.removeAttribute('rel');
      }
      launchEl.querySelector<HTMLElement>('[data-launch-label]')!.textContent = `Open ${work.title}`;
      studioEl.href = `/creations.html?work=${encodeURIComponent(work.id)}`;
      writeState({ creationId: work.id });
    };

    if (savedState.creationId) selectWork(savedState.creationId);

    swatches.forEach((btn, idx) => {
      btn.addEventListener('click', () => selectWork(btn.dataset.pigmentId!));
      btn.addEventListener('keydown', (event) => {
        if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
        event.preventDefault();
        const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
        const next = swatches[(idx + delta + swatches.length) % swatches.length];
        next.focus();
        selectWork(next.dataset.pigmentId!);
      });
    });
  }

  // ── 6. HOW I SEE IT: ECOLOGY CONSTELLATION + GENERATIVE PREVIEW ────────
  const perspectivePayload = document.querySelector('[data-perspective-manifest]');
  const perspectiveSection = root.querySelector<HTMLElement>('[data-perspective-section]');
  if (perspectiveSection && perspectivePayload) {
    const elements: any[] = JSON.parse(perspectivePayload.textContent || '[]');
    const termButtons = [...perspectiveSection.querySelectorAll<HTMLButtonElement>('.pf-term-btn[data-term-number]')];
    const svgNodes = [...perspectiveSection.querySelectorAll<SVGGElement>('[data-pf-node]')];
    const svgChords = [...perspectiveSection.querySelectorAll<SVGLineElement>('[data-pf-chord]')];
    const subEl = perspectiveSection.querySelector<HTMLElement>('[data-term-subtitle]');
    const bodyEl = perspectiveSection.querySelector<HTMLElement>('[data-term-summary]');
    const linkEl = perspectiveSection.querySelector<HTMLAnchorElement>('[data-term-link]');

    const selectTerm = (num: string, persist = true) => {
      const entry = elements.find((item) => item.number === num) || elements[0];
      if (!entry) return;
      termButtons.forEach((btn) => {
        const active = btn.dataset.termNumber === entry.number;
        btn.setAttribute('aria-selected', String(active));
        btn.tabIndex = active ? 0 : -1;
      });
      svgNodes.forEach((node) => {
        const nid = node.dataset.pfNode || '';
        const isActive = nid === entry.id;
        const isLinked = Array.isArray(entry.supports) && entry.supports.includes(nid);
        node.classList.toggle('is-active', isActive);
        node.classList.toggle('is-linked', isLinked);
        node.setAttribute('aria-pressed', String(isActive));
      });
      svgChords.forEach((chord) => {
        const pair = (chord.dataset.pfChord || '').split(':');
        const touches = pair.includes(entry.id) && pair.some((p) => p !== entry.id && entry.supports?.includes(p));
        chord.classList.toggle('is-lit', touches);
      });
      if (subEl) subEl.textContent = `${entry.number} / ${entry.subtitle}`;
      if (bodyEl) bodyEl.textContent = entry.summary;
      if (linkEl && entry.href) linkEl.href = entry.href;
      if (persist) writeState({ termNumber: entry.number });
    };

    selectTerm(savedState.termNumber || elements[0]?.number || '01', false);

    termButtons.forEach((btn, idx) => {
      btn.addEventListener('click', () => selectTerm(btn.dataset.termNumber!));
      btn.addEventListener('keydown', (event) => {
        if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
        event.preventDefault();
        const next = termButtons[(idx + (event.key === 'ArrowRight' ? 1 : -1) + termButtons.length) % termButtons.length];
        next.focus();
        selectTerm(next.dataset.termNumber!);
      });
    });

    svgNodes.forEach((node) => {
      const num = node.dataset.termNumber || '01';
      node.addEventListener('click', () => selectTerm(num));
      node.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectTerm(num);
        }
      });
    });

    // Interactive 6-Stage Generative Reality Mini Preview on Homepage
    const genPayload = document.querySelector('[data-generative-manifest]');
    const genCard = perspectiveSection.querySelector<HTMLElement>('[data-gen-preview]');
    if (genPayload && genCard) {
      const stages: any[] = JSON.parse(genPayload.textContent || '[]');
      const genBtns = [...genCard.querySelectorAll<HTMLButtonElement>('[data-gen-pick]')];
      const genBadge = genCard.querySelector<HTMLElement>('[data-gen-badge]');
      const genNote = genCard.querySelector<HTMLElement>('[data-gen-note]');

      const selectGen = (id: string) => {
        const st = stages.find((s) => s.id === id) || stages[1] || stages[0];
        if (!st) return;
        genCard.dataset.genStage = st.id;
        genBtns.forEach((btn) => {
          const active = btn.dataset.genPick === st.id;
          btn.setAttribute('aria-selected', String(active));
          btn.tabIndex = active ? 0 : -1;
        });
        if (genBadge) genBadge.textContent = st.affordanceBadge;
        if (genNote) genNote.textContent = st.stageNote;
      };

      genBtns.forEach((btn, idx) => {
        btn.addEventListener('click', () => selectGen(btn.dataset.genPick!));
        btn.addEventListener('keydown', (event) => {
          if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
          event.preventDefault();
          const next = genBtns[(idx + (event.key === 'ArrowRight' ? 1 : -1) + genBtns.length) % genBtns.length];
          next.focus();
          selectGen(next.dataset.genPick!);
        });
      });
    }
  }
}
