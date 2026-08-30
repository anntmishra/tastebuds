"use client";

import { useEffect, useRef, useState } from "react";
import { Dice } from "@/components/icons";
import { PACKS, packName } from "@/lib/packs";
import {
  PACK_EVENT,
  readPackPref,
  setPackPref,
} from "@/components/theme-pref";

/**
 * Site-wide theme (album pack) picker for logged-in pages. Persists to
 * localStorage via setPackPref — no server round-trip. The per-blend theme on
 * the reveal is separate (that one's saved to the blend).
 */
export function ThemeMenu({ align = "right" }: { align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [pack, setPack] = useState("studio");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPack(readPackPref());
    const sync = () => setPack(readPackPref());
    window.addEventListener(PACK_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PACK_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (id: string) => {
    setPackPref(id);
    setPack(id);
  };
  const shuffle = () => {
    const pool = PACKS.filter((p) => p.id !== pack);
    pick(pool[Math.floor(Math.random() * pool.length)].id);
  };

  return (
    <div ref={box} className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-[0.6875rem] uppercase tracking-[0.16em] text-fg-muted transition-colors hover:text-fg"
      >
        {packName(pack)}
        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
          <path
            d="M2 3.5 5 6.5 8 3.5"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <button
        type="button"
        onClick={shuffle}
        aria-label="Shuffle theme"
        style={{ borderRadius: "var(--r-btn)" }}
        className="border border-border p-1.5 text-fg-muted transition-all duration-200 ease-[var(--ease-spring)] hover:-rotate-12 hover:text-fg active:scale-90"
      >
        <Dice size={14} />
      </button>

      {open && (
        <div
          className={
            "tb-card absolute top-full z-40 mt-2 w-[19rem] p-2.5 " +
            (align === "left" ? "left-0" : "right-0")
          }
          style={{ borderRadius: "var(--r-card)" }}
        >
          <p className="px-1 pb-2 text-[0.625rem] uppercase tracking-[0.18em] text-fg-faint">
            Theme
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {PACKS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p.id)}
                title={p.note}
                style={{ borderRadius: "var(--r-input)" }}
                className={
                  "w-full overflow-hidden border text-left transition-transform hover:-translate-y-0.5 " +
                  (p.id === pack
                    ? "border-accent"
                    : "border-border hover:border-border-strong")
                }
              >
                <span
                  className="flex h-11 items-end gap-1 p-1.5"
                  style={{ background: p.swatch.bg }}
                >
                  <span
                    className="h-1.5 flex-1 rounded-full"
                    style={{ background: p.swatch.accent }}
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: p.swatch.fg, opacity: 0.9 }}
                  />
                </span>
                <span className="block truncate px-2 py-1.5 text-[0.6875rem] font-medium text-fg">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
