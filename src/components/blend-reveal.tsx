"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  generateBlend,
  pushBlend,
  refreshPlaylistCover,
  setBlendName,
  setCollaborative,
} from "@/app/actions";
import { PrimaryButton } from "@/components/button";
import { CopyButton } from "@/components/copy-button";
import { CoverControls } from "@/components/cover-controls";
import { Dice } from "@/components/icons";
import { NowPlaying } from "@/components/now-playing";
import { PlaylistCover } from "@/components/playlist-cover";
import { ThemeControls } from "@/components/theme-controls";
import { TrackRow, type RevealTrack } from "@/components/track-row";
import type { Lean, StoredBlendAnalysis } from "@/lib/blend-algo";
import { NAME_ADJECTIVES, NAME_NOUNS } from "@/lib/blend-name";

function rollName() {
  const a = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)];
  const n = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)];
  return `${a} ${n}`;
}

function useCountUp(target: number, ms = 1100) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setN(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

type Track = RevealTrack;

function Bar({ score }: { score: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden bg-surface-2" style={{ borderRadius: "var(--r-pill)" }}>
      <div
        className="h-full bg-accent transition-[width] duration-700 ease-[var(--ease-out)]"
        style={{ width: `${Math.max(3, score)}%`, borderRadius: "var(--r-pill)" }}
      />
    </div>
  );
}

export function BlendReveal({
  code,
  pack,
  coverStyle,
  initialName,
  compatibility,
  participantNames,
  analysis,
  playlistUrl,
  justSaved,
  canUploadCover,
  collaborative,
  otherName,
  pushError,
  tracks,
}: {
  code: string;
  pack: string;
  coverStyle: string | null;
  initialName: string;
  compatibility: number;
  participantNames: string[];
  analysis: StoredBlendAnalysis | null;
  playlistUrl: string | null;
  justSaved: boolean;
  canUploadCover: boolean;
  collaborative: boolean;
  otherName: string;
  pushError: string | null;
  tracks: Track[];
}) {
  const [name, setName] = useState(initialName);
  const [rolling, setRolling] = useState(false);
  const [active, setActive] = useState<RevealTrack | null>(null);
  const score = useCountUp(compatibility);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [a, b] = participantNames;
  const leanLabel = (l: Lean | string | null) =>
    l === "both" ? "both" : l === "a" ? a : l === "b" ? b : null;

  const reroll = () => {
    const next = rollName();
    setName(next);
    setRolling(true);
    setTimeout(() => setRolling(false), 380);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void setBlendName(code, next).catch(() => {});
    }, 600);
  };

  const [collab, setCollab] = useState(collaborative);
  const [pending, startTransition] = useTransition();
  const [coverState, setCoverState] = useState<"idle" | "syncing" | "done">(
    "idle",
  );

  const toggleCollab = () => {
    const next = !collab;
    setCollab(next);
    startTransition(async () => {
      try {
        await setCollaborative(code, next);
      } catch {
        setCollab(!next);
      }
    });
  };

  const syncCover = () => {
    setCoverState("syncing");
    startTransition(async () => {
      try {
        await refreshPlaylistCover(code);
        setCoverState("done");
        setTimeout(() => setCoverState("idle"), 2500);
      } catch {
        setCoverState("idle");
      }
    });
  };

  return (
    <div className="tb-develop lg:flex lg:gap-8">
     <div
       className={
         "min-w-0 flex-1 lg:max-w-[36rem] " + (active ? "pb-28 lg:pb-0" : "")
       }
     >
      <div className="flex items-start justify-between gap-4">
        <p className="pt-1 text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-fg-faint">
          {participantNames.join("  +  ")}
        </p>
        <ThemeControls code={code} pack={pack} />
      </div>

      {/* headline slab */}
      <div className="tb-card mt-4 p-7 sm:p-9">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-7">
          <div className="shrink-0">
            <PlaylistCover
              style={coverStyle}
              name={name}
              covers={analysis?.coverArt ?? []}
              score={compatibility}
              size={172}
            />
            <CoverControls
              code={code}
              style={coverStyle}
              name={name}
              covers={analysis?.coverArt ?? []}
              score={compatibility}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-end gap-3">
              <span className="tb-display tb-hero text-[length:clamp(3rem,9vw,5rem)] leading-[0.8] text-accent tabular-nums">
                {score}
              </span>
              <span className="pb-1.5 text-[0.8125rem] leading-tight text-fg-muted">
                / 100
                <br />
                taste match
              </span>
            </div>
            {analysis?.headline && (
              <p className="mt-5 text-[length:var(--text-lg)] leading-snug text-fg">
                {analysis.headline}
              </p>
            )}
          </div>
        </div>

        <div className="mt-7 flex items-start gap-3">
          <h1
            className={
              "tb-display tb-hero text-[length:var(--text-h1)] leading-[1.02] transition-transform duration-300 ease-[var(--ease-spring)] " +
              (rolling ? "-rotate-1 scale-[1.02]" : "")
            }
          >
            {name}
          </h1>
          <button
            type="button"
            onClick={reroll}
            aria-label="Reroll the name"
            style={{ borderRadius: "var(--r-btn)" }}
            className="mt-1 shrink-0 border border-border p-2 text-fg-muted transition-transform duration-200 ease-[var(--ease-spring)] hover:rotate-12 hover:text-fg active:scale-95"
          >
            <Dice size={16} />
          </button>
        </div>
      </div>

      {/* dimension bars */}
      {analysis?.dimensions && analysis.dimensions.length > 0 && (
        <section className="tb-card mt-8 p-6">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-fg-faint">
            The breakdown
          </p>
          <div className="mt-5 space-y-4">
            {analysis.dimensions.map((d) => (
              <div key={d.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.8125rem] font-medium text-fg">
                    {d.label}
                  </span>
                  <span className="tb-display text-[0.8125rem] tabular-nums text-fg-muted">
                    {d.score}
                  </span>
                </div>
                <div className="mt-1.5">
                  <Bar score={d.score} />
                </div>
                <p className="mt-1.5 text-[0.75rem] leading-snug text-fg-muted">
                  {d.blurb}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* how you connect */}
      {analysis &&
        (analysis.connections.length > 0 ||
          analysis.sharedArtists.length > 0 ||
          analysis.bridges.length > 0) && (
          <section className="mt-8">
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-fg-faint">
              How you connect
            </p>

            {analysis.connections.length > 0 && (
              <ul className="mt-3 space-y-2">
                {analysis.connections.map((c, i) => (
                  <li
                    key={i}
                    className="text-[0.9375rem] leading-relaxed text-fg-muted"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            )}

            {analysis.sharedArtists.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {analysis.sharedArtists.map((s) => (
                  <span
                    key={s.name}
                    style={{ borderRadius: "var(--r-pill)" }}
                    className="bg-accent-tint px-2.5 py-1 text-[0.75rem] text-accent"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            )}

            {analysis.bridges.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {analysis.bridges.map((br, i) => (
                  <li key={i} className="text-[0.8125rem] text-fg-muted">
                    <span className="text-fg-faint">→ </span>
                    {br.from}&rsquo;s gateway to{" "}
                    <span className="text-fg">{br.genre}</span>{" "}
                    <span className="text-fg-faint">· via {br.via}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

      {/* tracklist */}
      <section className="mt-8">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-fg-faint">
          The playlist · {tracks.length}
        </p>
        <ol className="mt-3 space-y-1">
          {tracks.map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              index={i}
              leanLabel={leanLabel(t.lean)}
              active={active?.id === t.id}
              onPreviewAction={setActive}
            />
          ))}
        </ol>
        <p className="mt-3 text-[0.6875rem] text-fg-faint">
          Hover to preview · click to open in Spotify
        </p>
      </section>

      {playlistUrl ? (
        <div
          className={
            "tb-card mt-10 p-5 " + (justSaved ? "reveal" : "")
          }
        >
          <div className="flex flex-wrap items-center gap-4">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center bg-accent text-accent-fg"
              style={{ borderRadius: "var(--r-btn)" }}
              aria-hidden
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[0.9375rem] text-fg">
              {justSaved ? "Saved to your Spotify" : "This blend is in your Spotify"}
            </span>
            <a
              href={playlistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.8125rem] font-semibold text-accent hover:underline"
            >
              Open playlist ↗
            </a>
          </div>

          <div className="mt-5 space-y-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={toggleCollab}
              disabled={pending}
              aria-pressed={collab}
              className="group flex w-full items-center gap-3 text-left disabled:opacity-60"
            >
              <span
                className={
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors " +
                  (collab ? "bg-accent" : "bg-surface-2")
                }
              >
                <span
                  className={
                    "absolute top-0.5 h-4 w-4 rounded-full bg-fg transition-transform " +
                    (collab ? "translate-x-4" : "translate-x-0.5")
                  }
                />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.875rem] text-fg">
                  Collaborative playlist
                </span>
                <span className="block text-[0.75rem] text-fg-faint">
                  {collab
                    ? `${otherName} can add & remove tracks — share the link below`
                    : `Let ${otherName} edit this playlist too`}
                </span>
              </span>
            </button>

            {collab && (
              <div
                className="flex items-center gap-2 bg-surface-2 p-2 pl-3"
                style={{ borderRadius: "var(--r-input)" }}
              >
                <span className="flex-1 truncate font-mono text-[0.75rem] text-fg-muted">
                  {playlistUrl}
                </span>
                <CopyButton value={playlistUrl} />
              </div>
            )}

            {canUploadCover ? (
              <button
                type="button"
                onClick={syncCover}
                disabled={pending || coverState === "syncing"}
                className="text-[0.75rem] font-medium text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline disabled:opacity-60"
              >
                {coverState === "syncing"
                  ? "Updating cover…"
                  : coverState === "done"
                    ? "Cover art synced ✓"
                    : "Sync this cover art to Spotify"}
              </button>
            ) : (
              <p className="text-[0.75rem] text-fg-faint">
                Sign out and back in to let Taste Buds set the playlist&rsquo;s
                cover art.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <form action={pushBlend.bind(null, code)}>
            <PrimaryButton type="submit">Save to Spotify</PrimaryButton>
          </form>
          <form action={generateBlend.bind(null, code)}>
            <button
              type="submit"
              className="text-[0.8125rem] font-medium text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
            >
              Re-blend
            </button>
          </form>
        </div>
      )}
      {pushError && (
        <p className="mt-3 text-[0.8125rem] text-fg-muted">
          {pushError === "scope"
            ? "Taste Buds needs playlist permission on Spotify. Sign out, sign back in, and approve the prompt — then try Save again."
            : pushError === "reconnect"
              ? "Spotify wants you to reconnect — sign out and back in, then try Save again."
              : "Couldn't save to Spotify just now. Try again in a moment."}
        </p>
      )}
     </div>

      <aside className="lg:w-[17rem] lg:shrink-0">
        <div className="lg:sticky lg:top-6">
          <NowPlaying track={active} />
        </div>
      </aside>
    </div>
  );
}
