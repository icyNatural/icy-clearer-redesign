/**
 * icyNatural Game OS — ExperienceSignal vocabulary + derivation.
 *
 * Two kinds of signal:
 *   core       — derived from the nine high-level Game OS dimensions
 *                (control, clarity, freedom, expression, engagement, depth,
 *                 flow, intensity, replay). Never removed, never replaced.
 *   contextual — optional, user-tagged signals (combat feel, parry, co-op
 *                chemistry, reasons for stopping, surprises, ...).
 *
 * A signal carries: polarity, importance, confidence, context, evidence.
 * Contradictory signals are normal: "love combat" + "dislike progression"
 * stay two records — they are never collapsed into one score.
 */
(function (root) {
  'use strict';

  var GOS = (root.GOS = root.GOS || {});

  var CORE_DIMENSIONS = [
    { key: 'control', label: 'Control feel' },
    { key: 'clarity', label: 'Clarity' },
    { key: 'freedom', label: 'Freedom' },
    { key: 'expression', label: 'Expression' },
    { key: 'engagement', label: 'Engagement' },
    { key: 'depth', label: 'Depth' },
    { key: 'flow', label: 'Flow' },
    { key: 'intensity', label: 'Intensity' },
    { key: 'replay', label: 'Replay pull' }
  ];

  /** Optional / contextual signals. `mechanics` links a taste to graph mechanics. */
  var CONTEXTUAL = [
    { key: 'combat-feel', label: 'Combat feel', group: 'Feel', mechanics: ['combat'] },
    { key: 'movement-feel', label: 'Movement feel', group: 'Feel', mechanics: ['movement'] },
    { key: 'active-defense', label: 'Active defense', group: 'Feel', mechanics: ['active defense', 'footsies'] },
    { key: 'parry-reversal', label: 'Parry / reversal', group: 'Feel', mechanics: ['parry', 'reversal'] },
    { key: 'spacing', label: 'Spacing', group: 'Feel', mechanics: ['spacing'] },
    { key: 'counterplay', label: 'Counterplay', group: 'Feel', mechanics: ['counterplay'] },
    { key: 'exploration', label: 'Exploration', group: 'World', mechanics: ['exploration'] },
    { key: 'world-atmosphere', label: 'World / atmosphere', group: 'World', mechanics: ['atmosphere'] },
    { key: 'visual-style', label: 'Visual style', group: 'World', mechanics: [] },
    { key: 'music-sound', label: 'Music / sound', group: 'World', mechanics: [] },
    { key: 'story-engagement', label: 'Story engagement', group: 'World', mechanics: [] },
    { key: 'build-freedom', label: 'Build freedom', group: 'Build', mechanics: ['build variety'] },
    { key: 'class-specialization', label: 'Class specialization', group: 'Build', mechanics: ['class-based play'] },
    { key: 'role-identity', label: 'Role identity', group: 'Build', mechanics: ['role identity'] },
    { key: 'ability-synergy', label: 'Ability synergy', group: 'Build', mechanics: ['ability synergy'] },
    { key: 'cooldown-combat', label: 'Cooldown combat', group: 'Build', mechanics: ['cooldown combat'] },
    { key: 'loot-satisfaction', label: 'Loot satisfaction', group: 'Build', mechanics: ['loot'] },
    { key: 'progression-satisfaction', label: 'Progression satisfaction', group: 'Build', mechanics: ['progression'] },
    { key: 'difficulty-fit', label: 'Difficulty fit', group: 'Challenge', mechanics: ['difficulty'] },
    { key: 'boss-encounters', label: 'Boss encounters', group: 'Challenge', mechanics: ['boss encounters'] },
    { key: 'co-op-chemistry', label: 'Co-op chemistry', group: 'Social', mechanics: ['co-op'] },
    { key: 'pvp', label: 'PvP', group: 'Social', mechanics: ['pvp'] },
    { key: 'team-coordination', label: 'Team coordination', group: 'Social', mechanics: ['team coordination'] },
    { key: 'experimentation', label: 'Experimentation', group: 'Systems', mechanics: ['experimentation'] },
    { key: 'destructibility', label: 'Destructibility', group: 'Systems', mechanics: ['destructibility'] },
    { key: 'traversal', label: 'Traversal', group: 'Systems', mechanics: ['traversal'] },
    { key: 'arena-combat', label: 'Arena combat', group: 'Systems', mechanics: ['arena combat'] },
    { key: 'possession', label: 'Possession', group: 'Systems', mechanics: ['possession'] },
    { key: 'disarming', label: 'Disarming', group: 'Systems', mechanics: ['disarming'] },
    { key: 'deck-building', label: 'Deck building', group: 'Systems', mechanics: ['deck building'] },
    { key: 'reasons-continuing', label: 'Reasons for continuing', group: 'Meta', mechanics: [] },
    { key: 'reasons-stopping', label: 'Reasons for stopping', group: 'Meta', mechanics: [] },
    { key: 'surprises', label: 'Surprises', group: 'Meta', mechanics: [] }
  ];

  /** Legacy friction tags become negative contextual signals on migration. */
  var FRICTION_MAP = {
    'Slow': { key: 'pace-slow', label: 'Pacing dragged', group: 'Feel', mechanics: ['pacing'] },
    'Restrictive': { key: 'restrictive', label: 'Restrictive', group: 'Feel', mechanics: [] },
    'Confusing': { key: 'confusing', label: 'Confusing', group: 'Feel', mechanics: [] },
    'Repetitive': { key: 'repetitive', label: 'Repetitive', group: 'Feel', mechanics: [] },
    'Clunky': { key: 'clunky', label: 'Clunky', group: 'Feel', mechanics: [] }
  };

  function coreByKey(key) {
    for (var i = 0; i < CORE_DIMENSIONS.length; i++) {
      if (CORE_DIMENSIONS[i].key === key) return CORE_DIMENSIONS[i];
    }
    return null;
  }

  function contextualByKey(key) {
    for (var i = 0; i < CONTEXTUAL.length; i++) {
      if (CONTEXTUAL[i].key === key) return CONTEXTUAL[i];
    }
    if (FRICTION_MAP) {
      for (var friction in FRICTION_MAP) {
        if (FRICTION_MAP[friction].key === key) return FRICTION_MAP[friction];
      }
    }
    return null;
  }

  function labelFor(key) {
    var core = coreByKey(key);
    if (core) return core.label;
    var ctx = contextualByKey(key);
    if (ctx) return ctx.label;
    return key;
  }

  function mechanicsFor(key) {
    var ctx = contextualByKey(key);
    return ctx && ctx.mechanics ? ctx.mechanics.slice() : [];
  }

  /**
   * Derive core signals from the nine dimension scores.
   * 8-10 => positive, 1-4 => negative, 5-7 => neutral (no signal).
   */
  function fromScores(scores, opts) {
    opts = opts || {};
    var out = [];
    CORE_DIMENSIONS.forEach(function (dimension) {
      var value = Number(scores[dimension.key]);
      if (!isFinite(value)) return;
      var polarity = null;
      var importance = 2;
      if (value >= 8) {
        polarity = 'positive';
        importance = value >= 9 ? 3 : 2;
      } else if (value <= 4) {
        polarity = 'negative';
        importance = value <= 2 ? 3 : 2;
      }
      if (!polarity) return;
      out.push({
        key: dimension.key,
        label: dimension.label,
        kind: 'core',
        polarity: polarity,
        importance: importance,
        confidence: 0.9,
        context: opts.context || 'overall',
        evidence: opts.evidence || (dimension.label + ' rated ' + value + '/10')
      });
    });
    return out;
  }

  /** Legacy friction tags -> negative contextual signals. */
  function fromFriction(friction, opts) {
    opts = opts || {};
    return (friction || []).map(function (tag) {
      var mapped = FRICTION_MAP[tag];
      if (!mapped) return null;
      return {
        key: mapped.key,
        label: mapped.label,
        kind: 'contextual',
        polarity: 'negative',
        importance: 2,
        confidence: 0.7,
        context: opts.context || 'overall',
        evidence: opts.evidence || ('Friction tag: ' + tag)
      };
    }).filter(Boolean);
  }

  /** Build the final signal records for an experience. */
  function buildForExperience(experience, selections) {
    selections = selections || {};
    var ctx = selections.context || (experience.context && experience.context.mode) || 'overall';
    var draft = fromScores(experience.scores, { context: ctx })
      .concat(fromFriction(experience.friction, { context: ctx }));

    (selections.contextual || []).forEach(function (item) {
      if (!item || !item.key) return;
      var defined = contextualByKey(item.key);
      draft.push({
        key: item.key,
        label: defined ? defined.label : (item.label || item.key),
        kind: 'contextual',
        polarity: item.polarity === 'negative' ? 'negative' : 'positive',
        importance: Math.min(3, Math.max(1, Number(item.importance) || 2)),
        confidence: Math.min(1, Math.max(0.1, Number(item.confidence) || 0.8)),
        context: item.context || ctx,
        evidence: item.evidence || ''
      });
    });

    return draft;
  }

  GOS.signals = {
    CORE_DIMENSIONS: CORE_DIMENSIONS,
    CONTEXTUAL: CONTEXTUAL,
    FRICTION_MAP: FRICTION_MAP,
    coreByKey: coreByKey,
    contextualByKey: contextualByKey,
    labelFor: labelFor,
    mechanicsFor: mechanicsFor,
    fromScores: fromScores,
    fromFriction: fromFriction,
    buildForExperience: buildForExperience
  };
})(typeof window !== 'undefined' ? window : globalThis);
