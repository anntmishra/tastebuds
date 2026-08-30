export type CoverStyleId =
  | "lens"
  | "grid"
  | "split"
  | "ring"
  | "type"
  | "duotone"
  | "stack"
  | "venn"
  | "corner"
  | "numeral"
  | "minimal"
  | "band"
  | "waveform"
  | "tint";

export const COVER_STYLES: { id: CoverStyleId; name: string }[] = [
  { id: "lens", name: "Lens" },
  { id: "tint", name: "Tint" },
  { id: "grid", name: "Grid" },
  { id: "split", name: "Split" },
  { id: "ring", name: "Ring" },
  { id: "venn", name: "Venn" },
  { id: "duotone", name: "Duotone" },
  { id: "stack", name: "Stack" },
  { id: "band", name: "Band" },
  { id: "corner", name: "Corner" },
  { id: "numeral", name: "Numeral" },
  { id: "waveform", name: "Waveform" },
  { id: "type", name: "Type" },
  { id: "minimal", name: "Minimal" },
];

const DEFAULT: CoverStyleId = "lens";

export function isCoverStyle(v: string | null | undefined): v is CoverStyleId {
  return !!v && COVER_STYLES.some((s) => s.id === v);
}

export function coverStyleOrDefault(v: string | null | undefined): CoverStyleId {
  return isCoverStyle(v) ? v : DEFAULT;
}

export function nextCoverStyle(cur: string | null | undefined): CoverStyleId {
  const ids = COVER_STYLES.map((s) => s.id);
  const i = ids.indexOf(coverStyleOrDefault(cur));
  return ids[(i + 1) % ids.length];
}
