// Homepage content manifest — single authoritative source for the living homepage.
// Edit this file to update content. No layout code changes needed for normal updates.
//
// AUTHORING RULES
// 1. Drop media into public/home/... (or use an external URL).
// 2. Add/edit one entry below.
// 3. Assign role / world / motion as needed. Done.
//
// NAVIGATION RULE
// A drop NEVER navigates unless it has an explicit `href`.
// Image drops focus/view only. Video drops play/focus only.
// Placeholders never navigate. No inherited project links.

export type DropType = 'image' | 'video';

export type DropShape =
  | 'hero-wide'
  | 'panoramic'
  | 'wide'
  | 'square'
  | 'portrait'
  | 'tall'
  | 'compact';

export type DropRole =
  | 'hero'
  | 'field'
  | 'fragment'
  | 'strip'
  | 'signal'
  | 'quiet';

export type WorldSide = 'clearer' | 'natural' | 'shared';

export type MotionMode = 'still' | 'drift' | 'parallax' | 'drag';

export interface Drop {
  id: string;
  type: DropType;
  src: string;
  poster?: string;
  label?: string;
  alt: string;
  /** Explicit destination. Omit → non-interactive (view / play only). */
  href?: string;
  external?: boolean;
  role?: DropRole;
  shape?: DropShape;
  world?: WorldSide;
  motion?: MotionMode;
  accent?: string;
  glyph?: string;
}

export interface DropSection {
  id: string;
  label: string;
  note?: string;
  layout: 'mosaic' | 'strip' | 'field';
  dropIds: string[];
}

export interface IdentityConfig {
  mark: string;
  title: string;
  titleAmp?: string;
  subtitle: string;
  tagline?: string;
  background?: string;
}

export interface DoorConfig {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  external?: boolean;
  image: string;
  world: WorldSide;
  glyph: string;
}

export interface PortfolioConfig {
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  external: boolean;
  glyph: string;
}

export interface WorldPortalConfig {
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  image: string;
  glyph: string;
}

export interface SignalItem {
  id: string;
  label: string;
  href: string;
  external?: boolean;
  glyph?: string;
  accent?: string;
}

export const homeContent = {
  identity: {
    mark: '✦',
    title: 'Icy Clearer',
    titleAmp: '&',
    subtitle: 'World 01 · Systems — World 02 · Forming',
    tagline: 'See clearly. Become slowly.',
  } as IdentityConfig,

  // ── Generic drops — assigned to sections, never tied to project routes ──
  drops: [
    {
      id: 'drop-01',
      type: 'image',
      src: '/home/drops/drop-01.svg',
      alt: 'Frozen ridge under a signal sky — current systems work',
      label: 'Systems weather',
      role: 'hero',
      shape: 'hero-wide',
      world: 'clearer',
      motion: 'parallax',
      accent: '#bfe4ff',
      glyph: '❄',
    },
    {
      id: 'drop-02',
      type: 'image',
      src: '/home/drops/drop-02.svg',
      alt: 'Forest light shaft — field notes in progress',
      label: 'Field notes',
      role: 'field',
      shape: 'square',
      world: 'natural',
      motion: 'drift',
      accent: '#c7e3b1',
      glyph: '❧',
    },
    {
      id: 'drop-03',
      type: 'image',
      src: '/home/drops/drop-03.svg',
      alt: 'Instrument glow — an active experiment',
      label: 'Instrument',
      role: 'field',
      shape: 'square',
      world: 'shared',
      motion: 'parallax',
      accent: '#9fd9ff',
      glyph: '◎',
    },
    {
      id: 'drop-04',
      type: 'image',
      src: '/home/drops/drop-04.svg',
      alt: 'Portrait light in the trees — a moment worth noticing',
      label: 'Worth keeping',
      role: 'fragment',
      shape: 'portrait',
      world: 'natural',
      motion: 'drag',
      accent: '#d7e8b8',
      glyph: '✤',
    },
    {
      id: 'drop-05',
      type: 'image',
      src: '/home/drops/drop-05.svg',
      alt: 'Ice lake horizon with constellation overlay',
      label: 'Long horizon',
      role: 'fragment',
      shape: 'wide',
      world: 'clearer',
      motion: 'drift',
      accent: '#bfe4ff',
      glyph: '✦',
    },
    {
      id: 'drop-06',
      type: 'image',
      src: '/home/drops/drop-06.svg',
      alt: 'Public signal — code constellation over night sky',
      label: 'Public signal',
      role: 'signal',
      shape: 'compact',
      world: 'clearer',
      href: 'https://github.com/icyclear',
      external: true,
      motion: 'still',
      accent: '#7fcbff',
      glyph: '⌘',
    },
    {
      id: 'drop-07',
      type: 'image',
      src: '/home/drops/drop-07.svg',
      alt: 'Moss and static — a quiet field recording',
      label: 'Field recording',
      role: 'quiet',
      shape: 'compact',
      world: 'natural',
      motion: 'still',
      accent: '#c7e3b1',
      glyph: '∿',
    },
    {
      id: 'drop-08',
      type: 'image',
      src: '/home/drops/drop-08.svg',
      alt: 'Threshold where ice meets forest',
      label: 'Threshold',
      role: 'quiet',
      shape: 'compact',
      world: 'shared',
      motion: 'still',
      accent: '#a8d8c8',
      glyph: '◈',
    },
  ] as Drop[],

  sections: [
    {
      id: 'current',
      label: 'Going crazy on',
      note: 'live signal',
      layout: 'mosaic',
      dropIds: ['drop-01', 'drop-02', 'drop-03'],
    },
    {
      id: 'noticing',
      label: 'Worth noticing',
      note: 'swipe',
      layout: 'strip',
      dropIds: ['drop-04', 'drop-05', 'drop-02', 'drop-08'],
    },
    {
      id: 'outside',
      label: 'Outside with it',
      layout: 'field',
      dropIds: ['drop-06', 'drop-07', 'drop-08'],
    },
  ] as DropSection[],

  // ── Environmental doorways ──
  doors: [
    {
      id: 'clear',
      title: 'Clear',
      eyebrow: 'Icy Clear OS',
      description: 'Doctrine · models · instruments',
      href: '/clear.html',
      image: '/clearnatural.png',
      world: 'clearer',
      glyph: '❄',
    },
    {
      id: 'natural',
      title: 'Natural',
      eyebrow: 'Icy Natural',
      description: 'Forming · play · becoming',
      href: '/natural.html',
      image: '/clearnatural.png',
      world: 'natural',
      glyph: '❧',
    },
    {
      id: 'worlds',
      title: 'Two Worlds',
      eyebrow: 'The boundary',
      description: 'One life · two climates',
      href: '/worlds.html',
      image: '/clearnatural.png',
      world: 'shared',
      glyph: '◎',
    },
  ] as DoorConfig[],

  portfolio: {
    title: 'Portfolio',
    eyebrow: 'Living archive',
    description: 'Systems, archives, experiments — a record of what I\'ve made, still accumulating.',
    href: 'https://github.com/icyclear',
    external: true,
    glyph: '◇',
  } as PortfolioConfig,

  worldPortal: {
    title: 'World',
    eyebrow: 'Enter my systems',
    description: 'The spatial map — every instrument, observatory, and connection.',
    href: '/world.html',
    image: '/icy-portal.png',
    glyph: '◎',
  } as WorldPortalConfig,

  // Only real, configured destinations. Never invent links.
  signals: [
    { id: 'github', label: 'GitHub', href: 'https://github.com/icyclear', external: true, glyph: '⌘', accent: '#e8e4d8' },
    { id: 'twitter', label: 'Twitter', href: 'https://x.com/icyclear', external: true, glyph: '✕', accent: '#e8e4d8' },
    { id: 'instagram', label: 'Instagram', href: 'https://instagram.com/icyclear', external: true, glyph: '◎', accent: '#e8e4d8' },
    { id: 'discord', label: 'Discord', href: 'https://discord.gg/icyclear', external: true, glyph: '◈', accent: '#7fcbff' },
    { id: 'youtube', label: 'YouTube', href: 'https://youtube.com/@icyclear', external: true, glyph: '▶', accent: '#ff6b6b' },
  ] as SignalItem[],
};

export function getDrop(dropId: string): Drop | undefined {
  return homeContent.drops.find((d) => d.id === dropId);
}

export function getDropsForSection(sectionId: string): Drop[] {
  const section = homeContent.sections.find((s) => s.id === sectionId);
  if (!section) return [];
  return section.dropIds
    .map((id) => getDrop(id))
    .filter((d): d is Drop => Boolean(d));
}

export const HOME_ASSET_FOLDERS = {
  drops: '/home/drops/',
  portals: '/home/portals/',
  portraits: '/home/portraits/',
  gaming: '/home/gaming/',
  music: '/home/music/',
  systems: '/home/systems/',
  clips: '/home/clips/',
  photos: '/home/photos/',
  hero: '/home/hero/',
  archive: '/home/archive/',
} as const;
