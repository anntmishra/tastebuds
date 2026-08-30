"use client";

import { useEffect, useRef, useState } from "react";
import { rerollCoverStyle, setCoverStyle } from "@/app/actions";
import { Dice } from "@/components/icons";
import { PlaylistCover } from "@/components/playlist-cover";
import { COVER_STYLES, coverStyleOrDefault } from "@/lib/cover-styles";

export function CoverControls({
  code,
  style,
  name,
  covers,
  score,
}: {
  code: string;
  style: string | null;
  name: string;
  covers: string[];
  score: number;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = coverStyleOrDefault(style);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={box} className="relative mt-3 flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[0.6875rem] uppercase tracking-[0.14em] text-fg-muted transition-colors hover:text-fg"
      >
        Cover
        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
          <path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      <form action={rerollCoverStyle.bind(null, code)}>
        <button
          type="submit"
          aria-label="Shuffle cover"
          style={{ borderRadius: "var(--r-btn)" }}
          className="border border-border p-1.5 text-fg-muted transition-all duration-200 ease-[var(--ease-spring)] hover:-rotate-12 hover:text-fg active:scale-90"
        >
          <Dice size={13} />
        </button>
      </form>

      {open && (
        <div
          className="tb-card absolute left-0 top-full z-30 mt-2 grid w-[19rem] grid-cols-4 gap-1.5 p-2.5"
          style={{ borderRadius: "var(--r-card)" }}
        >
          {COVER_STYLES.map((s) => (
            <form key={s.id} action={setCoverStyle.bind(null, code, s.id)}>
              <button
                type="submit"
                title={s.name}
                className={
                  "block w-full overflow-hidden rounded-[10px] border transition-transform hover:-translate-y-0.5 " +
                  (s.id === current ? "border-accent" : "border-border")
                }
              >
                <PlaylistCover
                  style={s.id}
                  name={name}
                  covers={covers}
                  score={score}
                  size={66}
                  className="!border-0 !shadow-none"
                />
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
