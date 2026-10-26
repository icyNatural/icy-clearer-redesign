/** Accessible deterministic SVG nine-axis radar glyph renderer.
 *  One filled polygon on a fixed 0–10 scale, shared by every glyph surface. */
(function (root) {
  'use strict';
  var GOS = (root.GOS = root.GOS || {});
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var serial = 0;
  var interactionInstalled = false;
  var RADAR = (GOS.glyphEngine && GOS.glyphEngine.RADAR) || { center: 100, outerRadius: 84, labelRadius: 97 };
  var CENTER = RADAR.center;
  var LABEL_RADIUS = RADAR.labelRadius;
  /* Perimeter labels live inside the viewBox, so nothing is clipped or scrolled. */
  var VIEWBOX = { x: -34, y: -10, width: 268, height: 220 };

  function svgEl(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }

  function detailFor(size) {
    var table = {
      xs: { labels: false, score: false, grid: false, dotRadius: 3.6, coreRadius: 0 },
      sm: { labels: false, score: false, grid: true, dotRadius: 3, coreRadius: 0 },
      md: { labels: false, score: true, grid: true, dotRadius: 2.6, coreRadius: 15 },
      lg: { labels: true, score: true, grid: true, dotRadius: 2.4, coreRadius: 17 }
    };
    return table[size] || table.lg;
  }

  function variantFor(data, options) {
    if (options.variant) return options.variant;
    return data && (data.type === 'game' || data.type === 'taste') ? data.type : 'session';
  }

  function polar(angle, radius) {
    return {
      x: Math.round((CENTER + Math.cos(angle) * radius) * 1000) / 1000,
      y: Math.round((CENTER + Math.sin(angle) * radius) * 1000) / 1000
    };
  }

  function sectorPath(angle) {
    var half = Math.PI / 9;
    var reach = LABEL_RADIUS + 8;
    var left = polar(angle - half, reach);
    var right = polar(angle + half, reach);
    return 'M ' + CENTER + ' ' + CENTER +
      ' L ' + left.x + ' ' + left.y +
      ' A ' + reach + ' ' + reach + ' 0 0 1 ' + right.x + ' ' + right.y + ' Z';
  }

  function labelAnchor(point) {
    var cosine = Math.cos(point.angle);
    var sine = Math.sin(point.angle);
    return {
      x: Math.round((CENTER + cosine * LABEL_RADIUS) * 1000) / 1000,
      y: Math.round((CENTER + sine * LABEL_RADIUS) * 1000) / 1000,
      anchor: cosine > 0.3 ? 'start' : cosine < -0.3 ? 'end' : 'middle'
    };
  }

  function formatDimensionValue(value) {
    return Number(value).toFixed(Number(value) % 1 ? 1 : 0) + ' / 10';
  }

  function interactionRoot(node) {
    return node.closest('.results-composition, .game-dossier__top, .taste-glyph-panel, .featured-take-main') ||
      node.closest('.tab') || node.closest('.experience-glyph') || document;
  }

  function setActiveDimension(node, key, pinned) {
    var rootNode = interactionRoot(node);
    rootNode.querySelectorAll('[data-glyph-dimension], [data-axis]').forEach(function (item) {
      var itemKey = item.getAttribute('data-glyph-dimension') || item.getAttribute('data-axis');
      item.classList.toggle('is-dimension-active', Boolean(key) && itemKey === key);
    });
    rootNode.querySelectorAll('.experience-glyph').forEach(function (figure) {
      if (pinned === true && key) figure.dataset.pinnedDimension = key;
      else if (pinned === false) delete figure.dataset.pinnedDimension;
    });
  }

  function pinnedDimension(node) {
    var figure = interactionRoot(node).querySelector('.experience-glyph[data-pinned-dimension]');
    return figure ? figure.dataset.pinnedDimension : '';
  }

  function installInteraction() {
    if (interactionInstalled || typeof document === 'undefined') return;
    interactionInstalled = true;
    document.addEventListener('pointerover', function (event) {
      var target = event.target.closest && event.target.closest('[data-glyph-dimension]');
      if (target) setActiveDimension(target, target.getAttribute('data-glyph-dimension'));
    });
    document.addEventListener('pointerout', function (event) {
      var target = event.target.closest && event.target.closest('[data-glyph-dimension]');
      if (!target || (event.relatedTarget && target.contains(event.relatedTarget))) return;
      var pinned = pinnedDimension(target);
      setActiveDimension(target, pinned || null);
    });
    document.addEventListener('focusin', function (event) {
      var target = event.target.closest && event.target.closest('[data-glyph-dimension]');
      if (target) setActiveDimension(target, target.getAttribute('data-glyph-dimension'));
    });
    document.addEventListener('focusout', function (event) {
      var target = event.target.closest && event.target.closest('[data-glyph-dimension]');
      if (!target) return;
      var pinned = pinnedDimension(target);
      setActiveDimension(target, pinned || null);
    });
    document.addEventListener('click', function (event) {
      var target = event.target.closest && event.target.closest('[data-glyph-dimension]');
      if (!target) return;
      var key = target.getAttribute('data-glyph-dimension');
      var next = pinnedDimension(target) === key ? '' : key;
      setActiveDimension(target, next || null, Boolean(next));
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      var target = event.target.closest && event.target.closest('[data-glyph-dimension]');
      if (!target) return;
      event.preventDefault();
      target.click();
    });
  }

  /* Hover/tap/focus reads the exact score off the chart point itself. */
  function installTip(figure, tip, geometry) {
    var byKey = {};
    geometry.points.forEach(function (point) { byKey[point.key] = point; });

    function targetKey(event) {
      var target = event.target;
      var node = target && target.closest ? target.closest('[data-glyph-dimension]') : null;
      return node ? node.getAttribute('data-glyph-dimension') : '';
    }

    function position(point) {
      var art = figure.querySelector('.experience-radar__art');
      if (!art || !art.getBoundingClientRect().width) return;
      var artBox = art.getBoundingClientRect();
      var figureBox = figure.getBoundingClientRect();
      var scale = artBox.width / VIEWBOX.width;
      var x = artBox.left - figureBox.left + (point.x - VIEWBOX.x) * scale;
      var y = artBox.top - figureBox.top + (point.y - VIEWBOX.y) * scale;
      tip.style.left = Math.round(x) + 'px';
      tip.style.top = Math.round(y) + 'px';
      tip.classList.toggle('is-below', y < figureBox.height * 0.3);
    }

    function show(key) {
      var point = byKey[key];
      if (!point) return;
      tip.textContent = point.label + ' · ' + formatDimensionValue(point.value);
      tip.hidden = false;
      position(point);
    }

    function hide() { tip.hidden = true; }

    figure.addEventListener('pointerover', function (event) {
      var key = targetKey(event);
      if (key) show(key);
    });
    figure.addEventListener('pointerout', function (event) {
      var key = targetKey(event);
      if (!key || (event.relatedTarget && event.target.closest && event.target.closest('[data-glyph-dimension]').contains(event.relatedTarget))) return;
      if (figure.dataset.pinnedDimension === key) return;
      hide();
    });
    figure.addEventListener('focusin', function (event) {
      var key = targetKey(event);
      if (key) show(key);
    });
    figure.addEventListener('focusout', function (event) {
      var key = targetKey(event);
      if (!key || figure.dataset.pinnedDimension === key) return;
      hide();
    });
    figure.addEventListener('click', function (event) {
      var key = targetKey(event);
      if (!key) return;
      root.requestAnimationFrame(function () {
        if (figure.dataset.pinnedDimension === key) show(key);
        else hide();
      });
    });
  }

  function render(data, options) {
    options = options || {};
    var engine = GOS.glyphEngine;
    var size = options.size || 'md';
    var detail = detailFor(size);
    var showLabels = options.labels === true || (options.labels !== false && detail.labels);
    var variant = variantFor(data, options);
    var scores = data && data.scores ? data.scores : data || {};
    var geometry = engine.geometry(scores, {
      score: data && data.score,
      signals: options.signals || (data && data.signals) || [],
      variant: variant,
      sampleCount: data && data.sampleCount,
      distinctGames: data && data.distinctGames
    });
    var uid = 'radar-' + (++serial);
    var figure = document.createElement('figure');
    figure.className = 'experience-glyph experience-radar experience-glyph--' + size + ' experience-radar--' + variant;
    if (options.className) figure.className += ' ' + options.className;
    figure.setAttribute('role', 'group');
    figure.setAttribute('aria-label', (options.label || 'Experience') + ' radar chart');

    var svg = svgEl('svg', {
      viewBox: VIEWBOX.x + ' ' + VIEWBOX.y + ' ' + VIEWBOX.width + ' ' + VIEWBOX.height,
      role: 'img', class: 'experience-radar__art',
      'aria-labelledby': uid + '-title ' + uid + '-desc',
      'data-variant': variant, 'data-detail': size,
      'data-scale': geometry.scale.min + '-' + geometry.scale.max,
      'data-perimeter-labels': showLabels ? 'available' : 'false'
    });
    svg.appendChild(svgEl('title', { id: uid + '-title' })).textContent = (options.label || 'Experience') + ' glyph, score ' + geometry.score;
    svg.appendChild(svgEl('desc', { id: uid + '-desc' })).textContent =
      'Nine-axis radar on a fixed 0 to 10 scale: the centre is 0 and the outer ring is 10, identical for every chart. ' +
      engine.DIMENSIONS.map(function (dimension) { return dimension.label + ' ' + geometry.scores[dimension.key] + ' out of 10'; }).join(', ') + '.';

    var defs = svgEl('defs');
    var fillGradient = svgEl('linearGradient', { id: uid + '-fill', x1: '0', y1: '1', x2: '1', y2: '0' });
    fillGradient.appendChild(svgEl('stop', { offset: '0%', 'stop-color': options.accent || '#7ee7ff' }));
    fillGradient.appendChild(svgEl('stop', { offset: '52%', 'stop-color': options.mid || '#8f7bff' }));
    fillGradient.appendChild(svgEl('stop', { offset: '100%', 'stop-color': options.secondary || '#c65cff' }));
    defs.appendChild(fillGradient);
    svg.appendChild(defs);

    var grid = svgEl('g', { class: 'experience-radar__grid', 'aria-hidden': 'true' });
    if (detail.grid) {
      geometry.spokes.forEach(function (path) { grid.appendChild(svgEl('path', { d: path, class: 'experience-radar__spoke' })); });
      geometry.rings.forEach(function (ring) {
        grid.appendChild(svgEl('polygon', {
          points: ring.polygon,
          class: 'experience-radar__ring' + (ring.score === geometry.scale.max ? ' experience-radar__ring--outer' : ''),
          'data-ring': ring.score
        }));
      });
    }
    svg.appendChild(grid);

    var axes = svgEl('g', { class: 'experience-radar__axes', 'aria-hidden': 'true' });
    geometry.points.forEach(function (point) {
      axes.appendChild(svgEl('line', {
        x1: CENTER, y1: CENTER, x2: point.x, y2: point.y,
        class: 'experience-radar__axis', 'data-axis': point.key, 'data-glyph-dimension': point.key
      }));
    });
    svg.appendChild(axes);

    svg.appendChild(svgEl('polygon', { points: geometry.polygon, class: 'experience-radar__fill', fill: 'url(#' + uid + '-fill)' }));
    svg.appendChild(svgEl('polygon', { points: geometry.polygon, class: 'experience-radar__outline', 'data-axis': 'polygon' }));

    var dots = svgEl('g', { class: 'experience-radar__dots' });
    geometry.points.forEach(function (point) {
      dots.appendChild(svgEl('circle', {
        cx: point.x, cy: point.y, r: detail.dotRadius, class: 'experience-radar__dot',
        'data-axis': point.key, 'data-glyph-dimension': point.key
      }));
    });
    svg.appendChild(dots);

    var sectors = svgEl('g', { class: 'experience-radar__sectors', 'aria-hidden': 'true' });
    geometry.points.forEach(function (point) {
      sectors.appendChild(svgEl('path', {
        d: sectorPath(point.angle), class: 'experience-radar__sector',
        'data-axis': point.key, 'data-glyph-dimension': point.key
      }));
    });
    svg.appendChild(sectors);

    if (showLabels) {
      var labels = svgEl('g', { class: 'experience-radar__labels' });
      geometry.points.forEach(function (point) {
        var anchor = labelAnchor(point);
        var label = svgEl('text', {
          x: anchor.x, y: anchor.y, class: 'experience-radar__label',
          'text-anchor': anchor.anchor, 'dominant-baseline': 'middle',
          'data-axis': point.key, 'data-glyph-dimension': point.key,
          tabindex: '0', role: 'button',
          'aria-label': point.label + ', ' + point.value + ' out of 10'
        });
        label.textContent = point.label;
        labels.appendChild(label);
      });
      svg.appendChild(labels);
    }

    if (detail.score) {
      if (detail.coreRadius) {
        svg.appendChild(svgEl('circle', { cx: CENTER, cy: CENTER, r: detail.coreRadius, class: 'experience-radar__core', 'aria-hidden': 'true' }));
      }
      var score = svgEl('text', { x: CENTER, y: CENTER + 2, class: 'experience-glyph__score', 'text-anchor': 'middle' });
      score.textContent = Number(geometry.score).toFixed(1);
      svg.appendChild(score);
      var scoreLabel = svgEl('text', {
        x: CENTER, y: CENTER + (detail.coreRadius > 15 ? 13 : 12),
        class: 'experience-glyph__score-label', 'text-anchor': 'middle'
      });
      scoreLabel.textContent = options.scoreLabel || (variant === 'taste' ? 'TASTE' : variant === 'game' ? 'GAME' : 'SESSION');
      svg.appendChild(scoreLabel);
    }

    figure.appendChild(svg);

    var tip = document.createElement('div');
    tip.className = 'experience-glyph__tip';
    tip.setAttribute('role', 'status');
    tip.hidden = true;
    figure.appendChild(tip);
    installTip(figure, tip, geometry);

    var caption = document.createElement('figcaption');
    caption.className = 'sr-only';
    caption.textContent = engine.DIMENSIONS.map(function (dimension) { return dimension.label + ': ' + geometry.scores[dimension.key]; }).join('; ');
    figure.appendChild(caption);
    return figure;
  }

  function mount(target, data, options) {
    var host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host || !GOS.glyphEngine) return null;
    host.textContent = '';
    var node = render(data, options);
    host.appendChild(node);
    return node;
  }

  installInteraction();
  GOS.glyph = { render: render, mount: mount, detailFor: detailFor, VIEWBOX: VIEWBOX };
})(typeof window !== 'undefined' ? window : globalThis);
