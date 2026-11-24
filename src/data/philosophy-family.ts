// Unified data manifest for the ICY CLEAR personal philosophy family:
// - Homepage "How I See It" (#perspective)
// - ICY CLEAR — Life as Continuous Development (/clear.html)
// - Generative Reality — How I See More (/generative-reality.html)
// - Five Written Models & Lenses (/models/*.html)

export interface ClearElement {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  shortLine: string;
  description: string;
  note: string;
  accent: string;
  /** Non-hierarchical connections to other elements in the living ecology */
  supports: string[];
  relationNote: string;
  /** Coordinates in a 420×340 ecological constellation SVG */
  x: number;
  y: number;
}

export const clearElements: ClearElement[] = [
  {
    id: 'resources',
    number: '01',
    title: 'Resources',
    subtitle: 'The means',
    shortLine:
      'Money, time, energy, health, knowledge, tools, and relationships give me possibilities — to use, not confuse with living itself.',
    description:
      'Money, time, energy, health, knowledge, tools, and relationships all give me possibilities. I want to use them, not confuse the act of accumulating them with the act of living.',
    note: 'Capacity kept in motion rather than mistaken for the destination.',
    accent: '#e2b872',
    supports: ['security', 'freedom', 'creation'],
    relationNote: 'Feeds security, expands room for choice, and supplies raw material for experiments.',
    x: 92,
    y: 94,
  },
  {
    id: 'security',
    number: '02',
    title: 'Security',
    subtitle: 'The continuity',
    shortLine:
      'Enough stability to meet responsibilities, absorb setbacks, and keep exploring without making security the whole purpose of life.',
    description:
      'I want enough stability to meet my responsibilities, absorb setbacks, and keep exploring. Security protects the life I want to participate in; it is not the whole purpose of that life.',
    note: 'A keel beneath the surface — steadying the hull without closing the horizon.',
    accent: '#9dcfe4',
    supports: ['resources', 'freedom', 'renewal'],
    relationNote: 'Absorbs shocks so freedom stays real and renewal is not interrupted by fragility.',
    x: 210,
    y: 52,
  },
  {
    id: 'freedom',
    number: '03',
    title: 'Freedom',
    subtitle: 'Meaningful choice',
    shortLine:
      'Meaningful room to choose where my time and attention go. More resources can open doors, but the doors matter more than the number.',
    description:
      'I want meaningful room to choose where my time and attention go. More resources can open doors, but the doors matter more than the number.',
    note: 'Direction of attention rather than an endless inventory of options.',
    accent: '#c8dfec',
    supports: ['creation', 'living', 'renewal'],
    relationNote: 'Turns stability into actual agency over what gets made, lived, and rested.',
    x: 332,
    y: 96,
  },
  {
    id: 'creation',
    number: '04',
    title: 'Creation',
    subtitle: 'Expression & experimentation',
    shortLine:
      'Turning curiosity into experiments, software, art, ideas, and new abilities — not everything I make needs a market or a finish line.',
    description:
      'I like turning curiosity into experiments, software, art, ideas, and new abilities. Not everything I make needs a market, a finish line, or a reason beyond wanting to try.',
    note: 'Curiosity given form — testing what happens when an idea meets the world.',
    accent: '#e0a96d',
    supports: ['resources', 'living', 'freedom'],
    relationNote: 'Produces new skills and tools while feeding directly back into living and capability.',
    x: 326,
    y: 238,
  },
  {
    id: 'living',
    number: '05',
    title: 'Living',
    subtitle: 'Participation now',
    shortLine:
      'Studying, building, playing, moving, traveling, noticing the world, being with people: these are not delays before life begins.',
    description:
      'Studying something new, taking a course, building, playing, moving, traveling, noticing the world, being with people: these are not delays before life begins. They are life.',
    note: 'Already inside the process — not waiting at the end of preparation.',
    accent: '#a8d5c2',
    supports: ['creation', 'renewal', 'freedom'],
    relationNote: 'Anchors every other part in real experience now instead of deferred someday.',
    x: 210,
    y: 286,
  },
  {
    id: 'renewal',
    number: '06',
    title: 'Renewal',
    subtitle: 'The return',
    shortLine:
      'Rest, reflection, and changing direction belong to development. Enjoyment without an output is still meaningful.',
    description:
      'Rest, reflection, and changing direction belong to development. I do not need to be improving or producing every moment. Enjoyment without an output is still meaningful.',
    note: 'Quieting pressure so clarity and energy can return on their own terms.',
    accent: '#98c7b8',
    supports: ['resources', 'living', 'security'],
    relationNote: 'Restores health, attention, and perspective so development stays sustainable.',
    x: 94,
    y: 238,
  },
];

export const clearCadence = [
  'Notice',
  'Explore',
  'Learn',
  'Create',
  'Experience',
  'Reflect',
  'Renew',
] as const;

export interface GenerativeStage {
  id: 'perception' | 'recognition' | 'simulation' | 'orchestration' | 'transformation' | 'generativity';
  index: number;
  number: string;
  title: string;
  eyebrow: string;
  shortDef: string;
  statement: string;
  copy: string;
  stageNote: string;
  affordanceBadge: string;
  worldState: string;
  accent: string;
}

export const generativeStages: GenerativeStage[] = [
  {
    id: 'perception',
    index: 0,
    number: '01',
    title: 'Perception',
    eyebrow: 'Encountering what exists',
    shortDef: 'Encountering what exists before its hidden structure resolves.',
    statement: 'Something is here before I understand what it means.',
    copy: 'I encounter a place, a sound, a person, a problem, a pattern. From my initial vantage, the monolith reads like a solid wall. The world is never limited to what my first glance notices.',
    stageNote: 'The passage is already carved into the stone. From this angle, it still looks like a wall.',
    affordanceBadge: 'ACTUAL: PRESENT · PERCEIVED: UNSEEN',
    worldState: 'Initial vantage · stone unchanged',
    accent: '#90aeb8',
  },
  {
    id: 'recognition',
    index: 1,
    number: '02',
    title: 'Recognition',
    eyebrow: 'Discovering what was already possible',
    shortDef: 'Seeing relationships and openings that were already there.',
    statement: 'I begin to see what was already possible.',
    copy: 'My angle shifts and raking light catches an edge. Something I read as an obstacle turns out to hold a passage. Nothing physical moved or was built — my resolution of possibility changed.',
    stageNote: 'The opening becomes visible. Zero stone moved — only resolution and angle shifted.',
    affordanceBadge: 'PERCEIVED AFFORDANCE EXPANDED · WORLD UNCHANGED',
    worldState: 'Camera orbits · hidden seam resolved',
    accent: '#e6bd78',
  },
  {
    id: 'simulation',
    index: 2,
    number: '03',
    title: 'Simulation',
    eyebrow: 'Mentally exploring possible outcomes',
    shortDef: 'Projecting routes and testing consequences inside a model.',
    statement: 'I can explore a future before it happens.',
    copy: 'Looking through the opening across the chasm, multiple crossings branch in imagination. I can compare trajectories, estimate tension, and weigh trade-offs — while remembering a projection is a model, not load-bearing stone.',
    stageNote: 'Three crossings appear as translucent projections — weightless hypotheses, not yet facts.',
    affordanceBadge: 'MODELLED ROUTES · NOT YET ACTUAL',
    worldState: 'Three imagined trajectories tested',
    accent: '#9dcfe4',
  },
  {
    id: 'orchestration',
    index: 3,
    number: '04',
    title: 'Orchestration',
    eyebrow: 'Coordinating real tools, resources & actions',
    shortDef: 'Arranging real constraints, parts, and effort into form.',
    statement: 'A possibility becomes an arrangement of real things.',
    copy: 'I coordinate knowledge, tools, people, time, and physical effort. One projected route commits to gravity: abutments seat into rock, piers anchor in the canyon, and deck slabs lock together under real constraints and feedback.',
    stageNote: 'One trajectory takes physical mass — piers anchor and stone spans the gap.',
    affordanceBadge: 'FROM MODEL TO REAL COORDINATION',
    worldState: 'Load-bearing crossing assembled',
    accent: '#dfb16c',
  },
  {
    id: 'transformation',
    index: 4,
    number: '05',
    title: 'Transformation',
    eyebrow: 'Changing the environment, capabilities, or both',
    shortDef: 'Crossing changes both what is reachable and what can be seen next.',
    statement: 'Acting alters both the world and what I can do next.',
    copy: 'Now the bridge physically changes the terrain. Crossing through the monolith onto the far ridge doesn’t merely solve the original gap — it changes my vantage point, revealing valleys and questions that were unreachable before.',
    stageNote: 'Crossing onto the far ridge unlocks terrain and sightlines that did not exist from the near bank.',
    affordanceBadge: 'ACTUAL AFFORDANCE CHANGED · NEW VANTAGE',
    worldState: 'Far plateau reached · horizon opens',
    accent: '#b7dfd0',
  },
  {
    id: 'generativity',
    index: 5,
    number: '06',
    title: 'Generativity',
    eyebrow: 'Opening futures beyond the original plan',
    shortDef: 'Making further possibilities available beyond the creator’s imagination.',
    statement: 'What I make can open futures I never planned.',
    copy: 'Once new ground is accessible, capabilities can be shared, adapted, and recombined. Other minds and systems discover paths, arches, and uses never present in the original blueprint. Reality keeps opening without needing my constant direction.',
    stageNote: 'Secondary routes and distant thresholds emerge in directions the original crossing never planned.',
    affordanceBadge: 'UNPLANNED POSSIBILITIES EMERGING',
    worldState: 'Panoramic valley · branching futures',
    accent: '#a4dbb8',
  },
];

export interface WrittenModelMeta {
  slug: string;
  idx: string;
  domain: string;
  title: string;
  shortTitle: string;
  line: string;
  chain: string;
  visualFocus: string;
  href: string;
  accent: string;
}

export const writtenModels: WrittenModelMeta[] = [
  {
    slug: 'seeing-before-naming',
    idx: 'M-01',
    domain: 'Perception',
    title: 'Seeing Before Naming',
    shortTitle: 'Seeing Before Naming',
    line: 'Your first interpretation is not the event itself.',
    chain: 'event → sensation → perception → interpretation → label',
    visualFocus: 'Distinguish raw contact from the label that closes observation.',
    href: '/models/seeing-before-naming.html',
    accent: '#9dcfe4',
  },
  {
    slug: 'replace-stories-with-systems',
    idx: 'M-02',
    domain: 'Systems',
    title: 'Replace Stories with Systems',
    shortTitle: 'Stories → Systems',
    line: 'A story explains. A mechanism predicts. Only one of them can be tested.',
    chain: 'actors ⇄ incentives ⇄ constraints ⇄ feedback',
    visualFocus: 'Peel back emotional narrative to locate real variables and leverage.',
    href: '/models/replace-stories-with-systems.html',
    accent: '#e2b872',
  },
  {
    slug: 'from-reaction-to-pattern',
    idx: 'M-03',
    domain: 'Time',
    title: 'From Reaction to Pattern',
    shortTitle: 'Reaction → Pattern',
    line: 'A single frame is noise. Direction is the signal.',
    chain: 'frame · frame · frame · frame → trajectory',
    visualFocus: 'Widen the window from one intense moment to its recurring slope.',
    href: '/models/from-reaction-to-pattern.html',
    accent: '#b4d7e6',
  },
  {
    slug: 'coherence-vs-entropy',
    idx: 'M-04',
    domain: 'State',
    title: 'Coherence vs. Entropy',
    shortTitle: 'Coherence vs. Entropy',
    line: 'Is the system holding its shape, or spending itself?',
    chain: 'organization ⇄ drift',
    visualFocus: 'Read what an action does to structure afterwards, beyond surface comfort.',
    href: '/models/coherence-vs-entropy.html',
    accent: '#a8d5c2',
  },
  {
    slug: 'clear-again',
    idx: 'M-05',
    domain: 'Return',
    title: 'Clear Again',
    shortTitle: 'Clear Again',
    line: 'You do not stay clear. You get clear again, on a shorter interval.',
    chain: 'drift → notice → adjust → return',
    visualFocus: 'Trust the return path instead of pretending pressure never shifts you.',
    href: '/models/clear-again.html',
    accent: '#98c7b8',
  },
];

export function findWrittenModelByTitleOrIdx(title?: string, idx?: string): WrittenModelMeta | undefined {
  if (idx) {
    const byIdx = writtenModels.find((m) => m.idx.toLowerCase() === idx.toLowerCase());
    if (byIdx) return byIdx;
  }
  if (title) {
    const clean = title.trim().toLowerCase();
    const byTitle = writtenModels.find((m) => m.title.toLowerCase() === clean);
    if (byTitle) return byTitle;
  }
  return undefined;
}
