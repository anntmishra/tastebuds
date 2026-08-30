"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // clipboard blocked — the link is still visible to copy by hand
        }
      }}
      className={
        "shrink-0 rounded-[var(--r-pill)] px-4 py-2 text-[13px] font-semibold " +
        "transition-all duration-200 ease-[var(--ease)] active:scale-[0.97] " +
        (copied
          ? "bg-accent-tint text-accent"
          : "bg-accent text-accent-fg shadow-soft hover:-translate-y-0.5 hover:shadow-lift")
      }
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
