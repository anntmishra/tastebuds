"use client";

import { useEffect, useState } from "react";
import { connectSpotify } from "@/app/actions";
import { PrimaryButton } from "@/components/button";
import { PackTheme } from "@/components/pack-theme";
import { Mark } from "@/components/wordmark";

// A tour of the aesthetics, not the full set.
const TOUR = [
  "studio",
  "midnight",
  "ember",
  "velvet",
  "neon",
  "frost",
  "plum",
  "gold",
  "static",
  "cobalt",
] as const;
const LABEL: Record<string, string> = {
  studio: "Studio",
  midnight: "Midnight",
  ember: "Ember",
  velvet: "Velvet",
  neon: "Neon",
  frost: "Frost",
  plum: "Plum",
  gold: "Gold",
  static: "Static",
  cobalt: "Cobalt",
};

export function LandingHero() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((n) => (n + 1) % TOUR.length), 4200);
    return () => clearInterval(t);
  }, [paused]);

  const pack = TOUR[i];

  return (
    <div
      className="relative flex min-h-svh flex-col bg-bg text-fg transition-colors duration-500"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <PackTheme pack={pack} />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-6 sm:px-10 sm:pt-8">
        <span className="inline-flex items-center gap-2.5 text-fg">
          <Mark className="h-5 w-[26px]" />
          <span className="tb-display text-[0.9375rem]">Taste Buds</span>
        </span>
        <span className="text-[0.6875rem] uppercase tracking-[0.2em] text-fg-faint">
          {LABEL[pack]}
        </span>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 items-center px-6 sm:px-10">
        <div className="w-full max-w-2xl py-16">
          <h1 className="tb-display reveal reveal-1 text-[length:var(--text-hero)] leading-[0.98]">
            Do your friends&rsquo;{" "}
            <span className="text-accent">taste buds</span> actually match?
          </h1>

          <p className="reveal reveal-2 mt-6 max-w-md text-[length:var(--text-lg)] leading-relaxed text-fg-muted">
            Blend your Spotify with a friend. Get one playlist with a stupid
            name &mdash; and a breakdown Spotify&rsquo;s own Blend won&rsquo;t
            show you.
          </p>

          <form className="reveal reveal-3 mt-9" action={connectSpotify}>
            <PrimaryButton type="submit">Connect Spotify</PrimaryButton>
          </form>

          <p className="reveal reveal-4 mt-4 text-[length:var(--text-sm)] text-fg-faint">
            No account to make &mdash; your Spotify is your login.
          </p>
        </div>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-5xl items-center gap-2 px-6 pb-8 sm:px-10">
        {TOUR.map((p, idx) => (
          <button
            key={p}
            type="button"
            aria-label={LABEL[p]}
            onClick={() => setI(idx)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: idx === i ? 28 : 8,
              background: idx === i ? "var(--accent)" : "var(--border-strong)",
            }}
          />
        ))}
      </footer>
    </div>
  );
}
