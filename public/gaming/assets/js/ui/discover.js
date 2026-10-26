/**
 * icyNatural Game OS — Discover view.
 *
 * Rules enforced by the domain layer (lineage.js), rendered here:
 *   - first-degree branches by default, grouped by relationship category
 *   - mechanical similarity / analogous design are labelled as such, never
 *     presented as lineage
 *   - filters narrow edges AND endpoints (games must actually relate)
 *   - expansion is explicit, bounded (depth <= 3) and shows the path taken
 */
(function (root) {
  'use strict';

  var GOS = (root.GOS = root.GOS || {});
  var U = GOS.util;
  var L = GOS.lineage;

  var SUGGESTIONS = [
    { id: 'game:halo-3', label: 'Halo 3' },
    { id: 'game:dark-souls', label: 'Dark Souls' },
    { id: 'studio:from-software', label: 'FromSoftware' },
    { id: 'game:virtua-fighter-5', label: 'Virtua Fighter 5' },
    { id: 'mechanic:stealth', label: 'stealth' }
  ];

  var selectedId = null;
  var trail = [];

  var filters = {
    lineageTypes: [],
    playability: 'any',
    mode: 'any',
    mechanic: '',
    platform: '',
    person: '',
    studio: '',
    franchise: '',
    yearFrom: '',
    yearTo: ''
  };

  function state() { return GOS.gos ? GOS.gos.context() : null; }

  function libraryByGame() {
    var map = Object.create(null);
    var ctx = state();
    if (ctx) ctx.library.forEach(function (entry) { map[entry.gameId] = entry; });
    return map;
  }

  /* ------------------------------ filter bar ------------------------------ */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function selectField(label, options, value, onChange) {
    var wrap = el('label', 'gos-filter-field');
    wrap.appendChild(el('span', null, label));
    var select = el('select', 'input');
    options.forEach(function (option) {
      var node = el('option', null, option.label);
      node.value = option.value;
      if (option.value === value) node.selected = true;
      select.appendChild(node);
    });
    select.addEventListener('change', function () { onChange(select.value); });
    wrap.appendChild(select);
    return wrap;
  }

  function renderFilters() {
    var host = document.getElementById('discoverFilters');
    if (!host) return;
    var ctx = state();
    host.textContent = '';

    var chipRow = el('div', 'gos-filter-chips');
    var categories = (root.GOS_VOCAB && GOS_VOCAB.relationshipCategories) || [];
    var labels = (root.GOS_VOCAB && GOS_VOCAB.relationshipCategoryLabels) || {};
    var lineageCats = (root.GOS_VOCAB && GOS_VOCAB.lineageCategories) || [];

    categories.forEach(function (category) {
      var chip = el('button', 'gos-chip', labels[category] || category);
      chip.type = 'button';
      if (lineageCats.indexOf(category) !== -1) chip.classList.add('gos-chip-lineage');
      if (filters.lineageTypes.indexOf(category) !== -1) chip.classList.add('active');
      chip.title = lineageCats.indexOf(category) !== -1
        ? 'Lineage relationship category'
        : 'Not lineage — shown as its own category';
      chip.addEventListener('click', function () {
        var index = filters.lineageTypes.indexOf(category);
        if (index === -1) filters.lineageTypes.push(category);
        else filters.lineageTypes.splice(index, 1);
        renderFilters();
        renderBranches();
      });
      chipRow.appendChild(chip);
    });
    host.appendChild(chipRow);

    var row = el('div', 'gos-filter-controls');

    row.appendChild(selectField('Playability', [
      { value: 'any', label: 'Any' },
      { value: 'current', label: 'Playable now' },
      { value: 'legacy', label: 'Legacy' }
    ], filters.playability, function (value) {
      filters.playability = value;
      renderBranches();
    }));

    row.appendChild(selectField('Mode', [
      { value: 'any', label: 'Any' },
      { value: 'single', label: 'Single-player' },
      { value: 'multiplayer', label: 'Multiplayer' },
      { value: 'coop', label: 'Co-op' },
      { value: 'pvp', label: 'PvP' }
    ], filters.mode, function (value) {
      filters.mode = value;
      renderBranches();
    }));

    if (ctx && ctx.graph) {
      var mechanicOptions = [{ value: '', label: 'Any mechanic' }];
      (ctx.graph.byType.mechanic || []).map(function (id) { return ctx.graph.byId[id]; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); })
        .forEach(function (node) { mechanicOptions.push({ value: node.id, label: node.name }); });
      row.appendChild(selectField('Mechanic', mechanicOptions, filters.mechanic, function (value) {
        filters.mechanic = value;
        renderBranches();
      }));

      var platformOptions = [{ value: '', label: 'Any platform' }];
      (ctx.graph.byType.platform || []).map(function (id) { return ctx.graph.byId[id]; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); })
        .forEach(function (node) { platformOptions.push({ value: node.id, label: node.name }); });
      row.appendChild(selectField('Platform', platformOptions, filters.platform, function (value) {
        filters.platform = value;
        renderBranches();
      }));

      var personOptions = [{ value: '', label: 'Any person' }];
      (ctx.graph.byType.person || []).map(function (id) { return ctx.graph.byId[id]; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); })
        .forEach(function (node) { personOptions.push({ value: node.id, label: node.name }); });
      row.appendChild(selectField('Person', personOptions, filters.person, function (value) {
        filters.person = value;
        renderBranches();
      }));

      var studioOptions = [{ value: '', label: 'Any studio' }];
      (ctx.graph.byType.studio || []).map(function (id) { return ctx.graph.byId[id]; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); })
        .forEach(function (node) { studioOptions.push({ value: node.id, label: node.name }); });
      row.appendChild(selectField('Studio', studioOptions, filters.studio, function (value) {
        filters.studio = value;
        renderBranches();
      }));

      var franchiseOptions = [{ value: '', label: 'Any franchise' }];
      (ctx.graph.byType.franchise || []).map(function (id) { return ctx.graph.byId[id]; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); })
        .forEach(function (node) { franchiseOptions.push({ value: node.id, label: node.name }); });
      row.appendChild(selectField('Franchise', franchiseOptions, filters.franchise, function (value) {
        filters.franchise = value;
        renderBranches();
      }));
    }

    var from = el('label', 'gos-filter-field');
    from.appendChild(el('span', null, 'From year'));
    var fromInput = el('input', 'input');
    fromInput.type = 'number';
    fromInput.min = '1970';
    fromInput.max = '2100';
    fromInput.value = filters.yearFrom;
    fromInput.addEventListener('input', function () {
      filters.yearFrom = fromInput.value;
      renderBranches();
    });
    from.appendChild(fromInput);
    row.appendChild(from);

    var to = el('label', 'gos-filter-field');
    to.appendChild(el('span', null, 'To year'));
    var toInput = el('input', 'input');
    toInput.type = 'number';
    toInput.min = '1970';
    toInput.max = '2100';
    toInput.value = filters.yearTo;
    toInput.addEventListener('input', function () {
      filters.yearTo = toInput.value;
      renderBranches();
    });
    to.appendChild(toInput);
    row.appendChild(to);

    var reset = el('button', 'btn btn-secondary gos-filter-reset', 'Reset filters');
    reset.type = 'button';
    reset.addEventListener('click', function () {
      filters = {
        lineageTypes: [],
        playability: 'any',
        mode: 'any',
        mechanic: '',
        platform: '',
        person: '',
        studio: '',
        franchise: '',
        yearFrom: '',
        yearTo: ''
      };
      renderFilters();
      renderBranches();
    });
    row.appendChild(reset);

    host.appendChild(row);
  }

  function domainFilters() {
    var out = {};
    if (filters.lineageTypes.length) out.lineageTypes = filters.lineageTypes.slice();
    if (filters.playability !== 'any') out.playability = filters.playability;
    if (filters.mode !== 'any') out.modes = [filters.mode];
    if (filters.mechanic) out.mechanic = filters.mechanic;
    if (filters.platform) out.platforms = [filters.platform];
    if (filters.person) out.person = filters.person;
    if (filters.studio) out.studio = filters.studio;
    if (filters.franchise) out.franchise = filters.franchise;
    if (filters.yearFrom) out.yearFrom = filters.yearFrom;
    if (filters.yearTo) out.yearTo = filters.yearTo;
    return out;
  }

  /* ----------------------------- navigation ------------------------------- */

  function navigate(id, pushTrail) {
    var ctx = state();
    if (!ctx || !ctx.graph || !ctx.graph.byId[id]) return;
    if (id === selectedId) return;
    if (pushTrail !== false && selectedId) trail.push(selectedId);
    selectedId = id;
    render();
  }

  function popTrail(targetIndex) {
    if (!trail[targetIndex]) return;
    selectedId = trail[targetIndex];
    trail = trail.slice(0, targetIndex);
    render();
  }

  function renderBreadcrumb() {
    var host = document.getElementById('discoverBreadcrumb');
    if (!host) return;
    host.textContent = '';
    var ctx = state();
    if (!ctx || !ctx.graph) return;

    trail.forEach(function (id, index) {
      var node = ctx.graph.byId[id];
      if (!node) return;
      var crumb = el('button', 'gos-crumb', node.name);
      crumb.type = 'button';
      crumb.title = 'Back to ' + node.name;
      crumb.addEventListener('click', function () { popTrail(index); });
      host.appendChild(crumb);
      host.appendChild(el('span', 'gos-crumb-sep', '›'));
    });

    if (selectedId && ctx.graph.byId[selectedId]) {
      host.appendChild(el('strong', 'gos-crumb-current', ctx.graph.byId[selectedId].name));
    }
  }

  /* ------------------------------- search --------------------------------- */

  var CATALOG_MIN_QUERY = 2;
  var searchToken = 0;

  function setStatus(text, tone) {
    var node = document.getElementById('catalogSearchStatus');
    if (!node) return;
    node.textContent = text || '';
    node.className = 'gos-catalog-status' + (tone ? ' is-' + tone : '');
  }

  function catalogConfig() {
    return GOS.gos && GOS.gos.catalogConfig ? GOS.gos.catalogConfig() : { proxyUrl: '', hasKey: false, _key: '' };
  }

  function catalogEnabled() {
    var config = catalogConfig();
    return !!(config.proxyUrl || config._key);
  }

  /** Which graph/user nodes already cover a catalog candidate (id + name). */
  function knownGraphMatch(candidate) {
    var ctx = state();
    if (!ctx || !ctx.graph || !GOS.catalog) return null;
    return GOS.catalog.canonicalMatch(ctx.graph.nodes, candidate);
  }

  function openRow(label, name, type, id) {
    var row = el('button', 'gos-search-item');
    row.type = 'button';
    row.dataset.id = id;
    row.appendChild(el('span', 'gos-type-chip gos-type-' + type, type));
    row.appendChild(el('span', 'gos-search-name', label ? name + ' (' + label + ')' : name));
    row.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      inputBlurAndClose();
      navigate(id);
    });
    row.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        navigate(id);
      }
    });
    return row;
  }

  /** RAWG ToS requires attribution with an active link wherever their data is shown. */
  function catalogAttribution() {
    var note = el('div', 'gos-search-attribution');
    var link = el('a', '', 'Game catalog data by RAWG');
    link.href = 'https://rawg.io';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    note.appendChild(link);
    return note;
  }

  function catalogRow(game) {
    var known = knownGraphMatch(game);
    var meta = game.metadata || {};
    var row = el('div', 'gos-search-item gos-search-item-catalog');
    row.appendChild(el('span', 'gos-type-chip gos-type-game', known ? 'saved' : 'catalog'));
    var copy = el('div', 'gos-search-copy');
    copy.appendChild(el('span', 'gos-search-name', game.name));
    var bits = [];
    if (meta.year) bits.push(String(meta.year));
    if (meta.releaseStatus === 'upcoming') bits.push('upcoming');
    if (meta.platforms && meta.platforms.length) bits.push(meta.platforms.slice(0, 3).join(', '));
    if (meta.developers && meta.developers.length) bits.push(meta.developers[0]);
    if (bits.length) copy.appendChild(el('span', 'gos-search-meta', bits.join(' · ')));
    row.appendChild(copy);

    if (known) {
      var open = el('button', 'gos-search-add is-known', 'Open');
      open.type = 'button';
      open.setAttribute('aria-label', 'Open ' + known.name);
      open.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        inputBlurAndClose();
        navigate(known.id);
      });
      row.appendChild(open);
    } else {
      var add = el('button', 'gos-search-add', 'Add');
      add.type = 'button';
      add.setAttribute('aria-label', 'Add ' + game.name + ' to library');
      add.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        addFromCatalog(game, add, row);
      });
      row.appendChild(add);
    }
    return row;
  }

  function addFromCatalog(game, button, row) {
    if (!GOS.gos || !GOS.gos.addCatalogGame) return;
    button.disabled = true;
    button.textContent = '…';
    GOS.gos.addCatalogGame(game).then(function (result) {
      if (result && result.added) {
        button.textContent = 'Added';
        row.classList.add('is-added');
        setStatus('“' + game.name + '” saved to your library.', 'ok');
        inputBlurAndClose();
        navigate(result.gameId);
      } else {
        button.textContent = 'Open';
        button.classList.add('is-known');
        setStatus('“' + game.name + '” was already in your library — opened the existing entry.', 'ok');
        if (result && result.gameId) {
          inputBlurAndClose();
          navigate(result.gameId);
        }
      }
    }).catch(function (error) {
      button.disabled = false;
      button.textContent = 'Add';
      setStatus('Could not save “' + game.name + '”: ' + error.message, 'error');
    });
  }

  function inputBlurAndClose() {
    var results = document.getElementById('discoverSearchResults');
    var input = document.getElementById('discoverSearch');
    if (input) input.blur();
    if (results) results.hidden = true;
  }

  /**
   * Universal search: instant local graph hits first, then cached catalog
   * results, then (when configured) a live RAWG round-trip. RAWG rows are
   * de-duplicated against the graph by canonical name / RAWG id, and nothing
   * is ever written to the library without an explicit Add.
   *
   * Options:
   *   replace  — rebuild the local block from scratch (first keystroke pass)
   *   skipLocal— leave rendered local rows alone (debounced network pass)
   *   network  — perform the live RAWG round-trip (default true)
   */
  function runSearch(rawQuery, options) {
    options = options || {};
    var network = options.network !== false;
    var ctx = state();
    var results = document.getElementById('discoverSearchResults');
    if (!results) return;
    var query = String(rawQuery || '').trim();
    if (!ctx || !ctx.graph || query.length < CATALOG_MIN_QUERY) {
      results.hidden = true;
      results.textContent = '';
      setStatus(catalogEnabled()
        ? 'Local and cached games work offline. RAWG search is live.'
        : 'Local and cached games work offline. RAWG search is optional — add a proxy or key in Settings.');
      return;
    }

    var token = ++searchToken;
    if (options.replace && !options.skipLocal) results.textContent = '';

    // 1) Local graph — instant, offline, includes your saved catalog games.
    var localMatches = L.search(ctx.graph, query, 8);
    var localIds = Object.create(null);
    localMatches.forEach(function (node) { localIds[node.id] = true; });

    if (!options.skipLocal) {
      Array.prototype.slice.call(results.querySelectorAll('.gos-search-item-local')).forEach(function (node) {
        node.parentNode.removeChild(node);
      });
      if (localMatches.length) {
        var anchor = results.firstChild;
        localMatches.forEach(function (node) {
          var row = openRow(null, node.name, node.type, node.id);
          row.classList.add('gos-search-item-local');
          results.insertBefore(row, anchor);
        });
      }
    }

    // 2) Cached RAWG results — shown until a live answer replaces them.
    var C = GOS.catalog;
    var storage = GOS.storage;
    var config = catalogConfig();
    var cachedDone = (!C || !storage) ? Promise.resolve(null) : C.readCache(storage, query).then(function (record) {
      if (token !== searchToken || !record) return null;
      var fresh = (record.games || []).filter(function (game) { return !knownGraphMatch(game) && !localIds[game.id]; });
      if (!fresh.length) return null;
      Array.prototype.slice.call(results.querySelectorAll('.gos-search-empty, .gos-search-item-catalog, .gos-search-attribution')).forEach(function (node) {
        node.parentNode.removeChild(node);
      });
      if (!results.querySelector('.gos-search-divider')) {
        results.appendChild(el('div', 'gos-search-divider', 'Catalog (cached)'));
      }
      fresh.forEach(function (game) { results.appendChild(catalogRow(game)); });
      results.appendChild(catalogAttribution());
      results.hidden = false;
      return fresh;
    });

    // 3) Live RAWG — only when configured, only on the network pass.
    var liveDone = cachedDone.then(function (cached) {
      if (token !== searchToken) return cached;
      if (!network || !catalogEnabled()) {
        setStatus(localMatches.length
          ? localMatches.length + ' local match(es).' + (catalogEnabled() ? '' : ' Add a RAWG proxy or key in Settings to search the wider catalog.')
          : 'No local matches. Add a RAWG proxy or key in Settings to search the wider catalog.');
        return cached;
      }
      setStatus('Searching…');
      return C.searchRawg(query, {
        proxyUrl: config.proxyUrl,
        key: config._key,
        limit: 12,
        timeoutMs: 6000
      }).then(function (remote) {
        if (token !== searchToken) return cached;
        C.writeCache(storage, query, remote);
        var fresh = (remote || []).filter(function (game) { return !knownGraphMatch(game) && !localIds[game.id]; });
        // Replace any cached-catalog block (and stale empty note) with the live one.
        var divider = results.querySelector('.gos-search-divider');
        while (divider && divider.nextSibling) divider.parentNode.removeChild(divider.nextSibling);
        if (divider) divider.parentNode.removeChild(divider);
        Array.prototype.slice.call(results.querySelectorAll('.gos-search-item-catalog, .gos-search-empty, .gos-search-attribution')).forEach(function (node) {
          node.parentNode.removeChild(node);
        });
        if (fresh.length) {
          results.appendChild(el('div', 'gos-search-divider', 'Catalog (RAWG)'));
          fresh.forEach(function (game) { results.appendChild(catalogRow(game)); });
          results.appendChild(catalogAttribution());
          setStatus((localMatches.length ? localMatches.length + ' local · ' : '') + fresh.length + ' RAWG result(s). Add any game to your library.', 'ok');
        } else {
          setStatus(localMatches.length
            ? localMatches.length + ' local match(es). No new RAWG results.'
            : 'No matches in your library or the RAWG catalog.');
        }
        results.hidden = false;
        return fresh;
      }).catch(function (error) {
        if (token !== searchToken) return cached;
        setStatus(cached && cached.length
          ? 'RAWG unreachable (' + error.message + ') — showing cached results.'
          : 'RAWG unreachable (' + error.message + ') — local results only.', 'error');
        return cached;
      });
    });

    results.hidden = false;
    if (!localMatches.length && !results.querySelector('.gos-search-item-catalog') && !results.querySelector('.gos-search-empty')) {
      // Live pass will refresh the status; keep an honest placeholder meanwhile.
      results.appendChild(el('div', 'gos-search-empty', 'No local matches for “' + query + '”.'));
    }
    return liveDone;
  }

  function wireSearch() {
    var input = document.getElementById('discoverSearch');
    var results = document.getElementById('discoverSearchResults');
    if (!input || !results) return;

    function close() { results.hidden = true; }

    // Network pass runs after a short pause so typing never re-renders rows
    // under the pointer/finger mid-click.
    var liveSearch = U.debounce
      ? U.debounce(function (value) { runSearch(value, { skipLocal: true, replace: true }); }, 350)
      : function () {};

    input.addEventListener('input', function () {
      var query = input.value.trim();
      if (!query) { searchToken++; close(); setStatus(''); return; }
      runSearch(query, { replace: true, network: false });  // local + cached, instant
      liveSearch(query);                                    // debounced RAWG round-trip
    });

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { input.value = ''; close(); return; }
      if (event.key === 'Enter') {
        event.preventDefault();
        var first = results.querySelector('.gos-search-item');
        if (first && first.dataset.id) {
          input.value = '';
          close();
          navigate(first.dataset.id);
        }
        return;
      }
      if (event.key === 'ArrowDown') {
        var firstRow = results.querySelector('.gos-search-item');
        if (firstRow && typeof firstRow.focus === 'function') { event.preventDefault(); firstRow.focus(); }
      }
    });

    input.addEventListener('blur', function () {
      setTimeout(close, 160);
    });

    // Live catalog refreshes when the user applies proxy/key settings.
    document.addEventListener('gos:catalog-config', function () {
      var query = input.value.trim();
      if (query) runSearch(query, { replace: true });
    });
  }

  /* ------------------------------- detail --------------------------------- */

  function formatExperienceDate(experience) {
    try { return new Date(experience.created_at || experience.date).toLocaleDateString(); }
    catch (e) { return 'Saved session'; }
  }

  function renderExperienceDossier(host, node, ctx) {
    if (node.type !== 'game' || !GOS.glyphEngine || !GOS.glyph) return;
    var aggregate = GOS.glyphEngine.aggregateGame(ctx.experiences, node.id);
    if (!aggregate) return;
    var experiences = ctx.experiences.filter(function (experience) { return experience.gameId === node.id; })
      .sort(function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
    var experienceIds = experiences.map(function (experience) { return experience.id; });
    var signals = ctx.signals.filter(function (signal) { return experienceIds.indexOf(signal.experienceId) !== -1; });
    var attachments = (ctx.evidence || []).filter(function (record) { return record.type === 'media-attachment' && record.gameId === node.id; });

    var dossier = el('section', 'game-dossier');
    var hero = el('div', 'game-dossier__hero');
    var heroArt = el('div', 'game-dossier__hero-art');
    if (GOS.art) heroArt.style.backgroundImage = 'url(\'' + GOS.art.cover(node.name) + '\')';
    hero.appendChild(heroArt);
    var heroCopy = el('div', 'game-dossier__hero-copy');
    heroCopy.appendChild(el('div', 'eyebrow', 'Measured game experience'));
    heroCopy.appendChild(el('h3', null, node.name));
    heroCopy.appendChild(el('p', 'subtext', aggregate.sampleCount + ' recorded experience' + (aggregate.sampleCount === 1 ? '' : 's') + ' · ' + aggregate.weighting));
    hero.appendChild(heroCopy);
    dossier.appendChild(hero);

    var top = el('div', 'game-dossier__top');
    var glyphPanel = el('article', 'game-dossier__panel game-dossier__glyph');
    var glyphHead = el('div', 'game-dossier__panel-head');
    glyphHead.appendChild(el('div', null, 'Experience Glyph'));
    glyphHead.appendChild(el('span', 'gos-chip', aggregate.sampleCount + ' sample' + (aggregate.sampleCount === 1 ? '' : 's')));
    glyphPanel.appendChild(glyphHead);
    glyphPanel.appendChild(GOS.glyph.render(aggregate, { size: 'xl', variant: 'game', label: node.name + ' game aggregate', signals: signals }));
    top.appendChild(glyphPanel);

    var dimensions = el('article', 'game-dossier__panel game-dossier__dimensions');
    dimensions.appendChild(el('div', 'game-dossier__panel-head', 'Nine dimensions'));
    GOS.glyphEngine.DIMENSIONS.forEach(function (dimension) {
      var row = el('div', 'glyph-dimension');
      row.setAttribute('data-glyph-dimension', dimension.key);
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', 'Highlight ' + dimension.label + ' dimension, score ' + aggregate.scores[dimension.key] + ' out of 10');
      var line = el('div', 'glyph-dimension__line');
      line.appendChild(el('span', null, dimension.label));
      line.appendChild(el('strong', null, String(aggregate.scores[dimension.key])));
      row.appendChild(line);
      var track = el('div', 'glyph-dimension__track');
      var fill = el('span', 'glyph-dimension__fill');
      fill.style.width = (aggregate.scores[dimension.key] * 10) + '%';
      track.appendChild(fill);
      row.appendChild(track);
      dimensions.appendChild(row);
    });
    top.appendChild(dimensions);
    dossier.appendChild(top);

    var signalsPanel = el('article', 'game-dossier__panel');
    signalsPanel.appendChild(el('div', 'game-dossier__panel-head', 'Signal identity'));
    var signalTags = el('div', 'game-signal-tags');
    if (!signals.length) signalTags.appendChild(el('span', 'gos-empty-text', 'No qualitative signal tags recorded yet.'));
    signals.forEach(function (signal) {
      signalTags.appendChild(el('span', 'gos-chip ' + (signal.polarity === 'negative' ? 'gos-chip-neg' : 'gos-chip-pos'), signal.label));
    });
    signalsPanel.appendChild(signalTags);
    dossier.appendChild(signalsPanel);

    var similarPanel = el('article', 'game-dossier__panel');
    similarPanel.appendChild(el('div', 'game-dossier__panel-head', 'Similar experience shapes'));
    var matches = GOS.glyphEngine.similarGames(ctx.experiences, node.id).slice(0, 4);
    var similarGrid = el('div', 'similar-glyph-grid');
    if (!matches.length) similarGrid.appendChild(el('div', 'gos-empty-text', 'No other reviewed game has enough recorded evidence for measured similarity.'));
    matches.forEach(function (match) {
      var game = ctx.gamesById[match.gameId] || ctx.graph.byId[match.gameId] || { name: match.gameId };
      var card = el('button', 'similar-glyph-card');
      card.type = 'button';
      card.appendChild(GOS.glyph.render(match.glyph, { size: 'sm', variant: 'game', label: game.name + ' game aggregate' }));
      card.appendChild(el('strong', null, game.name));
      card.appendChild(el('span', 'similar-glyph-card__score', match.similarity.score + '% match'));
      card.appendChild(el('span', 'subtext', 'Shared: ' + match.similarity.shared.map(function (item) { return item.label; }).join(', ')));
      card.appendChild(el('span', 'subtext', 'Differs: ' + match.similarity.differences.map(function (item) { return item.label; }).join(', ')));
      card.appendChild(el('span', 'subtext', match.similarity.evidence.left + ' vs ' + match.similarity.evidence.right + ' samples'));
      card.addEventListener('click', function () { navigate(match.gameId); });
      similarGrid.appendChild(card);
    });
    similarPanel.appendChild(similarGrid);
    dossier.appendChild(similarPanel);

    var lower = el('div', 'game-dossier__lower');
    var history = el('article', 'game-dossier__panel');
    history.appendChild(el('div', 'game-dossier__panel-head', 'Session history'));
    var historyList = el('div', 'dossier-session-list');
    experiences.forEach(function (experience) {
      var row = el('div', 'dossier-session');
      row.appendChild(GOS.glyph.render(GOS.glyphEngine.session(experience, signals), { size: 'xs', variant: 'session', label: node.name + ' session' }));
      var copy = el('div', 'dossier-session__copy');
      copy.appendChild(el('strong', null, Number(experience.score).toFixed(1) + ' · ' + formatExperienceDate(experience)));
      copy.appendChild(el('span', 'subtext', experience.notes || experience.verdict || 'No session note.'));
      row.appendChild(copy);
      historyList.appendChild(row);
    });
    history.appendChild(historyList);
    lower.appendChild(history);

    var media = el('article', 'game-dossier__panel');
    media.appendChild(el('div', 'game-dossier__panel-head', 'Clips & media'));
    if (!attachments.length) {
      media.appendChild(el('div', 'media-placeholder', 'No media attached. Add a local clip while logging a session; Game OS never uploads automatically.'));
    } else {
      attachments.forEach(function (attachment) {
        var row = el('div', 'media-attachment-row');
        var copy = el('div');
        copy.appendChild(el('strong', null, attachment.name));
        copy.appendChild(el('div', 'subtext', attachment.visibility + ' · ' + Math.max(1, Math.round(attachment.size / 1024 / 1024)) + ' MB'));
        row.appendChild(copy);
        var url = GOS.media && GOS.media.previewUrl(attachment.id);
        if (url) {
          var open = el('a', 'btn btn-secondary', 'Preview');
          open.href = url;
          open.target = '_blank';
          open.rel = 'noopener';
          row.appendChild(open);
        } else {
          row.appendChild(el('span', 'gos-chip', 'Re-select local file to preview'));
        }
        media.appendChild(row);
      });
    }
    lower.appendChild(media);
    dossier.appendChild(lower);
    host.appendChild(dossier);
  }

  function renderDetail() {
    var host = document.getElementById('discoverDetail');
    if (!host) return;
    host.textContent = '';
    var ctx = state();
    if (!ctx || !ctx.graph) return;

    if (!selectedId) {
      var empty = el('div', 'gos-empty');
      empty.appendChild(el('div', 'gos-empty-title', 'Search or pick an entity to explore'));
      empty.appendChild(el('div', 'gos-empty-text',
        'Every connection is labelled by category. Lineage (human / studio / franchise) is never mixed with mechanical similarity.'));
      var suggestions = el('div', 'gos-suggestion-row');
      SUGGESTIONS.forEach(function (suggestion) {
        var chip = el('button', 'gos-chip gos-chip-suggest', suggestion.label);
        chip.type = 'button';
        chip.addEventListener('click', function () { navigate(suggestion.id); });
        suggestions.appendChild(chip);
      });
      empty.appendChild(suggestions);
      host.appendChild(empty);
      return;
    }

    var node = ctx.graph.byId[selectedId];
    if (!node) return;

    var head = el('div', 'gos-detail-head');
    if (root.GOS && GOS.art && node.name) {
      var art = el('div', 'gos-detail-art');
      art.style.backgroundImage = 'url(\'' + GOS.art.cover(node.name) + '\')';
      head.appendChild(art);
    }
    head.appendChild(el('span', 'gos-type-chip gos-type-' + node.type, node.type));
    head.appendChild(el('h4', 'gos-detail-name', node.name));
    if (node.aliases && node.aliases.length) {
      head.appendChild(el('span', 'gos-detail-alias', 'aka ' + node.aliases.join(', ')));
    }
    host.appendChild(head);

    var meta = el('div', 'gos-detail-meta');
    var metadata = node.metadata || {};
    if (metadata.released) meta.appendChild(el('span', 'gos-meta-chip', 'released ' + metadata.released));
    else if (metadata.year) meta.appendChild(el('span', 'gos-meta-chip', String(metadata.year)));
    if (metadata.role) meta.appendChild(el('span', 'gos-meta-chip', metadata.role));
    if (metadata.playability) {
      meta.appendChild(el('span', 'gos-meta-chip',
        metadata.playability === 'current' ? 'playable now' : 'legacy'));
    }
    if (metadata.modes && metadata.modes.length) {
      meta.appendChild(el('span', 'gos-meta-chip', metadata.modes.join(' · ')));
    }
    var degree = L.edgesOf(ctx.graph, node.id).length;
    meta.appendChild(el('span', 'gos-meta-chip', degree + ' direct connection' + (degree === 1 ? '' : 's')));

    if (node.type === 'game' && GOS.gos && GOS.gos.libraryIdFor) {
      var current = ctx.library.filter(function (entry) {
        return entry.gameId === node.id;
      })[0];
      var statusField = el('label', 'gos-filter-field gos-library-field');
      statusField.appendChild(el('span', null, 'Your library'));
      var statusSelect = el('select', 'input');
      if (!current) {
        var none = el('option', null, 'not set');
        none.value = '';
        none.selected = true;
        statusSelect.appendChild(none);
      }
      (L.LIBRARY_STATUSES || []).forEach(function (status) {
        var option = el('option', null, status);
        option.value = status;
        if (current && current.status === status) option.selected = true;
        statusSelect.appendChild(option);
      });
      statusSelect.addEventListener('change', function () {
        if (!statusSelect.value) return;
        GOS.gos.setLibraryStatus(node.id, statusSelect.value).catch(function (error) {
          console.error('Library status update failed:', error);
        });
      });
      statusField.appendChild(statusSelect);
      meta.appendChild(statusField);
      if (current) meta.appendChild(el('span', 'gos-meta-chip', 'status: ' + current.status));
    }
    host.appendChild(meta);
    renderExperienceDossier(host, node, ctx);
  }

  /* ------------------------------ branches -------------------------------- */

  function evidenceText(edge) {
    if (!edge.evidence || !edge.evidence.length) return '';
    return edge.evidence.map(function (item) { return item.text || item.quote || ''; })
      .filter(Boolean).join(' ');
  }

  function renderBranches() {
    var host = document.getElementById('discoverBranches');
    if (!host) return;
    host.textContent = '';
    var ctx = state();
    if (!ctx || !ctx.graph || !selectedId) return;

    var result = L.firstDegree(ctx.graph, selectedId, {
      filters: domainFilters(),
      context: { graph: ctx.graph, libraryByGame: libraryByGame() }
    });
    if (!result) return;

    if (!result.groups.length) {
      host.appendChild(el('div', 'gos-empty',
        'No connections match the current filters.'));
      return;
    }

    result.groups.forEach(function (group) {
      var section = el('section', 'gos-branch-group');
      var head = el('div', 'gos-branch-head');
      var isLineageCat = (root.GOS_VOCAB && GOS_VOCAB.lineageCategories || []).indexOf(group.category) !== -1;
      head.appendChild(el('span', 'gos-branch-title' + (isLineageCat ? ' is-lineage' : ''), group.label));
      head.appendChild(el('span', 'gos-branch-count', String(group.items.length)));
      if (!isLineageCat) {
        head.appendChild(el('span', 'gos-not-lineage', 'not lineage'));
      }
      section.appendChild(head);

      var list = el('div', 'gos-branch-list');
      group.items.forEach(function (entry) {
        var row = el('div', 'gos-branch-item');

        var open = el('button', 'gos-branch-open');
        open.type = 'button';
        open.appendChild(el('span', 'gos-branch-label', entry.label));
        open.appendChild(el('span', 'gos-branch-name', entry.node.name));
        open.appendChild(el('span', 'gos-type-chip gos-type-' + entry.node.type, entry.node.type));
        open.addEventListener('click', function () { navigate(entry.node.id); });
        row.appendChild(open);

        var flags = el('span', 'gos-branch-flags');
        var band = entry.edge.confidence_band;
        if (band && band !== 'high') {
          flags.appendChild(el('span', 'gos-flag gos-flag-' + band, band + ' confidence'));
        }
        if (entry.edge.review_status && entry.edge.review_status !== 'verified') {
          flags.appendChild(el('span', 'gos-flag gos-flag-review', entry.edge.review_status));
        }
        var evidence = evidenceText(entry.edge);
        if (evidence) {
          var ev = el('span', 'gos-flag gos-flag-evidence', 'evidence');
          ev.title = evidence;
          flags.appendChild(ev);
        }
        if (flags.childNodes.length) row.appendChild(flags);

        list.appendChild(row);
      });
      section.appendChild(list);
      host.appendChild(section);
    });

    if (result.skipped && result.skipped.length) {
      host.appendChild(el('div', 'gos-skipped-note',
        result.skipped.length + ' connection(s) hidden: missing target entity.'));
    }
  }

  /* ------------------------------ expansion -------------------------------- */

  function hopLabel(graph, fromId, toId) {
    var edges = L.edgesOf(graph, fromId);
    for (var i = 0; i < edges.length; i++) {
      if (edges[i].source === toId || edges[i].target === toId) {
        return L.labelFor(edges[i], fromId);
      }
    }
    return 'related to';
  }

  function renderExpansion() {
    var host = document.getElementById('discoverExpansion');
    if (!host) return;
    host.textContent = '';
    var ctx = state();
    if (!ctx || !ctx.graph || !selectedId) return;

    var depthSelect = document.getElementById('discoverDepth');
    var depth = depthSelect ? Number(depthSelect.value) || 1 : 1;
    var expanded = L.expand(ctx.graph, [selectedId], {
      depth: depth,
      nodeBudget: 300,
      filters: domainFilters(),
      context: { graph: ctx.graph, libraryByGame: libraryByGame() }
    });

    var reached = expanded.nodes.filter(function (node) { return node.id !== selectedId; });
    if (!reached.length) {
      host.appendChild(el('div', 'gos-empty', 'Nothing beyond the first degree for these filters.'));
      return;
    }

    var summary = el('div', 'gos-expansion-summary');
    summary.textContent = 'Depth ' + expanded.depth + ' · ' + reached.length +
      ' entity(ies) reached' + (expanded.truncated ? ' · truncated by node budget' : '') + ':';
    host.appendChild(summary);

    var list = el('div', 'gos-branch-list');
    reached.forEach(function (node) {
      var path = (expanded.paths && expanded.paths[node.id]) || [node.id];
      var parts = [];
      for (var i = 0; i < path.length - 1; i++) {
        parts.push(hopLabel(ctx.graph, path[i], path[i + 1]));
      }
      var row = el('div', 'gos-branch-item');
      var open = el('button', 'gos-branch-open');
      open.type = 'button';
      open.appendChild(el('span', 'gos-branch-label', parts.join(' → ')));
      open.appendChild(el('span', 'gos-branch-name', node.name));
      open.appendChild(el('span', 'gos-type-chip gos-type-' + node.type, node.type));
      open.addEventListener('click', function () { navigate(node.id); });
      row.appendChild(open);
      list.appendChild(row);
    });
    host.appendChild(list);
  }

  /* -------------------------------- render --------------------------------- */

  function render() {
    renderBreadcrumb();
    renderDetail();
    renderBranches();
    renderExpansion();
  }

  function isActive() {
    var active = document.querySelector('.tab.active');
    return !!active && active.id === 'discover';
  }

  function onTab(detail) {
    if (detail && detail.tab === 'discover') {
      renderFilters();
      render();
    }
  }

  function onData() {
    if (isActive()) render();
  }

  function init() {
    renderFilters();
    wireSearch();
    var expandBtn = document.getElementById('discoverExpandBtn');
    if (expandBtn) expandBtn.addEventListener('click', renderExpansion);
    var depthSelect = document.getElementById('discoverDepth');
    if (depthSelect) depthSelect.addEventListener('change', renderExpansion);

    // Mobile affordance: top-bar Search jumps to Discover and focuses the
    // universal search box so adding games never needs a keyboard.
    var mobileSearchBtn = document.getElementById('mobileSearchBtn');
    if (mobileSearchBtn) {
      mobileSearchBtn.addEventListener('click', function () {
        if (root.showTab) root.showTab('discover');
        var input = document.getElementById('discoverSearch');
        if (input) {
          input.focus();
          input.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      });
    }

    document.addEventListener('gos:tab', function (event) { onTab(event.detail); });
    document.addEventListener('gos:data', function () { onData(); });
    document.addEventListener('gos:ready', function () {
      renderFilters();
      render();
    });
    render();
  }

  GOS.discover = {
    init: init,
    open: function (id, opts) {
      navigate(id, opts && opts.noTrail ? false : true);
      if (root.showTab) root.showTab('discover');
      renderFilters();
      render();
    },
    render: render,
    search: runSearch
  };

  if (root.document) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
