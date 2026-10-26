/**
 * Game OS Experience Glyph engine.
 * Fixed-scale nine-axis radar geometry, aggregation and measured vector similarity.
 * Every glyph shares one 0–10 scale: 0 at the centre, 10 at the outer ring.
 */
(function (root) {
  'use strict';

  var GOS = (root.GOS = root.GOS || {});
  var DIMENSIONS = [
    { key: 'control', label: 'Control' },
    { key: 'clarity', label: 'Clarity' },
    { key: 'freedom', label: 'Freedom' },
    { key: 'expression', label: 'Expression' },
    { key: 'engagement', label: 'Engagement' },
    { key: 'depth', label: 'Depth' },
    { key: 'flow', label: 'Flow' },
    { key: 'intensity', label: 'Intensity' },
    { key: 'replay', label: 'Replay Pull' }
  ];
  /* Fixed radar scale shared by every glyph. Scores are 0–10; 0 sits at the
     centre, 10 touches the outer ring. Nothing is normalised per glyph. */
  var RADAR = {
    center: 100,
    outerRadius: 84,
    labelRadius: 97,
    ringScores: [2, 4, 6, 8, 10],
    scaleMin: 0,
    scaleMax: 10
  };
  var MIN_EVIDENCE = 1;
  var POSITIVE_EXPERIENCE_THRESHOLD = 7.5;
  var MIN_PREFERENCE_GAMES = 2;
  var DIRECTION_LABELS = [
    '12 o’clock · up',
    '1–2 o’clock · upper right',
    '2–3 o’clock · right',
    '4 o’clock · lower right',
    '5–6 o’clock · lower right',
    '6–7 o’clock · lower left',
    '8 o’clock · lower left',
    '9–10 o’clock · left',
    '10–11 o’clock · upper left'
  ];
  var DIMENSION_LANGUAGE = {
    control: { high: 'responsive, dependable control', low: 'less emphasis on immediate control response' },
    clarity: { high: 'clear goals, feedback, or readable systems', low: 'more ambiguity or less readable feedback' },
    freedom: { high: 'room to choose routes, approaches, or priorities', low: 'a more directed or constrained structure' },
    expression: { high: 'meaningful room to play in your own way', low: 'fewer opportunities for personal play expression' },
    engagement: { high: 'sustained attention and involvement', low: 'less consistent involvement' },
    depth: { high: 'systems or decisions that reward learning', low: 'less mechanical or strategic depth' },
    flow: { high: 'smooth pacing and low interruption', low: 'more interruption or uneven pacing' },
    intensity: { high: 'dense pressure, activity, or stimulation', low: 'a calmer, lower-pressure experience' },
    replay: { high: 'reasons to return after the first experience', low: 'less pull to revisit' }
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value, places) {
    var power = Math.pow(10, places === undefined ? 3 : places);
    return Math.round(value * power) / power;
  }

  function normalizeScores(scores, missingValue) {
    scores = scores || {};
    var values = {};
    var missing = [];
    DIMENSIONS.forEach(function (dimension) {
      var raw = scores[dimension.key];
      var numeric = raw === '' || raw === null || raw === undefined ? NaN : Number(raw);
      if (!isFinite(numeric)) {
        values[dimension.key] = missingValue === undefined ? 5 : missingValue;
        missing.push(dimension.key);
      } else {
        values[dimension.key] = round(clamp(numeric, 1, 10), 3);
      }
    });
    return { values: values, missing: missing, complete: missing.length === 0 };
  }

  function vector(scores, missingValue) {
    var normalized = normalizeScores(scores, missingValue);
    return DIMENSIONS.map(function (dimension) { return normalized.values[dimension.key]; });
  }

  function average(scores) {
    var values = vector(scores, 5);
    return round(values.reduce(function (sum, value) { return sum + value; }, 0) / values.length, 1);
  }

  function point(index, value) {
    var count = DIMENSIONS.length;
    var angle = (-Math.PI / 2) + (Math.PI * 2 * index / count);
    var ratio = clamp((Number(value) - RADAR.scaleMin) / (RADAR.scaleMax - RADAR.scaleMin), 0, 1);
    var radius = round(RADAR.outerRadius * ratio, 3);
    return {
      x: round(RADAR.center + Math.cos(angle) * radius, 3),
      y: round(RADAR.center + Math.sin(angle) * radius, 3),
      angle: round(angle, 6),
      radius: radius
    };
  }

  function ringPoints(radius, center) {
    return DIMENSIONS.map(function (_, index) {
      var angle = (-Math.PI / 2) + (Math.PI * 2 * index / DIMENSIONS.length);
      return round(center + Math.cos(angle) * radius, 3) + ',' + round(center + Math.sin(angle) * radius, 3);
    }).join(' ');
  }

  function polarPoint(angle, radius, center) {
    center = center === undefined ? 100 : center;
    return {
      x: round(center + Math.cos(angle) * radius, 3),
      y: round(center + Math.sin(angle) * radius, 3),
      angle: round(angle, 6),
      radius: round(radius, 3)
    };
  }

  function pointsString(points) {
    return points.map(function (item) { return item.x + ',' + item.y; }).join(' ');
  }

  function closedPath(points) {
    if (!points.length) return '';
    return 'M ' + points.map(function (item) { return item.x + ' ' + item.y; }).join(' L ') + ' Z';
  }

  function linePath(points) {
    if (!points.length) return '';
    return 'M ' + points.map(function (item) { return item.x + ' ' + item.y; }).join(' L ');
  }

  function variantFor(options) {
    var variant = options && options.variant;
    return variant === 'game' || variant === 'taste' ? variant : 'session';
  }

  var ORNAMENTS = {
    'movement-feel': 'sweep',
    'active-defense': 'shield',
    'parry-reversal': 'mirrored-cuts',
    'exploration': 'branches',
    'build-freedom': 'modules',
    'role-identity': 'identity-mark'
  };

  function ornamentMap(signals) {
    var found = {};
    (signals || []).forEach(function (signal) {
      if (!signal || !ORNAMENTS[signal.key]) return;
      var key = ORNAMENTS[signal.key];
      if (!found[key] || signal.polarity === 'negative') {
        found[key] = {
          type: key,
          signalKey: signal.key,
          polarity: signal.polarity === 'negative' ? 'negative' : 'positive'
        };
      }
    });
    return Object.keys(found).sort().map(function (key) { return found[key]; });
  }

  function geometry(scores, options) {
    options = options || {};
    var normalized = normalizeScores(scores, 5);
    var variant = variantFor(options);
    var values = DIMENSIONS.map(function (dimension) { return normalized.values[dimension.key]; });
    var mean = values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
    var deviations = values.map(function (value) { return round(value - mean, 3); });
    var center = RADAR.center;
    var points = DIMENSIONS.map(function (dimension, index) {
      var p = point(index, normalized.values[dimension.key]);
      p.key = dimension.key;
      p.label = dimension.label;
      p.value = normalized.values[dimension.key];
      return p;
    });
    var rings = RADAR.ringScores.map(function (score) {
      var radius = round(RADAR.outerRadius * (score - RADAR.scaleMin) / (RADAR.scaleMax - RADAR.scaleMin), 3);
      return {
        score: score,
        radius: radius,
        polygon: ringPoints(radius, center),
        path: closedPath(DIMENSIONS.map(function (_, index) {
          var angle = (-Math.PI / 2) + (Math.PI * 2 * index / DIMENSIONS.length);
          return polarPoint(angle, radius, center);
        }))
      };
    });
    var spokes = points.map(function (vertex) {
      return linePath([{ x: center, y: center }, { x: vertex.x, y: vertex.y }]);
    });
    return {
      version: 3,
      chart: 'radar',
      variant: variant,
      scale: {
        min: RADAR.scaleMin,
        max: RADAR.scaleMax,
        center: center,
        outerRadius: RADAR.outerRadius,
        labelRadius: RADAR.labelRadius
      },
      dimensions: DIMENSIONS.slice(),
      scores: normalized.values,
      missing: normalized.missing,
      points: points,
      polygon: pointsString(points),
      polygonPath: closedPath(points),
      rings: rings,
      spokes: spokes,
      mean: round(mean, 3),
      deviations: deviations,
      relative: {
        mean: round(mean, 3),
        deviations: deviations
      },
      score: options.score === undefined ? average(normalized.values) : round(clamp(Number(options.score) || 0, 0, 10), 1)
    };
  }

  function session(experience, signals) {
    if (!experience) return null;
    return {
      type: 'session',
      id: experience.id,
      gameId: experience.gameId,
      sampleCount: 1,
      scores: normalizeScores(experience.scores, 5).values,
      score: isFinite(Number(experience.score)) ? Number(experience.score) : average(experience.scores),
      signals: (signals || []).filter(function (signal) { return signal.experienceId === experience.id; })
    };
  }

  function aggregateGame(experiences, gameId) {
    var rows = (experiences || []).filter(function (experience) {
      return experience && experience.gameId === gameId && experience.scores;
    });
    if (!rows.length) return null;
    var scores = {};
    DIMENSIONS.forEach(function (dimension) {
      var values = rows.map(function (row) { return normalizeScores(row.scores, null).values[dimension.key]; })
        .filter(function (value) { return value !== null; });
      scores[dimension.key] = values.length
        ? round(values.reduce(function (sum, value) { return sum + value; }, 0) / values.length, 2)
        : 5;
    });
    var scored = rows.filter(function (row) { return isFinite(Number(row.score)); });
    return {
      type: 'game',
      gameId: gameId,
      sampleCount: rows.length,
      weighting: 'Each recorded experience has equal weight; missing dimensions are excluded per axis.',
      experienceIds: rows.map(function (row) { return row.id; }),
      scores: scores,
      score: scored.length
        ? round(scored.reduce(function (sum, row) { return sum + Number(row.score); }, 0) / scored.length, 1)
        : average(scores)
    };
  }

  function aggregateTaste(experiences) {
    var byGame = {};
    (experiences || []).forEach(function (experience) {
      if (experience && experience.gameId && experience.scores) (byGame[experience.gameId] = byGame[experience.gameId] || []).push(experience);
    });
    var games = Object.keys(byGame).map(function (gameId) { return aggregateGame(byGame[gameId], gameId); }).filter(Boolean);
    if (!games.length) return null;
    var scores = {};
    DIMENSIONS.forEach(function (dimension) {
      scores[dimension.key] = round(games.reduce(function (sum, game) { return sum + game.scores[dimension.key]; }, 0) / games.length, 2);
    });
    return {
      type: 'taste',
      sampleCount: experiences.length,
      distinctGames: games.length,
      weighting: 'Each game contributes one equally weighted aggregate, regardless of session count.',
      gameIds: games.map(function (game) { return game.gameId; }),
      scores: scores,
      score: average(scores)
    };
  }

  function gameAggregates(experiences) {
    var byGame = {};
    (experiences || []).forEach(function (experience) {
      if (experience && experience.gameId && experience.scores) {
        (byGame[experience.gameId] = byGame[experience.gameId] || []).push(experience);
      }
    });
    return Object.keys(byGame).map(function (gameId) {
      return aggregateGame(byGame[gameId], gameId);
    }).filter(Boolean);
  }

  function positiveExperiences(experiences, threshold) {
    threshold = threshold === undefined ? POSITIVE_EXPERIENCE_THRESHOLD : Number(threshold);
    var positiveIds = {};
    gameAggregates(experiences).forEach(function (game) {
      if (game.score >= threshold) positiveIds[game.gameId] = true;
    });
    return (experiences || []).filter(function (experience) {
      return experience && positiveIds[experience.gameId];
    });
  }

  function gameName(gameId, gamesById, experiences) {
    var game = gamesById && gamesById[gameId];
    if (game && game.name) return game.name;
    var row = (experiences || []).filter(function (experience) { return experience.gameId === gameId; })[0];
    return row && row.gameName ? row.gameName : gameId;
  }

  function dimensionEvidence(games, dimension, gamesById, experiences) {
    var rows = games.map(function (game) {
      return {
        gameId: game.gameId,
        gameName: gameName(game.gameId, gamesById, experiences),
        value: game.scores[dimension.key],
        rating: game.score,
        sampleCount: game.sampleCount
      };
    }).sort(function (a, b) { return b.value - a.value || b.rating - a.rating; });
    return {
      supporting: rows.slice(0, Math.min(3, rows.length)),
      contrasting: rows.slice(Math.max(0, rows.length - Math.min(2, rows.length))).reverse()
    };
  }

  function analyzeTaste(experiences, gamesById, options) {
    options = options || {};
    var threshold = options.positiveThreshold === undefined
      ? POSITIVE_EXPERIENCE_THRESHOLD : Number(options.positiveThreshold);
    var allGames = gameAggregates(experiences);
    var overall = aggregateTaste(experiences);
    if (!overall) return null;
    var positiveRows = positiveExperiences(experiences, threshold);
    var positive = aggregateTaste(positiveRows);
    var positiveGames = positive ? gameAggregates(positiveRows) : [];
    var dimensions = DIMENSIONS.map(function (dimension, index) {
      var value = overall.scores[dimension.key];
      var positiveValue = positive ? positive.scores[dimension.key] : null;
      var evidence = dimensionEvidence(allGames, dimension, gamesById, experiences);
      return {
        key: dimension.key,
        label: dimension.label,
        direction: DIRECTION_LABELS[index],
        value: value,
        positiveValue: positiveValue,
        preferenceDelta: positiveValue === null ? null : round(positiveValue - value, 2),
        language: DIMENSION_LANGUAGE[dimension.key],
        supporting: evidence.supporting,
        contrasting: evidence.contrasting
      };
    });
    var ranked = dimensions.slice().sort(function (a, b) { return b.value - a.value; });
    var preferenceEvidenceSufficient = positiveGames.length >= MIN_PREFERENCE_GAMES;
    var patterns = [];
    if (preferenceEvidenceSufficient) {
      patterns = dimensions.slice().sort(function (a, b) {
        var aStrength = Math.abs(a.preferenceDelta) + Math.abs(a.positiveValue - 5.5) * 0.18;
        var bStrength = Math.abs(b.preferenceDelta) + Math.abs(b.positiveValue - 5.5) * 0.18;
        return bStrength - aStrength;
      }).slice(0, 3).map(function (dimension) {
        var direction = dimension.preferenceDelta > 0 ? 'more' : dimension.preferenceDelta < 0 ? 'less' : 'about the same amount of';
        var phrase = dimension.language.high;
        var positiveEvidence = dimensionEvidence(positiveGames, { key: dimension.key }, gamesById, experiences);
        return {
          key: dimension.key,
          label: dimension.label,
          direction: dimension.direction,
          overallValue: dimension.value,
          positiveValue: dimension.positiveValue,
          delta: dimension.preferenceDelta,
          text: 'Games you rated ' + threshold.toFixed(1) + '+ show ' + direction + ' ' + phrase +
            ' than your full recorded-game average (' + dimension.positiveValue.toFixed(1) + ' vs ' + dimension.value.toFixed(1) + ').',
          supporting: dimension.preferenceDelta < 0 ? positiveEvidence.contrasting : positiveEvidence.supporting,
          contrasting: dimension.preferenceDelta < 0 ? dimension.supporting : dimension.contrasting
        };
      });
    }
    var highestValue = ranked[0].value;
    var lowestValue = ranked[ranked.length - 1].value;
    return {
      overall: overall,
      positive: positive,
      positiveThreshold: threshold,
      positiveRule: 'A game enters the positive profile when its equally weighted average recorded rating is at least ' + threshold.toFixed(1) + '/10.',
      positiveGameCount: positiveGames.length,
      positiveExperienceCount: positiveRows.length,
      preferenceEvidenceSufficient: preferenceEvidenceSufficient,
      minimumPreferenceGames: MIN_PREFERENCE_GAMES,
      dimensions: dimensions,
      highest: ranked[0],
      lowest: ranked[ranked.length - 1],
      highestKeys: ranked.filter(function (dimension) { return dimension.value === highestValue; }).map(function (dimension) { return dimension.key; }),
      lowestKeys: ranked.filter(function (dimension) { return dimension.value === lowestValue; }).map(function (dimension) { return dimension.key; }),
      patterns: patterns
    };
  }

  function similarity(left, right, options) {
    options = options || {};
    var minimum = options.minEvidence === undefined ? MIN_EVIDENCE : Number(options.minEvidence);
    if (!left || !right || left.sampleCount < minimum || right.sampleCount < minimum) {
      return { calculable: false, reason: 'insufficient-evidence', score: null, shared: [], differences: [] };
    }
    var a = vector(left.scores, 5);
    var b = vector(right.scores, 5);
    var distances = a.map(function (value, index) {
      return { key: DIMENSIONS[index].key, label: DIMENSIONS[index].label, delta: round(Math.abs(value - b[index]), 2), left: value, right: b[index] };
    });
    var rms = Math.sqrt(distances.reduce(function (sum, item) { return sum + item.delta * item.delta; }, 0) / distances.length);
    return {
      calculable: true,
      method: 'Normalized Euclidean distance across the nine 1–10 dimensions.',
      score: round(clamp((1 - rms / 9) * 100, 0, 100), 1),
      shared: distances.slice().sort(function (aItem, bItem) { return aItem.delta - bItem.delta; }).slice(0, 3),
      differences: distances.slice().sort(function (aItem, bItem) { return bItem.delta - aItem.delta; }).slice(0, 3),
      evidence: { left: left.sampleCount, right: right.sampleCount }
    };
  }

  function similarGames(experiences, gameId, options) {
    options = options || {};
    var grouped = {};
    (experiences || []).forEach(function (experience) {
      if (experience && experience.gameId) (grouped[experience.gameId] = grouped[experience.gameId] || []).push(experience);
    });
    var source = aggregateGame(experiences, gameId);
    if (!source) return [];
    return Object.keys(grouped).filter(function (id) { return id !== gameId; }).map(function (id) {
      var target = aggregateGame(experiences, id);
      return { gameId: id, glyph: target, similarity: similarity(source, target, options) };
    }).filter(function (item) { return item.similarity.calculable; })
      .sort(function (a, b) { return b.similarity.score - a.similarity.score; });
  }

  GOS.glyphEngine = {
    DIMENSIONS: DIMENSIONS,
    RADAR: RADAR,
    ORNAMENTS: ORNAMENTS,
    normalizeScores: normalizeScores,
    vector: vector,
    average: average,
    geometry: geometry,
    ornamentMap: ornamentMap,
    session: session,
    aggregateGame: aggregateGame,
    aggregateTaste: aggregateTaste,
    gameAggregates: gameAggregates,
    positiveExperiences: positiveExperiences,
    analyzeTaste: analyzeTaste,
    similarity: similarity,
    similarGames: similarGames,
    MIN_EVIDENCE: MIN_EVIDENCE,
    POSITIVE_EXPERIENCE_THRESHOLD: POSITIVE_EXPERIENCE_THRESHOLD,
    MIN_PREFERENCE_GAMES: MIN_PREFERENCE_GAMES,
    DIRECTION_LABELS: DIRECTION_LABELS
  };
})(typeof window !== 'undefined' ? window : globalThis);