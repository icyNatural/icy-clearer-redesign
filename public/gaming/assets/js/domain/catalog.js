/**
 * Game OS catalog adapter: fuzzy local search, RAWG normalization and dedupe.
 * Network configuration is runtime-only. API credentials are never persisted.
 */
(function (root) {
  'use strict';

  var GOS = (root.GOS = root.GOS || {});
  var U = GOS.util || {};
  var DEFAULT_ENDPOINT = 'https://api.rawg.io/api/games';

  function key(value) { return U.normalizeKey ? U.normalizeKey(value) : String(value || '').toLowerCase().trim(); }
  function compact(value) { return key(value).replace(/\s+/g, ''); }

  /**
   * Query/value tokens shorter than MIN_TOKEN_LENGTH are ignored: single/double
   * letter fragments ("a", "of", "to") match almost every name and turn fuzzy
   * search into a phantom-result generator.
   */
  var MIN_TOKEN_LENGTH = 3;
  /** Whole queries shorter than this are noise, not intent. */
  var MIN_QUERY_LENGTH = 2;

  function tokens(value) {
    return key(value).split(' ').filter(function (token) { return token.length >= MIN_TOKEN_LENGTH; });
  }

  function distance(a, b) {
    a = compact(a); b = compact(b);
    if (!a) return b.length;
    if (!b) return a.length;
    var prev = [];
    for (var j = 0; j <= b.length; j++) prev[j] = j;
    for (var i = 1; i <= a.length; i++) {
      var next = [i];
      for (j = 1; j <= b.length; j++) {
        next[j] = Math.min(next[j - 1] + 1, prev[j] + 1,
          prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      }
      prev = next;
    }
    return prev[b.length];
  }

  function scoreText(query, value) {
    var q = key(query); var v = key(value);
    if (!q || !v) return 0;
    // Below MIN_QUERY_LENGTH a query is pure noise: "a" prefixes half the
    // catalog and "of" appears in every third name.
    if (compact(q).length < MIN_QUERY_LENGTH) return 0;
    if (q === v) return 120;
    if (v.indexOf(q) === 0) return 100 - Math.min(20, v.length - q.length);
    if (v.indexOf(q) !== -1) return 82 - Math.min(20, v.indexOf(q));
    var qTokens = tokens(q); var vTokens = tokens(v);
    var tokenHits = qTokens.filter(function (token) {
      return vTokens.some(function (candidate) { return candidate.indexOf(token) === 0 || token.indexOf(candidate) === 0; });
    }).length;
    var edit = distance(q, v);
    // Tolerance is anchored to the SHORTER side so a long value can never
    // "absorb" a short, unrelated query through a generous edit budget.
    var anchor = Math.min(compact(q).length, compact(v).length);
    var tolerance = Math.max(2, Math.floor(anchor * 0.3));
    if (edit <= tolerance) return 70 - edit * 5;
    if (tokenHits) return 48 + tokenHits * 7;
    return 0;
  }

  function searchableValues(game) {
    var metadata = game.metadata || {};
    return [game.name]
      .concat(game.aliases || [])
      .concat(metadata.franchises || [])
      .concat(metadata.developers || [])
      .filter(Boolean);
  }

  function localSearch(games, query, limit) {
    var seen = Object.create(null);
    var rows = [];
    (games || []).forEach(function (game) {
      if (!game || !game.id || seen[game.id]) return;
      var best = 0;
      searchableValues(game).forEach(function (value) { best = Math.max(best, scoreText(query, value)); });
      if (!best) return;
      seen[game.id] = true;
      rows.push({ game: game, score: best });
    });
    rows.sort(function (a, b) { return b.score - a.score || a.game.name.localeCompare(b.game.name); });
    return rows.slice(0, limit || 20).map(function (row) { return row.game; });
  }

  function releaseStatus(released) {
    if (!released) return 'unknown';
    var time = new Date(released + 'T00:00:00Z').getTime();
    if (!isFinite(time)) return 'unknown';
    return time > Date.now() ? 'upcoming' : 'released';
  }

  function normalizeRawg(item) {
    var platforms = (item.platforms || []).map(function (row) {
      return row && row.platform ? row.platform.name : null;
    }).filter(Boolean);
    var developers = (item.developers || []).map(function (row) { return row.name; }).filter(Boolean);
    return {
      id: 'game:rawg:' + String(item.id),
      type: 'game',
      name: item.name || 'Untitled game',
      aliases: [],
      metadata: {
        year: item.released ? Number(String(item.released).slice(0, 4)) || null : null,
        released: item.released || null,
        releaseStatus: releaseStatus(item.released),
        platforms: platforms,
        developers: developers,
        cover: item.background_image || null,
        rawgSlug: item.slug || null,
        source: 'rawg',
        sourceUrl: item.slug ? 'https://rawg.io/games/' + item.slug : 'https://rawg.io/'
      },
      externalIds: { rawg: String(item.id) },
      catalogSource: 'rawg'
    };
  }

  function canonicalMatch(games, candidate) {
    var rawgId = candidate.externalIds && candidate.externalIds.rawg;
    var candidateKeys = [candidate.name].concat(candidate.aliases || []).map(key);
    for (var i = 0; i < (games || []).length; i++) {
      var game = games[i];
      if (rawgId && game.externalIds && String(game.externalIds.rawg) === String(rawgId)) return game;
      var keys = [game.name].concat(game.aliases || []).map(key);
      if (candidateKeys.some(function (candidateKey) { return candidateKey && keys.indexOf(candidateKey) !== -1; })) return game;
    }
    return null;
  }

  function dedupe(games) {
    var out = [];
    (games || []).forEach(function (game) {
      if (!canonicalMatch(out, game)) out.push(game);
    });
    return out;
  }

  function cacheId(query) { return 'catalog:rawg:search:' + key(query); }

  /** Cached search results expire — the catalog is a cache, never the source of truth. */
  var CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  function cacheRecord(query, games, now) {
    return {
      id: cacheId(query),
      query: String(query || ''),
      games: (games || []).slice(),
      cached_at: new Date(now === undefined ? Date.now() : now).toISOString()
    };
  }

  function isCacheFresh(record, ttlMs, now) {
    if (!record || !record.games || !record.cached_at) return false;
    var time = new Date(record.cached_at).getTime();
    if (!isFinite(time)) return false;
    var age = (now === undefined ? Date.now() : now) - time;
    return age >= 0 && age < (ttlMs || CACHE_TTL_MS);
  }

  /**
   * Local-first cache reads/writes against the store's `catalogCache`
   * collection. The cache is never exported and a storage failure never
   * breaks search — it only means a round-trip to the network later.
   */
  function readCache(store, query, options) {
    options = options || {};
    if (!store || typeof store.get !== 'function') return Promise.resolve(null);
    return store.get('catalogCache', cacheId(query)).then(function (record) {
      return isCacheFresh(record, options.ttlMs, options.now) ? record : null;
    }).catch(function () { return null; });
  }

  function writeCache(store, query, games, options) {
    options = options || {};
    if (!store || typeof store.put !== 'function') return Promise.resolve(null);
    return store.put('catalogCache', cacheRecord(query, games, options.now))
      .catch(function () { return null; });
  }

  /** Endpoint resolution: proxy URL wins; RAWG key stays session-only. */
  function resolveEndpoint(options) {
    options = options || {};
    var proxy = String(options.proxyUrl || '').trim();
    if (proxy) return proxy;
    return options.endpoint || DEFAULT_ENDPOINT;
  }

  function searchRawg(query, options) {
    options = options || {};
    var url = new URL(resolveEndpoint(options), root.location && root.location.href ? root.location.href : undefined);
    url.searchParams.set('search', query);
    url.searchParams.set('page_size', String(options.limit || 12));
    // A key is only sent for the official RAWG endpoint — never to a proxy.
    if (options.key && url.toString().indexOf(DEFAULT_ENDPOINT) === 0) {
      url.searchParams.set('key', options.key);
    }

    var controller = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    var timer = null;
    if (controller && options.timeoutMs) {
      timer = setTimeout(function () { controller.abort(); }, options.timeoutMs);
    }

    return root.fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      if (!response.ok) throw new Error('Catalog request failed (' + response.status + ').');
      return response.json();
    }).then(function (payload) {
      return (payload.results || payload.games || []).map(normalizeRawg);
    }).finally(function () {
      if (timer) clearTimeout(timer);
    });
  }

  GOS.catalog = {
    DEFAULT_ENDPOINT: DEFAULT_ENDPOINT,
    CACHE_TTL_MS: CACHE_TTL_MS,
    MIN_TOKEN_LENGTH: MIN_TOKEN_LENGTH,
    MIN_QUERY_LENGTH: MIN_QUERY_LENGTH,
    scoreText: scoreText,
    localSearch: localSearch,
    normalizeRawg: normalizeRawg,
    canonicalMatch: canonicalMatch,
    dedupe: dedupe,
    cacheId: cacheId,
    cacheRecord: cacheRecord,
    isCacheFresh: isCacheFresh,
    readCache: readCache,
    writeCache: writeCache,
    resolveEndpoint: resolveEndpoint,
    searchRawg: searchRawg,
    releaseStatus: releaseStatus
  };
})(typeof window !== 'undefined' ? window : globalThis);