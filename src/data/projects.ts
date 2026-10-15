// Observatory registry. Everything that appears on the homepage is generated
// from these arrays. Add an entry here — it shows up automatically.

export type EntityStatus = 'live' | 'forming' | 'lab' | 'soon' | 'archived' | 'signal';
export type EntityType   = 'world' | 'artifact' | 'collection' | 'signal';
export type Atmosphere   = 'mountain' | 'forest' | 'aurora' | 'tide' | 'ember' | 'void' | 'meadow' | 'lab';

export interface Entity {
  id: string;
  title: string;
  type: EntityType;
  atmosphere: Atmosphere;
  route: string;
  external?: boolean;
  status: EntityStatus;
  blurb: string;
  glyph?: string;
  connections?: string[];   // ids of related entities
  // optional display helpers
  number?: string;
  subtitle?: string;
  accent?: string;
  // shown in the homepage depth section (Selected Instruments)
  featured?: boolean;
}

// ── WORLDS ──────────────────────────────────────────────────────────────
export const worlds: Entity[] = [];

// ── ARTIFACTS ───────────────────────────────────────────────────────────
export const artifacts: Entity[] = [
  {
    id: 'energy-engine',
    type: 'artifact',
    title: 'Energy Engine',
    subtitle: 'Physiological Instrument',
    atmosphere: 'aurora',
    route: 'https://phases.icynatural.now',
    external: false,
    status: 'live',
    accent: '#b88aff',
    glyph: '◉',
    blurb: 'Energy Engine models rhythm, recovery, baseline shifts, and daily direction in one feedback loop. It is a physiological instrument for observing energy, recovery, and autonomic lead over time.',
    connections: ['inquiry-engine', 'reality-capture'],
    featured: true,
  },
  {
    id: 'inquiry-engine',
    type: 'artifact',
    title: 'Inquiry Engine',
    subtitle: 'Investigation Room',
    atmosphere: 'tide',
    route: '#',
    status: 'forming',
    accent: '#7fcbff',
    glyph: '◎',
    blurb: 'A question-first system for investigating problems and revealing their underlying shape.',
    connections: ['potent-library'],
  },
  {
    id: 'potent-library',
    type: 'artifact',
    title: 'Semantic Archaeology',
    subtitle: 'Atlas of Words',
    atmosphere: 'ember',
    route: 'https://language.icynatural.now',
    status: 'live',
    accent: '#e8c07a',
    glyph: '☰',
    blurb: 'Semantic Archaeology explores words through their histories, roots, semantic changes, contexts, and uses across fields.',
    connections: ['inquiry-engine', 'reality-capture'],
    featured: true,
  },
  {
    id: 'pokedex-scanner',
    type: 'artifact',
    title: 'IcyVision Scanner',
    subtitle: 'Vision · Scanner · Playful Discovery',
    atmosphere: 'lab',
    route: 'https://vision.icynatural.now',
    external: false,
    status: 'live',
    accent: '#9bb88a',
    glyph: '◈',
    blurb: 'A playful visual scanner for identifying, observing, and turning ordinary things into discoveries.',
    connections: ['reality-capture'],
  },
  {
    id: 'reality-capture',
    type: 'artifact',
    title: 'Reality Capture',
    subtitle: 'Document Capture · Observation Archive · Reality First',
    atmosphere: 'void',
    route: 'https://reality.icynatural.now',
    external: false,
    status: 'live',
    accent: '#cfe7ff',
    glyph: '◬',
    blurb: 'A document capture and observation archive for saving evidence, notes, and real-world material before interpretation.',
    connections: ['potent-library', 'pokedex-scanner'],
    featured: true,
  },
  {
    id: 'playground',
    type: 'artifact',
    title: 'Playground',
    subtitle: 'Creative Sandbox',
    atmosphere: 'meadow',
    route: 'https://playground.icynatural.now',
    status: 'live',
    accent: '#7fe0c8',
    glyph: '◇',
    blurb: 'Playground is a creative sandbox for testing ideas, building prototypes, exploring concepts, and turning curiosity into experiments before they become finished projects.',
    connections: ['scenario-states'],
  },
  {
    id: 'scenario-states',
    type: 'artifact',
    title: 'Scenario States',
    subtitle: 'Branching States',
    atmosphere: 'void',
    route: 'https://scenario.icynatural.now',
    status: 'forming',
    accent: '#a8b8ff',
    glyph: '⑂',
    blurb: 'Scenario States explores situations as changing states that can expand into further states, making branching possibilities and transitions easier to examine.',
    connections: ['inquiry-engine'],
  },
  {
    id: 'hoop-focus',
    type: 'artifact',
    title: 'Hoop Focus',
    subtitle: 'Basketball Video & Organization',
    atmosphere: 'ember',
    route: 'https://hoop.icynatural.now',
    status: 'forming',
    accent: '#ff9d5a',
    glyph: '◯',
    blurb: 'Hoop Focus is a basketball video and organization application centered on games, clips, mixtapes, and moments from play.',
    connections: ['reality-capture'],
  },
  {
    id: 'photogression',
    type: 'artifact',
    title: 'Photogression',
    subtitle: 'Lens · Ways of Seeing',
    atmosphere: 'forest',
    route: 'https://photogression.icynatural.now',
    external: false,
    status: 'live',
    accent: '#cfe7ff',
    glyph: '◉',
    blurb: 'A lens that teaches you how to capture. Photogression walks you through the different types of seeing — framing, light, distance, stillness, attention — so the photograph becomes a practice of looking rather than a reflex.',
    connections: ['reality-capture'],
    featured: true,
  },
];


// ── COLLECTIONS — curated groupings across the catalog ─────────────────
export interface Collection {
  id: string;
  title: string;
  blurb: string;
  members: string[];   // entity ids
}

export const collections: Collection[] = [
  {
    id: 'instruments',
    title: 'Instruments',
    blurb: 'Tools you use, not just read.',
    members: ['energy-engine', 'inquiry-engine'],
  },
  {
    id: 'archives',
    title: 'Archives',
    blurb: 'Curated bodies of high-signal material.',
    members: ['potent-library'],
  },
  {
    id: 'captures',
    title: 'Captures',
    blurb: 'Documents and observations recorded before interpretation.',
    members: ['reality-capture'],
  },
  {
    id: 'experiments',
    title: 'Experiments',
    blurb: 'Play, prototypes, and one-off probes.',
    members: ['pokedex-scanner', 'reality-capture'],
  },
];

// ── SIGNALS — short transmissions / current thinking ───────────────────
export interface Signal {
  id: string;
  title: string;
  body: string;
  stamp: string;        // freeform date / label
  origin?: string;      // entity id the signal is coming from
}

export const signals: Signal[] = [
  { id: 's1', stamp: 'Transmission 001', origin: 'inquiry-engine', title: 'Clarity returns when pressure drops.',     body: 'The system isn\'t broken when you can\'t see — the pressure is too high to perceive.' },
  { id: 's2', stamp: 'Transmission 002', origin: 'energy-engine',   title: 'You don\'t fix the mode. You change leads.', body: 'Sympathetic and parasympathetic don\'t fight — they take turns leading.' },
  { id: 's3', stamp: 'Transmission 003', origin: 'reality-capture', title: 'Become, slowly.',                            body: 'The personal layer cannot be rushed. The room is still being built.' },
];

// ── Convenience exports for legacy/back-compat ──────────────────────────
export const allEntities: Entity[] = [...worlds, ...artifacts];

// ── LENSES — the full ecosystem directory ───────────────────────────────
// One institute, many specialized tools. Each entry is a different lens on
// reality and shares the same information hierarchy:
//   title · philosophy (one line) · field (one paragraph)
export interface Lens {
  id: string;
  title: string;
  lens: string;          // "Observe change." — the lens verb
  philosophy: string;    // one-line philosophy
  field: string;         // one concise paragraph
  url: string;
  status: EntityStatus;
  accent: string;
  glyph: string;
  group: 'observatory' | 'instruments';
}

export const lenses: Lens[] = [
  // ── Observatories — public fields of study ──
  { id: 'photogression', title: 'Photogression', lens: 'Learn to see.', philosophy: 'Learn to see.', field: 'A lens that teaches you how to capture. Photogression walks you through the different types of seeing — framing, light, distance, stillness, attention — so the photograph becomes a practice of looking rather than a reflex.', url: 'https://photogression.icynatural.now', status: 'live', accent: '#cfe7ff', glyph: '◉', group: 'observatory' },
  { id: 'timeline', title: 'Timeline', lens: 'Observe time.', philosophy: 'Everything has a history.', field: 'Organizes events into chronological sequences, making it easy to explore how people, civilizations, discoveries, technologies, cultures, and ideas develop across time.', url: 'https://timeline.icynatural.now', status: 'live', accent: '#e8c07a', glyph: '⎯', group: 'observatory' },
  { id: 'beat', title: 'Beat', lens: 'Observe rhythm.', philosophy: 'Everything has rhythm.', field: 'Explores rhythm, percussion, groove, timing, musical structure, and the foundations of music. Study how patterns create movement, emotion, and culture across genres and generations.', url: 'https://beat.icynatural.now', status: 'live', accent: '#ff9d7a', glyph: '◍', group: 'observatory' },
  { id: 'phases', title: 'Phases', lens: 'Observe transitions.', philosophy: 'Everything changes.', field: 'Explores cycles, transitions, and changing states across nature, health, learning, creativity, behavior, and life. Understand not just where something is, but what stage it is in.', url: 'https://phases.icynatural.now', status: 'live', accent: '#b88aff', glyph: '◑', group: 'observatory' },
  { id: 'sense', title: 'Sense', lens: 'Observe perception.', philosophy: 'Observe before interpreting.', field: 'Helps you identify and understand the world through perception. Explore objects, sounds, images, text, and environments using observation before assumption.', url: 'https://vision.icynatural.now', status: 'live', accent: '#9bb88a', glyph: '◉', group: 'observatory' },
  { id: 'playground', title: 'Playground', lens: 'Observe experimentation.', philosophy: 'Experiment without limits.', field: 'A creative sandbox for testing ideas, building prototypes, exploring concepts, and turning curiosity into experiments before they become finished projects.', url: 'https://playground.icynatural.now', status: 'live', accent: '#7fe0c8', glyph: '◇', group: 'observatory' },
  { id: 'sample', title: 'Sample', lens: 'Observe origins.', philosophy: 'Everything comes from somewhere.', field: 'Sample traces the origins of music through sampling, interpolation, influence, production, and musical lineage, revealing how sounds evolve across generations.', url: 'https://sample.icynatural.now', status: 'live', accent: '#f2a65a', glyph: '⌁', group: 'observatory' },
  { id: 'symbol', title: 'Symbol', lens: 'Observe meaning.', philosophy: 'Meaning beyond words.', field: 'Symbol explores signs, icons, visual language, semiotics, mythology, and cultural symbolism to understand how humans communicate through images, shapes, and representations.', url: 'https://symbol.icynatural.now', status: 'live', accent: '#d9b8ff', glyph: '✶', group: 'observatory' },
  { id: 'reality', title: 'Reality', lens: 'Observe truth.', philosophy: 'Question what you know.', field: 'Reality is an inquiry platform built around observation, evidence, critical thinking, and understanding. Explore the world by asking better questions before reaching conclusions.', url: 'https://reality.icynatural.now', status: 'live', accent: '#cfe7ff', glyph: '◬', group: 'observatory' },
  { id: 'language', title: 'Language', lens: 'Observe communication.', philosophy: 'Words shape thought.', field: 'Language explores etymology, writing systems, semantic evolution, translation, linguistics, and the history of human communication to reveal how ideas travel through words.', url: 'https://language.icynatural.now', status: 'live', accent: '#e8c07a', glyph: '☰', group: 'observatory' },
  { id: 'livingcycles', title: 'Living Cycles', lens: 'Observe nature.', philosophy: 'Nature never stands still.', field: 'Living Cycles documents ecosystems through repeated observation. Track seasons, wildlife, weather, landscapes, water, and environmental change to understand how nature evolves over time.', url: 'https://livingcycles.icynatural.now', status: 'live', accent: '#8fc98a', glyph: '❧', group: 'observatory' },
  { id: 'formation', title: 'Formation', lens: 'Observe development.', philosophy: 'Everything is becoming something.', field: 'Formation explores how things are created and transformed — from mountains and stars to civilizations, identities, languages, habits, and ideas — revealing the processes behind development.', url: 'https://formation.icynatural.now', status: 'live', accent: '#c2956b', glyph: '△', group: 'observatory' },
  { id: 'motion', title: 'Motion', lens: 'Observe movement.', philosophy: 'Movement explains the world.', field: 'Motion explores biomechanics, coordination, athletics, dance, locomotion, body control, and physical movement, uncovering the principles that govern how living things move.', url: 'https://motion.icynatural.now', status: 'live', accent: '#7fcbff', glyph: '⟿', group: 'observatory' },
  { id: 'humanity', title: 'Humanity', lens: 'Observe ourselves.', philosophy: 'Understand ourselves.', field: 'Humanity explores psychology, behavior, culture, history, society, relationships, and cognition to better understand what connects people across time and place.', url: 'https://humanity.icynatural.now', status: 'live', accent: '#f0a3a3', glyph: '◐', group: 'observatory' },
  { id: 'wonder', title: 'Wonder', lens: 'Observe curiosity.', philosophy: 'Curiosity begins understanding.', field: 'Wonder is a collection of fascinating questions, remarkable discoveries, natural phenomena, historical mysteries, and moments that inspire deeper exploration of the world.', url: 'https://wonder.icynatural.now', status: 'live', accent: '#ffd98a', glyph: '✧', group: 'observatory' },
  { id: 'woah', title: 'Woah', lens: 'Observe the extraordinary.', philosophy: 'The world is full of surprises.', field: 'Woah showcases astonishing facts, unbelievable discoveries, incredible places, unexpected connections, and moments that challenge expectations and spark amazement.', url: 'https://woah.icynatural.now', status: 'live', accent: '#ff8fb1', glyph: '✷', group: 'observatory' },
  { id: 'martial', title: 'Martial', lens: 'Observe combat and discipline.', philosophy: 'Discipline through movement.', field: 'Martial explores combat systems, martial arts, historical fighting traditions, strategy, weapons, self-defense, and the physical and mental disciplines behind them.', url: 'https://martial.icynatural.now', status: 'live', accent: '#c9705a', glyph: '⚔', group: 'observatory' },

  // ── Instruments — the working tools of the institute ──
  { id: 'icy-clear-os', title: 'Icy Clear OS', lens: 'Observe clearly.', philosophy: 'See clearly.', field: 'An operating system for observation. Models, modes, and frameworks for seeing what is actually happening before reaching for explanation.', url: '/clear.html', status: 'live', accent: '#bfe4ff', glyph: '❄', group: 'instruments' },
  { id: 'energy-engine', title: 'Energy Engine', lens: 'Observe internal state.', philosophy: 'Understand your rhythms.', field: 'Energy Engine models rhythm, recovery, baseline shifts, and daily direction in one feedback loop. It is a physiological instrument for observing energy, recovery, and autonomic lead over time.', url: 'https://phases.icynatural.now', status: 'live', accent: '#b88aff', glyph: '◉', group: 'instruments' },
  { id: 'inquiry-engine', title: 'Inquiry Engine', lens: 'Observe through inquiry.', philosophy: 'Questions reveal structure.', field: 'Inquiry Engine is a question-first system for investigating problems and revealing their underlying shape.', url: '#', status: 'forming', accent: '#7fcbff', glyph: '◎', group: 'instruments' },
  { id: 'reality-capture', title: 'Reality Capture', lens: 'Observe evidence.', philosophy: 'Capture before interpretation.', field: 'Reality Capture is a document capture and observation archive for saving evidence, notes, and real-world material before interpretation.', url: 'https://reality.icynatural.now', status: 'live', accent: '#cfe7ff', glyph: '✒', group: 'instruments' },
  { id: 'semantic-archaeology', title: 'Semantic Archaeology', lens: 'Observe words through time.', philosophy: 'Every word is a fossil.', field: 'Semantic Archaeology explores words through their histories, roots, semantic changes, contexts, and uses across fields. It treats language as something that can be excavated rather than reduced to a single dictionary definition.', url: 'https://language.icynatural.now', status: 'live', accent: '#e8c07a', glyph: '☰', group: 'instruments' },
  { id: 'scenario-states', title: 'Scenario States', lens: 'Observe possibilities.', philosophy: 'Think in possibilities.', field: 'Scenario States explores situations as changing states that can expand into further states, making branching possibilities and transitions easier to examine.', url: 'https://scenario.icynatural.now', status: 'forming', accent: '#a8b8ff', glyph: '⑂', group: 'instruments' },
  { id: 'hoop-focus', title: 'Hoop Focus', lens: 'Observe the game.', philosophy: 'See the game differently.', field: 'Hoop Focus is a basketball video and organization application centered on games, clips, mixtapes, and moments from play.', url: 'https://hoop.icynatural.now', status: 'forming', accent: '#ff9d5a', glyph: '◯', group: 'instruments' },
  

];
