/**
 * icyNatural Game OS — Feed view.
 *
 * Every recommendation shows WHY: relationship paths out of games you rated
 * highly, taste-pattern matches with their supporting games, studio/franchise
 * affinity, platform fit. Surprise Me walks 1-3 hops and shows the path.
 */
(function (root) {
  'use strict';

  var GOS = (root.GOS = root.GOS || {});
  var U = GOS.util;

  var surprisePick = 0;
  var lastSurprise = null;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function engineState() {
    var ctx = GOS.gos ? GOS.gos.context() : null;
    if (!ctx || !ctx.graph) return null;
    return {
      graph: ctx.graph,
      experiences: ctx.experiences,
      library: ctx.library,
      games: ctx.games,
      patterns: ctx.patterns
    };
  }

  function pathNames(state, pathIds) {
    if (!pathIds || !pathIds.length) return [];
    return pathIds.map(function (id) {
      if (state.graph.byId[id]) return state.graph.byId[id].name;
      var match = (state.games || []).filter(function (game) { return game.id === id; })[0];
      return match ? match.name : id;
    });
  }

  function reasonRow(reason) {
    var row = el('li', 'gos-reason');
    row.appendChild(el('span', 'gos-reason-text', reason.text));
    if (reason.evidence && reason.evidence.length) {
      var chips = el('span', 'gos-reason-evidence');
      reason.evidence.slice(0, 5).forEach(function (name) {
        chips.appendChild(el('span', 'gos-chip', name));
      });
      row.appendChild(chips);
    }
    return row;
  }

  function gameCard(state, item, options) {
    options = options || {};
    var card = el('article', 'gos-rec-card');

    var gameName = item.game ? item.game.name : item.gameId;
    if (root.GOS && GOS.art && gameName) {
      var art = el('div', 'gos-rec-art');
      art.style.backgroundImage = 'url(\'' + GOS.art.cover(gameName) + '\')';
      card.appendChild(art);
    }
    var ctx = GOS.gos ? GOS.gos.context() : null;
    var measured = ctx && GOS.glyphEngine ? GOS.glyphEngine.aggregateGame(ctx.experiences, item.gameId) : null;
    if (measured && GOS.glyph) {
      var glyph = el('div', 'gos-rec-glyph');
      glyph.appendChild(GOS.glyph.render(measured, { size: 'sm', variant: 'game', label: gameName + ' measured game' }));
      card.appendChild(glyph);
    }

    var head = el('div', 'gos-rec-head');
    var open = el('button', 'gos-rec-title');
    open.type = 'button';
    open.textContent = gameName;
    open.title = 'Open in Discover';
    open.addEventListener('click', function () {
      if (GOS.discover) GOS.discover.open(item.gameId);
    });
    head.appendChild(open);

    var meta = el('span', 'gos-rec-meta');
    if (item.game && item.game.metadata && item.game.metadata.year) {
      meta.appendChild(el('span', 'gos-chip', String(item.game.metadata.year)));
    }
    meta.appendChild(el('span', 'gos-chip', 'fit ' + item.score.toFixed(1)));
    if (options.depth) meta.appendChild(el('span', 'gos-chip', options.depth + ' hop' + (options.depth === 1 ? '' : 's')));
    head.appendChild(meta);
    card.appendChild(head);

    if (item.path && item.path.length > 1) {
      var path = el('div', 'gos-path');
      pathNames(state, item.path).forEach(function (name, index) {
        if (index > 0) path.appendChild(el('span', 'gos-path-sep', '→'));
        path.appendChild(el('span', 'gos-path-node', name));
      });
      card.appendChild(path);
    }

    var list = el('ul', 'gos-reason-list');
    (item.reasons || []).forEach(function (reason) { list.appendChild(reasonRow(reason)); });
    card.appendChild(list);

    return card;
  }

  function renderSurprise(state, result) {
    var host = document.getElementById('surprisePanel');
    if (!host) return;
    host.textContent = '';

    if (result.note) {
      host.appendChild(el('div', 'gos-empty', result.note));
      return;
    }
    if (!result.items.length) {
      host.appendChild(el('div', 'gos-empty',
        'No unplayed games reachable from your favourites in 1-3 hops.'));
      return;
    }

    var head = el('div', 'gos-surprise-head');
    head.appendChild(el('span', 'gos-surprise-label', 'Walked out from'));
    result.seeds.forEach(function (seed, index) {
      if (index > 0) head.appendChild(el('span', 'gos-path-sep', '+'));
      var chip = el('span', 'gos-chip gos-chip-pos', seed.name + ' (' + seed.score.toFixed(1) + ')');
      head.appendChild(chip);
    });
    host.appendChild(head);

    var grid = el('div', 'gos-rec-grid');
    result.items.forEach(function (item) {
      grid.appendChild(gameCard(state, item, { depth: item.depth }));
    });
    host.appendChild(grid);
  }

  function renderRecommendations(state) {
    var host = document.getElementById('recommendList');
    if (!host) return;
    host.textContent = '';

    var items = GOS.recommend.candidates(state, { limit: 8 });
    if (!items.length) {
      var empty = el('div', 'gos-empty');
      empty.appendChild(el('div', 'gos-empty-title', 'No recommendations yet'));
      empty.appendChild(el('div', 'gos-empty-text',
        'Log and strongly rate a few games. Recommendations are ranked from evidence: relationship paths, taste patterns, studio affinity and platform fit.'));
      host.appendChild(empty);
      return;
    }

    var label = el('div', 'gos-feed-label',
      'Ranked candidates — every line below is a reason, not a guess:');
    host.appendChild(label);

    var grid = el('div', 'gos-rec-grid');
    items.forEach(function (item) { grid.appendChild(gameCard(state, item)); });
    host.appendChild(grid);
  }

  function render() {
    var state = engineState();
    var host = document.getElementById('recommendList');
    if (!host) return;

    if (!state) {
      host.textContent = '';
      host.appendChild(el('div', 'gos-empty', 'Loading graph and experiences…'));
      return;
    }

    if (lastSurprise) renderSurprise(state, lastSurprise);
    renderRecommendations(state);
  }

  function runSurprise() {
    var state = engineState();
    if (!state) return;
    var result = GOS.recommend.surprise(state, { limit: 3, pick: surprisePick });
    surprisePick += 1;
    lastSurprise = result;
    renderSurprise(state, result);
  }

  function init() {
    var button = document.getElementById('surpriseBtn');
    if (button) button.addEventListener('click', runSurprise);

    document.addEventListener('gos:tab', function (event) {
      if (event.detail && event.detail.tab === 'feed') {
        if (GOS.gos) GOS.gos.refresh().then(render, render);
        else render();
      }
    });
    document.addEventListener('gos:data', function () { render(); });
    document.addEventListener('gos:ready', render);
  }

  GOS.feed = { init: init, render: render };

  if (root.document) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
