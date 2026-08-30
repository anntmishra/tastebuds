import Link from "next/link";

/**
 * Taste Buds mark — two overlapping "buds" on a shared stem. The overlap
 * (the blend) is the accent and breathes; the stem node ties them together.
 * Everything tracks the active pack via CSS vars.
 */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 34 28"
      className={className}
      role="img"
      aria-label="Taste Buds"
      fill="none"
    >
      <defs>
        <clipPath id="tb-lens">
          <circle cx="21" cy="12" r="9" />
        </clipPath>
      </defs>
      {/* stem down to the node */}
      <path
        d="M17 20 v3.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="17" cy="25.4" r="2.2" fill="var(--accent)" />
      {/* the two buds */}
      <circle cx="13" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="21" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      {/* the blend */}
      <g clipPath="url(#tb-lens)">
        <circle cx="13" cy="12" r="9" fill="var(--accent)" className="breathe" />
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
      <Mark className="h-6 w-[29px]" />
      <span className="tb-display text-[0.9375rem]">Taste Buds</span>
    </Link>
  );
}
