// Living Homepage & Individual Worlds data manifest.
// Composes verified media, links, and records from existing room manifests so
// additions in Local Studio or projects.ts surface without rewriting layouts.

import homeManifest from './media/home.json';
import momentsManifest from './media/moments.json';
import naturalManifest from './media/natural.json';
import snapshot from '../../public/gaming/data/public-snapshot.json';
import { artifacts, lenses } from './projects';
import { homeContent } from './home';
import { naraka, gameplay, clips, evaluationUrl, channel } from './gaming';
import { homeReflectionSources } from '../scripts/home-scene';

const byId = (list: any[], id: string) => list.find((item) => item.id === id && !item.deleted);

// ── HERO / LAKE THRESHOLD (derived from home.json + real personal media) ──
const skyItem = byId(homeManifest, 'home-sky');
const portalItem = byId(homeManifest, 'home-portal');
const handleItem = byId(homeManifest, 'home-handle');

export const thresholdData = {
  handle: handleItem?.text || '@ICYCLEARER',
  handleHref: handleItem?.href || 'https://www.instagram.com/icyclearer/',
  kicker: 'a living archive of interests, play, and personal curation.',
  titleLines: ['ICY', 'CLEARER'] as const,
  signature: 'Chad',
  heading: 'Become, slowly.',
  lead: 'Interests, movement, captures, sound, software, and personal perspective — not filed into boxes, each opening into its own room.',
  lakePoster: '/media/home/life/19781-lake-poster.jpg',
  lakeVideo: '/media/home/life/19781-lake-background.mp4',
  sunsetPhoto: {
    src: skyItem?.src || '/media/home/495c5c57c786ffbd5693.jpg',
    alt: skyItem?.overrides?.alt || 'Golden sunset breaking through clouds above the lake, photographed by Chad',
    note: 'Lens Captured',
    href: skyItem?.href || '/moments.html',
  },
  portal: portalItem || { id: 'home-portal', group: 'portal', href: '/natural.html', kind: 'placeholder' },
  reflections: homeReflectionSources(homeManifest, momentsManifest),
};

// ── WORLD INDEX (for quiet navigation & expandable subject ordering) ──
export interface WorldAnchor {
  id: string;
  number: string;
  name: string;
  climate: 'light' | 'dark';
  href: string;
  sectionHref: string;
}

export const worldAnchors: WorldAnchor[] = [
  { id: 'gaming', number: '01', name: 'Gaming', climate: 'dark', href: '/games.html', sectionHref: '#gaming' },
  { id: 'basketball', number: '02', name: 'Basketball', climate: 'light', href: '/basketball.html', sectionHref: '#basketball' },
  { id: 'moments', number: '03', name: 'Moments', climate: 'dark', href: '/moments.html', sectionHref: '#moments' },
  { id: 'music', number: '04', name: 'Music', climate: 'dark', href: '/music.html', sectionHref: '#music' },
  { id: 'creations', number: '05', name: 'Creations', climate: 'light', href: '/creations.html', sectionHref: '#creations' },
  { id: 'perspective', number: '06', name: 'How I See It', climate: 'dark', href: '/clear.html', sectionHref: '#perspective' },
];

// ── 01 · GAMING (reuses /games.html & /gaming/ + real clips & snapshot) ──
const marvelClip = byId(naturalManifest, 'play-marvel');
const ratedGames = snapshot.collections.experiences;

const preferredRatingOrder = [
  'game:user:naraka',
  'game:user:shape-of-dreams',
  'game:user:hi-fi-rush',
  'game:user:gow5',
  'game:halo-infinite',
  'game:user:melty-blood',
];

const featuredRatings = preferredRatingOrder
  .map((gameId) => ratedGames.find((record) => record.gameId === gameId))
  .filter(Boolean)
  .map((record: any) => ({
    id: record.id,
    gameId: record.gameId,
    gameName: record.gameName,
    platform: record.platform,
    score: record.score,
    verdict: record.verdict,
    scores: record.scores,
    href: `/gaming/?view=results&experience=${encodeURIComponent(record.id)}`,
  }));

export const gamingWorld = {
  leadClip: {
    videoId: gameplay.videoId,
    title: gameplay.metadata.title,
    game: 'Naraka: Bladepoint',
    author: gameplay.metadata.author,
    thumbnail: gameplay.metadata.thumbnail,
    alt: gameplay.overrides?.alt || gameplay.metadata.title,
    href: `/games.html?highlight=${encodeURIComponent(gameplay.videoId)}`,
    canonicalUrl: gameplay.metadata.canonicalUrl,
  },
  featuredClips: clips.map((clip, index) => ({
    videoId: clip.videoId,
    title: clip.metadata.title,
    tag: index === 0 ? 'Naraka 1v1' : index === 1 ? 'Halo Infinite' : 'Gears E-Day',
    thumbnail: clip.metadata.thumbnail,
    aspect: clip.metadata.aspect,
    href: `/games.html?highlight=${encodeURIComponent(clip.videoId)}`,
    canonicalUrl: clip.metadata.canonicalUrl,
  })),
  archiveClips: [
    ...(marvelClip
      ? [{
          videoId: marvelClip.videoId,
          title: marvelClip.metadata.title,
          shortLabel: 'Marvel Rivals · Venom 1v6',
          tag: 'Marvel Rivals',
          thumbnail: marvelClip.metadata.thumbnail,
          canonicalUrl: marvelClip.metadata.canonicalUrl,
        }]
      : []),
    {
      videoId: 'sOJHKw6G6a8',
      title: 'Dragonball sparking zero has a PERCEPTION problem',
      shortLabel: 'Sparking Zero · Perception',
      tag: 'Sparking Zero',
      thumbnail: '/intro/highlights/sparking-zero.jpg',
      canonicalUrl: 'https://www.youtube.com/watch?v=sOJHKw6G6a8',
    },
  ],
  naraka,
  featuredRatings,
  ratingCount: ratedGames.length,
  evaluationUrl,
  channelUrl: channel,
  paths: [
    { label: 'Enter Gaming', href: '/games.html', primary: true },
    { label: 'Highlights', href: '/games.html#highlights-title' },
    { label: `My Take · ${naraka.score.toFixed(1)}/10`, href: '/games.html#naraka-evaluation' },
    { label: `All ${ratedGames.length} Ratings`, href: '/gaming/?view=history' },
    { label: 'Gaming OS', href: '/gaming/' },
  ],
};

// ── 02 · BASKETBALL (real court footage + real portrait + Hoop Focus) ──
const basketballClips = naturalManifest.filter(
  (item: any) =>
    !item.deleted &&
    item.group === 'play-basketball' &&
    item.kind !== 'placeholder' &&
    (item.src || item.source || item.videoId)
);

const primaryHoop = basketballClips[0] || {
  id: 'play-hoop',
  kind: 'video',
  src: '/media/home/life/64675-basketball.mp4',
  metadata: {
    title: 'Hesi pull pretty asf',
    thumbnail: '/media/home/life/64675-basketball-poster.jpg',
    aspect: 0.5625,
  },
};

const hoopFocusProject = artifacts.find((a) => a.id === 'hoop-focus');
const motionLens = lenses.find((l) => l.id === 'motion');

export const basketballWorld = {
  portrait: {
    src: '/media/home/life/66028-personal-portrait.jpg',
    alt: 'Personal portrait of Chad',
  },
  leadFootage: {
    id: primaryHoop.id,
    title: primaryHoop.overrides?.title || primaryHoop.metadata?.title || 'Hesi pull pretty asf',
    videoSrc: primaryHoop.src || primaryHoop.source || '/media/home/life/64675-basketball.mp4',
    poster: primaryHoop.metadata?.thumbnail || '/media/home/life/64675-basketball-poster.jpg',
    aspect: primaryHoop.metadata?.aspect || 0.5625,
  },
  clips: basketballClips.map((item: any) => ({
    id: item.id,
    kind: item.kind,
    title: item.overrides?.title || item.metadata?.title || 'Court clip',
    src: item.src || item.source,
    poster: item.metadata?.thumbnail || '/media/home/life/64675-basketball-poster.jpg',
    aspect: item.metadata?.aspect || 0.5625,
  })),
  hoopFocus: hoopFocusProject
    ? {
        title: hoopFocusProject.title,
        status: hoopFocusProject.status,
        blurb: hoopFocusProject.blurb,
        href: hoopFocusProject.route,
      }
    : null,
  motionLens: motionLens
    ? {
        title: motionLens.title,
        philosophy: motionLens.philosophy,
        field: motionLens.field,
        href: motionLens.url,
      }
    : null,
  paths: [
    { label: 'Enter Basketball', href: '/basketball.html', primary: true },
    { label: 'Court Footage', href: '/basketball.html#footage' },
    { label: 'Movement & Rhythm', href: '/basketball.html#movement' },
    ...(hoopFocusProject ? [{ label: 'Hoop Focus (Forming)', href: hoopFocusProject.route, external: true }] : []),
  ],
};

// ── 03 · MOMENTS / PHOTOGRAPHY (live from moments.json, deep-linked!) ──
const liveMoments = momentsManifest.filter((item: any) => !item.deleted && item.kind === 'image');

// Curated descriptive labels grounded directly in the real photographs in moments.json.
const momentFallbacks: Record<string, { label: string; alt: string }> = {
  'media-9cbd40939ce4cac0ba62a03f6d391f14': { label: 'Lake light & stone', alt: 'Sun shimmering directly across rippled lake water and rocky shore' },
  'media-dfca8515a151c170d9ce2f742f12bc45': { label: 'Dusk across the water', alt: 'Golden sunset horizon framed by shoreline leaves over calm water' },
  'media-57c4d0209db55af02fc89b642d986169': { label: 'Heron through branches', alt: 'White heron perched on lakeside rocks seen through tree branches' },
  'media-07be7bb43cef592b25d6d2cba8509ac0': { label: 'Night flora', alt: 'Close-up botanical study illuminated in darkness' },
  'media-934f55c597d366bcbc081137755e830a': { label: 'Still shore reflection', alt: 'Misty green treeline and white egret mirrored in quiet lake water' },
  'media-3ff72c170efb5bcda4122af1f4ea9316': { label: 'Horizon break', alt: 'Glowing orange sun slipping beneath storm clouds over choppy water' },
  'media-f6256eef13607aa403b746d8508e7e2c': { label: 'Oak trunk lookout', alt: 'Squirrel peering around a textured mossy tree trunk' },
  'media-e9b44a9ec1395af1e7b619dbeb9d19f0': { label: 'White bloom & bee', alt: 'Honeybee hovering inside a luminous white moonflower blossom' },
};

const mappedMoments = liveMoments.map((item: any, index: number) => {
  const fallback = momentFallbacks[item.id];
  const label = item.overrides?.title || item.overrides?.label || item.label || fallback?.label || `Capture ${String(index + 1).padStart(2, '0')}`;
  const alt = item.overrides?.alt || fallback?.alt || label;
  return {
    id: item.id,
    src: item.displaySrc || item.src,
    fullSrc: item.src,
    aspect: item.metadata?.aspect || (item.pixelWidth && item.pixelHeight ? item.pixelWidth / item.pixelHeight : 0.75),
    label,
    alt,
    href: `/moments.html#moment=${encodeURIComponent(item.id)}`,
  };
});

// Hand-chosen 5-photo spatial cluster (falls back gracefully if manifest changes)
const clusterOrder = [
  'media-9cbd40939ce4cac0ba62a03f6d391f14', // 0: primary lake sun
  'media-dfca8515a151c170d9ce2f742f12bc45', // 1: dusk horizon
  'media-e9b44a9ec1395af1e7b619dbeb9d19f0', // 2: moonflower bee foreground
  'media-934f55c597d366bcbc081137755e830a', // 3: misty lakeside woods
  'media-3ff72c170efb5bcda4122af1f4ea9316', // 4: horizon break sun
];

const pickedCluster = [
  ...clusterOrder.map((id) => mappedMoments.find((m) => m.id === id)).filter(Boolean),
  ...mappedMoments.filter((m) => !clusterOrder.includes(m.id)),
].slice(0, 5) as typeof mappedMoments;

export const momentsWorld = {
  totalCount: mappedMoments.length,
  featuredPhotos: pickedCluster,
  allPhotos: mappedMoments,
  paths: [
    { label: `Enter Observatory (${String(mappedMoments.length).padStart(2, '0')})`, href: '/moments.html', primary: true },
    { label: 'Photogression · Ways of Seeing', href: 'https://photogression.icynatural.now', external: true },
  ],
};

// ── 04 · MUSIC (honest inventory: ICY Music Lab + Beat + Sample + Voice) ──
const beatLens = lenses.find((l) => l.id === 'beat');
const sampleLens = lenses.find((l) => l.id === 'sample');
const voiceArtifacts = naturalManifest.filter(
  (item: any) =>
    !item.deleted &&
    item.kind !== 'placeholder' &&
    Array.isArray(item.signals) &&
    item.signals.includes('VOICE')
);

export const musicWorld = {
  musicLabUrl: 'https://music.icyclearer.com',
  studies: [
    ...(beatLens
      ? [{ id: 'beat', title: beatLens.title, lens: beatLens.lens, philosophy: beatLens.philosophy, field: beatLens.field, href: beatLens.url, accent: beatLens.accent, glyph: beatLens.glyph }]
      : []),
    ...(sampleLens
      ? [{ id: 'sample', title: sampleLens.title, lens: sampleLens.lens, philosophy: sampleLens.philosophy, field: sampleLens.field, href: sampleLens.url, accent: sampleLens.accent, glyph: sampleLens.glyph }]
      : []),
  ],
  voiceArtifacts,
  paths: [
    { label: 'Enter Music', href: '/music.html', primary: true },
    { label: 'ICY Music Lab', href: 'https://music.icyclearer.com', external: true },
    ...(beatLens ? [{ label: 'Beat · Rhythm', href: beatLens.url, external: true }] : []),
    ...(sampleLens ? [{ label: 'Sample · Origins', href: sampleLens.url, external: true }] : []),
  ],
};

// ── 05 · CREATIONS / INTERFACES (Interactive Pigment Palette + Real Work) ──
export interface CreationWork {
  id: string;
  title: string;
  pigmentName: string;
  pigmentHex: string;
  pigmentSurface: string;
  kind: string;
  status: string;
  philosophy: string;
  description: string;
  href: string;
  external: boolean;
  glyph: string;
  visualType: 'orbit' | 'photo' | 'strata' | 'aperture' | 'scanner' | 'sandbox' | 'gaming' | 'studies';
  previewSrc?: string;
  previewAlt?: string;
  relatedIds: string[];
  studies?: { title: string; subtitle: string; src: string; alt: string }[];
}

const findLens = (id: string) => lenses.find((l) => l.id === id);
const findArtifact = (id: string) => artifacts.find((a) => a.id === id);

export const materialStudies = [
  {
    title: 'Garment Study',
    subtitle: 'Something to live in — room to move',
    src: '/media/natural/garment-study.svg',
    alt: 'Garment pattern study sketch with hand notes: Something to live in, room to move',
  },
  {
    title: 'Material Study / 001',
    subtitle: 'Touch before finish — woven textile study',
    src: '/media/natural/cloth-study.svg',
    alt: 'Woven cloth texture study reading touch before finish',
  },
  {
    title: 'Formulation Study',
    subtitle: 'A little of the earth — botanical work in progress',
    src: '/media/natural/oil-study.svg',
    alt: 'Botanical glass bottle formulation study reading a little of the earth',
  },
];

export const creationWorks: CreationWork[] = [
  {
    id: 'energy-engine',
    title: 'Energy Engine',
    pigmentName: 'Aurora Violet',
    pigmentHex: '#7d56c9',
    pigmentSurface: '#ede6f8',
    kind: 'Physiological Instrument',
    status: 'Live',
    philosophy: findLens('energy-engine')?.philosophy || 'Understand your rhythms.',
    description: findArtifact('energy-engine')?.blurb || 'Models rhythm, recovery, baseline shifts, and daily direction in one feedback loop.',
    href: 'https://phases.icynatural.now',
    external: true,
    glyph: '◉',
    visualType: 'orbit',
    relatedIds: ['reality-capture', 'semantic-archaeology'],
  },
  {
    id: 'photogression',
    title: 'Photogression',
    pigmentName: 'Shoreline Blue',
    pigmentHex: '#3f7ea6',
    pigmentSurface: '#e3eff6',
    kind: 'Ways of Seeing · Lens',
    status: 'Live',
    philosophy: findLens('photogression')?.philosophy || 'Learn to see.',
    description: findArtifact('photogression')?.blurb || 'Walks through framing, light, distance, stillness, and attention so the photograph becomes a practice of looking.',
    href: 'https://photogression.icynatural.now',
    external: true,
    glyph: '◉',
    visualType: 'photo',
    previewSrc: '/media/moments/3da6aa713541c9f283ae.jpg.display.webp',
    previewAlt: 'Lake sunlight photograph captured through Photogression',
    relatedIds: ['reality-capture', 'icyvision'],
  },
  {
    id: 'semantic-archaeology',
    title: 'Semantic Archaeology',
    pigmentName: 'Fossil Ochre',
    pigmentHex: '#b87d2e',
    pigmentSurface: '#f5ebda',
    kind: 'Atlas of Words',
    status: 'Live',
    philosophy: findLens('semantic-archaeology')?.philosophy || 'Every word is a fossil.',
    description: findLens('semantic-archaeology')?.field || 'Explores words through their histories, roots, semantic changes, contexts, and uses across fields.',
    href: 'https://language.icynatural.now',
    external: true,
    glyph: '☰',
    visualType: 'strata',
    relatedIds: ['reality-capture', 'energy-engine'],
  },
  {
    id: 'reality-capture',
    title: 'Reality Capture',
    pigmentName: 'Slate Ink',
    pigmentHex: '#436475',
    pigmentSurface: '#e4ecef',
    kind: 'Observation Archive',
    status: 'Live',
    philosophy: findLens('reality-capture')?.philosophy || 'Capture before interpretation.',
    description: findArtifact('reality-capture')?.blurb || 'A document capture and observation archive for saving evidence, notes, and real-world material before interpretation.',
    href: 'https://reality.icynatural.now',
    external: true,
    glyph: '◬',
    visualType: 'aperture',
    relatedIds: ['semantic-archaeology', 'icyvision', 'photogression'],
  },
  {
    id: 'icyvision',
    title: 'IcyVision Scanner',
    pigmentName: 'Field Moss',
    pigmentHex: '#507d47',
    pigmentSurface: '#e5efe2',
    kind: 'Visual Discovery',
    status: 'Live',
    philosophy: findLens('sense')?.philosophy || 'Observe before interpreting.',
    description: findArtifact('pokedex-scanner')?.blurb || 'A playful visual scanner for identifying, observing, and turning ordinary things into discoveries.',
    href: 'https://vision.icynatural.now',
    external: true,
    glyph: '◈',
    visualType: 'scanner',
    previewSrc: '/media/moments/8cb967d793938116fa49.jpg.display.webp',
    previewAlt: 'Honeybee inside a white blossom observed through a visual discovery lens',
    relatedIds: ['reality-capture', 'playground'],
  },
  {
    id: 'playground',
    title: 'Playground',
    pigmentName: 'Studio Seafoam',
    pigmentHex: '#2f8a74',
    pigmentSurface: '#dff0eb',
    kind: 'Creative Sandbox',
    status: 'Live',
    philosophy: findLens('playground')?.philosophy || 'Experiment without limits.',
    description: findArtifact('playground')?.blurb || 'A creative sandbox for testing ideas, building prototypes, and turning curiosity into experiments.',
    href: 'https://playground.icynatural.now',
    external: true,
    glyph: '◇',
    visualType: 'sandbox',
    relatedIds: ['energy-engine', 'icyvision'],
  },
  {
    id: 'gaming-os',
    title: 'Gaming OS',
    pigmentName: 'Vermilion Ember',
    pigmentHex: '#b8533e',
    pigmentSurface: '#f4e5e0',
    kind: 'Personal Taste Engine',
    status: 'Live',
    philosophy: 'Quantify feel without losing taste.',
    description: `Personal 9-axis game evaluation environment tracking control feel, clarity, freedom, expression, depth, flow, intensity, and replay across ${ratedGames.length} published ratings.`,
    href: '/gaming/',
    external: false,
    glyph: '◈',
    visualType: 'gaming',
    previewSrc: gameplay.metadata.thumbnail,
    previewAlt: 'Naraka Bladepoint gameplay inside Gaming OS',
    relatedIds: ['playground', 'energy-engine'],
  },
  {
    id: 'material-studies',
    title: 'Garment & Material Studies',
    pigmentName: 'Raw Linen',
    pigmentHex: '#826b4c',
    pigmentSurface: '#efe7d9',
    kind: 'Visual & Physical Craft',
    status: 'In Progress',
    philosophy: 'Touch before finish. Something to live in.',
    description: 'Early personal studies in garment silhouettes, woven cloth surfaces, and botanical formulation — physical making alongside software.',
    href: '/creations.html?work=material-studies',
    external: false,
    glyph: '⊕',
    visualType: 'studies',
    previewSrc: '/media/natural/garment-study.svg',
    previewAlt: 'Garment pattern sketch study',
    relatedIds: ['playground', 'photogression'],
    studies: materialStudies,
  },
];

export const creationsWorld = {
  works: creationWorks,
  studies: materialStudies,
  paths: [
    { label: 'Enter Creations Studio', href: '/creations.html', primary: true },
    { label: 'App World · Spatial Atlas', href: '/world.html' },
    { label: 'GitHub Archive', href: 'https://github.com/icynatural', external: true },
  ],
};

// ── 06 · HOW I SEE IT (honest first-person perspective from clear.astro & written models) ──
export const perspectiveElements = [
  {
    number: '01',
    title: 'Resources',
    subtitle: 'The means',
    summary: 'Money, time, energy, health, knowledge, tools, and relationships give me possibilities — to use, not confuse with living itself.',
    href: '/clear.html#framework',
  },
  {
    number: '02',
    title: 'Security',
    subtitle: 'The continuity',
    summary: 'Enough stability to meet responsibilities, absorb setbacks, and keep exploring without making security the whole purpose of life.',
    href: '/clear.html#framework',
  },
  {
    number: '03',
    title: 'Freedom',
    subtitle: 'The choice',
    summary: 'Meaningful room to choose where time and attention go. The doors matter more than the number.',
    href: '/clear.html#framework',
  },
  {
    number: '04',
    title: 'Creation',
    subtitle: 'The expression',
    summary: 'Turning curiosity into experiments, software, art, ideas, and new abilities — not everything needs a market or finish line.',
    href: '/clear.html#framework',
  },
  {
    number: '05',
    title: 'Living',
    subtitle: 'The participation',
    summary: 'Studying, building, playing, moving, traveling, noticing the world, being with people: these are not delays before life begins.',
    href: '/clear.html#framework',
  },
  {
    number: '06',
    title: 'Renewal',
    subtitle: 'The return',
    summary: 'Rest, reflection, and changing direction belong to development. Enjoyment without an output is still meaningful.',
    href: '/clear.html#framework',
  },
];

// Only verified, fully written models (excluding placeholder doctrine stubs).
export const writtenModels = [
  {
    idx: 'M-01',
    title: 'Seeing Before Naming',
    line: 'Your first interpretation is not the event itself.',
    chain: 'event → sensation → perception → interpretation → label',
    href: '/models/seeing-before-naming.html',
  },
  {
    idx: 'M-02',
    title: 'Replace Stories with Systems',
    line: 'A story explains. A mechanism predicts. Only one of them can be tested.',
    chain: 'actors ⇄ incentives ⇄ constraints ⇄ feedback',
    href: '/models/replace-stories-with-systems.html',
  },
  {
    idx: 'M-03',
    title: 'From Reaction to Pattern',
    line: 'A single frame is noise. Direction is the signal.',
    chain: 'frame · frame · frame · frame → trajectory',
    href: '/models/from-reaction-to-pattern.html',
  },
  {
    idx: 'M-04',
    title: 'Coherence vs. Entropy',
    line: 'Is the system holding its shape, or spending itself?',
    chain: 'organization ⇄ drift',
    href: '/models/coherence-vs-entropy.html',
  },
  {
    idx: 'M-05',
    title: 'Clear Again',
    line: 'You do not stay clear. You get clear again, on a shorter interval.',
    chain: 'drift → notice → adjust → return',
    href: '/models/clear-again.html',
  },
];

export const perspectiveWorld = {
  quote: 'Development is not preparation for my life. Development is part of my life.',
  note: 'Not a doctrine or a set of instructions — just how I currently see.',
  sequence: ['Notice', 'Explore', 'Learn', 'Create', 'Experience', 'Reflect', 'Renew'],
  elements: perspectiveElements,
  models: writtenModels,
  paths: [
    { label: 'Enter ICY CLEAR', href: '/clear.html', primary: true },
    { label: 'The Framework (01–06)', href: '/clear.html#framework' },
    { label: 'Generative Reality · How I See More', href: '/generative-reality.html' },
    { label: 'What is Enough?', href: '/clear.html#enough' },
    { label: 'Two Worlds', href: '/worlds.html' },
  ],
};

// ── REAL VERIFIED SOCIAL LINKS (from src/data/home.ts) ──
export const socialPresence = homeContent.social.items.map((item) => ({
  id: item.id,
  label: item.label || item.alt,
  href: item.href,
  external: item.external,
}));
