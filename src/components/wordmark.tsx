import Link from "next/link";

/** Two overlapping circles = a Venn / "buds". The overlap is the accent and
 *  breathes gently. Colours track the active pack. */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" className={className} role="img" aria-label="Taste Buds">
      <defs>
        <clipPath id="tb-lens">
          <circle cx="20" cy="12" r="8.5" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="20" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <g clipPath="url(#tb-lens)">
        <circle cx="12" cy="12" r="8.5" fill="var(--accent)" className="breathe" />
      </g>
    </svg>
  );
}

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 text-fg transition-opacity duration-200 hover:opacity-70"
    >
      <Mark className="h-5 w-[26px]" />
      <span className="tb-display text-[0.9375rem]">Taste Buds</span>
    </Link>
  );
}
