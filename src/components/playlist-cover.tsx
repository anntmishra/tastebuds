/* Designed square covers for a blend. Inline SVG so they restyle instantly on
 * a theme (pack) change. One of ~14 compositions, chosen by the user. */

import { coverStyleOrDefault, type CoverStyleId } from "@/lib/cover-styles";

type Props = {
  style?: string | null;
  name: string;
  covers: string[];
  score: number;
  size?: number;
  className?: string;
};

const DISPLAY = {
  fontFamily: "var(--font-display-family), system-ui, sans-serif",
  fontWeight: 700,
} as const;

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

function Mosaic({
  imgs,
  opacity = 1,
  uid,
}: {
  imgs: string[];
  opacity?: number;
  uid: string;
}) {
  if (imgs.length === 0) return null;
  const cells = imgs.length >= 4 ? imgs.slice(0, 4) : [imgs[0]];
  return (
    <g opacity={opacity} clipPath={`url(#sq-${uid})`}>
      {cells.length === 1 ? (
        <image
          href={cells[0]}
          x="0"
          y="0"
          width="400"
          height="400"
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        cells.map((u, i) => (
          <image
            key={i}
            href={u}
            x={(i % 2) * 200}
            y={Math.floor(i / 2) * 200}
            width="200"
            height="200"
            preserveAspectRatio="xMidYMid slice"
          />
        ))
      )}
    </g>
  );
}

function Body({
  style,
  name,
  imgs,
  score,
  uid,
}: {
  style: CoverStyleId;
  name: string;
  imgs: string[];
  score: number;
  uid: string;
}) {
  const L = wrap(name);
  const tb = (
    <text x="28" y="52" fill="var(--fg)" style={{ ...DISPLAY, fontSize: 18, letterSpacing: "0.18em", opacity: 0.65 }}>
      TASTE BUDS
    </text>
  );
  const scoreText = (x: number, y: number, size = 24) => (
    <text x={x} y={y} fill="var(--fg)" style={{ ...DISPLAY, fontSize: size, opacity: 0.85 }}>
      {score} / 100
    </text>
  );
  const nameLines = (x: number, y: number, size: number, fill = "var(--fg)", dy = 0.9) =>
    L.map((l, i) => (
      <text key={i} x={x} y={y + i * size * dy} fill={fill} style={{ ...DISPLAY, fontSize: size, letterSpacing: "-0.02em" }}>
        {l}
      </text>
    ));

  switch (style) {
    case "tint":
      return (
        <g clipPath={`url(#sq-${uid})`}>
          <Mosaic imgs={imgs} uid={uid} />
          <rect width="400" height="400" fill="url(#tint-grad)" />
          <rect y="236" width="400" height="164" fill="var(--bg)" opacity="0.5" />
          {tb}
          {nameLines(26, 306, 48)}
          {scoreText(28, 374, 22)}
        </g>
      );

    case "grid":
      return (
        <g clipPath={`url(#sq-${uid})`}>
          <rect width="400" height="400" fill="var(--accent)" />
          <g transform="translate(16,16)">
            <clipPath id={`gi-${uid}`}>
              <rect width="368" height="288" />
            </clipPath>
            <g clipPath={`url(#gi-${uid})`}>
              <Mosaic imgs={imgs} uid={uid} />
              {imgs.length === 0 && <rect width="368" height="288" fill="var(--surface)" />}
            </g>
          </g>
          {nameLines(20, 348, 30, "var(--accent-fg)")}
          <text x="372" y="392" textAnchor="end" fill="var(--accent-fg)" style={{ ...DISPLAY, fontSize: 20, opacity: 0.8 }}>
            {score}/100
          </text>
        </g>
      );

    case "split":
      return (
        <g clipPath={`url(#sq-${uid})`}>
          <rect width="400" height="400" fill="var(--surface)" />
          <Mosaic imgs={imgs} uid={uid} opacity={0.85} />
          <polygon points="0,0 260,0 120,400 0,400" fill="var(--accent)" />
          <rect y="300" width="400" height="100" fill="var(--bg)" opacity="0.62" />
          <text x="26" y="52" fill="var(--accent-fg)" style={{ ...DISPLAY, fontSize: 18, letterSpacing: "0.18em", opacity: 0.8 }}>
            TASTE BUDS
          </text>
          {nameLines(26, 348, 34, "var(--fg)")}
          {scoreText(28, 388, 20)}
        </g>
      );

    case "ring":
      return (
        <g clipPath={`url(#sq-${uid})`}>
          <rect width="400" height="400" fill="var(--bg)" />
          <Mosaic imgs={imgs} uid={uid} opacity={0.16} />
          <circle cx="200" cy="205" r="128" fill="none" stroke="var(--accent)" strokeWidth="26" />
          {tb}
          {L.map((l, i) => (
            <text key={i} x="200" y={195 + i * 34 - (L.length - 1) * 17} textAnchor="middle" fill="var(--fg)" style={{ ...DISPLAY, fontSize: 30, letterSpacing: "-0.02em" }}>
              {l}
            </text>
          ))}
          <text x="200" y={230 + (L.length - 1) * 17} textAnchor="middle" fill="var(--accent)" style={{ ...DISPLAY, fontSize: 18 }}>
            {score} / 100
          </text>
        </g>
      );

    case "venn":
      return (
        <g clipPath={`url(#sq-${uid})`}>
          <rect width="400" height="400" fill="var(--bg)" />
          <clipPath id={`vl-${uid}`}>
            <circle cx="238" cy="168" r="105" />
          </clipPath>
          <circle cx="162" cy="168" r="105" fill="none" stroke="var(--fg)" strokeWidth="3" />
          <circle cx="238" cy="168" r="105" fill="none" stroke="var(--fg)" strokeWidth="3" />
          <g clipPath={`url(#vl-${uid})`}>
            <circle cx="162" cy="168" r="105" fill="var(--accent)" opacity="0.9" />
          </g>
          {tb}
          {nameLines(26, 330, 36)}
          {scoreText(28, 378, 20)}
        </g>
      );

    case "duotone":
      return (
        <g clipPath={`url(#sq-${uid})`}>
          <rect width="400" height="400" fill="var(--bg)" />
          <g filter={`url(#duo-${uid})`}>
            <Mosaic imgs={imgs} uid={uid} />
          </g>
          <rect width="400" height="400" fill="var(--accent)" opacity="0.28" style={{ mixBlendMode: "color" }} />
          <rect y="150" width="400" height="250" fill="var(--bg)" opacity="0.6" />
          {nameLines(24, 262, 50, "var(--fg)")}
          {scoreText(28, 376, 22)}
        </g>
      );

    case "stack":
      return (
        <g clipPath={`url(#sq-${uid})`}>
          <rect width="400" height="400" fill="var(--bg)" />
          {(imgs.length ? imgs.slice(0, 3) : []).map((u, i) => (
            <image
              key={i}
              href={u}
              x={90}
              y={70}
              width="200"
              height="200"
              preserveAspectRatio="xMidYMid slice"
              transform={`rotate(${(i - 1) * 9} 190 170)`}
              opacity={0.65 + i * 0.15}
            />
          ))}
          {imgs.length === 0 && <circle cx="200" cy="170" r="110" fill="var(--accent)" opacity="0.9" />}
          <rect x="0" y="316" width="400" height="84" fill="var(--surface)" />
          {nameLines(26, 356, 28)}
        </g>
      );

    case "band":
      return (
        <g clipPath={`url(#sq-${uid})`}>
          <rect width="400" height="400" fill="var(--bg)" />
          <g opacity="0.35">
            {(imgs.length >= 4 ? imgs.slice(0, 4) : []).map((u, i) => (
              <image key={i} href={u} x={i * 100} y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" />
            ))}
          </g>
          <rect x="0" y="150" width="400" height="120" fill="var(--accent)" />
          {L.map((l, i) => (
            <text key={i} x="28" y={195 + i * 34 - (L.length - 1) * 17} fill="var(--accent-fg)" style={{ ...DISPLAY, fontSize: 32, letterSpacing: "-0.02em" }}>
              {l}
            </text>
          ))}
          {tb}
          {scoreText(28, 344, 22)}
        </g>
      );

    case "corner":
      return (
        <g clipPath={`url(#sq-${uid})`}>
          <rect width="400" height="400" fill="var(--bg)" />
          {nameLines(24, 120, 62)}
          <rect x="24" y={140 + (L.length - 1) * 55} width="90" height="8" fill="var(--accent)" />
          <g transform="translate(232,232)">
            <clipPath id={`ci-${uid}`}>
              <rect width="144" height="144" />
            </clipPath>
            <g clipPath={`url(#ci-${uid})`}>
              <Mosaic imgs={imgs} uid={uid} />
              {imgs.length === 0 && <rect width="144" height="144" fill="var(--accent)" />}
            </g>
          </g>
          {tb}
        </g>
      );

    case "numeral":
      return (
        <g clipPath={`url(#sq-${uid})`}>
          <rect width="400" height="400" fill="var(--bg)" />
          <Mosaic imgs={imgs} uid={uid} opacity={0.12} />
          <text x="200" y="250" textAnchor="middle" fill="var(--accent)" style={{ ...DISPLAY, fontSize: 220, letterSpacing: "-0.04em" }}>
            {score}
          </text>
          {tb}
          {L.map((l, i) => (
            <text key={i} x="200" y={310 + i * 26} textAnchor="middle" fill="var(--fg)" style={{ ...DISPLAY, fontSize: 22 }}>
              {l}
            </text>
          ))}
        </g>
      );

    case "waveform":
      return (
        <g clipPath={`url(#sq-${uid})`}>
          <rect width="400" height="400" fill="var(--bg)" />
          <polyline
            points="0,268 40,222 80,300 120,214 160,306 200,222 240,302 280,216 320,298 360,230 400,268"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {tb}
          {nameLines(26, 130, 42)}
          {scoreText(28, 378, 22)}
        </g>
      );

    case "type":
      return (
        <g clipPath={`url(#sq-${uid})`}>
          <rect width="400" height="400" fill="var(--accent)" />
          {L.map((l, i) => (
            <text key={i} x="24" y={200 + i * 62 - (L.length - 1) * 31} fill="var(--accent-fg)" style={{ ...DISPLAY, fontSize: 66, letterSpacing: "-0.03em" }}>
              {l}
            </text>
          ))}
          <text x="24" y="52" fill="var(--accent-fg)" style={{ ...DISPLAY, fontSize: 18, letterSpacing: "0.18em", opacity: 0.75 }}>
            TASTE BUDS
          </text>
          <text x="376" y="384" textAnchor="end" fill="var(--accent-fg)" style={{ ...DISPLAY, fontSize: 22, opacity: 0.85 }}>
            {score}/100
          </text>
        </g>
      );

    case "minimal":
      return (
        <g clipPath={`url(#sq-${uid})`}>
          <rect width="400" height="400" fill="var(--bg)" />
          <circle cx="200" cy="150" r="9" fill="var(--accent)" />
          {L.map((l, i) => (
            <text key={i} x="200" y={210 + i * 30 - (L.length - 1) * 15} textAnchor="middle" fill="var(--fg)" style={{ ...DISPLAY, fontSize: 28, letterSpacing: "-0.02em" }}>
              {l}
            </text>
          ))}
          <text x="200" y="300" textAnchor="middle" fill="var(--fg)" style={{ ...DISPLAY, fontSize: 14, letterSpacing: "0.2em", opacity: 0.5 }}>
            TASTE BUDS · {score}/100
          </text>
        </g>
      );

    case "lens":
    default:
      return (
        <g clipPath={`url(#sq-${uid})`}>
          <rect width="400" height="400" fill="var(--bg)" />
          <Mosaic imgs={imgs} uid={uid} opacity={0.3} />
          <rect width="400" height="400" fill="var(--accent)" opacity="0.14" style={{ mixBlendMode: "color" }} />
          <clipPath id={`ll-${uid}`}>
            <circle cx="330" cy="330" r="150" />
          </clipPath>
          <g clipPath={`url(#ll-${uid})`}>
            <circle cx="270" cy="330" r="150" fill="var(--accent)" opacity="0.9" />
          </g>
          <circle cx="270" cy="330" r="150" fill="none" stroke="var(--accent)" strokeWidth="2" opacity="0.5" />
          <rect width="400" height="400" filter={`url(#grain-${uid})`} opacity="0.06" style={{ mixBlendMode: "overlay" }} />
          {tb}
          {nameLines(26, 150, 52)}
          {scoreText(28, 376, 26)}
        </g>
      );
  }
}

export function PlaylistCover({
  style,
  name,
  covers,
  score,
  size = 200,
  className = "",
}: Props) {
  const s = coverStyleOrDefault(style);
  const imgs = (covers ?? []).filter(Boolean).slice(0, 4);
  const uid = (name.replace(/\W/g, "").slice(0, 6) || "c") + s;

  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={"shrink-0 border border-border shadow-card " + className}
      style={{ borderRadius: "var(--r-card)" }}
      role="img"
      aria-label={`${name} — cover (${s})`}
    >
      <defs>
        <clipPath id={`sq-${uid}`}>
          <rect width="400" height="400" />
        </clipPath>
        <filter id={`grain-${uid}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <filter id={`duo-${uid}`}>
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.1" />
          </feComponentTransfer>
        </filter>
        <linearGradient id="tint-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.05" />
          <stop offset="60%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--bg)" stopOpacity="0.92" />
        </linearGradient>
      </defs>
      <Body style={s} name={name} imgs={imgs} score={score} uid={uid} />
    </svg>
  );
}
