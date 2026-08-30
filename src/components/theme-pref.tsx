"use client";

import { useEffect } from "react";

export const PACK_KEY = "tb-pack";
export const PACK_EVENT = "tb-pack-change";

/** Blocking script for <head> — applies the saved pack before first paint so
 *  there's no flash of the default theme. */
export const themePrefScript = `try{var p=localStorage.getItem('${PACK_KEY}');if(p&&p!=='studio')document.documentElement.setAttribute('data-pack',p);}catch(e){}`;

export function applyPack(pack: string | null) {
  const el = document.documentElement;
  if (pack && pack !== "studio") el.setAttribute("data-pack", pack);
  else el.removeAttribute("data-pack");
}

export function setPackPref(pack: string) {
  try {
    localStorage.setItem(PACK_KEY, pack);
  } catch {
    // private mode / storage disabled — the change still applies for this view
  }
  applyPack(pack);
  window.dispatchEvent(new CustomEvent(PACK_EVENT, { detail: pack }));
}

export function readPackPref(): string {
  try {
    return localStorage.getItem(PACK_KEY) ?? "studio";
  } catch {
    return "studio";
  }
}

/** Mounted once in the root layout: keeps every tab/route in sync when the
 *  preference changes (same tab via the custom event, other tabs via storage). */
export function ThemePref() {
  useEffect(() => {
    applyPack(readPackPref());
    const onEvent = (e: Event) => applyPack((e as CustomEvent<string>).detail);
    const onStorage = (e: StorageEvent) => {
      if (e.key === PACK_KEY) applyPack(e.newValue);
    };
    window.addEventListener(PACK_EVENT, onEvent as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PACK_EVENT, onEvent as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return null;
}
