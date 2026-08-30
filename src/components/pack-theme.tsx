"use client";

import { useEffect } from "react";

/** Syncs the active album pack onto <html> so the full-viewport texture +
 *  glow layers (body::before / ::after) pick it up. Renders nothing. */
export function PackTheme({ pack }: { pack: string | null | undefined }) {
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.getAttribute("data-pack");
    if (pack && pack !== "studio") el.setAttribute("data-pack", pack);
    else el.removeAttribute("data-pack");
    return () => {
      if (prev) el.setAttribute("data-pack", prev);
      else el.removeAttribute("data-pack");
    };
  }, [pack]);
  return null;
}
