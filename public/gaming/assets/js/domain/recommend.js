/**
 * icyNatural Game OS — explainable discovery candidates + Surprise Me.
 *
 * Every recommendation is `{ game, score, reasons[], path? }` where each
 * reason carries its own evidence (games, counts, relationship labels).
 * Nothing here says "you may like this" without showing why.
 *
 * Inputs are plain data (graph, experiences, signals→patterns, library),
 * so the engine is testable without a browser.
 */
(function (root) {
  'use strict';

  var GOS = (root.GOS = root.GOS || {});
  var L = GOS.lineage;

  var CATEGORY_WEIGHTS = {
    'franchise-lineage': 4,
    'studio-lineage': 3,
    'human-lineage': 3,
    'documented-influence': 3,
    'analogous-design': 3,
    credit: 2.5,
    affiliation: 1.5,
    'mechanical-similarity': 1.5,
    'mechanic-usage': 1,
    availability: 0.2
  };

  var PATH_EDGE_TYPES = [
    'SEQUEL_OF', 'PREQUEL_OF', 'SPINOFF_OF', 'FRANCHISE_DESCENDANT',
    'STUDIO_DESCENDANT', 'LEFT_TO_FOUND', 'FOUNDED', 'MEMBER_OF',
    'INFLUENCED_BY', 'SPIRITUAL_SUCCESSOR', 'MECHANICALLY_RELATED',
    'CREATED_BY', 'DEVELOPED_BY', 'PUBLISHED_BY', 'DIRECTED_BY',
    'DESIGNED_BY', 'WORKED_ON', 'USES_MECHANIC'
  ];

  function likedScore(experiences) {
    var list = experiences || [];
    if (!list.length) return null;
    var best = -Infinity;
    list.forEach(function (experience) {
      var score = Number(experience.score);
      if (isFinite(score) && score > best) best = score;
    });
    return best === -Infinity ? null : best;
  }

  /** Build everything the engines need from the current in-memory state. */
  function buildContext(state) {
    var graph = state.graph;
    var experiencesByGame = Object.create(null);
    (state.experiences || []).forEach(function (experience) {
      (experiencesByGame[experience.gameId] = experiencesByGame[experience.gameId] || []).push(experience);
    });

    var libraryByGame = Object.create(null);
    (state.library || []).forEach(function (entry) { libraryByGame[entry.gameId] = entry; });

    var gamesById = Object.create(null);
    (graph ? graph.nodes : []).forEach(function (node) {
      if (node.type === 'game') gamesById[node.id] = node;
    });
    (state.games || []).forEach(function (game) { gamesById[game.id] = game; });

    var userPlatforms = {};
    (state.experiences || []).forEach(function (experience) {
      if (experience.platform) userPlatforms[String(experience.platform)] = true;
    });

    var patterns = state.patterns || [];

    return {
      graph: graph,
      experiencesByGame: experiencesByGame,
      libraryByGame: libraryByGame,
      gamesById: gamesById,
      userPlatforms: userPlatforms,
      patterns: patterns,
      experiences: state.experiences || [],
      library: state.library || []
    };
  }

  function isPlayed(ctx, gameId) {
    return (ctx.experiencesByGame[gameId] || []).length > 0;
  }

  function isDropped(ctx, gameId) {
    var entry = ctx.libraryByGame[gameId];
    return !!entry && entry.status === 'dropped';
  }

  function lovedGames(ctx) {
    var out = [];
    Object.keys(ctx.experiencesByGame).forEach(function (gameId) {
      var score = likedScore(ctx.experiencesByGame[gameId]);
      var game = ctx.gamesById[gameId];
      if (!game || score === null) return;
      if (score >= 7.5) out.push({ id: gameId, game: game, score: score });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }

  /** Positive taste patterns -> mechanic names the graph can be searched with. */
  function likedMechanics(ctx) {
    var map = {};
    ctx.patterns.forEach(function (pattern) {
      if (pattern.net <= 0 || pattern.polarity === 'negative') return;
      var names = GOS.signals && GOS.signals.mechanicsFor ? GOS.signals.mechanicsFor(pattern.key) : [];
      names.forEach(function (name) {
        var key = String(name).toLowerCase();
        map[key] = map[key] || { name: name, pattern: pattern };
      });
    });
    return map;
  }

  function mechanicsOfGame(ctx, gameId) {
    var graph = ctx.graph;
    if (!graph) return [];
    var out = [];
    (graph.out[gameId] || []).forEach(function (edge) {
      if (edge.relationship_type !== 'USES_MECHANIC') return;
      var node = graph.byId[edge.target];
      if (node) out.push(node);
    });
    return out;
  }

  function studiosOfGame(ctx, gameId) {
    var graph = ctx.graph;
    if (!graph) return [];
    var out = [];
    (graph.out[gameId] || []).forEach(function (edge) {
      if (['DEVELOPED_BY', 'CREATED_BY', 'PUBLISHED_BY'].indexOf(edge.relationship_type) === -1) return;
      var node = graph.byId[edge.target];
      if (node) out.push(node);
    });
    return out;
  }

  function platformsOfGame(ctx, gameId) {
    var graph = ctx.graph;
    if (!graph) return [];
    var out = [];
    (graph.out[gameId] || []).forEach(function (edge) {
      if (edge.relationship_type !== 'AVAILABLE_ON') return;
      var node = graph.byId[edge.target];
      if (node) out.push(node);
    });
    return out;
  }

  function pathReasons(ctx, candidateId, loved, pathIndex) {
    var entry = pathIndex[candidateId];
    if (!entry) return [];
    var seed = null;
    loved.forEach(function (item) { if (item.id === entry.seedId) seed = item; });
    if (!seed) return [];

    var hops = entry.hops;
    var weight = 0;
    hops.forEach(function (hop) {
      weight += CATEGORY_WEIGHTS[hop.category] || 1;
    });
    weight = weight / Math.sqrt(hops.length);

    var evidence = [seed.game.name].concat(hops.map(function (hop) { return hop.node.name; }));
    var text;
    if (hops.length === 1) {
      var label = hops[0].label;
      text = label.charAt(0).toUpperCase() + label.slice(1) + ' ' + seed.game.name;
      if (seed.score !== null) text += ' (you rated it ' + seed.score.toFixed(1) + ')';
    } else {
      text = hops.length + ' steps from ' + seed.game.name + ' via ' +
        hops.slice(0, -1).map(function (hop) { return hop.node.name; }).join(' → ');
    }

    return [{
      code: 'lineage',
      text: text,
      weight: weight,
      evidence: evidence,
      path: [seed.id].concat(hops.map(function (hop) { return hop.node.id; }))
    }];
  }

  function buildPathIndex(ctx, loved, maxDepth) {
    var pathIndex = {};
    if (!ctx.graph || !loved.length) return pathIndex;
    var paths = L.pathsFrom(ctx.graph, loved.map(function (item) { return item.id; }), {
      depth: maxDepth || 3,
      minDepth: 1,
      maxPaths: 4000,
      edgeTypes: PATH_EDGE_TYPES,
      targetFilter: function (node) { return node.type === 'game'; }
    });
    paths.forEach(function (path) {
      var existing = pathIndex[path.targetId];
      var better = !existing ||
        path.hops.length < existing.hops.length ||
        (path.hops.length === existing.hops.length && pathSeedScore(path, loved) > pathSeedScore(existing, loved));
      if (better) pathIndex[path.targetId] = path;
    });
    return pathIndex;
  }

  function pathSeedScore(path, loved) {
    var found = 0;
    loved.forEach(function (item) { if (item.id === path.seedId) found = item.score; });
    return found;
  }

  function studioReasons(ctx, candidateId, loved) {
    var candidateStudios = studiosOfGame(ctx, candidateId);
    if (!candidateStudios.length) return [];
    var lovedStudioCount = {};
    var lovedStudioNames = {};
    loved.forEach(function (item) {
      studiosOfGame(ctx, item.id).forEach(function (studio) {
        lovedStudioCount[studio.id] = (lovedStudioCount[studio.id] || 0) + 1;
        lovedStudioNames[studio.id] = studio.name;
      });
    });
    var reasons = [];
    candidateStudios.forEach(function (studio) {
      var count = lovedStudioCount[studio.id] || 0;
      if (!count) return;
      reasons.push({
        code: 'studio',
        text: 'by ' + studio.name + ' — behind ' + count + ' game' + (count === 1 ? '' : 's') + ' you rated highly',
        weight: 2.5,
        evidence: [studio.name]
      });
    });
    return reasons;
  }

  function mechanicReasons(ctx, candidateId) {
    var liked = likedMechanics(ctx);
    if (!Object.keys(liked).length) return [];
    var reasons = [];
    mechanicsOfGame(ctx, candidateId).forEach(function (mechanic) {
      var key = String(mechanic.name).toLowerCase();
      var match = liked[key];
      if (!match) return;
      var pattern = match.pattern;
      var support = pattern.support.filter(function (entry) { return entry.polarity === 'positive'; });
      var games = GOS.util.uniq(support.map(function (entry) { return entry.gameName; }));
      var strengthPart = pattern.strength === 'strong' ? 'strong ' : '';
      reasons.push({
        code: 'mechanic',
        text: mechanic.name + ' matches ' + support.length + ' ' + strengthPart +
          'positive experience' + (support.length === 1 ? '' : 's'),
        weight: 1.5 + (pattern.strength === 'strong' ? 1.5 : pattern.strength === 'moderate' ? 0.75 : 0.25),
        evidence: games
      });
    });
    return reasons;
  }

  function platformReasons(ctx, candidateId) {
    var userPlatforms = Object.keys(ctx.userPlatforms);
    if (!userPlatforms.length) return [];
    var platforms = platformsOfGame(ctx, candidateId);
    var reasons = [];
    platforms.forEach(function (platform) {
      var hit = userPlatforms.some(function (name) {
        return String(name).toLowerCase() === String(platform.name).toLowerCase();
      });
      if (!hit) return;
      reasons.push({
        code: 'platform',
        text: 'available on ' + platform.name + ' (you play on ' + platform.name + ')',
        weight: 1.5,
        evidence: [platform.name]
      });
    });
    return reasons;
  }

  function franchiseReasons(ctx, candidateId, loved) {
    var graph = ctx.graph;
    if (!graph) return [];
    var candidateFranchises = {};
    (graph.out[candidateId] || []).forEach(function (edge) {
      if (edge.relationship_type === 'MEMBER_OF') {
        var node = graph.byId[edge.target];
        if (node && node.type === 'franchise') candidateFranchises[node.id] = node.name;
      }
    });
    var lovedCount = {};
    loved.forEach(function (item) {
      (graph.out[item.id] || []).forEach(function (edge) {
        if (edge.relationship_type !== 'MEMBER_OF') return;
        var node = graph.byId[edge.target];
        if (node && candidateFranchises[node.id]) lovedCount[node.id] = (lovedCount[node.id] || 0) + 1;
      });
    });
    var reasons = [];
    Object.keys(lovedCount).forEach(function (franchiseId) {
      var count = lovedCount[franchiseId];
      reasons.push({
        code: 'franchise',
        text: 'same franchise as ' + count + ' game' + (count === 1 ? '' : 's') + ' you rated highly (' + candidateFranchises[franchiseId] + ')',
        weight: 2,
        evidence: [candidateFranchises[franchiseId]]
      });
    });
    return reasons;
  }

  /**
   * Explainable discovery candidates: unplayed graph games ranked by evidence.
   */
  function candidates(state, options) {
    options = options || {};
    var limit = Number(options.limit) || 8;
    var ctx = buildContext(state);
    if (!ctx.graph) return [];

    var loved = lovedGames(ctx);
    var pathIndex = buildPathIndex(ctx, loved, 3);
    var results = [];

    Object.keys(ctx.gamesById).forEach(function (gameId) {
      if (isPlayed(ctx, gameId) && !options.includePlayed) return;
      if (isDropped(ctx, gameId)) return;

      var reasons = [];
      reasons = reasons.concat(pathReasons(ctx, gameId, loved, pathIndex));
      if (!reasons.length) reasons = reasons.concat(studioReasons(ctx, gameId, loved));
      reasons = reasons.concat(mechanicReasons(ctx, gameId));
      reasons = reasons.concat(franchiseReasons(ctx, gameId, loved));
      reasons = reasons.concat(platformReasons(ctx, gameId));

      var entry = ctx.libraryByGame[gameId];
      if (!entry || ['backlog', 'wishlist', 'interested', 'discovered'].indexOf(entry.status) !== -1) {
        reasons.push({
          code: 'unplayed',
          text: entry ? 'still ' + entry.status.replace('-', ' ') + ' in your library' : 'unplayed in your library',
          weight: 1,
          evidence: []
        });
      }
      if (!reasons.length) return;

      var score = reasons.reduce(function (sum, reason) { return sum + (reason.weight || 0); }, 0);
      if (score <= 1) return;

      results.push({
        gameId: gameId,
        game: ctx.gamesById[gameId],
        score: Math.round(score * 10) / 10,
        reasons: reasons.sort(function (a, b) { return b.weight - a.weight; }),
        path: (pathIndex[gameId] ? [pathIndex[gameId].seedId].concat(pathIndex[gameId].hops.map(function (hop) { return hop.node.id; })) : null),
        lovedSeed: pathIndex[gameId] ? pathIndex[gameId].seedId : null
      });
    });

    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, limit);
  }

  /**
   * Surprise Me From My History.
   * Walks 1-3 hops out of positively reviewed games and returns the PATH
   * together with the reasons. Dropped games are skipped; unplayed wins.
   */
  function surprise(state, options) {
    options = options || {};
    var limit = Number(options.limit) || 3;
    var ctx = buildContext(state);
    if (!ctx.graph) return { items: [], seeds: [], note: 'No graph loaded.' };

    var loved = lovedGames(ctx);
    if (!loved.length) {
      return {
        items: [],
        seeds: [],
        note: 'Log a strongly rated experience first — Surprise Me walks outward from games you enjoyed.'
      };
    }

    var seedPool = loved.slice(0, 6);
    var pickIndex = Number(options.pick) || 0;
    var seeds = [seedPool[pickIndex % seedPool.length]];
    if (seedPool.length > 1) seeds.push(seedPool[(pickIndex + 1) % seedPool.length]);

    var liked = likedMechanics(ctx);
    var paths = L.pathsFrom(ctx.graph, seeds.map(function (seed) { return seed.id; }), {
      depth: 3,
      minDepth: 1,
      maxPaths: 3000,
      edgeTypes: PATH_EDGE_TYPES,
      targetFilter: function (node) {
        if (node.type !== 'game') return false;
        if (isPlayed(ctx, node.id)) return false;
        if (isDropped(ctx, node.id)) return false;
        return true;
      }
    });

    var bestByTarget = {};
    paths.forEach(function (path) {
      var current = bestByTarget[path.targetId];
      if (!current || pathScore(path, ctx, liked) > pathScore(current, ctx, liked)) {
        bestByTarget[path.targetId] = path;
      }
    });

    var items = Object.keys(bestByTarget).map(function (targetId) {
      var path = bestByTarget[targetId];
      var reasons = [];
      var viaText = path.hops.map(function (hop) { return hop.label + ' ' + hop.node.name; }).join(' → ');
      reasons.push({
        code: 'path',
        text: 'path from ' + pathSeedName(path, loved) + ': ' + viaText,
        weight: pathScore(path, ctx, liked),
        evidence: [pathSeedName(path, loved)].concat(path.hops.map(function (hop) { return hop.node.name; }))
      });
      mechanicsOfGame(ctx, targetId).forEach(function (mechanic) {
        var key = String(mechanic.name).toLowerCase();
        if (!liked[key]) return;
        reasons.push({
          code: 'mechanic',
          text: 'shares ' + mechanic.name + ' — a mechanic behind your positive patterns',
          weight: 1.5,
          evidence: [mechanic.name, liked[key].pattern.label]
        });
      });
      platformReasons(ctx, targetId).forEach(function (reason) { reasons.push(reason); });

      return {
        gameId: targetId,
        game: ctx.gamesById[targetId],
        score: Math.round(pathScore(path, ctx, liked) * 10) / 10,
        reasons: reasons,
        path: [path.seedId].concat(path.hops.map(function (hop) { return hop.node.id; })),
        depth: path.hops.length
      };
    });

    items.sort(function (a, b) { return b.score - a.score; });

    return {
      items: items.slice(0, limit),
      seeds: seeds.map(function (seed) { return { id: seed.id, name: seed.game.name, score: seed.score }; }),
      note: null
    };
  }

  function pathSeedName(path, loved) {
    var name = path.seedId;
    loved.forEach(function (item) { if (item.id === path.seedId) name = item.game.name; });
    return name;
  }

  function pathScore(path, ctx, likedMechanicsMap) {
    var score = 0;
    path.hops.forEach(function (hop) {
      score += CATEGORY_WEIGHTS[hop.category] || 1;
    });
    score = score / Math.sqrt(path.hops.length);
    var target = ctx.gamesById[path.targetId];
    if (target) {
      mechanicsOfGame(ctx, path.targetId).forEach(function (mechanic) {
        if (likedMechanicsMap[String(mechanic.name).toLowerCase()]) score += 1.5;
      });
      if (platformReasons(ctx, path.targetId).length) score += 0.75;
    }
    if (path.hops.length >= 2 && path.hops.length <= 3) score += 1; // novelty: a new branch
    return score;
  }

  GOS.recommend = {
    buildContext: buildContext,
    lovedGames: lovedGames,
    likedMechanics: likedMechanics,
    mechanicsOfGame: mechanicsOfGame,
    studiosOfGame: studiosOfGame,
    platformsOfGame: platformsOfGame,
    candidates: candidates,
    surprise: surprise,
    PATH_EDGE_TYPES: PATH_EDGE_TYPES,
    CATEGORY_WEIGHTS: CATEGORY_WEIGHTS
  };
})(typeof window !== 'undefined' ? window : globalThis);
