/**
 * icyNatural Game OS — taste engine (explainable, evidence-first).
 *
 * Aggregates ExperienceSignals across games into TastePatterns:
 *   frequency, direction, strength, recency, confidence, context,
 *   supporting experiences, contradicting experiences.
 *
 * Nothing here is opaque: every pattern keeps the exact experiences that
 * produced it, confidence is deliberately conservative when evidence is
 * sparse, and contradictory signals stay visible instead of being averaged
 * into one number.
 */
(function (root) {
  'use strict';

  var GOS = (root.GOS = root.GOS || {});
  var U = GOS.util || {};

  var RECENT_WINDOW_DAYS = 90;
  var EMERGING_WINDOW_DAYS = 21;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isoDaysAgo(days, now) {
    var base = now ? new Date(now).getTime() : Date.now();
    return new Date(base - days * 86400000).toISOString();
  }

  /**
   * @param {Object} input
   *   signals      ExperienceSignal[]
   *   experiences  ExperienceLog[]  (for evidence titles)
   *   gamesById    map of game records
   *   now          ISO timestamp override (tests)
   */
  function computePatterns(input) {
    var signals = (input && input.signals) || [];
    var experiences = (input && input.experiences) || [];
    var gamesById = (input && input.gamesById) || {};
    var now = (input && input.now) || new Date().toISOString();
    var recentCutoff = isoDaysAgo(RECENT_WINDOW_DAYS, now);
    var emergingCutoff = isoDaysAgo(EMERGING_WINDOW_DAYS, now);

    var experienceById = Object.create(null);
    experiences.forEach(function (experience) { experienceById[experience.id] = experience; });

    var grouped = Object.create(null);

    signals.forEach(function (signal) {
      if (!signal || !signal.key) return;
      var bucket = grouped[signal.key] || (grouped[signal.key] = {
        key: signal.key,
        label: signal.label || signal.key,
        kind: signal.kind || 'contextual',
        entries: []
      });
      if (signal.kind === 'core') bucket.kind = 'core';
      bucket.entries.push(signal);
    });

    var patterns = Object.keys(grouped).map(function (key) {
      var bucket = grouped[key];
      var positive = 0;
      var negative = 0;
      var positiveCount = 0;
      var negativeCount = 0;
      var recentPositive = 0;
      var recentNegative = 0;
      var support = [];
      var supportingGames = [];
      var contradictingGames = [];
      var evidenceExperienceIds = [];
      var contexts = {};
      var firstAt = null;
      var lastAt = null;
      var gameSeen = Object.create(null);

      bucket.entries.forEach(function (signal) {
        var weight = clamp(Number(signal.importance) || 2, 1, 3);
        var at = signal.created_at || now;
        var experience = experienceById[signal.experienceId];
        var game = experience ? gamesById[experience.gameId] : null;
        var gameName = game ? game.name : (signal.gameName || 'Unknown game');
        var gameId = game ? game.id : signal.gameId;

        if (!firstAt || at < firstAt) firstAt = at;
        if (!lastAt || at > lastAt) lastAt = at;

        if (signal.polarity === 'positive') {
          positive += weight;
          positiveCount += 1;
          if (at >= recentCutoff) recentPositive += weight;
          supportingGames.push(gameName);
        } else if (signal.polarity === 'negative') {
          negative += weight;
          negativeCount += 1;
          if (at >= recentCutoff) recentNegative += weight;
          contradictingGames.push(gameName);
        } else {
          return;
        }

        var context = signal.context || 'overall';
        contexts[context] = contexts[context] || { positive: 0, negative: 0, count: 0 };
        contexts[context].count += 1;
        if (signal.polarity === 'positive') contexts[context].positive += weight;
        else contexts[context].negative += weight;

        if (signal.experienceId) evidenceExperienceIds.push(signal.experienceId);
        support.push({
          signalId: signal.id,
          experienceId: signal.experienceId,
          gameId: gameId,
          gameName: gameName,
          polarity: signal.polarity,
          importance: weight,
          context: context,
          evidence: signal.evidence || '',
          at: at,
          score: experience ? experience.score : null
        });
        if (gameId && !gameSeen[gameId]) gameSeen[gameId] = true;
      });

      var frequency = positiveCount + negativeCount;
      var weightedTotal = positive + negative;
      var net = weightedTotal === 0 ? 0 : (positive - negative) / weightedTotal;
      var agreement = weightedTotal === 0 ? 0 : Math.max(positive, negative) / weightedTotal;
      var distinctGames = Object.keys(gameSeen).length;

      var polarity = 'mixed';
      if (positive > 0 && negative === 0) polarity = 'positive';
      else if (negative > 0 && positive === 0) polarity = 'negative';
      else if (net >= 0.25) polarity = 'positive';
      else if (net <= -0.25) polarity = 'negative';

      var strength = 'weak';
      if (frequency >= 3 && weightedTotal >= 6) strength = 'strong';
      else if (frequency >= 2 && weightedTotal >= 3) strength = 'moderate';

      // Conservative confidence: sparse evidence can never read as high.
      var evidenceFactor = Math.min(1, frequency / 4);
      var diversityFactor = Math.min(1, distinctGames / 2);
      var confidence = Math.round(clamp(evidenceFactor * (0.55 + 0.45 * agreement) * (0.65 + 0.35 * diversityFactor), 0.05, 1) * 100) / 100;

      var recentNet = (recentPositive + recentNegative) === 0 ? null
        : Math.round(((recentPositive - recentNegative) / (recentPositive + recentNegative)) * 100) / 100;

      var trend = [];
      var monthly = {};
      support.forEach(function (entry) {
        var month = String(entry.at).slice(0, 7);
        var bucketMonth = monthly[month] || (monthly[month] = { positive: 0, negative: 0 });
        if (entry.polarity === 'positive') bucketMonth.positive += entry.importance;
        else bucketMonth.negative += entry.importance;
      });
      Object.keys(monthly).sort().forEach(function (month) {
        var value = monthly[month];
        var total = value.positive + value.negative;
        trend.push({ month: month, score: total ? Math.round(((value.positive - value.negative) / total) * 100) / 100 : 0, count: total });
      });

      return {
        id: 'pattern:' + key,
        key: key,
        label: bucket.label,
        kind: bucket.kind,
        polarity: polarity,
        strength: strength,
        frequency: frequency,
        positiveCount: positiveCount,
        negativeCount: negativeCount,
        weightedPositive: positive,
        weightedNegative: negative,
        net: Math.round(net * 100) / 100,
        recentNet: recentNet,
        confidence: confidence,
        contradictory: positive > 0 && negative > 0,
        emerging: lastAt >= emergingCutoff && frequency <= 2 && net > 0,
        contexts: contexts,
        distinctGames: distinctGames,
        supportingGames: GOS.util ? GOS.util.uniq(supportingGames) : supportingGames,
        contradictingGames: GOS.util ? GOS.util.uniq(contradictingGames) : contradictingGames,
        evidenceExperienceIds: GOS.util ? GOS.util.uniq(evidenceExperienceIds) : evidenceExperienceIds,
        firstAt: firstAt,
        lastAt: lastAt,
        trend: trend,
        support: support
      };
    });

    patterns.sort(function (a, b) {
      var aScore = Math.abs(a.net) * a.frequency * a.confidence;
      var bScore = Math.abs(b.net) * b.frequency * b.confidence;
      return bScore - aScore;
    });

    return patterns;
  }

  function buckets(patterns) {
    patterns = patterns || [];
    var strongPositive = [];
    var strongNegative = [];
    var contradictions = [];
    var emerging = [];
    var contextual = [];
    var core = [];

    patterns.forEach(function (pattern) {
      if (pattern.contradictory) contradictions.push(pattern);
      if (pattern.emerging) emerging.push(pattern);
      if (pattern.kind === 'core') core.push(pattern);
      else contextual.push(pattern);
      if (pattern.polarity === 'positive' && (pattern.strength === 'strong' || pattern.strength === 'moderate')) strongPositive.push(pattern);
      if (pattern.polarity === 'negative' && (pattern.strength === 'strong' || pattern.strength === 'moderate')) strongNegative.push(pattern);
    });

    var byGroup = {};
    contextual.forEach(function (pattern) {
      var defined = GOS.signals && GOS.signals.contextualByKey ? GOS.signals.contextualByKey(pattern.key) : null;
      var group = defined ? defined.group : 'Other';
      (byGroup[group] = byGroup[group] || []).push(pattern);
    });

    return {
      strongPositive: strongPositive,
      strongNegative: strongNegative,
      contradictions: contradictions,
      emerging: emerging,
      contextual: contextual,
      core: core,
      byGroup: byGroup
    };
  }

  /** Human-readable confidence label — never overstates sparse evidence. */
  function confidenceLabel(pattern) {
    if (pattern.frequency <= 1) return 'very low evidence';
    if (pattern.confidence < 0.35) return 'low confidence';
    if (pattern.confidence < 0.6) return 'moderate confidence';
    return 'well supported';
  }

  function describe(pattern) {
    var dir = pattern.polarity === 'positive' ? 'positive'
      : pattern.polarity === 'negative' ? 'negative' : 'mixed';
    return pattern.label + ' — ' + dir + ', ' + pattern.strength +
      ' (' + pattern.frequency + ' signal' + (pattern.frequency === 1 ? '' : 's') +
      ', ' + confidenceLabel(pattern) + ')';
  }

  GOS.taste = {
    computePatterns: computePatterns,
    buckets: buckets,
    confidenceLabel: confidenceLabel,
    describe: describe,
    RECENT_WINDOW_DAYS: RECENT_WINDOW_DAYS,
    EMERGING_WINDOW_DAYS: EMERGING_WINDOW_DAYS
  };
})(typeof window !== 'undefined' ? window : globalThis);
