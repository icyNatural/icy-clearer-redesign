/**
 * icyNatural Game OS — Taste Atlas view.
 *
 * Renders taste patterns with their evidence:
 *   - strong positive / strong negative / contradictions / emerging
 *   - confidence labels that never overstate sparse evidence
 *   - every pattern expands to the exact experiences behind it, including
 *     contradicting experiences (kept visible, never averaged away)
 */
(function (root) {
  'use strict';

  var GOS = (root.GOS = root.GOS || {});
  var U = GOS.util;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function formatDate(at) {
    if (!at) return '';
    try { return new Date(at).toLocaleDateString(); } catch (e) { return String(at); }
  }

  function section(title, hint, patterns, options) {
    options = options || {};
    var wrap = el('section', 'gos-atlas-section');
    var head = el('div', 'gos-atlas-section-head');
    head.appendChild(el('span', 'gos-atlas-section-title', title));
    head.appendChild(el('span', 'gos-branch-count', String(patterns.length)));
    if (hint) head.appendChild(el('span', 'gos-atlas-hint', hint));
    wrap.appendChild(head);

    if (!patterns.length) {
      wrap.appendChild(el('div', 'gos-empty', options.emptyText || 'None yet.'));
      return wrap;
    }

    var list = el('div', 'gos-pattern-list');
    patterns.forEach(function (pattern) {
      list.appendChild(patternRow(pattern));
    });
    wrap.appendChild(list);
    return wrap;
  }

  function patternRow(pattern) {
    var row = el('article', 'gos-pattern gos-pattern-' + pattern.polarity);
    if (pattern.contradictory) row.classList.add('is-contradictory');
    if (pattern.emerging) row.classList.add('is-emerging');

    var head = el('button', 'gos-pattern-head');
    head.type = 'button';

    var title = el('span', 'gos-pattern-title', pattern.label);
    head.appendChild(title);

    var chips = el('span', 'gos-pattern-chips');
    chips.appendChild(el('span', 'gos-chip ' + chipTone(pattern.polarity), pattern.polarity));
    chips.appendChild(el('span', 'gos-chip', pattern.strength));
    chips.appendChild(el('span', 'gos-chip', pattern.frequency + ' signal' + (pattern.frequency === 1 ? '' : 's')));
    chips.appendChild(el('span', 'gos-chip', GOS.taste.confidenceLabel(pattern)));
    if (pattern.emerging) chips.appendChild(el('span', 'gos-chip gos-chip-emerging', 'emerging'));
    if (pattern.contradictory) chips.appendChild(el('span', 'gos-chip gos-chip-contra', 'contradictory'));
    head.appendChild(chips);

    var meter = el('span', 'gos-conf-meter');
    var fill = el('span', 'gos-conf-fill');
    fill.style.width = Math.round(pattern.confidence * 100) + '%';
    meter.appendChild(fill);
    head.appendChild(meter);

    row.appendChild(head);

    var body = el('div', 'gos-pattern-body hidden');

    var stats = el('div', 'gos-pattern-stats');
    stats.appendChild(stat('Net', String(pattern.net)));
    stats.appendChild(stat('Distinct games', String(pattern.distinctGames)));
    stats.appendChild(stat('First seen', formatDate(pattern.firstAt)));
    stats.appendChild(stat('Last seen', formatDate(pattern.lastAt)));
    if (pattern.recentNet !== null && pattern.recentNet !== undefined) {
      stats.appendChild(stat('Last 90 days', String(pattern.recentNet)));
    }
    body.appendChild(stats);

    if (pattern.evidenceExperienceIds && pattern.evidenceExperienceIds.length) {
      var expIds = {};
      pattern.evidenceExperienceIds.forEach(function (id) { expIds[id] = true; });

      body.appendChild(el('div', 'gos-evidence-title', 'Supporting experiences'));
      var supportList = el('ul', 'gos-evidence-list');
      pattern.support.forEach(function (entry) {
        var li = el('li', 'gos-evidence-item');
        var line = el('div', 'gos-evidence-line');
        line.appendChild(el('span', 'gos-evidence-game', entry.gameName));
        line.appendChild(el('span', 'gos-chip ' + (entry.polarity === 'positive' ? 'gos-chip-pos' : 'gos-chip-neg'),
          entry.polarity));
        line.appendChild(el('span', 'gos-chip', 'importance ' + entry.importance));
        if (entry.score !== null && entry.score !== undefined) {
          line.appendChild(el('span', 'gos-chip', 'rated ' + Number(entry.score).toFixed(1)));
        }
        line.appendChild(el('span', 'gos-evidence-date', formatDate(entry.at)));
        li.appendChild(line);
        if (entry.evidence) li.appendChild(el('div', 'gos-evidence-text', entry.evidence));
        supportList.appendChild(li);
      });
      body.appendChild(supportList);
    }

    if (pattern.contradictingGames && pattern.contradictingGames.length) {
      body.appendChild(el('div', 'gos-evidence-title', 'Contradicting experiences'));
      body.appendChild(el('div', 'gos-contradicting', pattern.contradictingGames.join(', ')));
    }

    if (pattern.contexts && Object.keys(pattern.contexts).length) {
      var contexts = el('div', 'gos-context-line');
      Object.keys(pattern.contexts).forEach(function (key) {
        var value = pattern.contexts[key];
        contexts.appendChild(el('span', 'gos-chip',
          key + ' (+' + value.positive + '/-' + value.negative + ')'));
      });
      body.appendChild(contexts);
    }

    head.addEventListener('click', function () {
      body.classList.toggle('hidden');
    });

    row.appendChild(body);
    return row;
  }

  function stat(label, value) {
    var wrap = el('div', 'gos-stat');
    wrap.appendChild(el('span', 'gos-stat-label', label));
    wrap.appendChild(el('span', 'gos-stat-value', value));
    return wrap;
  }

  function chipTone(polarity) {
    if (polarity === 'positive') return 'gos-chip-pos';
    if (polarity === 'negative') return 'gos-chip-neg';
    return 'gos-chip-mixed';
  }

  function scoreText(value) {
    return Number(value).toFixed(1) + '/10';
  }

  function gameEvidence(title, rows) {
    var wrap = el('span', 'taste-evidence');
    wrap.appendChild(el('span', 'taste-evidence__label', title));
    var list = el('span', 'taste-evidence__list');
    (rows || []).forEach(function (row) {
      var item = el('span', 'taste-evidence__item');
      item.appendChild(el('strong', null, row.gameName));
      item.appendChild(el('span', null, scoreText(row.value) + ' dimension · rated ' + scoreText(row.rating) +
        ' · ' + row.sampleCount + ' experience' + (row.sampleCount === 1 ? '' : 's')));
      list.appendChild(item);
    });
    if (!rows || !rows.length) list.appendChild(el('span', 'taste-evidence__item', 'No contrasting game recorded yet.'));
    wrap.appendChild(list);
    return wrap;
  }

  function dimensionRow(dimension, extremes) {
    var button = el('button', 'taste-dimension');
    button.type = 'button';
    button.dataset.glyphDimension = dimension.key;
    button.setAttribute('aria-label', 'Highlight ' + dimension.label + ', ' + scoreText(dimension.value) + ', ' + dimension.direction);
    var top = el('span', 'taste-dimension__top');
    top.appendChild(el('strong', null, dimension.label));
    top.appendChild(el('span', 'taste-dimension__direction', dimension.direction));
    var badges = el('span', 'taste-dimension__badges');
    if (extremes.highestKeys.indexOf(dimension.key) !== -1) badges.appendChild(el('span', 'gos-chip gos-chip-pos', 'highest'));
    if (extremes.lowestKeys.indexOf(dimension.key) !== -1) badges.appendChild(el('span', 'gos-chip gos-chip-neg', 'lowest'));
    top.appendChild(badges);
    button.appendChild(top);
    var values = el('span', 'taste-dimension__values');
    values.appendChild(el('span', null, 'All played ' + scoreText(dimension.value)));
    values.appendChild(el('span', null, dimension.positiveValue === null
      ? 'Positive profile — not enough rated games'
      : 'Positive profile ' + scoreText(dimension.positiveValue) + ' (' + (dimension.preferenceDelta >= 0 ? '+' : '') + dimension.preferenceDelta.toFixed(1) + ')'));
    button.appendChild(values);
    var track = el('span', 'taste-dimension__track');
    var fill = el('span', 'taste-dimension__fill');
    fill.style.width = (dimension.value * 10) + '%';
    track.appendChild(fill);
    button.appendChild(track);
    return button;
  }

  function patternCard(pattern) {
    var card = el('button', 'taste-pattern');
    card.type = 'button';
    card.dataset.glyphDimension = pattern.key;
    card.appendChild(el('span', 'taste-pattern__title', pattern.label + ' · ' + pattern.direction));
    card.appendChild(el('span', 'taste-pattern__copy', pattern.text));
    card.appendChild(gameEvidence('Positive examples', pattern.supporting));
    card.appendChild(gameEvidence('Contrasting recorded games', pattern.contrasting));
    return card;
  }

  function renderTasteGlyph(tasteHost, analysis) {
    if (!tasteHost || !analysis || !GOS.glyph) return;
    tasteHost.textContent = '';

    var visual = el('div', 'taste-glyph-visual');
    visual.appendChild(GOS.glyph.render(analysis.overall, {
      size: 'lg', variant: 'taste', label: 'Overall recorded experience profile', scoreLabel: 'ALL', interactive: true
    }));
    var copy = el('div', 'taste-glyph-copy');
    copy.appendChild(el('div', 'eyebrow', 'Overall experience glyph'));
    copy.appendChild(el('h3', null, 'What all recorded games looked like'));
    copy.appendChild(el('p', 'subtext', analysis.overall.weighting));
    copy.appendChild(el('span', 'gos-chip', analysis.overall.distinctGames + ' games · ' + analysis.overall.sampleCount + ' experiences'));
    var highLabels = analysis.dimensions.filter(function (dimension) { return analysis.highestKeys.indexOf(dimension.key) !== -1; }).map(function (dimension) { return dimension.label; });
    var lowLabels = analysis.dimensions.filter(function (dimension) { return analysis.lowestKeys.indexOf(dimension.key) !== -1; }).map(function (dimension) { return dimension.label; });
    copy.appendChild(el('p', 'taste-extremes',
      'Highest: ' + highLabels.join(', ') + ' ' + scoreText(analysis.highest.value) + '. Lowest: ' + lowLabels.join(', ') + ' ' + scoreText(analysis.lowest.value) + '.'));
    visual.appendChild(copy);

    var positiveToggle = el('button', 'btn btn-secondary taste-positive-toggle', 'Show positive-experience glyph');
    positiveToggle.type = 'button';
    positiveToggle.setAttribute('aria-expanded', 'false');
    visual.appendChild(positiveToggle);
    var positiveWrap = el('div', 'taste-positive-glyph hidden');
    var positiveRendered = false;
    positiveToggle.addEventListener('click', function () {
      var open = positiveWrap.classList.toggle('hidden') === false;
      if (open && !positiveRendered) {
        positiveRendered = true;
        if (analysis.positive) {
          positiveWrap.appendChild(GOS.glyph.render(analysis.positive, {
            size: 'md', variant: 'taste', label: 'Positively rated game profile', scoreLabel: '7.5+', interactive: true
          }));
          positiveWrap.appendChild(el('p', 'subtext', analysis.positiveRule + ' ' + analysis.positiveGameCount + ' games and ' + analysis.positiveExperienceCount + ' experiences qualify.'));
        } else {
          positiveWrap.appendChild(el('div', 'gos-empty', 'No game currently meets the ' + analysis.positiveThreshold.toFixed(1) + '/10 positive-profile threshold.'));
        }
      }
      positiveToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      positiveToggle.textContent = open ? 'Hide positive-experience glyph' : 'Show positive-experience glyph';
    });
    visual.appendChild(positiveWrap);
    tasteHost.appendChild(visual);

    var interpretation = el('section', 'taste-interpretation');
    interpretation.appendChild(el('div', 'eyebrow', 'Taste interpretation'));
    interpretation.appendChild(el('h3', null, 'Why the shape reaches in each direction'));
    interpretation.appendChild(el('p', 'subtext',
      'Tap any dimension or explanation to highlight its matching radar axis. “All played” describes your recorded experiences; it is not automatically a preference claim.'));
    var dimensions = el('div', 'taste-dimensions');
    analysis.dimensions.forEach(function (dimension) {
      dimensions.appendChild(dimensionRow(dimension, analysis));
    });
    interpretation.appendChild(dimensions);

    var patternHead = el('div', 'taste-patterns__head');
    patternHead.appendChild(el('h4', null, 'Strongest preference differences'));
    patternHead.appendChild(el('p', 'subtext', analysis.positiveRule));
    interpretation.appendChild(patternHead);
    if (!analysis.preferenceEvidenceSufficient) {
      interpretation.appendChild(el('div', 'taste-evidence-warning',
        'Insufficient preference evidence: ' + analysis.positiveGameCount + ' positively rated game' + (analysis.positiveGameCount === 1 ? '' : 's') +
        ' recorded; at least ' + analysis.minimumPreferenceGames + ' are required before comparing recurring preference patterns.'));
    } else {
      var patterns = el('div', 'taste-patterns');
      analysis.patterns.forEach(function (pattern) { patterns.appendChild(patternCard(pattern)); });
      interpretation.appendChild(patterns);
    }
    tasteHost.appendChild(interpretation);
  }

  function render() {
    var host = document.getElementById('atlasSections');
    var summary = document.getElementById('atlasSummary');
    if (!host) return;

    var ctx = GOS.gos ? GOS.gos.context() : null;
    host.textContent = '';

    if (!ctx || !ctx.booted) {
      host.appendChild(el('div', 'gos-empty', 'Loading your experiences…'));
      return;
    }

    if (!ctx.experiences.length) {
      var empty = el('div', 'gos-empty');
      empty.appendChild(el('div', 'gos-empty-title', 'No experiences logged yet'));
      empty.appendChild(el('div', 'gos-empty-text',
        'Log a game in Test Game. Scores, friction tags and signal tags become evidence for taste patterns here.'));
      host.appendChild(empty);
      if (summary) summary.textContent = '';
      return;
    }

    var buckets = GOS.taste.buckets(ctx.patterns);
    var tasteHost = document.getElementById('tasteGlyph');
    var analysis = GOS.glyphEngine ? GOS.glyphEngine.analyzeTaste(ctx.experiences, ctx.gamesById) : null;
    renderTasteGlyph(tasteHost, analysis);

    if (summary) {
      summary.textContent = '';
      summary.appendChild(el('span', 'gos-chip', ctx.experiences.length + ' experiences'));
      summary.appendChild(el('span', 'gos-chip', ctx.signals.length + ' signals'));
      summary.appendChild(el('span', 'gos-chip', ctx.patterns.length + ' patterns'));
      summary.appendChild(el('span', 'gos-chip',
        (buckets.strongPositive.length + buckets.strongNegative.length) + ' strong'));
    }

    host.appendChild(section('Strong positive', 'what your evidence says you respond to',
      buckets.strongPositive, { emptyText: 'No positive patterns with enough evidence yet.' }));
    host.appendChild(section('Strong negative', 'what your evidence says pushes you away',
      buckets.strongNegative, { emptyText: 'No negative patterns with enough evidence yet.' }));
    host.appendChild(section('Contradictions', 'same signal, both directions — kept visible',
      buckets.contradictions, { emptyText: 'No contradictory signals so far.' }));
    host.appendChild(section('Emerging', 'recent, low-count positives worth watching',
      buckets.emerging, { emptyText: 'Nothing emerging in the last 21 days.' }));

    var core = section('Core dimensions', 'derived from the nine Game OS sliders',
      buckets.core, { emptyText: 'No slider scored 8+ or 4- yet.' });
    host.appendChild(core);

    var contextualWrap = el('section', 'gos-atlas-section');
    var ctxHead = el('div', 'gos-atlas-section-head');
    ctxHead.appendChild(el('span', 'gos-atlas-section-title', 'Contextual signals'));
    ctxHead.appendChild(el('span', 'gos-branch-count', String(buckets.contextual.length)));
    contextualWrap.appendChild(ctxHead);

    var groups = Object.keys(buckets.byGroup).sort();
    if (!groups.length) {
      contextualWrap.appendChild(el('div', 'gos-empty',
        'Add signal tags when logging a game to build contextual patterns.'));
    } else {
      groups.forEach(function (group) {
        var groupWrap = el('div', 'gos-atlas-group');
        groupWrap.appendChild(el('div', 'gos-atlas-group-title', group));
        var list = el('div', 'gos-pattern-list');
        buckets.byGroup[group].forEach(function (pattern) {
          list.appendChild(patternRow(pattern));
        });
        groupWrap.appendChild(list);
        contextualWrap.appendChild(groupWrap);
      });
    }
    host.appendChild(contextualWrap);
  }

  function init() {
    document.addEventListener('gos:tab', function (event) {
      if (event.detail && event.detail.tab === 'atlas') {
        if (GOS.gos) GOS.gos.refresh().then(render, render);
        else render();
      }
    });
    document.addEventListener('gos:data', function () { render(); });
    document.addEventListener('gos:ready', render);
  }

  GOS.atlas = { init: init, render: render };

  if (root.document) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
