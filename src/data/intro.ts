import { existsSync } from "node:fs";
import { join } from "node:path";

export type IntroKind = "photo" | "highlight" | "object" | "observation" | "motion";

export type IntroCategory =
  | "portrait"
  | "image"
  | "game"
  | "basketball"
  | "mvp"
  | "creation"
  | "observation"
  | "life"
  | "music";

export type IntroMaterial =
  | "ice"
  | "silver"
  | "denim"
  | "charcoal"
  | "forest"
  | "cream"
  | "suede"
  | "sky"
  | "earth"
  | "iridescent"
  | "black";

export type IntroShape = "arch" | "tall" | "soft" | "strip" | "slice" | "organic" | "paper";

export interface IntroItem {
  id: string;
  kind: IntroKind;
  category: IntroCategory;
  src?: string;
  poster?: string;
  videoId?: string;
  href?: string;
  label?: string;
  title?: string;
  alt?: string;
  material?: IntroMaterial;
  shape?: IntroShape;
  priority?: number;
  present: boolean;
}

const PUBLIC_DIR = join(process.cwd(), "public");

function resolveLocal(path?: string): boolean {
  if (!path) return false;
  if (/^https?:\/\//.test(path)) return true;
  if (!path.startsWith("/")) return false;
  return existsSync(join(PUBLIC_DIR, path.slice(1)));
}

const kindDefaults: Record<IntroKind, { material: IntroMaterial; shape: IntroShape }> = {
  photo: { material: "silver", shape: "soft" },
  highlight: { material: "charcoal", shape: "slice" },
  object: { material: "cream", shape: "paper" },
  observation: { material: "sky", shape: "organic" },
  motion: { material: "ice", shape: "strip" },
};

function define(
  item: Omit<IntroItem, "present" | "material" | "shape" | "kind"> &
    Partial<Pick<IntroItem, "material" | "shape" | "kind">>,
): IntroItem {
  const kind = item.kind ?? "photo";
  const file = kind === "highlight" ? item.poster : item.src;
  return {
    ...item,
    kind,
    material: item.material ?? kindDefaults[kind].material,
    shape: item.shape ?? kindDefaults[kind].shape,
    present: resolveLocal(file),
    alt: item.alt ?? item.title ?? item.id,
  };
}

const youtubeHighlights: Array<{
  id: string;
  videoId: string;
  title: string;
  game: string;
  category: IntroCategory;
  material: IntroMaterial;
  shape: IntroShape;
  priority: number;
  poster: string;
}> = [
  {
    id: "venom-1v6",
    videoId: "6JL4DZIalNg",
    title: "venom 1v6 survivability",
    game: "MARVEL RIVALS",
    category: "game",
    material: "charcoal",
    shape: "slice",
    priority: 92,
    poster: "/intro/highlights/venom-1v6.jpg",
  },
  {
    id: "yoto-main",
    videoId: "68PbSDhCrxI",
    title: "iDoAutographs F2 Yoto main",
    game: "NARAKA BLADEPOINT",
    category: "game",
    material: "forest",
    shape: "soft",
    priority: 84,
    poster: "/intro/highlights/yoto-main.jpg",
  },
  {
    id: "sparking-zero",
    videoId: "sOJHKw6G6a8",
    title: "Dragonball sparking zero has a PERCEPTION problem",
    game: "SPARKING ZERO",
    category: "game",
    material: "iridescent",
    shape: "strip",
    priority: 76,
    poster: "/intro/highlights/sparking-zero.jpg",
  },
];

export const introItems: IntroItem[] = [
  define({
    id: "primary",
    kind: "photo",
    category: "portrait",
    src: "/intro/primary.jpg",
    material: "ice",
    shape: "arch",
    priority: 100,
    label: "PORTRAIT",
    title: "Icy Clearer",
    alt: "Icy Clearer — portrait",
  }),
  ...youtubeHighlights.map((clip) =>
    define({
      id: clip.id,
      kind: "highlight",
      category: clip.category,
      poster: clip.poster,
      videoId: clip.videoId,
      href: `https://www.youtube.com/watch?v=${clip.videoId}`,
      label: clip.game,
      title: clip.title,
      alt: `${clip.title} — ${clip.game} highlight`,
      material: clip.material,
      shape: clip.shape,
      priority: clip.priority,
    }),
  ),
  define({
    id: "secondary",
    kind: "photo",
    category: "life",
    src: "/intro/secondary.jpg",
    material: "silver",
    shape: "soft",
    priority: 64,
    label: "PHOTO",
    title: "Icy Clearer — frame",
    alt: "Icy Clearer — second frame",
  }),
  define({
    id: "detail",
    kind: "observation",
    category: "observation",
    src: "/intro/detail.jpg",
    material: "denim",
    shape: "strip",
    priority: 52,
    label: "DETAIL",
    title: "Icy Clearer — detail crop",
    alt: "Icy Clearer — detail crop",
  }),
  define({
    id: "motion",
    kind: "motion",
    category: "life",
    src: "/intro/fragment.mp4",
    material: "ice",
    shape: "strip",
    priority: 40,
    label: "MOTION",
    title: "Icy Clearer — muted loop",
    alt: "Icy Clearer — muted loop",
  }),
];

export const introMediaList = introItems;

export const introCopy = {
  handle: "@icyclearer",
  handleUrl: "https://www.instagram.com/icyclearer/",
  titleLines: ["ICY", "CLEARER"],
  signature: "Chad",
  line: "See for yourself.",
  categories: ["SYSTEMS", "IMAGES", "GAMES", "SOUND", "EXPERIMENTS"],
  channel: "https://www.youtube.com/@icyclear",
  enter: { label: "ENTER", href: "/world.html" },
};
