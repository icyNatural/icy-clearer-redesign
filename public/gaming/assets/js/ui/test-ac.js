/**
 * Game OS — Test screen inline game autocomplete.
 *
 * Reuses the existing catalog adapter (fuzzy scoring, RAWG normalize + cache)
 * and the gos bridge (graph context, personal library, addCatalogGame). There
 * is no second search database: candidates come from the seed graph, the
 * persisted user overlay, the games collection and — optionally — a debounced
 * RAWG round-trip when a proxy/key is configured.
 */
(function (root) {
  'use strict';

  var GOS = (root.GOS = root.GOS || {});
  var U = GOS.util || {};

  // Most UI modules use the compact (tag, className, text) helper shape,
  // while GOS.util.el accepts (tag, attributes, children). Keep this module
  // compatible with both forms without changing the shared DOM utility.
  function el(tag, attrs, children) {
    if (typeof attrs === 'string') return U.el(tag, { class: attrs }, children);
    return U.el(tag, attrs, children);
  }

  var MIN_QUERY = 2;
  var LIVE_DEBOUNCE_MS = 350;
  var LIMIT_OWNED = 5;
  var LIMIT_OTHERS = 5;
  var LIMIT_CATALOG = 6;
  var MIN_DROPDOWN = 120;
  var MAX_DROPDOWN = 360;
  var FRANCHISE_PENALTY = 15;

  /* ------------------------------ pure logic ------------------------------ */

  function normKey(value) {
    return U.normalizeKey ? U.normalizeKey(value) : String(value || '').toLowerCase().trim();
  }

  var PLATFORM_RULES = [
    { value: 'PC', test: function (v) { return v === 'pc' || v.indexOf('windows') !== -1 || v.indexOf('linux') !== -1; } },
    { value: 'PS5', test: function (v) { return v.indexOf('ps5') !== -1 || v.indexOf('playstation 5') !== -1 || v.indexOf('playstation5') !== -1; } },
    { value: 'Xbox Series', test: function (v) { return v.indexOf('xbox series') !== -1; } },
    { value: 'Switch', test: function (v) { return v.indexOf('switch') !== -1; } },
    { value: 'Mobile', test: function (v) { return v.indexOf('android') !== -1 || v === 'ios' || v.indexOf('ios ') === 0 || v.indexOf('iphone') !== -1 || v.indexOf('ipad') !== -1 || v.indexOf('mobile') !== -1; } },
    { value: 'Cloud / Streaming', test: function (v) { return v.indexOf('cloud') !== -1 || v.indexOf('geforce now') !== -1 || v.indexOf('streaming') !== -1 || v.indexOf('luna') !== -1 || v.indexOf('ps now') !== -1; } },
    { value: 'Retro', test: function (v) { return v === 'arcade' || v.indexOf('arcade') !== -1 || v.indexOf('gamecube') !== -1 || v.indexOf('nintendo 64') !== -1 || v.indexOf('n64') !== -1 || v.indexOf('snes') !== -1 || v.indexOf('super nintendo') !== -1 || v.indexOf('genesis') !== -1 || v.indexOf('mega drive') !== -1 || v.indexOf('dreamcast') !== -1 || v.indexOf('wii') !== -1 || v.indexOf('game boy') !== -1 || v.indexOf('gba') !== -1 || v === 'playstation' || v === 'ps1' || v.indexOf('playstation 1') !== -1 || v.indexOf('playstation 2') !== -1 || v.indexOf('ps2') !== -1; } }
  ];

  function mapPlatform(name) {
    var value = String(name || '').trim().toLowerCase();
    if (!value) return null;
    for (var i = 0; i < PLATFORM_RULES.length; i++) {
      if (PLATFORM_RULES[i].test(value)) return PLATFORM_RULES[i].value;
    }
    return null;
  }

  function platformSuggestions(names) {
    var out = [];
    (names || []).forEach(function (name) {
      var value = mapPlatform(name);
      if (value && out.indexOf(value) === -1) out.push(value);
    });
    return out.slice(0, 4);
  }

  function candidateValues(candidate) {
    var metadata = candidate.metadata || {};
    return [candidate.name]
      .concat(candidate.aliases || [])
      .concat(metadata.franchises || [])
      .concat(metadata.developers || [])
      .filter(Boolean);
  }

  function scoreCandidate(query, candidate) {
    if (!GOS.catalog || !GOS.catalog.scoreText) return 0;
    var best = 0;
    candidateValues(candidate).forEach(function (value) {
      var score = GOS.catalog.scoreText(query, value);
      if (score > best) best = score;
    });
    var franchiseBest = 0;
    (candidate.franchises || []).forEach(function (value) {
      var score = GOS.catalog.scoreText(query, value);
      if (score > franchiseBest) franchiseBest = score;
    });
    if (franchiseBest) {
      franchiseBest = Math.max(1, franchiseBest - FRANCHISE_PENALTY);
      if (franchiseBest > best) best = franchiseBest;
    }
    if (!best) return 0;
    if (candidate.libraryStatus || candidate.playCount) best += 25;
    else if (candidate.source === 'graph') best += 6;
    if (candidate.playCount) best += 10;
    return best;
  }

  function rankCandidates(candidates, query, limit) {
    var rows = [];
    (candidates || []).forEach(function (candidate) {
      var score = scoreCandidate(query, candidate);
      if (score > 0) rows.push({ candidate: candidate, score: score });
    });
    rows.sort(function (a, b) {
      return b.score - a.score
        || (b.candidate.playCount || 0) - (a.candidate.playCount || 0)
        || String(a.candidate.name).localeCompare(String(b.candidate.name));
    });
    return rows.slice(0, limit || 20).map(function (row) { return row.candidate; });
  }

  function isOwned(candidate) {
    return !!(candidate && (candidate.libraryStatus || candidate.playCount));
  }

  function collectCandidates(ctx) {
    var out = [];
    if (!ctx) return out;
    var graph = ctx.graph;
    var seenId = Object.create(null);
    var seenKey = Object.create(null);
    var libraryByGame = Object.create(null);
    var playsByGame = Object.create(null);
    var franchiseNames = Object.create(null);

    (ctx.library || []).forEach(function (entry) {
      if (entry && entry.gameId) libraryByGame[entry.gameId] = entry.status || 'saved';
    });
    (ctx.experiences || []).forEach(function (exp) {
      if (exp && exp.gameId) playsByGame[exp.gameId] = (playsByGame[exp.gameId] || 0) + 1;
    });
    if (graph && graph.byFranchise) {
      Object.keys(graph.byFranchise).forEach(function (franchiseId) {
        var node = graph.byId[franchiseId];
        if (!node) return;
        var names = [node.name].concat(node.aliases || []).filter(Boolean);
        (graph.byFranchise[franchiseId] || []).forEach(function (gameId) {
          var list = (franchiseNames[gameId] = franchiseNames[gameId] || []);
          names.forEach(function (name) { if (list.indexOf(name) === -1) list.push(name); });
        });
      });
    }

    function graphPlatforms(gameId) {
      if (!graph || !graph.out || !graph.out[gameId]) return [];
      var names = [];
      graph.out[gameId].forEach(function (edge) {
        if (edge.relationship_type !== 'AVAILABLE_ON') return;
        var node = graph.byId[edge.target];
        if (node && names.indexOf(node.name) === -1) names.push(node.name);
      });
      return names;
    }

    function push(node, source) {
      if (!node || !node.id || seenId[node.id]) return false;
      var nameKey = normKey(node.name);
      if (!nameKey || seenKey[nameKey]) return false;
      seenId[node.id] = true;
      seenKey[nameKey] = true;
      var metadata = node.metadata || {};
      out.push({
        id: node.id,
        name: node.name,
        aliases: node.aliases || [],
        metadata: metadata,
        externalIds: node.externalIds || null,
        source: source,
        franchises: franchiseNames[node.id] || [],
        platforms: (metadata.platforms && metadata.platforms.length) ? metadata.platforms.slice() : graphPlatforms(node.id),
        libraryStatus: libraryByGame[node.id] || null,
        playCount: playsByGame[node.id] || 0
      });
      return true;
    }

    if (graph && graph.nodes) {
      graph.nodes.forEach(function (node) { if (node && node.type === 'game') push(node, 'graph'); });
    }
    (ctx.games || []).forEach(function (game) {
      push(game, libraryByGame[game && game.id] ? 'library' : 'saved');
    });
    (ctx.experiences || []).forEach(function (exp) {
      if (!exp || !exp.gameId || seenId[exp.gameId]) return;
      push({ id: exp.gameId, name: exp.gameName || exp.gameId, metadata: {} }, 'played');
    });
    return out;
  }

  GOS.testAc = {
    MIN_QUERY: MIN_QUERY,
    mapPlatform: mapPlatform,
    platformSuggestions: platformSuggestions,
    candidateValues: candidateValues,
    scoreCandidate: scoreCandidate,
    rankCandidates: rankCandidates,
    collectCandidates: collectCandidates,
    isOwned: isOwned,
    dom: null
  };

  /* -------------------------------- wiring -------------------------------- */

  function wire() {
    var doc = root.document;
    var input = doc.getElementById('gameName');
    var wrap = doc.getElementById('gameNameWrap');
    var results = doc.getElementById('gameNameResults');
    var platformSelect = doc.getElementById('platform');
    var suggestHost = doc.getElementById('gamePlatformSuggest');
    if (!input || !wrap || !results) return;

    var localHost = results.querySelector('.gos-ac-local');
    var catalogHost = results.querySelector('.gos-ac-catalog');
    var customHost = results.querySelector('.gos-ac-custom-host');
    var searchToken = 0;
    var activeIndex = -1;
    var suppressInput = false;
    var currentQuery = '';
    var lastLocal = [];

    function context() {
      return GOS.gos && GOS.gos.context ? GOS.gos.context() : null;
    }

    function catalogConfig() {
      return GOS.gos && GOS.gos.catalogConfig ? GOS.gos.catalogConfig() : { proxyUrl: '', _key: '' };
    }

    function catalogEnabled() {
      var config = catalogConfig();
      return !!(config.proxyUrl || config._key);
    }

    function isOpen() { return !results.hidden; }

    function close() {
      if (results.hidden) return;
      results.hidden = true;
      activeIndex = -1;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }

    function open() {
      results.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      fit();
    }

    function fit() {
      if (!isOpen()) return;
      var rect = input.getBoundingClientRect();
      var viewport = root.innerHeight || doc.documentElement.clientHeight || 800;
      var cap = viewport <= 700 ? Math.round(viewport * 0.6) : MAX_DROPDOWN;
      var below = viewport - rect.bottom - 16;
      var above = rect.top - 16;
      var flip = below < 180 && above > below;
      wrap.classList.toggle('is-up', flip);
      var space = flip ? above : below;
      if (space < 80) space = 80;
      var height = Math.min(cap, space);
      if (height < MIN_DROPDOWN) height = Math.min(space, MIN_DROPDOWN);
      results.style.maxHeight = Math.max(80, height) + 'px';
    }

    function rows() {
      return Array.prototype.slice.call(results.querySelectorAll('.gos-ac-row'));
    }

    function renumber() {
      var list = rows();
      list.forEach(function (row, index) {
        row.id = 'gameAcOpt-' + index;
        var on = index === activeIndex;
        row.classList.toggle('is-active', on);
        row.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (activeIndex >= 0 && activeIndex < list.length) {
        input.setAttribute('aria-activedescendant', list[activeIndex].id);
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }

    function setActive(index) {
      var list = rows();
      if (!list.length) {
        activeIndex = -1;
        renumber();
        return;
      }
      activeIndex = index < 0 ? list.length - 1 : (index >= list.length ? 0 : index);
      renumber();
      var row = list[activeIndex];
      if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
    }

    function coverSrc(candidate) {
      var metadata = candidate.metadata || {};
      if (metadata.cover) return metadata.cover;
      return GOS.art && GOS.art.cover ? GOS.art.cover(candidate.name) : '';
    }

    function metaBits(candidate) {
      var metadata = candidate.metadata || {};
      var bits = [];
      if (metadata.year) bits.push(String(metadata.year));
      if (metadata.releaseStatus === 'upcoming') bits.push('upcoming');
      else if (metadata.earlyAccess) bits.push('early access');
      else if (metadata.playability === 'legacy') bits.push('legacy');
      var platforms = (candidate.platforms && candidate.platforms.length) ? candidate.platforms : (metadata.platforms || []);
      if (platforms.length) bits.push(platforms.slice(0, 3).join(', ') + (platforms.length > 3 ? ' +' + (platforms.length - 3) : ''));
      if (metadata.developers && metadata.developers.length) bits.push(metadata.developers[0]);
      return bits;
    }

    function rowFor(candidate) {
      var row = el('button', {
        class: 'gos-search-item gos-ac-row' + (candidate.source === 'rawg' ? ' gos-ac-row-rawg' : ''),
        type: 'button',
        role: 'option',
        tabindex: '-1',
        'aria-selected': 'false',
        dataset: { id: candidate.id, name: candidate.name, source: candidate.source }
      });
      row.__gosCandidate = candidate;
      row.appendChild(el('img', {
        class: 'gos-ac-cover',
        src: coverSrc(candidate),
        alt: '',
        draggable: 'false'
      }));
      var copy = el('span', 'gos-search-copy');
      var nameRow = el('span', 'gos-ac-name-row');
      nameRow.appendChild(el('span', 'gos-search-name', candidate.name));
      if (candidate.libraryStatus) {
        nameRow.appendChild(el('span', 'gos-ac-badge', 'In library' + (candidate.libraryStatus !== 'completed' ? ' · ' + candidate.libraryStatus : '')));
      } else if (candidate.playCount) {
        nameRow.appendChild(el('span', 'gos-ac-badge', 'Played' + (candidate.playCount > 1 ? ' ×' + candidate.playCount : '')));
      }
      copy.appendChild(nameRow);
      var bits = metaBits(candidate);
      if (bits.length) copy.appendChild(el('span', 'gos-search-meta', bits.join(' · ')));
      row.appendChild(copy);
      wireRow(row);
      return row;
    }

    function customRowFor(query) {
      var row = el('button', {
        class: 'gos-search-item gos-ac-row gos-ac-custom',
        type: 'button',
        role: 'option',
        tabindex: '-1',
        'aria-selected': 'false',
        dataset: { custom: '1', name: query }
      });
      row.appendChild(el('img', {
        class: 'gos-ac-cover',
        src: GOS.art && GOS.art.cover ? GOS.art.cover(query) : '',
        alt: '',
        draggable: 'false'
      }));
      row.appendChild(el('span', 'gos-type-chip', 'custom'));
      var copy = el('span', 'gos-search-copy');
      copy.appendChild(el('span', 'gos-search-name', 'Use “' + query + '” as a custom name'));
      copy.appendChild(el('span', 'gos-search-meta', 'No catalog match needed — any name can be rated.'));
      row.appendChild(copy);
      wireRow(row);
      return row;
    }

    function wireRow(row) {
      row.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        activateRow(row);
      });
      row.addEventListener('click', function (event) {
        if (!isOpen()) return;
        event.preventDefault();
        activateRow(row);
      });
      row.addEventListener('mouseenter', function () {
        setActive(rows().indexOf(row));
      });
    }

    function activateRow(row) {
      if (!row) return;
      if (row.dataset.custom === '1') { selectCustom(); return; }
      if (row.__gosCandidate) selectCandidate(row.__gosCandidate);
    }

    function attribution() {
      var note = el('div', 'gos-search-attribution');
      note.appendChild(el('a', {
        href: 'https://rawg.io',
        target: '_blank',
        rel: 'noopener noreferrer'
      }, 'Game catalog data by RAWG'));
      return note;
    }

    function syncEmpty() {
      if (!customHost) return;
      U.clear(customHost);
      if (!currentQuery) return;
      var hasLocal = localHost.querySelectorAll('.gos-ac-row').length > 0;
      var hasCatalog = catalogHost.querySelectorAll('.gos-ac-row').length > 0;
      if (!hasLocal && !hasCatalog) {
        customHost.appendChild(el('div', 'gos-search-empty', 'No matches for “' + currentQuery + '”.'));
      }
      customHost.appendChild(customRowFor(currentQuery));
    }

    function renderLocal(candidates) {
      U.clear(localHost);
      var owned = [];
      var others = [];
      candidates.forEach(function (candidate) { (isOwned(candidate) ? owned : others).push(candidate); });
      if (owned.length) {
        localHost.appendChild(el('div', 'gos-search-divider', 'In your library'));
        owned.slice(0, LIMIT_OWNED).forEach(function (candidate) { localHost.appendChild(rowFor(candidate)); });
      }
      if (others.length) {
        localHost.appendChild(el('div', 'gos-search-divider', owned.length ? 'More matches' : 'Local matches'));
        others.slice(0, LIMIT_OTHERS).forEach(function (candidate) { localHost.appendChild(rowFor(candidate)); });
      }
    }

    function matchesLocal(game) {
      if (!lastLocal.length) return false;
      if (lastLocal.some(function (candidate) { return candidate.id === game.id; })) return true;
      if (!GOS.catalog || !GOS.catalog.canonicalMatch) return false;
      var proxy = lastLocal.map(function (candidate) {
        return { id: candidate.id, name: candidate.name, aliases: candidate.aliases };
      });
      return !!GOS.catalog.canonicalMatch(proxy, game);
    }

    function rawgCandidate(game) {
      var metadata = (game && game.metadata) || {};
      return {
        id: game.id,
        name: game.name,
        aliases: game.aliases || [],
        metadata: metadata,
        externalIds: game.externalIds || null,
        source: 'rawg',
        franchises: [],
        platforms: metadata.platforms || [],
        libraryStatus: null,
        playCount: 0
      };
    }

    function renderCatalog(games, label) {
      U.clear(catalogHost);
      var fresh = [];
      (games || []).forEach(function (game) {
        if (!game || !game.id || fresh.length >= LIMIT_CATALOG) return;
        if (matchesLocal(game)) return;
        fresh.push(rawgCandidate(game));
      });
      if (fresh.length) {
        catalogHost.appendChild(el('div', 'gos-search-divider', label));
        fresh.forEach(function (candidate) { catalogHost.appendChild(rowFor(candidate)); });
        catalogHost.appendChild(attribution());
      }
      syncEmpty();
      renumber();
      fit();
    }

    function selectCandidate(candidate) {
      if (!candidate || !candidate.name) return;
      applyValue(candidate.name, candidate);
    }

    function selectCustom() {
      applyValue(input.value.trim(), null);
    }

    function applyValue(name, candidate) {
      if (!name) return;
      suppressInput = true;
      input.value = name;
      try {
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } finally {
        suppressInput = false;
      }
      if (candidate && candidate.id) {
        wrap.dataset.gameId = candidate.id;
        wrap.dataset.gameName = candidate.name;
      } else {
        delete wrap.dataset.gameId;
        delete wrap.dataset.gameName;
      }
      close();
      renderSuggest(candidate);
      ensureGraphRecord(candidate);
      if (doc.activeElement !== input && input.focus) input.focus();
    }

    function ensureGraphRecord(candidate) {
      if (!candidate || candidate.source !== 'rawg') return;
      if (!GOS.gos || !GOS.gos.addCatalogGame) return;
      var payload = {
        id: candidate.id,
        name: candidate.name,
        aliases: candidate.aliases || [],
        metadata: candidate.metadata || {},
        externalIds: candidate.externalIds || null
      };
      Promise.resolve().then(function () { return GOS.gos.addCatalogGame(payload); }).catch(function () {});
    }

    function renderSuggest(candidate) {
      if (!suggestHost) return;
      U.clear(suggestHost);
      var known = (candidate && candidate.platforms) || [];
      if (!known.length) {
        suggestHost.hidden = true;
        return;
      }
      var mapped = platformSuggestions(known);
      suggestHost.appendChild(el('span', 'gos-ac-platforms-label', mapped.length
        ? 'Platform for ' + candidate.name + ' — pick one, nothing is forced:'
        : 'Known platforms for ' + candidate.name + ': ' + known.slice(0, 4).join(', ') + ' — pick one manually.'));
      mapped.forEach(function (value) {
        var chip = el('button', { class: 'gos-ac-chip', type: 'button', dataset: { value: value } }, value);
        chip.addEventListener('click', function () { pickPlatform(value); });
        suggestHost.appendChild(chip);
      });
      suggestHost.hidden = false;
      syncChips();
    }

    function pickPlatform(value) {
      if (!platformSelect) return;
      platformSelect.value = value;
      platformSelect.dispatchEvent(new Event('change', { bubbles: true }));
      syncChips();
    }

    function syncChips() {
      if (!suggestHost || suggestHost.hidden || !platformSelect) return;
      var value = platformSelect.value;
      Array.prototype.forEach.call(suggestHost.querySelectorAll('.gos-ac-chip'), function (chip) {
        chip.classList.toggle('is-picked', chip.dataset.value === value);
      });
    }

    function clearSuggest() {
      if (!suggestHost || suggestHost.hidden) return;
      U.clear(suggestHost);
      suggestHost.hidden = true;
    }

    function syncSelection() {
      var value = input.value.trim();
      var selectedName = wrap.dataset.gameName;
      if (value && selectedName && normKey(value) === normKey(selectedName)) return;
      delete wrap.dataset.gameId;
      delete wrap.dataset.gameName;
      clearSuggest();
    }

    function runSearch(rawQuery, options) {
      options = options || {};
      var query = String(rawQuery || '').trim();
      currentQuery = query;
      var ctx = context();
      if (!ctx || !ctx.graph || query.length < MIN_QUERY) {
        searchToken++;
        lastLocal = [];
        U.clear(localHost);
        U.clear(catalogHost);
        U.clear(customHost);
        close();
        return null;
      }
      var token = ++searchToken;
      activeIndex = -1;
      var candidates = collectCandidates(ctx);
      lastLocal = rankCandidates(candidates, query, LIMIT_OWNED + LIMIT_OTHERS);
      renderLocal(lastLocal);
      U.clear(catalogHost);
      syncEmpty();
      renumber();
      open();

      if (GOS.storage && GOS.catalog && GOS.catalog.readCache) {
        GOS.catalog.readCache(GOS.storage, query).then(function (record) {
          if (token !== searchToken || !record || !record.games) return;
          renderCatalog(record.games, 'Catalog (cached)');
        });
      }
      return token;
    }

    function liveSearch(query) {
      if (!GOS.catalog || !GOS.catalog.searchRawg || !catalogEnabled()) return;
      var token = searchToken;
      var config = catalogConfig();
      GOS.catalog.searchRawg(query, {
        proxyUrl: config.proxyUrl,
        key: config._key,
        limit: 8,
        timeoutMs: 6000
      }).then(function (remote) {
        if (token !== searchToken) return;
        if (GOS.catalog.writeCache && GOS.storage) GOS.catalog.writeCache(GOS.storage, query, remote);
        renderCatalog(remote, 'Catalog (RAWG)');
      }).catch(function () {});
    }

    var liveDebounced = U.debounce
      ? U.debounce(function (query) { liveSearch(query); }, LIVE_DEBOUNCE_MS)
      : function () {};

    function onInput() {
      if (suppressInput) return;
      var query = input.value.trim();
      syncSelection();
      currentQuery = query;
      if (query.length < MIN_QUERY) {
        searchToken++;
        lastLocal = [];
        U.clear(localHost);
        U.clear(catalogHost);
        U.clear(customHost);
        close();
        return;
      }
      runSearch(query, {});
      liveDebounced(query);
    }

    input.addEventListener('input', onInput);

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (isOpen()) { event.preventDefault(); close(); }
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!isOpen()) {
          var query = input.value.trim();
          if (query.length >= MIN_QUERY) { runSearch(query, {}); setActive(0); }
          return;
        }
        setActive(activeIndex + 1);
        return;
      }
      if (event.key === 'ArrowUp') {
        if (isOpen()) { event.preventDefault(); setActive(activeIndex - 1); }
        return;
      }
      if (event.key === 'Enter') {
        if (!isOpen()) return;
        event.preventDefault();
        var list = rows();
        activateRow(list[activeIndex >= 0 ? activeIndex : 0]);
        return;
      }
      if (event.key === 'Tab') close();
    });

    wrap.addEventListener('focusout', function (event) {
      if (!wrap.contains(event.relatedTarget)) close();
    });

    doc.addEventListener('pointerdown', function (event) {
      if (isOpen() && !wrap.contains(event.target)) close();
    }, true);

    doc.addEventListener('click', function () { syncSelection(); });

    doc.addEventListener('scroll', function () { if (isOpen()) fit(); }, true);
    root.addEventListener('resize', function () { if (isOpen()) fit(); });

    if (platformSelect) {
      platformSelect.addEventListener('change', function () { close(); syncChips(); });
    }

    doc.addEventListener('gos:data', function () {
      syncSelection();
      if (isOpen() && currentQuery) runSearch(currentQuery, {});
    });

    doc.addEventListener('gos:catalog-config', function () {
      if (isOpen() && currentQuery) liveSearch(currentQuery);
    });

    GOS.testAc.dom = {
      close: close,
      isOpen: isOpen,
      fit: fit,
      rows: rows
    };
  }

  if (root.document) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', wire);
    } else {
      wire();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
