import sharp from "sharp";
import { coverStyleOrDefault } from "@/lib/cover-styles";
import { packSwatch } from "@/lib/packs";

/** Spotify's PUT .../images caps the *base64* payload at 256 KB, so the raw
 *  JPEG must land under ~190 KB. */
const MAX_JPEG_BYTES = 185_000;

type Palette = {
  bg: string;
  accent: string;
  fg: string;
  accentFg: string;
  surface: string;
};

function luminance(hex: string): number {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return 0;
  const [r, g, b] = m.map((h) => parseInt(h, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function esc(s: string): string {
  return s.replace(/[<>&]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;",
  );
}

function wrap(name: string, limit = 12): string[] {
  const words = name.trim().split(/\s+/);
  if (words.length <= 2) return words;
  const lines = ["", ""];
  let i = 0;
  for (const w of words) {
    if (i === 0 && (lines[0] + " " + w).trim().length > limit) i = 1;
    lines[i] = (lines[i] + " " + w).trim();
  }
  return lines.filter(Boolean);
}

/** Fetch an album-art URL and return it as a data: URI sharp can embed. */
async function inlineImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 2_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

const F = `font-family="Oswald, 'Arial Narrow', system-ui, sans-serif" font-weight="700"`;

function mosaic(imgs: string[], opacity = 1): string {
  if (imgs.length === 0) return "";
  const o = ` opacity="${opacity}"`;
  if (imgs.length < 4) {
    return `<image href="${imgs[0]}" x="0" y="0" width="400" height="400" preserveAspectRatio="xMidYMid slice"${o}/>`;
  }
  return (
    `<g${o}>` +
    imgs
      .slice(0, 4)
      .map(
        (u, i) =>
          `<image href="${u}" x="${(i % 2) * 200}" y="${Math.floor(i / 2) * 200}" width="200" height="200" preserveAspectRatio="xMidYMid slice"/>`,
      )
      .join("") +
    `</g>`
  );
}

function body(
  style: string,
  L: string[],
  score: number,
  imgs: string[],
  C: Palette,
): string {
  const tb = `<text x="28" y="52" fill="${C.fg}" ${F} font-size="18" letter-spacing="3.2" opacity="0.65">TASTE BUDS</text>`;
  const scoreT = (x: number, y: number, s = 24, fill = C.fg) =>
    `<text x="${x}" y="${y}" fill="${fill}" ${F} font-size="${s}" opacity="0.85">${score} / 100</text>`;
  const nameT = (x: number, y: number, s: number, fill = C.fg, dy = 0.9, anchor = "start") =>
    L.map(
      (l, i) =>
        `<text x="${x}" y="${y + i * s * dy}" text-anchor="${anchor}" fill="${fill}" ${F} font-size="${s}" letter-spacing="-1">${esc(l)}</text>`,
    ).join("");

  switch (style) {
    case "tint":
      return `<g clip-path="url(#sq)">${mosaic(imgs)}<rect width="400" height="400" fill="url(#tg)"/><rect y="236" width="400" height="164" fill="${C.bg}" opacity="0.5"/>${tb}${nameT(26, 306, 48)}${scoreT(28, 374, 22)}</g>`;

    case "grid":
      return `<g clip-path="url(#sq)"><rect width="400" height="400" fill="${C.accent}"/><g transform="translate(16,16)"><clipPath id="gi"><rect width="368" height="288"/></clipPath><g clip-path="url(#gi)">${mosaic(imgs) || `<rect width="368" height="288" fill="${C.surface}"/>`}</g></g>${nameT(20, 348, 30, C.accentFg)}<text x="372" y="392" text-anchor="end" fill="${C.accentFg}" ${F} font-size="20" opacity="0.8">${score}/100</text></g>`;

    case "split":
      return `<g clip-path="url(#sq)"><rect width="400" height="400" fill="${C.surface}"/>${mosaic(imgs, 0.85)}<polygon points="0,0 260,0 120,400 0,400" fill="${C.accent}"/><rect y="300" width="400" height="100" fill="${C.bg}" opacity="0.62"/><text x="26" y="52" fill="${C.accentFg}" ${F} font-size="18" letter-spacing="3.2" opacity="0.8">TASTE BUDS</text>${nameT(26, 348, 34)}${scoreT(28, 388, 20)}</g>`;

    case "ring":
      return `<g clip-path="url(#sq)"><rect width="400" height="400" fill="${C.bg}"/>${mosaic(imgs, 0.16)}<circle cx="200" cy="205" r="128" fill="none" stroke="${C.accent}" stroke-width="26"/>${tb}${L.map((l, i) => `<text x="200" y="${195 + i * 34 - (L.length - 1) * 17}" text-anchor="middle" fill="${C.fg}" ${F} font-size="30" letter-spacing="-1">${esc(l)}</text>`).join("")}<text x="200" y="${230 + (L.length - 1) * 17}" text-anchor="middle" fill="${C.accent}" ${F} font-size="18">${score} / 100</text></g>`;

    case "venn":
      return `<g clip-path="url(#sq)"><rect width="400" height="400" fill="${C.bg}"/><clipPath id="vl"><circle cx="238" cy="168" r="105"/></clipPath><circle cx="162" cy="168" r="105" fill="none" stroke="${C.fg}" stroke-width="3"/><circle cx="238" cy="168" r="105" fill="none" stroke="${C.fg}" stroke-width="3"/><g clip-path="url(#vl)"><circle cx="162" cy="168" r="105" fill="${C.accent}" opacity="0.9"/></g>${tb}${nameT(26, 330, 36)}${scoreT(28, 378, 20)}</g>`;

    case "duotone":
      return `<g clip-path="url(#sq)"><rect width="400" height="400" fill="${C.bg}"/><g style="filter:grayscale(1)">${mosaic(imgs)}</g><rect width="400" height="400" fill="${C.accent}" opacity="0.28"/><rect y="150" width="400" height="250" fill="${C.bg}" opacity="0.6"/>${nameT(24, 262, 50)}${scoreT(28, 376, 22)}</g>`;

    case "stack":
      return `<g clip-path="url(#sq)"><rect width="400" height="400" fill="${C.bg}"/>${(imgs.length ? imgs.slice(0, 3) : []).map((u, i) => `<image href="${u}" x="90" y="70" width="200" height="200" preserveAspectRatio="xMidYMid slice" transform="rotate(${(i - 1) * 9} 190 170)" opacity="${0.65 + i * 0.15}"/>`).join("")}${imgs.length === 0 ? `<circle cx="200" cy="170" r="110" fill="${C.accent}" opacity="0.9"/>` : ""}<rect x="0" y="316" width="400" height="84" fill="${C.surface}"/>${nameT(26, 356, 28)}</g>`;

    case "band":
      return `<g clip-path="url(#sq)"><rect width="400" height="400" fill="${C.bg}"/><g opacity="0.35">${(imgs.length >= 4 ? imgs.slice(0, 4) : []).map((u, i) => `<image href="${u}" x="${i * 100}" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice"/>`).join("")}</g><rect x="0" y="150" width="400" height="120" fill="${C.accent}"/>${L.map((l, i) => `<text x="28" y="${195 + i * 34 - (L.length - 1) * 17}" fill="${C.accentFg}" ${F} font-size="32" letter-spacing="-1">${esc(l)}</text>`).join("")}${tb}${scoreT(28, 344, 22)}</g>`;

    case "corner":
      return `<g clip-path="url(#sq)"><rect width="400" height="400" fill="${C.bg}"/>${nameT(24, 120, 62)}<rect x="24" y="${140 + (L.length - 1) * 55}" width="90" height="8" fill="${C.accent}"/><g transform="translate(232,232)"><clipPath id="ci"><rect width="144" height="144"/></clipPath><g clip-path="url(#ci)">${mosaic(imgs) || `<rect width="144" height="144" fill="${C.accent}"/>`}</g></g>${tb}</g>`;

    case "numeral":
      return `<g clip-path="url(#sq)"><rect width="400" height="400" fill="${C.bg}"/>${mosaic(imgs, 0.12)}<text x="200" y="250" text-anchor="middle" fill="${C.accent}" ${F} font-size="220" letter-spacing="-8">${score}</text>${tb}${L.map((l, i) => `<text x="200" y="${310 + i * 26}" text-anchor="middle" fill="${C.fg}" ${F} font-size="22">${esc(l)}</text>`).join("")}</g>`;

    case "waveform":
      return `<g clip-path="url(#sq)"><rect width="400" height="400" fill="${C.bg}"/><polyline points="0,268 40,222 80,300 120,214 160,306 200,222 240,302 280,216 320,298 360,230 400,268" fill="none" stroke="${C.accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>${tb}${nameT(26, 130, 42)}${scoreT(28, 378, 22)}</g>`;

    case "type":
      return `<g clip-path="url(#sq)"><rect width="400" height="400" fill="${C.accent}"/>${L.map((l, i) => `<text x="24" y="${200 + i * 62 - (L.length - 1) * 31}" fill="${C.accentFg}" ${F} font-size="66" letter-spacing="-2">${esc(l)}</text>`).join("")}<text x="24" y="52" fill="${C.accentFg}" ${F} font-size="18" letter-spacing="3.2" opacity="0.75">TASTE BUDS</text><text x="376" y="384" text-anchor="end" fill="${C.accentFg}" ${F} font-size="22" opacity="0.85">${score}/100</text></g>`;

    case "minimal":
      return `<g clip-path="url(#sq)"><rect width="400" height="400" fill="${C.bg}"/><circle cx="200" cy="150" r="9" fill="${C.accent}"/>${L.map((l, i) => `<text x="200" y="${210 + i * 30 - (L.length - 1) * 15}" text-anchor="middle" fill="${C.fg}" ${F} font-size="28" letter-spacing="-1">${esc(l)}</text>`).join("")}<text x="200" y="300" text-anchor="middle" fill="${C.fg}" ${F} font-size="14" letter-spacing="2.8" opacity="0.5">TASTE BUDS · ${score}/100</text></g>`;

    case "lens":
    default:
      return `<g clip-path="url(#sq)"><rect width="400" height="400" fill="${C.bg}"/>${mosaic(imgs, 0.3)}<rect width="400" height="400" fill="${C.accent}" opacity="0.14"/><clipPath id="ll"><circle cx="330" cy="330" r="150"/></clipPath><g clip-path="url(#ll)"><circle cx="270" cy="330" r="150" fill="${C.accent}" opacity="0.9"/></g><circle cx="270" cy="330" r="150" fill="none" stroke="${C.accent}" stroke-width="2" opacity="0.5"/>${tb}${nameT(26, 150, 52)}${scoreT(28, 376, 26)}</g>`;
  }
}

type Args = {
  style: string | null;
  pack: string | null;
  name: string;
  score: number;
  covers: string[];
};

/**
 * Render the same designed cover we show in-app to a square JPEG for Spotify's
 * playlist artwork. Built as a plain SVG string (not the React component —
 * Next forbids react-dom/server in the app graph); the active pack's palette
 * is baked to concrete hex and the rasteriser falls back to its default sans.
 * Returns a JPEG Buffer or null if it can't be produced.
 */
export async function renderCoverJpeg(args: Args): Promise<Buffer | null> {
  const { bg, accent, fg } = packSwatch(args.pack);
  const C: Palette = {
    bg,
    accent,
    fg,
    accentFg: luminance(accent) > 0.55 ? "#0a0a0d" : "#ffffff",
    surface: luminance(bg) > 0.5 ? "#0000001f" : "#ffffff1f",
  };

  const inlined = (
    await Promise.all((args.covers ?? []).slice(0, 4).map(inlineImage))
  ).filter((u): u is string => !!u);

  const L = wrap(args.name);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="640" height="640">` +
    `<defs><clipPath id="sq"><rect width="400" height="400"/></clipPath>` +
    `<linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${accent}" stop-opacity="0.05"/>` +
    `<stop offset="60%" stop-color="${accent}" stop-opacity="0.35"/>` +
    `<stop offset="100%" stop-color="${bg}" stop-opacity="0.92"/></linearGradient></defs>` +
    body(coverStyleOrDefault(args.style), L, Math.round(args.score) || 0, inlined, C) +
    `</svg>`;

  for (const [q, size] of [
    [82, 640],
    [70, 640],
    [58, 600],
    [45, 512],
  ] as const) {
    const out = await sharp(Buffer.from(svg))
      .resize(size, size, { fit: "cover" })
      .jpeg({ quality: q, mozjpeg: true })
      .toBuffer();
    if (out.byteLength <= MAX_JPEG_BYTES || q === 45) return out;
  }
  return null;
}
