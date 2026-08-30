"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlbumCover } from "@/components/album-cover";
import { Pause, Play, Volume, VolumeOff } from "@/components/icons";
import { findPreview } from "@/lib/preview-client";
import type { RevealTrack } from "@/components/track-row";

const MUTE_KEY = "tb-preview-muted";

type Status = "idle" | "loading" | "playing" | "paused" | "none";

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function NowPlaying({ track }: { track: RevealTrack | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  useEffect(() => {
    try {
      const m = localStorage.getItem(MUTE_KEY) === "1";
      mutedRef.current = m;
      setMuted(m);
    } catch {
      /* private mode */
    }
  }, []);

  const applyMuted = useCallback((m: boolean) => {
    mutedRef.current = m;
    setMuted(m);
    if (audioRef.current) audioRef.current.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!track) {
      a.pause();
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setCur(0);
    setDur(0);
    a.pause();

    findPreview(track.name, track.artists).then((url) => {
      if (cancelled || audioRef.current !== a) return;
      if (!url) {
        setStatus("none");
        return;
      }
      a.src = url;
      a.currentTime = 0;
      a.volume = 0.6;
      a.muted = mutedRef.current;
      a.play()
        .then(() => setStatus("playing"))
        .catch(() => setStatus("paused")); // autoplay blocked → wait for tap
    });

    return () => {
      cancelled = true;
    };
  }, [track]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a || !a.src) return;
    if (a.paused) {
      a.play()
        .then(() => setStatus("playing"))
        .catch(() => {});
    } else {
      a.pause();
      setStatus("paused");
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = Math.max(
      0,
      Math.min(dur, ((e.clientX - rect.left) / rect.width) * dur),
    );
  };

  return (
    <div
      className={
        "z-40 " +
        (track
          ? "fixed inset-x-3 bottom-3 lg:static lg:inset-auto"
          : "hidden lg:block")
      }
    >
      <div className="tb-card p-4">
        <p className="text-[0.625rem] font-medium uppercase tracking-[0.18em] text-fg-faint">
          Now playing
        </p>

        {!track ? (
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-fg-faint">
            Hover a track to hear a 30-second preview here.
          </p>
        ) : (
          <>
            <div className="mt-3 flex items-center gap-3">
              {track.albumArt ? (
                <AlbumCover urls={[track.albumArt]} size={52} />
              ) : (
                <div
                  className="h-[52px] w-[52px] shrink-0 border border-border bg-surface-2"
                  style={{ borderRadius: "var(--r-card)" }}
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-[0.875rem] text-fg">{track.name}</p>
                <p className="truncate text-[0.75rem] text-fg-muted">
                  {track.artists}
                </p>
              </div>
            </div>

            {status === "none" ? (
              <p className="mt-3 text-[0.75rem] text-fg-faint">
                No preview for this one — open it in Spotify instead.
              </p>
            ) : (
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={status === "playing" ? "Pause" : "Play"}
                  disabled={status === "loading"}
                  className="grid h-9 w-9 shrink-0 place-items-center bg-accent text-accent-fg transition-transform active:scale-95 disabled:opacity-50"
                  style={{ borderRadius: "var(--r-btn)" }}
                >
                  {status === "playing" ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <div
                  onClick={seek}
                  className="h-1.5 flex-1 cursor-pointer rounded-full bg-surface-2"
                >
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-150"
                    style={{ width: dur ? `${(cur / dur) * 100}%` : "0%" }}
                  />
                </div>
                <span className="shrink-0 text-[0.6875rem] tabular-nums text-fg-faint">
                  {fmt(cur)} / {fmt(dur || 30)}
                </span>
                <button
                  type="button"
                  onClick={() => applyMuted(!muted)}
                  aria-label={muted ? "Unmute" : "Mute"}
                  aria-pressed={muted}
                  className="grid h-7 w-7 shrink-0 place-items-center text-fg-muted transition-colors hover:text-fg"
                >
                  {muted ? <VolumeOff size={15} /> : <Volume size={15} />}
                </button>
              </div>
            )}

            <a
              href={`https://open.spotify.com/track/${track.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-[0.75rem] font-medium text-accent hover:underline"
            >
              Open in Spotify ↗
            </a>
          </>
        )}

        <audio
          ref={audioRef}
          preload="none"
          onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
          onEnded={() => setStatus("paused")}
          onPlay={() => setStatus("playing")}
          onPause={() =>
            setStatus((s) => (s === "playing" ? "paused" : s))
          }
        />
      </div>
    </div>
  );
}
