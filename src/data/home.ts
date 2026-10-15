// Homepage content manifest — single authoritative source for the visual identity page.
// Edit this file to update content. No layout code changes needed for normal updates.

export type MediaType = 'image' | 'video' | 'project' | 'link';

export type SlotSize = 'hero-wide' | 'wide' | 'square' | 'portrait' | 'tall' | 'compact' | 'feature';

export interface LayoutSlot {
  id: string;
  size: SlotSize;
  group: 'identity' | 'current' | 'highlights' | 'outside' | 'portfolio' | 'world' | 'social';
  order: number;
}

export interface MediaItem {
  id: string;
  type: MediaType;
  slotId: string;          // references a layout slot
  src: string;             // path under /home/... or external URL
  poster?: string;         // for video
  alt: string;
  label?: string;          // short label
  href?: string;           // destination on click
  external?: boolean;      // opens in new tab
  accent?: string;         // accent color for this item
  tags?: string[];         // for filtering/grouping
  glyph?: string;
}

export interface IdentityConfig {
  mark: string;
  title: string;
  subtitle: string;
  accent: string;
  background?: string;
}

export interface SectionConfig {
  id: string;
  label: string;
  slotIds: string[];       // which slots belong to this section
}

export interface PortfolioConfig {
  title: string;
  description: string;
  href: string;
  external: boolean;
  accent: string;
  glyph: string;
  stats?: { label: string; value: string }[];
}

export interface WorldDoorwayConfig {
  title: string;
  description: string;
  href: string;
  accent: string;
  glyph: string;
}

export interface SocialConfig {
  items: MediaItem[];      // edge/corner portals
}

export const homeContent = {
  // Layout slots — generic drop zones, not tied to specific projects
  layoutSlots: [
    // Identity (special — not a media slot)
    { id: 'identity', size: 'hero-wide', group: 'identity', order: 0 },

    // Current — "Going crazy on"
    { id: 'drop-01', size: 'hero-wide', group: 'current', order: 1 },
    { id: 'drop-02', size: 'square', group: 'current', order: 2 },
    { id: 'drop-03', size: 'square', group: 'current', order: 3 },

    // Highlights — "Worth noticing"
    { id: 'drop-04', size: 'portrait', group: 'highlights', order: 4 },
    { id: 'drop-05', size: 'wide', group: 'highlights', order: 5 },

    // Outside — "Outside with it"
    { id: 'drop-06', size: 'compact', group: 'outside', order: 6 },
    { id: 'drop-07', size: 'compact', group: 'outside', order: 7 },
    { id: 'drop-08', size: 'compact', group: 'outside', order: 8 },

    // Portfolio (special)
    { id: 'portfolio', size: 'feature', group: 'portfolio', order: 9 },

    // World doorway (special)
    { id: 'world', size: 'feature', group: 'world', order: 10 },
  ] as LayoutSlot[],

  // Section configuration — which slots belong to which labeled section
  sections: [
    { id: 'current', label: 'Going crazy on', slotIds: ['drop-01', 'drop-02', 'drop-03'] },
    { id: 'highlights', label: 'Worth noticing', slotIds: ['drop-04', 'drop-05'] },
    { id: 'outside', label: 'Outside with it', slotIds: ['drop-06', 'drop-07', 'drop-08'] },
  ] as SectionConfig[],

  // Content items — assigned to slots, not sections
  items: [
    // drop-01: hero-wide (current)
    {
      id: 'item-01',
      type: 'project' as MediaType,
      slotId: 'drop-01',
      src: '/home/drops/drop-01.svg',
      alt: 'Current focus — large visual piece',
      label: 'Current focus',
      href: 'https://photogression.icynatural.now',
      external: true,
      accent: '#cfe7ff',
      tags: ['photography', 'live'],
    },
    // drop-02: square (current)
    {
      id: 'item-02',
      type: 'project' as MediaType,
      slotId: 'drop-02',
      src: '/home/drops/drop-02.svg',
      alt: 'Current system — energy engine',
      label: 'Energy Engine',
      href: 'https://phases.icynatural.now',
      external: true,
      accent: '#b88aff',
      tags: ['systems', 'live'],
    },
    // drop-03: square (current)
    {
      id: 'item-03',
      type: 'image' as MediaType,
      slotId: 'drop-03',
      src: '/home/drops/drop-03.svg',
      alt: 'Active experiment',
      label: 'Active experiment',
      accent: '#7fe0c8',
      tags: ['experiment', 'lab'],
    },
    // drop-04: portrait (highlights)
    {
      id: 'item-04',
      type: 'project' as MediaType,
      slotId: 'drop-04',
      src: '/home/drops/drop-04.svg',
      alt: 'Reality Capture — document archive',
      label: 'Reality Capture',
      href: 'https://reality.icynatural.now',
      external: true,
      accent: '#cfe7ff',
      tags: ['archive', 'live'],
    },
    // drop-05: wide (highlights)
    {
      id: 'item-05',
      type: 'project' as MediaType,
      slotId: 'drop-05',
      src: '/home/drops/drop-05.svg',
      alt: 'Semantic Archaeology — word atlas',
      label: 'Semantic Archaeology',
      href: 'https://language.icynatural.now',
      external: true,
      accent: '#e8c07a',
      tags: ['words', 'live'],
    },
    // drop-06: compact (outside)
    {
      id: 'item-06',
      type: 'link' as MediaType,
      slotId: 'drop-06',
      src: '/home/drops/drop-06.svg',
      alt: 'Portfolio — body of work',
      label: 'Portfolio',
      href: '/portfolio.html',
      external: false,
      accent: '#bfe4ff',
      tags: ['portfolio', 'archive'],
    },
    // drop-07: compact (outside)
    {
      id: 'item-07',
      type: 'link' as MediaType,
      slotId: 'drop-07',
      src: '/home/drops/drop-07.svg',
      alt: 'Public presence — GitHub',
      label: 'Public presence',
      href: 'https://github.com/icyclear',
      external: true,
      accent: '#7fcbff',
      tags: ['github', 'code'],
    },
    // drop-08: compact (outside)
    {
      id: 'item-08',
      type: 'link' as MediaType,
      slotId: 'drop-08',
      src: '/home/drops/drop-08.svg',
      alt: 'Media archive',
      label: 'Media archive',
      href: '/archive.html',
      external: false,
      accent: '#8fc98a',
      tags: ['media', 'archive'],
    },
  ] as MediaItem[],

  identity: {
    mark: '✦',
    title: 'Icy Clearer',
    subtitle: 'Personal visual identity · media · systems',
    accent: '#cfe7ff',
  } as IdentityConfig,

  portfolio: {
    title: 'Portfolio',
    description: 'A constellation of systems, archives, experiments, and builds. Not a resume — a living record of what I\'ve made.',
    href: 'https://github.com/icyclear',
    external: true,
    accent: '#bfe4ff',
    glyph: '◇',
    stats: [
      { label: 'Systems', value: '8' },
      { label: 'Works', value: '29' },
    ],
  } as PortfolioConfig,

  worldDoorway: {
    title: 'World',
    description: 'My systems ecosystem — spatial map of every instrument, observatory, and connection.',
    href: '/world.html',
    accent: '#cfe7ff',
    glyph: '◎',
  } as WorldDoorwayConfig,

  social: {
    items: [
      {
        id: 'social-github',
        type: 'link' as MediaType,
        slotId: 'social-github',
        src: '/home/portals/github.svg',
        alt: 'GitHub',
        label: 'GitHub',
        href: 'https://github.com/icyclear',
        external: true,
        accent: '#e8e4d8',
        tags: ['code', 'external'],
      },
      {
        id: 'social-twitter',
        type: 'link' as MediaType,
        slotId: 'social-twitter',
        src: '/home/portals/twitter.svg',
        alt: 'Twitter / X',
        label: 'Twitter',
        href: 'https://x.com/icyclear',
        external: true,
        accent: '#e8e4d8',
        tags: ['social', 'external'],
      },
      {
        id: 'social-instagram',
        type: 'link' as MediaType,
        slotId: 'social-instagram',
        src: '/home/portals/instagram.svg',
        alt: 'Instagram',
        label: 'Instagram',
        href: 'https://instagram.com/icyclear',
        external: true,
        accent: '#e8e4d8',
        tags: ['social', 'external'],
      },
      {
        id: 'social-discord',
        type: 'link' as MediaType,
        slotId: 'social-discord',
        src: '/home/portals/discord.svg',
        alt: 'Discord',
        label: 'Discord',
        href: 'https://discord.gg/icyclear',
        external: true,
        accent: '#7fcbff',
        tags: ['community', 'external'],
      },
      {
        id: 'social-youtube',
        type: 'link' as MediaType,
        slotId: 'social-youtube',
        src: '/home/portals/youtube.svg',
        alt: 'YouTube',
        label: 'YouTube',
        href: 'https://youtube.com/@icyclear',
        external: true,
        accent: '#ff4444',
        tags: ['video', 'external'],
      },
    ],
  } as SocialConfig,
};

// Helpers
export function getSlot(slotId: string): LayoutSlot | undefined {
  return homeContent.layoutSlots.find((s) => s.id === slotId);
}

export function getItemsForSlot(slotId: string): MediaItem[] {
  return homeContent.items.filter((item) => item.slotId === slotId);
}

export function getItemsForSection(sectionId: string): MediaItem[] {
  const section = homeContent.sections.find((s) => s.id === sectionId);
  if (!section) return [];
  return homeContent.items.filter((item) => section.slotIds.includes(item.slotId));
}

export function getAllMediaItems(): MediaItem[] {
  return [...homeContent.items, ...homeContent.social.items];
}

// Asset folder map for documentation
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