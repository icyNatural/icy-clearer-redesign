const tabs = document.querySelectorAll('.tab');
const navButtons = document.querySelectorAll('.nav-btn[data-tab]');
const goButtons = document.querySelectorAll('[data-go]');
const tags = document.querySelectorAll('#frictionTags .tag');

const STORAGE_KEY = 'icyNaturalGameOS';
const HISTORY_KEY = 'icyNaturalGameOSHistory';
const RATING_IDS = ['control','clarity','freedom','expression','engagement','depth','flow','intensity','replay'];

const demoState = Object.freeze({});

const blankTestState = {
  gameName: '', platform: '', notes: '', friction: [],
  control: null, clarity: null, freedom: null, expression: null,
  engagement: null, depth: null, flow: null, intensity: null, replay: null
};

function showTab(tabId, options = {}) {
  if (tabId === 'test' && options.preserveDraft !== true) resetNewTestForm();
  tabs.forEach(tab => tab.classList.toggle('active', tab.id === tabId));
  navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
}

function ratingValue(id) {
  const input = document.getElementById(id);
  if (!input || input.dataset.answered !== 'true') return null;
  const value = Number(input.value);
  return Number.isFinite(value) ? value : null;
}

function getState() {
  const friction = [...document.querySelectorAll('#frictionTags .tag.active')].map(t => t.textContent.trim());
  const gameName = document.getElementById('gameName')?.value.trim() || '';
  const wrap = document.getElementById('gameNameWrap');
  const nameKey = (value) => (window.GOS && GOS.util && GOS.util.normalizeKey
    ? GOS.util.normalizeKey(value)
    : String(value || '').toLowerCase());
  const gameId = wrap && wrap.dataset.gameId && gameName && wrap.dataset.gameName &&
    nameKey(wrap.dataset.gameName) === nameKey(gameName)
    ? wrap.dataset.gameId
    : null;
  return {
    gameName,
    gameId,
    platform: document.getElementById('platform')?.value || '',
    control: ratingValue('control'),
    clarity: ratingValue('clarity'),
    freedom: ratingValue('freedom'),
    expression: ratingValue('expression'),
    engagement: ratingValue('engagement'),
    depth: ratingValue('depth'),
    flow: ratingValue('flow'),
    intensity: ratingValue('intensity'),
    replay: ratingValue('replay'),
    notes: document.getElementById('notes')?.value || '',
    friction
  };
}

function validateTestState(state = getState()) {
  const missing = [];
  if (!state.gameName) missing.push('game name');
  if (!state.platform) missing.push('platform');
  const unanswered = RATING_IDS.filter(id => !Number.isFinite(state[id]));
  if (unanswered.length) missing.push(`${unanswered.length} rating${unanswered.length === 1 ? '' : 's'}`);
  return { valid: missing.length === 0, missing, unanswered };
}

function updateTestValidation() {
  const validation = validateTestState();
  const button = document.getElementById('calculateBtn');
  const status = document.getElementById('testValidationStatus');
  if (button) button.disabled = !validation.valid;
  if (status) {
    status.classList.toggle('is-ready', validation.valid);
    status.classList.remove('is-error');
    status.textContent = validation.valid
      ? 'Ready to calculate and save this experience.'
      : 'Required: ' + validation.missing.join(', ') + '.';
  }
  return validation;
}

function scoreState(state) {
  const weights = {
    control: 0.14,
    clarity: 0.12,
    freedom: 0.10,
    expression: 0.15,
    engagement: 0.17,
    depth: 0.10,
    flow: 0.12,
    intensity: 0.12,
    replay: 0.08
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const key in weights) {
    const value = Number(state[key]);
    if (!Number.isFinite(value)) return null;
    const weight = weights[key];
    weightedSum += value * weight;
    totalWeight += weight;
  }

  const normalized = weightedSum / totalWeight;

  return Math.round(normalized * 10) / 10;
}

function buildVerdict(state) {
  const lines = [];
  if (state.intensity >= 8) lines.push('High interaction density.');
  else if (state.intensity <= 4) lines.push('Low engagement density.');
  if (state.expression >= 8) lines.push('Strong expression potential.');
  if (state.control >= 8) lines.push('Very responsive control feel.');
  if (state.freedom <= 4) lines.push('Some restriction is present.');
  if (state.replay >= 8) lines.push('Strong replay pull.');
  return lines.join(' ') || 'Solid experience.';
}

function toneForValue(value) {
  if (value <= 2) return 'var(--red)';
  if (value <= 4) return 'var(--orange)';
  if (value <= 6) return 'var(--green)';
  if (value <= 8) return 'var(--cyan)';
  return 'linear-gradient(90deg,var(--blue),var(--violet))';
}

function shadowForValue(value) {
  if (value <= 2) return '0 0 18px rgba(255,95,109,.20)';
  if (value <= 4) return '0 0 18px rgba(255,159,67,.18)';
  if (value <= 6) return '0 0 18px rgba(90,242,167,.18)';
  if (value <= 8) return '0 0 18px rgba(99,215,255,.18)';
  return '0 0 22px rgba(155,107,255,.22)';
}

function textColorForValue(value) {
  if (value <= 2) return 'var(--red)';
  if (value <= 4) return 'var(--orange)';
  if (value <= 6) return 'var(--green)';
  if (value <= 8) return 'var(--cyan)';
  return 'var(--violet)';
}

function applyTextColor(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.color = textColorForValue(value);
  el.style.textShadow = shadowForValue(value);
}

function animateNumber(el, endValue, decimals = 0) {
  if (!el) return;
  const startValue = Number(el.dataset.value || 0);
  const duration = 420;
  const startTime = performance.now();

  function frame(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = startValue + ((endValue - startValue) * eased);
    el.textContent = current.toFixed(decimals);
    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      el.dataset.value = endValue;
      el.textContent = Number(endValue).toFixed(decimals);
    }
  }

  requestAnimationFrame(frame);
}

function setBar(id, value) {
  const fill = document.getElementById(id);
  if (!fill) return;
  fill.style.width = `${value * 10}%`;
  fill.style.background = toneForValue(value);
  fill.style.boxShadow = shadowForValue(value);
}

function setRingVisual(ring, valueNode, score) {
  if (!ring) return;

  const clamped = Math.max(0, Math.min(10, score));
  const angle = (clamped / 10) * 360;

  ring.style.setProperty('--score-angle', `${angle}deg`);
  ring.classList.remove('good', 'mid', 'low');

  if (score <= 2.9) {
    ring.classList.add('low');
    ring.style.background = `conic-gradient(from 180deg, var(--red) 0deg, var(--red) ${angle}deg, rgba(255,255,255,.08) ${angle}deg, rgba(255,255,255,.08) 360deg)`;
  } else if (score <= 4.9) {
    ring.classList.add('mid');
    ring.style.background = `conic-gradient(from 180deg, var(--orange) 0deg, var(--orange) ${angle}deg, rgba(255,255,255,.08) ${angle}deg, rgba(255,255,255,.08) 360deg)`;
  } else if (score <= 6.9) {
    ring.classList.add('mid');
    ring.style.background = `conic-gradient(from 180deg, var(--green) 0deg, var(--green) ${angle}deg, rgba(255,255,255,.08) ${angle}deg, rgba(255,255,255,.08) 360deg)`;
  } else if (score <= 8.9) {
    ring.classList.add('good');
    ring.style.background = `conic-gradient(from 180deg, var(--cyan) 0deg, var(--cyan) ${angle}deg, rgba(255,255,255,.08) ${angle}deg, rgba(255,255,255,.08) 360deg)`;
  } else {
    ring.classList.add('good');
    ring.style.background = `conic-gradient(from 180deg, var(--blue) 0deg, var(--violet) ${angle}deg, rgba(255,255,255,.08) ${angle}deg, rgba(255,255,255,.08) 360deg)`;
  }

  if (valueNode) {
    valueNode.textContent = score.toFixed(1);
    valueNode.dataset.value = score;
    valueNode.style.color = textColorForValue(score);
    valueNode.style.textShadow = shadowForValue(score);
  }
}

function updateScoreRing(score) {
  setRingVisual(document.getElementById('scoreRing'), document.getElementById('resultScore'), score);
}

function updateDashScoreRing(score) {
  setRingVisual(document.getElementById('scoreRingDash'), document.getElementById('dashRingScore'), score);
}

function getHistory() {
  const ctx = window.GOS && GOS.gos && GOS.gos.context();
  if (ctx && ctx.booted) {
    const history = ctx.experiences.map(experience => ({
      ...experience.scores, __experienceId: experience.id, gameId: experience.gameId,
      gameName: experience.gameName, platform: experience.platform, notes: experience.notes,
      friction: experience.friction, score: experience.score, verdict: experience.verdict,
      time: experience.date ?? Date.parse(experience.created_at)
    }));
    try {
      const legacy = JSON.parse(PUBLIC_STORAGE.getItem(HISTORY_KEY) || '[]');
      if (Array.isArray(legacy)) legacy.forEach(item => {
        if (!history.some(record => item.__experienceId
          ? record.__experienceId === item.__experienceId
          : record.gameName === item.gameName && record.time === item.time && record.score === item.score)) history.push(item);
      });
    } catch { /* malformed legacy JSON remains untouched */ }
    return history.sort((a, b) => (b.time || 0) - (a.time || 0));
  }
  try {
    const raw = PUBLIC_STORAGE.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToHistory(state, score, verdict) {
  const history = getHistory();
  const item = {
    gameName: state.gameName,
    platform: state.platform,
    control: state.control,
    clarity: state.clarity,
    freedom: state.freedom,
    expression: state.expression,
    engagement: state.engagement,
    depth: state.depth,
    flow: state.flow,
    intensity: state.intensity,
    replay: state.replay,
    friction: state.friction || [],
    score,
    verdict,
    notes: state.notes || '',
    time: Date.now()
  };

  const filtered = history.filter(x => x.gameName.toLowerCase() !== state.gameName.toLowerCase());
  filtered.unshift(item);
  PUBLIC_STORAGE.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, 12)));
}

function loadHistoryItem(item) {
  const state = {
    __experienceId: item.__experienceId,
    recordedScore: item.score,
    recordedVerdict: item.verdict,
    gameName: item.gameName || 'Untitled Game',
    platform: item.platform || 'PC',
    control: Number(item.control ?? 5),
    clarity: Number(item.clarity ?? 5),
    freedom: Number(item.freedom ?? 5),
    expression: Number(item.expression ?? 5),
    engagement: Number(item.engagement ?? 5),
    depth: Number(item.depth ?? 5),
    flow: Number(item.flow ?? 5),
    intensity: Number(item.intensity ?? 5),
    replay: Number(item.replay ?? 5),
    notes: item.notes || '',
    friction: Array.isArray(item.friction) ? item.friction : []
  };

  loadState(state);
  showTab('results');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildIdentityLine(state) {
  const tags = [];
  tags.push(state.platform || 'PC');

  if (state.intensity >= 8) tags.push('High Pace');
  else if (state.intensity <= 4) tags.push('Low Pace');
  else tags.push('Mid Pace');

  if (state.clarity >= 8) tags.push('High Clarity');
  else if (state.clarity <= 4) tags.push('Low Clarity');
  else tags.push('Mid Clarity');

  return tags.join(' • ');
}

function updateTakeChips(state) {
  const platform = document.getElementById('takeChipPlatform');
  const intensity = document.getElementById('takeChipIntensity');
  const replay = document.getElementById('takeChipReplay');
  const freedom = document.getElementById('takeChipFreedom');
  const identity = document.getElementById('takeIdentityLine');

  if (platform) platform.textContent = state.platform || 'PC';
  if (intensity) intensity.textContent = state.intensity;
  if (replay) replay.textContent = state.replay;
  if (freedom) freedom.textContent = state.freedom;
  if (identity) identity.textContent = buildIdentityLine(state);
}

function setFeaturedTakeFallback(bg) {
  bg.style.backgroundImage = 'radial-gradient(circle at 22% 40%, rgba(99,215,255,.16), transparent 28%), radial-gradient(circle at 78% 18%, rgba(155,107,255,.10), transparent 20%), linear-gradient(120deg, rgba(255,255,255,.02), transparent 28%, rgba(255,255,255,.01))';
  bg.style.opacity = '1';
  bg.style.filter = 'none';
  bg.style.transform = 'none';
}

function updateFeaturedTakeBackground(state) {
  const bg = document.getElementById('featuredTakeBg');
  if (!bg) return;

  const name = (state.gameName || '').trim();
  const art = (window.GOS && GOS.art && name) ? GOS.art.cover(name) : null;

  if (art) {
    const probe = new Image();
    probe.onload = function () {
      bg.style.backgroundImage = `url('${art}')`;
      bg.style.opacity = '1';
      bg.style.filter = 'none';
      bg.style.transform = 'none';
    };
    probe.onerror = function () { setFeaturedTakeFallback(bg); };
    probe.src = art;
  } else {
    setFeaturedTakeFallback(bg);
  }
}

function escapeText(value) {
  if (window.GOS && GOS.util && GOS.util.escapeHtml) return GOS.util.escapeHtml(String(value ?? ''));
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function legacyScores(item) {
  return {
    control: Number(item.control ?? 5), clarity: Number(item.clarity ?? 5), freedom: Number(item.freedom ?? 5),
    expression: Number(item.expression ?? 5), engagement: Number(item.engagement ?? 5), depth: Number(item.depth ?? 5),
    flow: Number(item.flow ?? 5), intensity: Number(item.intensity ?? 5), replay: Number(item.replay ?? 5)
  };
}

function mountCurrentGlyphs(state, score) {
  if (!window.GOS || !GOS.glyph) return;
  const ctx = GOS.gos && GOS.gos.context ? GOS.gos.context() : null;
  const latest = state.__experienceId && ctx ? ctx.experiences.find(experience => experience.id === state.__experienceId)
    : ctx && ctx.experiences ? ctx.experiences.slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0] : null;
  const signals = latest && ctx ? ctx.signals.filter(signal => signal.experienceId === latest.id) : [];
  const data = { scores: legacyScores(state), score, signals };
  GOS.glyph.mount('#dashboardGlyph', data, { size: 'lg', variant: 'session', label: `${state.gameName} latest experience`, signals });
  GOS.glyph.mount('#resultGlyph', data, { size: 'xl', variant: 'session', label: `${state.gameName} session`, signals, labels: true });
}

function hydrateHistoryGlyphs(host, history) {
  if (!window.GOS || !GOS.glyph) return;
  host.querySelectorAll('[data-glyph-index]').forEach(node => {
    const item = history[Number(node.dataset.glyphIndex)];
    if (!item) return;
    const scores = legacyScores(item);
    GOS.glyph.mount(node, { scores, score: Number(item.score) || GOS.glyphEngine.average(scores) }, { size: 'xs', variant: 'session', label: `${item.gameName} session` });
  });
}

function renderRecentGames() {
  const host = document.getElementById('recentGamesList');
  if (!host) return;

  const history = getHistory().slice(0, 5);
  if (!history.length) {
    host.innerHTML = '<div class="analysis-item">No recent games yet.</div>';
    return;
  }

  host.innerHTML = history.map((item, index) => {
    const preview = (item.notes && item.notes.trim())
      ? item.notes.trim()
      : (item.verdict && item.verdict.trim() ? item.verdict.trim() : 'No details yet.');

    const scoreColor = textColorForValue(item.score);
    const key = item.__experienceId || `idx-${index}`;
    const art = (window.GOS && GOS.art) ? GOS.art.cover(item.gameName) : '';

    return `
      <div class="recent-game-item compact">
        <div class="recent-game-head" data-game-key="${escapeText(key)}">
          <div class="history-glyph" data-glyph-index="${index}"></div>
          <div class="recent-game-left">
            <div class="recent-game-title">${escapeText(item.gameName)}</div>
            <div class="recent-game-preview">${escapeText(preview)}</div>
          </div>
          <div class="recent-game-score" style="color:${scoreColor}">${Number(item.score).toFixed(1)}</div>
          <div class="recent-game-chevron">›</div>
        </div>
      </div>
    `;
  }).join('');
  hydrateHistoryGlyphs(host, history);

  host.querySelectorAll('[data-game-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-game-key');
      const historyList = getHistory();
      const item = historyList.find(x => (x.__experienceId || '') === key) ||
        historyList.find((x, i) => `idx-${i}` === key);
      if (item) loadHistoryItem(item);
    });
  });
}

function renderHistoryGames() {
  const host = document.getElementById('historyGamesList');
  if (!host) return;

  const history = getHistory();
  if (!history.length) {
    host.innerHTML = '<div class="analysis-item">No saved reviews yet.</div>';
    return;
  }

  host.innerHTML = history.map((item, index) => {
    const preview = (item.notes && item.notes.trim())
      ? item.notes.trim()
      : (item.verdict && item.verdict.trim() ? item.verdict.trim() : 'No details yet.');

    const scoreColor = textColorForValue(item.score);
    const tested = item.time ? new Date(item.time).toLocaleDateString() : 'Saved';
    const key = item.__experienceId || `idx-${index}`;
    const art = (window.GOS && GOS.art) ? GOS.art.cover(item.gameName) : '';

    return `
      <div class="recent-game-item history-game-item">
        <div class="recent-game-head" data-history-key="${escapeText(key)}">
          <div class="history-glyph" data-glyph-index="${index}"></div>
          <div class="recent-game-left">
            <div class="recent-game-title">${escapeText(item.gameName)}</div>
            <div class="history-game-meta">${escapeText(item.platform || 'Unknown Platform')} • ${escapeText(tested)}</div>
            <div class="recent-game-preview">${escapeText(preview)}</div>
          </div>
          <div class="recent-game-score" style="color:${scoreColor}">${Number(item.score).toFixed(1)}</div>
          <div class="recent-game-chevron">›</div>
        </div>
      </div>
    `;
  }).join('');
  hydrateHistoryGlyphs(host, history);

  host.querySelectorAll('[data-history-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-history-key');
      const item = history.find(x => (x.__experienceId || '') === key) ||
        history.find((x, i) => `idx-${i}` === key);
      if (item) loadHistoryItem(item);
    });
  });
}

function previewDash() {
  const state = getState();
  if (!validateTestState(state).valid) return;
  const score = scoreState(state);
  mountCurrentGlyphs(state, score);

  const dashGame = document.getElementById('dashGame');
  if (dashGame) dashGame.textContent = state.gameName;

  animateNumber(document.getElementById('dashScore'), score, 1);
  animateNumber(document.getElementById('dashIntensity'), state.intensity, 0);
  animateNumber(document.getElementById('dashReplay'), state.replay, 0);

  applyTextColor('dashScore', score);
  applyTextColor('sidebarScore', score);
  applyTextColor('dashRingScore', score);

  const sidebarPlatform = document.getElementById('sidebarPlatform');
  if (sidebarPlatform) sidebarPlatform.textContent = state.platform;

  updateTakeChips(state);
  updateFeaturedTakeBackground(state);
  updateDashScoreRing(score);
}

function updateResults(state, initial = false) {
  const score = typeof state.recordedScore === 'number' && Number.isFinite(state.recordedScore)
    ? state.recordedScore : scoreState(state);
  const verdict = state.recordedVerdict || buildVerdict(state);
  mountCurrentGlyphs(state, score);

  updateScoreRing(score);
  updateDashScoreRing(score);

  const resultGame = document.getElementById('resultGame');
  if (resultGame) resultGame.textContent = state.gameName;

  const verdictText = document.getElementById('verdictText');
  if (verdictText) verdictText.textContent = verdict;

  const dashGame = document.getElementById('dashGame');
  if (dashGame) dashGame.textContent = state.gameName;

  const sidebarScore = document.getElementById('sidebarScore');
  if (sidebarScore) sidebarScore.textContent = score.toFixed(1);

  const sidebarPlatform = document.getElementById('sidebarPlatform');
  if (sidebarPlatform) sidebarPlatform.textContent = state.platform;

  const recentTakeGame = document.getElementById('recentTakeGame');
  if (recentTakeGame) recentTakeGame.textContent = state.gameName;

  updateTakeChips(state);
  updateFeaturedTakeBackground(state);

  const dashVerdict = document.getElementById('dashVerdict');
  if (dashVerdict) dashVerdict.textContent = verdict;

  const dashNotesPreview = document.getElementById('dashNotesPreview');
  if (dashNotesPreview) {
    dashNotesPreview.textContent = state.notes && state.notes.trim() ? state.notes.trim() : 'No notes yet.';
  }

  const resultUserNote = document.getElementById('resultUserNote');
  if (resultUserNote) {
    resultUserNote.textContent = state.notes && state.notes.trim() ? state.notes.trim() : 'No notes yet.';
  }

  if (initial) {
    const resultScore = document.getElementById('resultScore');
    const dashScore = document.getElementById('dashScore');
    const dashIntensity = document.getElementById('dashIntensity');
    const dashReplay = document.getElementById('dashReplay');
    const dashRingScore = document.getElementById('dashRingScore');

    if (resultScore) { resultScore.dataset.value = score; resultScore.textContent = score.toFixed(1); }
    if (dashScore) { dashScore.dataset.value = score; dashScore.textContent = score.toFixed(1); }
    if (dashIntensity) { dashIntensity.dataset.value = state.intensity; dashIntensity.textContent = state.intensity; }
    if (dashReplay) { dashReplay.dataset.value = state.replay; dashReplay.textContent = state.replay; }
    if (dashRingScore) { dashRingScore.dataset.value = score; dashRingScore.textContent = score.toFixed(1); }
  } else {
    animateNumber(document.getElementById('resultScore'), score, 1);
    animateNumber(document.getElementById('dashScore'), score, 1);
    animateNumber(document.getElementById('dashIntensity'), state.intensity, 0);
    animateNumber(document.getElementById('dashReplay'), state.replay, 0);
    animateNumber(document.getElementById('dashRingScore'), score, 1);
  }

  applyTextColor('sidebarScore', score);
  applyTextColor('dashScore', score);
  applyTextColor('resultScore', score);
  applyTextColor('dashRingScore', score);

  const dashScoreCard = document.getElementById('dashScore')?.closest('.mini-card');
  const sidebarScoreCard = document.getElementById('sidebarScore')?.closest('.meta-card');
  if (dashScoreCard) {
    dashScoreCard.style.borderColor = textColorForValue(score);
    dashScoreCard.style.boxShadow = shadowForValue(score);
  }
  if (sidebarScoreCard) {
    sidebarScoreCard.style.borderColor = textColorForValue(score);
    sidebarScoreCard.style.boxShadow = shadowForValue(score);
  }

  const resultMap = {
    resultControl: state.control,
    resultClarity: state.clarity,
    resultFreedom: state.freedom,
    resultExpression: state.expression,
    resultEngagement: state.engagement,
    resultDepth: state.depth,
    resultFlow: state.flow,
    resultIntensity: state.intensity,
    resultReplay: state.replay
  };

  Object.entries(resultMap).forEach(([id, value]) => {
    setBar(id, value);
    const valueNode = document.getElementById(`${id}Value`);
    if (valueNode) valueNode.textContent = value;
  });
}

function loadState(state, options = {}) {
  ['gameName','platform','notes'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = state[id] === undefined || state[id] === null ? '' : state[id];
  });

  RATING_IDS.forEach(id => {
    const display = document.getElementById(`${id}Display`);
    const input = document.getElementById(id);
    if (!input) return;
    const answered = state[id] !== null && state[id] !== '' && Number.isFinite(Number(state[id]));
    input.value = answered ? String(state[id]) : '5';
    input.dataset.answered = answered ? 'true' : 'false';
    input.closest('.metric-row')?.classList.toggle('is-unanswered', !answered);
    const label = input.closest('.metric-row')?.querySelector('.metric-name')?.textContent || id;
    input.setAttribute('aria-label', `${label}, ${answered ? input.value + ' out of 10' : 'unanswered'}`);
    if (display) display.textContent = answered ? input.value : 'Unanswered';
  });

  tags.forEach(tag => {
    tag.classList.toggle('active', (state.friction || []).includes(tag.textContent.trim()));
  });

  updateTestValidation();
  if (options.updateViews !== false && validateTestState(state).valid) updateResults(state, true);
}

function clearTransientSelections() {
  tags.forEach(tag => tag.classList.remove('active'));
  if (window.GOS && GOS.gos && GOS.gos.resetSignalTags) GOS.gos.resetSignalTags('overall');
  const context = document.getElementById('signalContext');
  if (context) context.value = 'overall';
  const media = document.getElementById('experienceMediaFile');
  if (media) media.value = '';
  const visibility = document.getElementById('experienceMediaVisibility');
  if (visibility) visibility.value = 'private';
  const mediaStatus = document.getElementById('experienceMediaStatus');
  if (mediaStatus) mediaStatus.textContent = 'No media selected.';
}

function resetNewTestForm() {
  loadState(blankTestState, { updateViews: false });
  clearTransientSelections();
  updateTestValidation();
}

function startGameExperience(game) {
  resetNewTestForm();
  const name = game && game.name ? game.name : String(game || '');
  const gameName = document.getElementById('gameName');
  if (gameName) gameName.value = name;
  updateTestValidation();
  showTab('test', { preserveDraft: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.startGameExperience = startGameExperience;

function clearLatestGame() {
  PUBLIC_STORAGE.removeItem(STORAGE_KEY);
  resetNewTestForm();
  showTab('dashboard');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearRecentGames() {
  PUBLIC_STORAGE.removeItem(HISTORY_KEY);
  const gos = window.GOS && GOS.gos;
  if (gos && gos.clearExperiences) gos.clearExperiences();
  renderRecentGames();
  renderHistoryGames();
}

navButtons.forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
goButtons.forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.go)));

document.getElementById('startTestBtn')?.addEventListener('click', () => {
  showTab('test');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('loadDemoBtn')?.addEventListener('click', () => {
  clearTransientSelections();
  loadState(demoState, { updateViews: false });
  showTab('test', { preserveDraft: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('viewFullHistoryBtn')?.addEventListener('click', () => {
  showTab('history');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

tags.forEach(tag => {
  tag.addEventListener('click', () => tag.classList.toggle('active'));
});

RATING_IDS.forEach(id => {
  const input = document.getElementById(id);
  const display = document.getElementById(`${id}Display`);
  if (input && display) {
    input.addEventListener('input', () => {
      input.dataset.answered = 'true';
      input.closest('.metric-row')?.classList.remove('is-unanswered');
      display.textContent = input.value;
      const label = input.closest('.metric-row')?.querySelector('.metric-name')?.textContent || id;
      input.setAttribute('aria-label', `${label}, ${input.value} out of 10`);
      updateTestValidation();
    });
  }
});

document.getElementById('gameName')?.addEventListener('input', updateTestValidation);
document.getElementById('platform')?.addEventListener('change', updateTestValidation);

document.getElementById('calculateBtn')?.addEventListener('click', () => {
  const btn = document.getElementById('calculateBtn');
  const originalText = btn ? btn.textContent : 'Calculate Result';

  const validation = updateTestValidation();
  if (!validation.valid) {
    const status = document.getElementById('testValidationStatus');
    if (status) status.classList.add('is-error');
    return;
  }

  if (btn) {
    btn.textContent = 'Analyzing...';
    btn.disabled = true;
  }

  const state = getState();
  const score = scoreState(state);
  const verdict = buildVerdict(state);

  const finish = () => {
    try {
      updateResults(state);
      renderRecentGames();
      renderHistoryGames();
      showTab('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Calculate flow error:', err);
      alert('A script error happened after calculation. Open DevTools Console to see it.');
    } finally {
      if (btn) {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }
  };

  setTimeout(() => {
    const gos = window.GOS && GOS.gos;
    if (gos && gos.saveExperience) {
      gos.saveExperience(state, score, verdict)
        .then(finish)
        .catch(err => {
          console.error('Store save failed, falling back to legacy storage:', err);
          try {
            PUBLIC_STORAGE.setItem(STORAGE_KEY, JSON.stringify(state));
            saveToHistory(state, score, verdict);
          } catch (legacyErr) {
            console.error('Legacy save failed too:', legacyErr);
          }
          finish();
        });
      return;
    }

    try {
      PUBLIC_STORAGE.setItem(STORAGE_KEY, JSON.stringify(state));
      saveToHistory(state, score, verdict);
      finish();
    } catch (err) {
      console.error('Calculate flow error:', err);
      alert('A script error happened after calculation. Open DevTools Console to see it.');
      if (btn) {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }
  }, 350);
});

document.getElementById('resetBtn')?.addEventListener('click', () => {
  resetNewTestForm();
  showTab('test', { preserveDraft: true });
});

document.getElementById('clearLatestBtn')?.addEventListener('click', clearLatestGame);
document.getElementById('clearHistoryBtn')?.addEventListener('click', clearRecentGames);

const stored = PUBLIC_STORAGE.getItem(STORAGE_KEY);
if (stored) {
  try {
    loadState(JSON.parse(stored));
  } catch {
    resetNewTestForm();
  }
} else {
  resetNewTestForm();
}
resetNewTestForm();

renderRecentGames();
renderHistoryGames();


document.addEventListener('gos:data', () => {
  renderRecentGames();
  renderHistoryGames();
});

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}



