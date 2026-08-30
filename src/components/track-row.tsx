"use client";

import { useRef, useState } from "react";

export type RevealTrack = {
  id: string; // Spotify track id
  name: string;
  artists: string;
  matchReason: string;
  vibe: string | null;
  lean: string | null;
  albumArt: string | null;
};

// how long you must rest on a row before the preview engages
const HOVER_INTENT_MS = 3000;

export function TrackRow({
  track,
  index,
  leanLabel,
  active,
  onPreviewAction,
}: {
  track: RevealTrack;
  index: number;
  leanLabel: string | null;
  active: boolean;
  onPreviewAction: (t: RevealTrack) => void;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutual = track.matchReason.startsWith("You both");

  const startHold = () => {
    if (active) return;
    setHolding(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setHolding(false);
      onPreviewAction(track);
    }, HOVER_INTENT_MS);
  };

  const cancelHold = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };

  return (
    <li>
      <a
        href={`https://open.spotify.com/track/${track.id}`}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={startHold}
        onMouseLeave={cancelHold}
        onFocus={startHold}
        onBlur={cancelHold}
        className={
          "group -mx-2 flex gap-3 rounded-[var(--r-input)] px-2 py-2 transition-colors " +
          (active ? "bg-surface-2" : "hover:bg-surface-2")
        }
      >
        <span className="tb-display w-5 shrink-0 pt-3 text-right text-[0.75rem] tabular-nums text-fg-faint">
          {index + 1}
        </span>

        <span
          className="relative mt-0.5 h-10 w-10 shrink-0 overflow-hidden border border-border bg-surface-2"
          style={{ borderRadius: "var(--r-card)" }}
        >
          {track.albumArt && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.albumArt}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          )}
          {active ? (
            <span className="absolute inset-0 flex items-end justify-center gap-[2px] bg-black/45 pb-1.5 text-accent">
              <span className="tb-eq flex items-end gap-[2px]">
                <span />
                <span />
                <span />
                <span />
              </span>
            </span>
          ) : holding ? (
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-black/40">
              <span className="tb-fill block h-full w-full bg-accent" />
            </span>
          ) : null}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[0.875rem] text-fg">
                {track.name}
              </span>
              <span
                aria-hidden
                className="shrink-0 text-fg-faint opacity-0 transition-opacity group-hover:opacity-100"
              >
                ↗
              </span>
            </span>
            {leanLabel && (
              <span className="shrink-0 text-[0.6875rem] text-fg-faint">
                {leanLabel}
              </span>
            )}
          </span>
          <span className="block truncate text-[0.75rem] text-fg-muted">
            {track.artists}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {track.vibe && (
              <span
                style={{ borderRadius: "var(--r-pill)" }}
                className="border border-border px-2 py-0.5 text-[0.6875rem] text-fg-muted"
              >
                {track.vibe}
              </span>
            )}
            <span
              style={{ borderRadius: "var(--r-pill)" }}
              className={
                "px-2 py-0.5 text-[0.6875rem] " +
                (mutual
                  ? "bg-accent-tint text-accent"
                  : "bg-surface-2 text-fg-muted")
              }
            >
              {track.matchReason}
            </span>
          </span>
        </span>
      </a>
    </li>
  );
}
