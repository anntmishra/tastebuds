import type { StoredBlendAnalysis } from "@/lib/blend-algo";

export type PackId =
  | "studio"
  | "midnight"
  | "citrus"
  | "chrome"
  | "bloom"
  | "velvet"
  | "static"
  | "concrete"
  | "sunburn"
  | "onyx"
  | "neon"
  | "rust";

export type PackSwatch = { bg: string; accent: string; fg: string };

export const PACKS: {
  id: PackId;
  name: string;
  note: string;
  swatch: PackSwatch;
}[] = [
  { id: "studio", name: "Studio", note: "clean, neutral", swatch: { bg: "#0a0a0d", accent: "#7c7cff", fg: "#f5f5f7" } },
  { id: "midnight", name: "Midnight", note: "stark, post-punk", swatch: { bg: "#000000", accent: "#9fe8f0", fg: "#fafafa" } },
  { id: "chrome", name: "Chrome", note: "brutalist red", swatch: { bg: "#070707", accent: "#ff2d1a", fg: "#ededed" } },
  { id: "neon", name: "Neon", note: "club, acid green", swatch: { bg: "#070b0a", accent: "#c6ff3d", fg: "#eef7f0" } },
  { id: "concrete", name: "Concrete", note: "clinical cobalt", swatch: { bg: "#0d1015", accent: "#4a7bff", fg: "#e9edf3" } },
  { id: "static", name: "Static", note: "dream-pop haze", swatch: { bg: "#130d11", accent: "#e58ba9", fg: "#f2e4ea" } },
  { id: "velvet", name: "Velvet", note: "nocturnal amber", swatch: { bg: "#140b1c", accent: "#e8a13c", fg: "#f2e9dd" } },
  { id: "bloom", name: "Bloom", note: "airy, green", swatch: { bg: "#07120c", accent: "#3fd97f", fg: "#e9f5ec" } },
  { id: "citrus", name: "Citrus", note: "sun-bleached", swatch: { bg: "#140f09", accent: "#f2792e", fg: "#f6ecdd" } },
  { id: "sunburn", name: "Sunburn", note: "warm coral", swatch: { bg: "#170f0b", accent: "#ff6f52", fg: "#f7e9e2" } },
  { id: "rust", name: "Rust", note: "worn americana", swatch: { bg: "#150e09", accent: "#d47a3e", fg: "#efe2d0" } },
  { id: "onyx", name: "Onyx", note: "elegant, serif", swatch: { bg: "#000000", accent: "#f0ece2", fg: "#f0ece2" } },
];

export function packSwatch(id: string | null | undefined): PackSwatch {
  return PACKS.find((p) => p.id === id)?.swatch ?? PACKS[0].swatch;
}

const CYCLE: PackId[] = PACKS.map((p) => p.id).filter((id) => id !== "studio");

export function isPackId(v: string | null | undefined): v is PackId {
  return !!v && PACKS.some((p) => p.id === v);
}

export function packName(id: string | null | undefined): string {
  return PACKS.find((p) => p.id === id)?.name ?? "Studio";
}

/** Next pack in the reroll order. */
export function nextPack(current: string | null | undefined): PackId {
  const i = CYCLE.indexOf((current as PackId) ?? "midnight");
  return CYCLE[(i + 1) % CYCLE.length];
}

/**
 * Pick an album-aesthetic pack from a blend's analysis. Scores every pack
 * against the dominant mood, the shared-genre keywords, the obscurity /
 * era / compatibility profile, and returns the best.
 */
export function resolvePack(
  analysis: StoredBlendAnalysis,
  compatibility: number,
): PackId {
  const mood = analysis.mood?.toLowerCase() ?? "";
  const genres = analysis.sharedGenres.join(" ").toLowerCase();
  const dim = Object.fromEntries(
    analysis.dimensions.map((d) => [d.key, d.score]),
  ) as Record<string, number>;
  const obscurity = dim.obscurity ?? 50; // high = aligned mainstream/deep instincts
  const genreScore = dim.genres ?? 0;
  const era = Number(analysis.era ?? 0);

  const has = (hay: string, ...needles: string[]) =>
    needles.some((n) => hay.includes(n));

  const score: Record<PackId, number> = {
    studio: 1,
    midnight: 0,
    citrus: 0,
    chrome: 0,
    bloom: 0,
    velvet: 0,
    static: 0,
    concrete: 0,
    sunburn: 0,
    onyx: 0,
    neon: 0,
    rust: 0,
  };

  // mood → pack
  if (has(mood, "menacing", "cold", "blown-out")) {
    score.chrome += 3;
    score.midnight += 2;
  }
  if (has(mood, "hazy")) score.static += 4;
  if (has(mood, "relentless")) score.neon += 4;
  if (has(mood, "tender", "bare")) score.bloom += 3;
  if (has(mood, "dusty")) score.rust += 4;
  if (has(mood, "velvet", "silky", "smooth")) score.velvet += 3;
  if (has(mood, "bright")) score.sunburn += 3;
  if (has(mood, "sharp", "restless")) score.citrus += 2;
  if (has(mood, "weightless")) score.concrete += 3;
  if (has(mood, "heavy", "feral", "wounded")) score.midnight += 3;
  if (has(mood, "sweaty")) score.neon += 2;

  // shared genres → pack
  if (has(genres, "house", "techno", "edm", "trance", "hardstyle"))
    score.neon += 3;
  if (has(genres, "shoegaze", "dream pop", "slowcore")) score.static += 3;
  if (has(genres, "ambient", "idm", "drone", "electronic")) score.concrete += 3;
  if (has(genres, "folk", "americana", "country", "singer-songwriter"))
    score.rust += 3;
  if (has(genres, "soul", "neo soul", "jazz", "r&b", "rnb")) score.velvet += 2;
  if (has(genres, "indie rock", "post-punk", "garage")) score.midnight += 2;
  if (has(genres, "indie pop", "bedroom pop", "twee")) score.bloom += 2;
  if (has(genres, "pop", "hyperpop")) score.sunburn += 2;
  if (has(genres, "punk", "hardcore", "metal")) score.chrome += 2;
  if (has(genres, "phonk", "trap", "drill", "cloud rap")) score.chrome += 2;

  // profile modifiers
  if (compatibility >= 88) score.onyx += 4; // "same person" → unity
  if (compatibility <= 46) score.chrome += 3; // "chaos blend" → collision
  if (genreScore <= 15) score.midnight += 1;
  if (obscurity >= 80 && compatibility >= 60) score.velvet += 1;
  if (era >= 2020) score.neon += 1;
  if (era > 0 && era <= 1990) score.rust += 1;

  let best: PackId = "studio";
  let bestScore = -1;
  for (const p of Object.keys(score) as PackId[]) {
    if (score[p] > bestScore) {
      bestScore = score[p];
      best = p;
    }
  }
  return best;
}
