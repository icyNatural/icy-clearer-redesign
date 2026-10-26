/**
 * icyNatural Game OS — lineage / discovery graph.
 *
 * Input: a shared-schema `BranchGraph` (branch-schema Stage 1): nodes with
 * `id/type/name/aliases/metadata`, edges with
 * `source/target/relationship_type/confidence_band/evidence/review_status`.
 *
 * Design rules:
 *   - FIRST-DEGREE by default. Outward expansion is explicit and bounded
 *     (depth cap + node budget + visited set) so cycles can never freeze it.
 *   - Indexes, not scans: byId, byKey (canonical name + alias), byType,
 *     out/in adjacency, byCategory, byMechanic, byStudio, byPerson.
 *   - Relationship semantics come from the shared vocabulary artifact
 *     (`GOS_VOCAB`), never hardcoded in UI logic.
 *   - Mechanical similarity is NEVER reported as lineage: grouping and
 *     descendant queries read `lineage`/`category` from the vocabulary.
 */
(function (root) {
  'use strict';

  var GOS = (root.GOS = root.GOS || {});
  var U = GOS.util || {};

  var MAX_DEPTH = 3;
  var DEFAULT_NODE_BUDGET = 400;

  function normalizeKey(value) {
    return U && U.normalizeKey ? U.normalizeKey(value) : String(value || '').toLowerCase().trim();
  }

  function vocab() {
    return root.GOS_VOCAB || null;
  }

  /** Semantics for a relationship type, with a safe fallback if the artifact is missing. */
  function semantics(type) {
    var table = vocab();
    if (!table) return null;
    for (var i = 0; i < table.relationships.length; i++) {
      if (table.relationships[i].type === type) return table.relationships[i];
    }
    return null;
  }

  function categoryOf(type) {
    var s = semantics(type);
    return s ? s.category : 'unknown';
  }

  function isLineage(type) {
    var s = semantics(type);
    return !!(s && s.lineage);
  }

  /** Label for an edge as seen from `viewerId` (handles direction). */
  function labelFor(edge, viewerId) {
    var s = semantics(edge.relationship_type);
    if (!s) return edge.relationship_type;
    var fromViewer = edge.source === viewerId;
    if (s.directed && !fromViewer) return s.inverseLabel;
    return s.label;
  }

  /* ------------------------------- building -------------------------------- */

  function buildGraph(seedGraph, userGraph) {
    var nodes = [];
    var edges = [];
    var byId = Object.create(null);
    var byKey = Object.create(null);
    var byType = Object.create(null);
    var out = Object.create(null);
    var inc = Object.create(null);
    var byCategory = Object.create(null);
    var byMechanic = Object.create(null);   // normalized mechanic name -> [gameId]
    var byStudio = Object.create(null);     // studio id -> [gameId]
    var byPerson = Object.create(null);     // person id -> [gameId]
    var byFranchise = Object.create(null);  // franchise id -> [gameId]
    var byPlatform = Object.create(null);   // platform id -> [gameId]

    function addNode(node) {
      if (!node || typeof node.id !== 'string') return;
      if (byId[node.id]) return;
      nodes.push(node);
      byId[node.id] = node;
      var keys = [node.name].concat(Array.isArray(node.aliases) ? node.aliases : []);
      keys.forEach(function (key) {
        var normalized = normalizeKey(key);
        if (normalized && !byKey[normalized]) byKey[normalized] = node;
      });
      (byType[node.type] = byType[node.type] || []).push(node.id);
    }

    function addEdge(edge) {
      if (!edge || typeof edge.source !== 'string' || typeof edge.target !== 'string') return;
      if (!edge.relationship_type) return;
      if (!edge.id) edge.id = 'auto:' + edge.source + '>' + edge.target + ':' + edge.relationship_type;
      if (byId[edge.source] === undefined || byId[edge.target] === undefined) return; // dangling
      edges.push(edge);
      (out[edge.source] = out[edge.source] || []).push(edge);
      (inc[edge.target] = inc[edge.target] || []).push(edge);
      var category = categoryOf(edge.relationship_type);
      (byCategory[category] = byCategory[category] || []).push(edge);

      var source = byId[edge.source];
      var target = byId[edge.target];
      if (source.type === 'game' && target.type === 'mechanic') {
        (byMechanic[normalizeKey(target.name)] = byMechanic[normalizeKey(target.name)] || []).push(source.id);
        (byMechanic[target.id] = byMechanic[target.id] || []).push(source.id);
      } else if (target.type === 'game' && source.type === 'mechanic') {
        (byMechanic[normalizeKey(source.name)] = byMechanic[normalizeKey(source.name)] || []).push(target.id);
        (byMechanic[source.id] = byMechanic[source.id] || []).push(target.id);
      }
      if (source.type === 'game' && target.type === 'studio') {
        (byStudio[target.id] = byStudio[target.id] || []).push(source.id);
      }
      if (source.type === 'person' && target.type === 'game') {
        (byPerson[source.id] = byPerson[source.id] || []).push(target.id);
      }
      if (source.type === 'game' && target.type === 'franchise') {
        (byFranchise[target.id] = byFranchise[target.id] || []).push(source.id);
      }
      if (source.type === 'game' && target.type === 'platform') {
        (byPlatform[target.id] = byPlatform[target.id] || []).push(source.id);
      }
    }

    function ingest(graph) {
      if (!graph) return;
      (graph.nodes || []).forEach(addNode);
      (graph.edges || []).forEach(addEdge);
    }

    ingest(seedGraph);
    ingest(userGraph);

    var graph = {
      nodes: nodes,
      edges: edges,
      byId: byId,
      byKey: byKey,
      byType: byType,
      out: out,
      in: inc,
      byCategory: byCategory,
      byMechanic: byMechanic,
      byStudio: byStudio,
      byPerson: byPerson,
      byFranchise: byFranchise,
      byPlatform: byPlatform,
      stats: {
        nodes: nodes.length,
        edges: edges.length
      }
    };
    return graph;
  }

  /* --------------------------------- lookup -------------------------------- */

  function resolve(graph, idOrQuery) {
    if (!idOrQuery) return null;
    if (graph.byId[idOrQuery]) return graph.byId[idOrQuery];
    var key = normalizeKey(idOrQuery);
    return graph.byKey[key] || null;
  }

  function search(graph, query, limit) {
    if (GOS.catalog && GOS.catalog.localSearch) {
      return GOS.catalog.localSearch(graph.nodes, query, limit || 20);
    }
    var key = normalizeKey(query);
    if (!key) return [];
    limit = limit || 20;
    var startsWith = [];
    var contains = [];
    var seen = Object.create(null);

    Object.keys(graph.byKey).forEach(function (candidate) {
      if (seen[candidate]) return;
      var node = graph.byKey[candidate];
      if (seen[node.id]) return;
      if (candidate === key || candidate.indexOf(key) === 0) {
        startsWith.push(node);
        seen[node.id] = true;
      } else if (candidate.indexOf(key) !== -1) {
        contains.push(node);
        seen[node.id] = true;
      }
    });

    function typeRank(node) {
      var order = { game: 0, franchise: 1, studio: 2, person: 3, mechanic: 4, platform: 5 };
      return order[node.type] === undefined ? 9 : order[node.type];
    }

    var results = startsWith.concat(contains);
    results.sort(function (a, b) {
      var rank = typeRank(a) - typeRank(b);
      if (rank !== 0) return rank;
      return a.name.localeCompare(b.name);
    });
    return results.slice(0, limit);
  }

  function edgesOf(graph, id) {
    return (graph.out[id] || []).concat(graph.in[id] || []);
  }

  function otherEnd(edge, id) {
    return edge.source === id ? edge.target : edge.source;
  }

  /* -------------------------------- filters -------------------------------- */

  var LIBRARY_STATUSES = [
    'discovered', 'interested', 'wishlist', 'backlog', 'installed', 'playing',
    'paused', 'completed', 'dropped', 'returned', 'replaying'
  ];

  function hasGameContentFilter(filters) {
    if (!filters) return false;
    return !!(
      filters.playability === 'current' ||
      (filters.modes && filters.modes.length) ||
      filters.yearFrom || filters.yearTo ||
      (filters.platforms && filters.platforms.length) ||
      filters.mechanic ||
      filters.person || filters.studio || filters.franchise ||
      (filters.libraryStatus && filters.libraryStatus.length) ||
      (filters.played && filters.played !== 'any')
    );
  }

  function edgePasses(edge, filters) {
    if (!filters || !filters.lineageTypes || !filters.lineageTypes.length) return true;
    return filters.lineageTypes.indexOf(categoryOf(edge.relationship_type)) !== -1;
  }

  function gamePasses(game, filters, ctx) {
    var meta = game.metadata || {};
    if (filters.playability === 'current' && meta.playability !== 'current') return false;

    if (filters.modes && filters.modes.length) {
      var modes = meta.modes || [];
      var hit = filters.modes.some(function (mode) { return modes.indexOf(mode) !== -1; });
      if (!hit) return false;
    }

    if (filters.yearFrom || filters.yearTo) {
      var year = Number(meta.year);
      if (!isFinite(year)) return false;
      if (filters.yearFrom && year < Number(filters.yearFrom)) return false;
      if (filters.yearTo && year > Number(filters.yearTo)) return false;
    }

    if (filters.played === 'played' && !libraryEntry(ctx, game)) return false;
    if (filters.played === 'unplayed' && libraryEntry(ctx, game)) return false;
    if (filters.libraryStatus && filters.libraryStatus.length) {
      var entry = libraryEntry(ctx, game);
      if (!entry || filters.libraryStatus.indexOf(entry.status) === -1) return false;
    }

    // Relationship filters narrow to games that actually connect to the target.
    if (filters.mechanic && !relatedTo(game.id, 'mechanic', filters.mechanic, ctx)) return false;
    if (filters.person && !relatedTo(game.id, 'person', filters.person, ctx)) return false;
    if (filters.studio && !relatedTo(game.id, 'studio', filters.studio, ctx)) return false;
    if (filters.franchise && !relatedTo(game.id, 'franchise', filters.franchise, ctx)) return false;
    if (filters.platforms && filters.platforms.length) {
      var onPlatform = filters.platforms.some(function (platform) {
        return relatedTo(game.id, 'platform', platform, ctx);
      });
      if (!onPlatform) return false;
    }
    return true;
  }

  function libraryEntry(ctx, game) {
    if (!ctx || !ctx.libraryByGame) return null;
    return ctx.libraryByGame[game.id] || null;
  }

  /** Does `gameId` connect to an entity of `type` identified by `value` (id, name or alias)? */
  function relatedTo(gameId, type, value, ctx) {
    if (!ctx || !ctx.graph) return true; // no graph context — cannot evaluate, keep the row
    var graph = ctx.graph;
    var wanted = graph.byId[value] || graph.byKey[normalizeKey(value)] || null;
    if (wanted && wanted.type !== type) wanted = null;
    var list = edgesOf(graph, gameId);
    for (var i = 0; i < list.length; i++) {
      var other = graph.byId[otherEnd(list[i], gameId)];
      if (!other || other.type !== type) continue;
      if (!wanted) {
        if (normalizeKey(other.name) === normalizeKey(value) || other.id === value) return true;
      } else if (other.id === wanted.id) {
        return true;
      }
    }
    return false;
  }

  /**
   * Decide whether an entity should be shown for the current filter set.
   * `ctx` supplies `{ graph, libraryByGame }` so relationship filters can be
   * evaluated against the graph instead of being ignored.
   */
  function entityPasses(node, filters, ctx) {
    if (!filters) return true;
    var contentFilter = hasGameContentFilter(filters);

    if (node.type === 'game') return gamePasses(node, filters, ctx || {});

    if (node.type === 'mechanic') {
      if (filters.mechanic) {
        return normalizeKey(node.name) === normalizeKey(filters.mechanic) || node.id === filters.mechanic;
      }
      return !contentFilter;
    }
    if (node.type === 'platform') {
      if (filters.platforms && filters.platforms.length) {
        return filters.platforms.some(function (platform) {
          return normalizeKey(platform) === normalizeKey(node.name) || platform === node.id;
        });
      }
      return !contentFilter;
    }
    if (node.type === 'person') {
      return filters.person ? filters.person === node.id : !contentFilter;
    }
    if (node.type === 'studio') {
      return filters.studio ? filters.studio === node.id : !contentFilter;
    }
    if (node.type === 'franchise') {
      return filters.franchise ? filters.franchise === node.id : !contentFilter;
    }
    return true;
  }

  /* ---------------------------- first degree ------------------------------- */

  /**
   * First-degree branches of one entity, grouped by relationship category.
   * Returns `{ node, groups, skipped }` — `skipped` lists edges whose endpoint
   * is missing (safe fallback: never rendered as clickable).
   */
  function firstDegree(graph, id, options) {
    options = options || {};
    var filters = options.filters || null;
    var ctx = options.context || {};
    var node = graph.byId[id];
    if (!node) return null;

    var categories = vocab() ? vocab().relationshipCategories : [];
    var labels = vocab() ? vocab().relationshipCategoryLabels : {};
    var groups = {};
    var skipped = [];

    edgesOf(graph, id).forEach(function (edge) {
      if (!edgePasses(edge, filters)) return;
      var otherId = otherEnd(edge, id);
      var other = graph.byId[otherId];
      if (!other) {
        skipped.push({ edge: edge, reason: 'missing-entity', missingId: otherId });
        return;
      }
      if (!entityPasses(other, filters, ctx)) return;
      var reverse = edge.target === id;
      var entry = {
        edge: edge,
        node: other,
        reverse: reverse,
        label: labelFor(edge, id),
        category: categoryOf(edge.relationship_type),
        lineage: isLineage(edge.relationship_type)
      };
      var key = entry.category;
      (groups[key] = groups[key] || []).push(entry);
    });

    var order = categories.concat(Object.keys(groups).filter(function (key) {
      return categories.indexOf(key) === -1;
    }));

    var groupList = order.filter(function (key) { return groups[key] && groups[key].length; })
      .map(function (key) {
        groups[key].sort(function (a, b) { return a.node.name.localeCompare(b.node.name); });
        return {
          category: key,
          label: labels[key] || key,
          items: groups[key]
        };
      });

    return { node: node, groups: groupList, skipped: skipped };
  }

  /* --------------------------- bounded expansion --------------------------- */

  /**
   * BFS expansion from a set of roots. Depth is capped (default 1 = first
   * degree), a node budget stops runaway walks, and `visited` breaks cycles.
   */
  function expand(graph, rootIds, options) {
    options = options || {};
    var depth = Math.max(1, Math.min(MAX_DEPTH, Number(options.depth) || 1));
    var budget = Number(options.nodeBudget) || DEFAULT_NODE_BUDGET;
    var filters = options.filters || null;
    var ctx = options.context || {};
    var edgeTypes = options.edgeTypes || null;

    var visited = Object.create(null);
    var resultNodes = [];
    var resultEdges = [];
    var frontier = [];

    (rootIds || []).forEach(function (id) {
      if (!graph.byId[id] || visited[id]) return;
      visited[id] = true;
      resultNodes.push(graph.byId[id]);
      frontier.push({ id: id, depth: 0 });
    });

    var truncated = false;
    var pathOf = Object.create(null);
    frontier.forEach(function (entry) { pathOf[entry.id] = [entry.id]; });

    while (frontier.length) {
      var current = frontier.shift();
      if (current.depth >= depth) continue;
      var list = edgesOf(graph, current.id);
      for (var i = 0; i < list.length; i++) {
        var edge = list[i];
        if (edgeTypes && edgeTypes.indexOf(edge.relationship_type) === -1) continue;
        if (!edgePasses(edge, filters)) continue;
        var otherId = otherEnd(edge, current.id);
        var other = graph.byId[otherId];
        if (!other) continue;
        if (!entityPasses(other, filters, ctx)) continue;

        if (resultEdges.indexOf(edge) === -1) resultEdges.push(edge);

        if (visited[otherId]) continue;
        if (resultNodes.length >= budget) { truncated = true; break; }

        visited[otherId] = true;
        resultNodes.push(other);
        pathOf[otherId] = (pathOf[current.id] || []).concat([otherId]);
        frontier.push({ id: otherId, depth: current.depth + 1 });
      }
      if (truncated) break;
    }

    return {
      nodes: resultNodes,
      edges: resultEdges,
      rootIds: rootIds || [],
      depth: depth,
      truncated: truncated,
      paths: pathOf
    };
  }

  /* --------------------------------- paths --------------------------------- */

  /**
   * Walk outward from seed entities and return candidate paths:
   * `[{ seedId, targetId, hops: [{ edge, node, label, category }], depth }]`.
   * Used by Surprise Me and by recommendation lineage reasons.
   */
  function pathsFrom(graph, seedIds, options) {
    options = options || {};
    var depth = Math.max(1, Math.min(MAX_DEPTH, Number(options.depth) || 2));
    var edgeTypes = options.edgeTypes || null;
    var maxPaths = Number(options.maxPaths) || 400;
    var minDepth = Number(options.minDepth) || 1;
    var visitedSeeds = Object.create(null);
    (seedIds || []).forEach(function (id) { visitedSeeds[id] = true; });

    var found = [];
    var queue = (seedIds || []).map(function (id) {
      return { id: id, seedId: id, hops: [], seen: Object.create(null) };
    });
    queue.forEach(function (entry) { entry.seen[entry.id] = true; });

    while (queue.length && found.length < maxPaths) {
      var current = queue.shift();
      if (current.hops.length >= depth) continue;
      var list = edgesOf(graph, current.id);
      for (var i = 0; i < list.length; i++) {
        var edge = list[i];
        if (edgeTypes && edgeTypes.indexOf(edge.relationship_type) === -1) continue;
        var otherId = otherEnd(edge, current.id);
        var other = graph.byId[otherId];
        if (!other) continue;
        if (current.seen[otherId]) continue;
        if (options.targetFilter && !options.targetFilter(other)) continue;

        var hop = {
          edge: edge,
          nodeId: otherId,
          node: other,
          label: labelFor(edge, current.id),
          category: categoryOf(edge.relationship_type)
        };
        var hops = current.hops.concat([hop]);
        var isSeed = !!visitedSeeds[otherId];

        if (!isSeed && hops.length >= minDepth && (!options.targetFilter || options.targetFilter(other))) {
          found.push({ seedId: current.seedId, targetId: otherId, hops: hops, depth: hops.length });
        }

        if (hops.length < depth) {
          var seen = Object.create(null);
          Object.keys(current.seen).forEach(function (key) { seen[key] = true; });
          seen[otherId] = true;
          queue.push({ id: otherId, seedId: current.seedId, hops: hops, seen: seen });
        }
        if (found.length >= maxPaths) break;
      }
    }
    return found;
  }

  /** Shortest undirected path between two entities (bounded). */
  function pathBetween(graph, fromId, toId, options) {
    options = options || {};
    var depth = Math.max(1, Math.min(MAX_DEPTH + 1, Number(options.depth) || 3));
    if (!graph.byId[fromId] || !graph.byId[toId]) return null;
    var visited = Object.create(null);
    var queue = [{ id: fromId, hops: [] }];
    visited[fromId] = true;
    while (queue.length) {
      var current = queue.shift();
      if (current.id === toId) return current.hops;
      if (current.hops.length >= depth) continue;
      var list = edgesOf(graph, current.id);
      for (var i = 0; i < list.length; i++) {
        var edge = list[i];
        if (options.edgeTypes && options.edgeTypes.indexOf(edge.relationship_type) === -1) continue;
        var otherId = otherEnd(edge, current.id);
        if (visited[otherId] || !graph.byId[otherId]) continue;
        visited[otherId] = true;
        queue.push({
          id: otherId,
          hops: current.hops.concat([{ edge: edge, nodeId: otherId, node: graph.byId[otherId], label: labelFor(edge, current.id), category: categoryOf(edge.relationship_type) }])
        });
      }
    }
    return null;
  }

  GOS.lineage = {
    MAX_DEPTH: MAX_DEPTH,
    LIBRARY_STATUSES: LIBRARY_STATUSES,
    semantics: semantics,
    categoryOf: categoryOf,
    isLineage: isLineage,
    labelFor: labelFor,
    buildGraph: buildGraph,
    resolve: resolve,
    search: search,
    edgesOf: edgesOf,
    otherEnd: otherEnd,
    hasGameContentFilter: hasGameContentFilter,
    edgePasses: edgePasses,
    entityPasses: entityPasses,
    firstDegree: firstDegree,
    expand: expand,
    pathsFrom: pathsFrom,
    pathBetween: pathBetween
  };
})(typeof window !== 'undefined' ? window : globalThis);
