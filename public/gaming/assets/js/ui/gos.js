/**
 * icyNatural Game OS — UI bridge.
 *
 * Responsibilities:
 *   - boot storage (IndexedDB w/ PUBLIC_STORAGE fallback), migrate legacy data
 *   - keep the shared graph + taste context in memory for all views
 *   - persist every calculated experience as ExperienceLog + ExperienceSignals
 *   - render the contextual "signal tag" picker on the Test form
 *   - settings: export / import / storage status
 *   - re-dispatch tab switches so views can refresh on activation
 */
(function (root) {
  'use strict';

  var GOS = (root.GOS = root.GOS || {});
  var U = GOS.util;

  var ctx = {
    graph: null,
    experiences: [],
    signals: [],
    library: [],
    games: [],
    entities: [],
    edges: [],
    evidence: [],
    patterns: [],
    mode: null,
    booted: false
  };

  var LIB_STATUS_DEFAULT = 'completed';
  var CATALOG_CONFIG_KEY = 'icyNaturalGameOSCatalog';
  var catalogSession = { apiKey: '' };

  /* ------------------------------- helpers -------------------------------- */

  function slugName(name) {
    var base = U && U.slugify ? U.slugify(name) : String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return base || 'unknown';
  }

  function resolveGameId(name) {
    var key = U.normalizeKey(name);
    var node = ctx.graph && ctx.graph.byKey ? ctx.graph.byKey[key] : null;
    if (node && node.type === 'game') return node.id;
    return 'game:user:' + slugName(name);
  }

  function libraryIdFor(gameId) {
    return 'lib:' + gameId;
  }

  function byId(list) {
    var map = Object.create(null);
    (list || []).forEach(function (item) { map[item.id] = item; });
    return map;
  }

  /* ------------------------- signal tag picker ---------------------------- */

  var SIGNAL_STATES = [null, 'pos', 'neg'];

  function renderSignalTagGroups() {
    var host = document.getElementById('signalTagGroups');
    if (!host || !GOS.signals) return;
    var groups = {};
    GOS.signals.CONTEXTUAL.forEach(function (item) {
      (groups[item.group] = groups[item.group] || []).push(item);
    });

    host.textContent = '';
    Object.keys(groups).forEach(function (group) {
      var row = document.createElement('div');
      row.className = 'gos-sig-group';
      var label = document.createElement('div');
      label.className = 'gos-sig-group-label';
      label.textContent = group;
      row.appendChild(label);

      var tags = document.createElement('div');
      tags.className = 'tag-row';
      groups[group].forEach(function (item) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tag gos-sig-tag';
        btn.dataset.signalKey = item.key;
        btn.dataset.signalState = '';
        btn.textContent = item.title || item.label;
        btn.addEventListener('click', function () {
          var current = btn.dataset.signalState || '';
          var next = current === '' ? 'pos' : current === 'pos' ? 'neg' : '';
          btn.dataset.signalState = next;
          btn.classList.toggle('gos-sig-pos', next === 'pos');
          btn.classList.toggle('gos-sig-neg', next === 'neg');
        });
        tags.appendChild(btn);
      });
      row.appendChild(tags);
      host.appendChild(row);
    });
  }

  function resetSignalTags(contextValue) {
    var host = document.getElementById('signalTagGroups');
    if (host) {
      host.querySelectorAll('.gos-sig-tag').forEach(function (btn) {
        btn.dataset.signalState = '';
        btn.classList.remove('gos-sig-pos', 'gos-sig-neg');
      });
    }
    var select = document.getElementById('signalContext');
    if (select) select.value = contextValue || 'overall';
  }

  function readSignalSelections() {
    var out = [];
    var host = document.getElementById('signalTagGroups');
    if (!host) return out;
    host.querySelectorAll('.gos-sig-tag').forEach(function (btn) {
      var state = btn.dataset.signalState;
      if (state !== 'pos' && state !== 'neg') return;
      out.push({
        key: btn.dataset.signalKey,
        polarity: state === 'neg' ? 'negative' : 'positive',
        importance: 2
      });
    });
    return out;
  }

  function readSignalContext() {
    var select = document.getElementById('signalContext');
    return select && select.value ? select.value : 'overall';
  }

  /* ----------------------------- persistence ------------------------------ */

  function scoresFromLegacy(state) {
    var scores = {};
    GOS.signals.CORE_DIMENSIONS.forEach(function (dimension) {
      var value = Number(state[dimension.key]);
      if (!isFinite(value) || state[dimension.key] === null || state[dimension.key] === '') {
        throw new Error('Cannot save an experience with unanswered rating: ' + dimension.label);
      }
      scores[dimension.key] = value;
    });
    return scores;
  }

  function saveExperience(state, score, verdict) {
    var name = state && String(state.gameName || '').trim();
    if (!name) return Promise.reject(new Error('Game name is required.'));
    if (!state.platform) return Promise.reject(new Error('Platform is required.'));
    if (!isFinite(Number(score))) return Promise.reject(new Error('A complete scored experience is required.'));
    // The autocomplete can pin a canonical id (seed, catalog or RAWG record);
    // fall back to name resolution for hand-typed games.
    var gameId = (state.gameId && String(state.gameId).trim()) || resolveGameId(name);
    var now = new Date();
    var contextMode = readSignalContext();
    var selections = readSignalSelections();

    var experience = {
      id: U.uid('exp'),
      gameId: gameId,
      gameName: name,
      platform: state.platform,
      scores: scoresFromLegacy(state),
      friction: Array.isArray(state.friction) ? state.friction.slice() : [],
      notes: state.notes || '',
      score: score,
      verdict: verdict || '',
      date: now.getTime(),
      context: { mode: contextMode },
      contextual: selections,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    var signals = GOS.signals.buildForExperience(experience, {
      context: contextMode,
      contextual: selections
    }).map(function (signal) {
      return Object.assign({}, signal, {
        id: U.uid('sig'),
        experienceId: experience.id,
        gameId: gameId,
        gameName: name,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      });
    });

    var libId = libraryIdFor(gameId);
    var mediaInput = document.getElementById('experienceMediaFile');
    var mediaFile = mediaInput && mediaInput.files ? mediaInput.files[0] : null;
    var visibilityInput = document.getElementById('experienceMediaVisibility');
    var attachment = null;
    if (mediaFile && GOS.media) {
      attachment = GOS.media.metadata(mediaFile, {
        gameId: gameId,
        experienceId: experience.id,
        signalKeys: selections.map(function (item) { return item.key; }),
        visibility: visibilityInput ? visibilityInput.value : 'private'
      });
    }

    var writes = [
      GOS.storage.put('experiences', experience),
      signals.length ? GOS.storage.putMany('signals', signals) : Promise.resolve(),
      attachment ? GOS.storage.put('evidence', attachment) : Promise.resolve(),
      GOS.storage.get('games', gameId).then(function (existing) {
        return GOS.storage.put('games', existing || {
          id: gameId,
          name: name,
          metadata: {},
          created_at: now.toISOString()
        });
      }),
      GOS.storage.get('library', libId).then(function (entry) {
        return GOS.storage.put('library', entry || {
          id: libId,
          gameId: gameId,
          status: LIB_STATUS_DEFAULT,
          created_at: now.toISOString()
        });
      })
    ];

    return Promise.all(writes)
      .then(function () { return GOS.storage.all('experiences'); })
      .then(function (all) { GOS.storage.mirrorLegacy(all); return refresh(); })
      .then(function () {
        if (mediaInput) mediaInput.value = '';
        var mediaStatus = document.getElementById('experienceMediaStatus');
        if (mediaStatus) mediaStatus.textContent = attachment
          ? 'Attached locally: ' + attachment.name + ' (' + attachment.visibility + ').'
          : 'No media selected.';
        document.dispatchEvent(new CustomEvent('gos:data', { detail: { reason: 'experience-saved' } }));
        return experience;
      });
  }

  function setLibraryStatus(gameId, status) {
    var libId = libraryIdFor(gameId);
    return GOS.storage.get('library', libId).then(function (entry) {
      var record = entry || {
        id: libId,
        gameId: gameId,
        status: LIB_STATUS_DEFAULT,
        created_at: new Date().toISOString()
      };
      record.status = status;
      record.updated_at = new Date().toISOString();
      return GOS.storage.put('library', record);
    }).then(function () {
      return refresh();
    }).then(function (ctx2) {
      document.dispatchEvent(new CustomEvent('gos:data', { detail: { reason: 'library-status' } }));
      return ctx2;
    });
  }

  /* ------------------------- catalog: add game ---------------------------- */

  /**
   * Add a catalog (RAWG or manual) game to the personal library.
   * Duplicate prevention: a candidate matching an existing graph node by RAWG
   * id or canonical name is NEVER re-added — the existing entry wins.
   */
  function addCatalogGame(candidate, options) {
    options = options || {};
    var C = GOS.catalog;
    if (!candidate || !candidate.name) {
      return Promise.reject(new Error('A catalog game with a name is required.'));
    }
    var graph = ctx.graph || { nodes: [], byId: {}, byKey: {} };
    var match = C && C.canonicalMatch ? C.canonicalMatch(graph.nodes, candidate) : null;
    if (match) {
      return Promise.resolve({ added: false, reason: 'duplicate', gameId: match.id, game: match });
    }

    var gameId = candidate.id || ('game:user:' + slugName(candidate.name));
    if (graph.byId && graph.byId[gameId]) {
      return Promise.resolve({ added: false, reason: 'duplicate', gameId: gameId, game: graph.byId[gameId] });
    }

    var now = new Date().toISOString();
    var entity = {
      id: gameId,
      type: 'game',
      name: candidate.name,
      aliases: Array.isArray(candidate.aliases) ? candidate.aliases.slice() : [],
      metadata: Object.assign({}, candidate.metadata || {}, { origin: 'catalog' }),
      created_at: now,
      updated_at: now
    };

    var writes = [
      GOS.storage.put('entities', entity),
      GOS.storage.get('games', gameId).then(function (existing) {
        return GOS.storage.put('games', existing || {
          id: gameId,
          name: candidate.name,
          metadata: entity.metadata,
          externalIds: candidate.externalIds || null,
          created_at: now
        });
      }),
      GOS.storage.get('library', libraryIdFor(gameId)).then(function (entry) {
        return GOS.storage.put('library', entry || {
          id: libraryIdFor(gameId),
          gameId: gameId,
          status: options.status || 'discovered',
          created_at: now
        });
      })
    ];

    return Promise.all(writes)
      .then(function () { return refresh(); })
      .then(function (ctx2) {
        document.dispatchEvent(new CustomEvent('gos:data', { detail: { reason: 'catalog-game-added' } }));
        return { added: true, reason: 'added', gameId: gameId, game: entity, context: ctx2 };
      });
  }

  function clearExperiences() {
    var collections = ['experiences', 'signals', 'taste', 'recommendations', 'library'];
    var chain = Promise.resolve();
    collections.forEach(function (name) {
      chain = chain.then(function () { return GOS.storage.clear(name); });
    });
    return chain.then(refresh).then(function () {
      document.dispatchEvent(new CustomEvent('gos:data', { detail: { reason: 'cleared' } }));
    });
  }

  /* ------------------------------- context -------------------------------- */

  function refresh() {
    return Promise.all([
      GOS.storage.all('experiences'),
      GOS.storage.all('signals'),
      GOS.storage.all('library'),
      GOS.storage.all('games'),
      GOS.storage.all('evidence'),
      GOS.storage.all('entities'),
      GOS.storage.all('edges')
    ]).then(function (results) {
      ctx.experiences = results[0];
      ctx.signals = results[1];
      ctx.library = results[2];
      ctx.games = results[3];
      ctx.evidence = results[4];
      ctx.entities = results[5];
      ctx.edges = results[6];

      // Rebuild the graph from seed + the persisted user overlay so catalog
      // games added on any device session survive reloads and stay searchable.
      ctx.graph = GOS.lineage.buildGraph(root.GOS_SEED_GRAPH || { nodes: [], edges: [] }, {
        nodes: ctx.entities,
        edges: ctx.edges
      });

      var gamesById = Object.create(null);
      ctx.graph.nodes.forEach(function (node) {
        if (node.type === 'game') gamesById[node.id] = node;
      });
      ctx.games.forEach(function (game) { gamesById[game.id] = game; });
      ctx.gamesById = gamesById;

      ctx.patterns = GOS.taste.computePatterns({
        signals: ctx.signals,
        experiences: ctx.experiences,
        gamesById: gamesById
      });
      updateStatus();
      return ctx;
    });
  }

  function context() { return ctx; }

  /* ----------------------------- export/import ---------------------------- */

  function exportData(label) {
    return GOS.storage.exportAll().then(function (payload) {
      var check = GOS.storage.validateImport(payload);
      if (!check.ok) throw new Error('Backup validation failed: ' + check.errors.join('; '));
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      var stamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = 'icyNatural-game-os-' + (label || 'export') + '-' + stamp + '.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return payload;
    });
  }

  function importFile(file) {
    return file.text().then(function (text) {
      var payload;
      try {
        payload = JSON.parse(text);
      } catch (error) {
        return { ok: false, errors: ['File is not valid JSON: ' + error.message], counts: null };
      }
      var check = GOS.storage.validateImport(payload);
      if (!check.ok) return check;
      // Download a portable target backup as well as storage-layer snapshots.
      return exportData('before-import').then(function () { return GOS.storage.importAll(payload); });
    }).then(function (result) {
      if (result.ok) return refresh().then(function () {
        document.dispatchEvent(new CustomEvent('gos:data', { detail: { reason: 'imported' } }));
        return result;
      });
      return result;
    });
  }

  /* --------------------------- legacy migration --------------------------- */

  function buildLegacyRecords(history, latest) {
    history = Array.isArray(history) ? history : [];
    var games = [];
    var library = [];
    var experiences = [];
    var signals = [];

    var seenGames = Object.create(null);

    function ensureGame(name) {
      var id = resolveGameId(name);
      if (!seenGames[id]) {
        seenGames[id] = true;
        games.push({ id: id, name: name, metadata: {}, created_at: new Date().toISOString() });
        library.push({
          id: libraryIdFor(id),
          gameId: id,
          status: LIB_STATUS_DEFAULT,
          created_at: new Date().toISOString()
        });
      }
      return id;
    }

    history.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var name = item.gameName || 'Untitled Game';
      var when = new Date(item.time || Date.now());
      var gameId = ensureGame(name);

      var experience = {
        id: item.__experienceId || U.uid('exp'),
        gameId: gameId,
        gameName: name,
        platform: item.platform || 'PC',
        scores: scoresFromLegacy(item),
        friction: Array.isArray(item.friction) ? item.friction.slice() : [],
        notes: item.notes || '',
        score: Number(item.score) || 0,
        verdict: item.verdict || '',
        date: Number(item.time) || when.getTime(),
        context: { mode: 'overall' },
        contextual: [],
        created_at: when.toISOString(),
        updated_at: when.toISOString()
      };
      experiences.push(experience);

      GOS.signals.buildForExperience(experience, {
        context: (experience.context && experience.context.mode) || 'overall'
      }).forEach(function (signal) {
        signals.push(Object.assign({}, signal, {
          id: U.uid('sig'),
          experienceId: experience.id,
          gameId: gameId,
          gameName: name,
          created_at: when.toISOString(),
          updated_at: when.toISOString()
        }));
      });
    });

    if (!history.length && latest && latest.gameName) {
      ensureGame(latest.gameName);
    }

    return {
      games: games,
      library: library,
      sessions: [],
      experiences: experiences,
      signals: signals,
      evidence: []
    };
  }

  /* -------------------------------- status -------------------------------- */

  function updateStatus() {
    var storageLine = document.getElementById('storageStatus');
    if (storageLine) {
      storageLine.textContent = 'Storage: ' + GOS.storage.mode() +
        ' · ' + ctx.experiences.length + ' experiences · ' +
        ctx.signals.length + ' signals · schema v' + GOS.storage.SCHEMA_VERSION;
    }
    var migrationLine = document.getElementById('migrationStatus');
    if (migrationLine) {
      var state = GOS.storage.migrationState();
      if (state.completed) {
        migrationLine.textContent = 'Migration: completed ' + (state.completedAt || '') +
          ' (backup: ' + (state.backupKey || 'none') + ', legacy keys preserved).';
      } else {
        migrationLine.textContent = 'Migration: not needed yet.';
      }
    }
  }

  /* --------------------------------- boot --------------------------------- */

  function buildGraph() {
    var seed = root.GOS_SEED_GRAPH || { nodes: [], edges: [] };
    ctx.graph = GOS.lineage.buildGraph(seed, { nodes: [], edges: [] });
    return ctx.graph;
  }

  function boot() {
    if (!GOS.storage) return Promise.resolve();
    return GOS.storage.init()
      .then(function (info) {
        ctx.mode = info.mode;
        buildGraph();
        return GOS.storage.migrateLegacy(buildLegacyRecords);
      })
      .then(function () {
        return refresh();
      })
      .then(function () {
        ctx.booted = true;
        renderSignalTagGroups();
        updateStatus();
        document.dispatchEvent(new CustomEvent('gos:ready', { detail: { mode: ctx.mode } }));
        document.dispatchEvent(new CustomEvent('gos:data', { detail: { reason: 'boot' } }));
      })
      .catch(function (error) {
        console.error('Game OS boot failed:', error);
        try { buildGraph(); } catch (e) { /* graph unavailable */ }
        updateStatus();
      });
  }

  /* ----------------------------- tab broadcast ---------------------------- */

  var originalShowTab = root.showTab;
  if (typeof originalShowTab === 'function') {
    root.showTab = function (tabId, options) {
      originalShowTab(tabId, options);
      document.dispatchEvent(new CustomEvent('gos:tab', { detail: { tab: tabId } }));
    };
  }

  /* ------------------------------ wire settings --------------------------- */

  function wireSettings() {
    var exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        exportData().catch(function (error) {
          console.error('Export failed:', error);
          alert('Export failed: ' + error.message);
        });
      });
    }

    var importInput = document.getElementById('importDataFile');
    if (importInput) {
      importInput.addEventListener('change', function () {
        var file = importInput.files && importInput.files[0];
        if (!file) return;
        importFile(file).then(function (result) {
          if (result && result.ok) {
            var counts = result.counts || {};
            alert('Import complete: verified. Existing records preserved; target backup downloaded. ' + GOS.storage.COLLECTIONS
              .map(function (name) { return name + ': added ' + ((result.added || {})[name] || 0) + ', duplicates ' + ((result.duplicates || {})[name] || 0); })
              .join(', '));
            updateStatus();
          } else {
            alert('Import rejected — nothing was written:\n' +
              (result && result.errors ? result.errors.join('\n') : 'Unknown error'));
          }
          importInput.value = '';
        }).catch(function (error) {
          alert('Import did not complete: ' + error.message + '\nRecovery backups, if created, are retained. Do not clear storage.');
          importInput.value = '';
        });
      });
    }
  }

  function wireResets() {
    ['resetBtn', 'loadDemoBtn', 'clearLatestBtn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', function () { resetSignalTags('overall'); });
    });
  }

  function wireMedia() {
    var input = document.getElementById('experienceMediaFile');
    var status = document.getElementById('experienceMediaStatus');
    if (!input || !status) return;
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) { status.textContent = 'No media selected.'; return; }
      var check = GOS.media ? GOS.media.validate(file) : { ok: false, error: 'Media support unavailable.' };
      if (!check.ok) {
        input.value = '';
        status.textContent = check.error;
        return;
      }
      status.textContent = file.name + ' · ' + Math.max(1, Math.round(file.size / 1024 / 1024)) + ' MB · local only';
    });
  }

  /* --------------------------- catalog configuration ---------------------- */

  /**
   * Proxy URL persists in PUBLIC_STORAGE (never exported — it holds no secret).
   * The RAWG API key is SESSION-ONLY: memory only, never written to storage,
   * never exported, cleared on reload.
   */
  function catalogConfig() {
    var stored = {};
    try {
      var raw = root.PUBLIC_STORAGE.getItem(CATALOG_CONFIG_KEY);
      if (raw) stored = JSON.parse(raw) || {};
    } catch (e) { stored = {}; }
    return {
      proxyUrl: String(stored.proxyUrl || '').trim(),
      hasKey: !!catalogSession.apiKey,
      _key: catalogSession.apiKey
    };
  }

  function setCatalogConfig(next) {
    next = next || {};
    var proxyUrl = String(next.proxyUrl || '').trim();
    try {
      if (proxyUrl) root.PUBLIC_STORAGE.setItem(CATALOG_CONFIG_KEY, JSON.stringify({ proxyUrl: proxyUrl }));
      else root.PUBLIC_STORAGE.removeItem(CATALOG_CONFIG_KEY);
    } catch (e) { /* private mode — config stays session-only */ }
    if (typeof next.apiKey === 'string') catalogSession.apiKey = next.apiKey.trim();
    document.dispatchEvent(new CustomEvent('gos:catalog-config', { detail: catalogConfig() }));
    return catalogConfig();
  }

  function wireCatalogSettings() {
    var saveBtn = document.getElementById('saveCatalogConfigBtn');
    var urlInput = document.getElementById('catalogProxyUrl');
    var keyInput = document.getElementById('catalogApiKey');
    if (!saveBtn || !urlInput) return;
    var current = catalogConfig();
    urlInput.value = current.proxyUrl;
    saveBtn.addEventListener('click', function () {
      var saved = setCatalogConfig({ proxyUrl: urlInput.value, apiKey: keyInput ? keyInput.value : '' });
      if (keyInput) keyInput.value = '';
      saveBtn.textContent = 'Applied';
      setTimeout(function () { saveBtn.textContent = 'Apply Catalog Config'; }, 1600);
      document.dispatchEvent(new CustomEvent('gos:data', { detail: { reason: 'catalog-config' } }));
      return saved;
    });
  }

  /* --------------------------------- init --------------------------------- */

  GOS.gos = {
    boot: boot,
    refresh: refresh,
    context: context,
    saveExperience: saveExperience,
    addCatalogGame: addCatalogGame,
    catalogConfig: catalogConfig,
    setCatalogConfig: setCatalogConfig,
    clearExperiences: clearExperiences,
    exportData: exportData,
    importFile: importFile,
    resolveGameId: resolveGameId,
    libraryIdFor: libraryIdFor,
    setLibraryStatus: setLibraryStatus,
    renderSignalTagGroups: renderSignalTagGroups,
    resetSignalTags: resetSignalTags,
    updateStatus: updateStatus,
    buildGraph: buildGraph
  };

  if (root.document) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', function () {
        wireSettings();
        wireCatalogSettings();
        wireResets();
        wireMedia();
        boot();
      });
    } else {
      wireSettings();
      wireCatalogSettings();
      wireResets();
      wireMedia();
      boot();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
