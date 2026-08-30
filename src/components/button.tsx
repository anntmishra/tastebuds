import type { ComponentProps, ReactNode } from "react";

type Props = ComponentProps<"button"> & { trailing?: ReactNode | null };

function Arrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 3l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Accent primary. Radius, motion + colour all come from the active pack. */
export function PrimaryButton({
  children,
  trailing = <Arrow />,
  className = "",
  ...props
}: Props) {
  return (
    <button
      {...props}
      style={{ borderRadius: "var(--r-btn)" }}
      className={
        "group inline-flex items-center justify-center gap-2 " +
        "bg-accent px-6 py-3.5 text-[0.9375rem] font-semibold text-accent-fg " +
        "shadow-soft transition-all duration-[var(--dur)] ease-[var(--ease-out)] " +
        "hover:-translate-y-0.5 hover:shadow-lift hover:bg-accent-press " +
        "active:translate-y-0 active:scale-[0.98] " +
        "disabled:pointer-events-none disabled:opacity-40 " +
        className
      }
    >
      {children}
      {trailing !== null ? (
        <span className="transition-transform duration-[var(--dur)] ease-[var(--ease-out)] group-hover:translate-x-0.5">
          {trailing}
        </span>
      ) : null}
    </button>
  );
}

/** Bordered secondary. */
export function OutlineButton({ children, className = "", ...props }: Props) {
  return (
    <button
      {...props}
      style={{ borderRadius: "var(--r-btn)" }}
      className={
        "inline-flex items-center justify-center gap-2 border border-border-strong " +
        "px-5 py-3 text-[0.875rem] font-medium text-fg " +
        "transition-all duration-[var(--dur)] ease-[var(--ease-out)] " +
        "hover:border-fg hover:-translate-y-0.5 active:translate-y-0 " +
        "disabled:pointer-events-none disabled:opacity-40 " +
        className
      }
    >
      {children}
    </button>
  );
}

/** Low-emphasis text button. */
export function GhostButton({ children, className = "", ...props }: Props) {
  return (
    <button
      {...props}
      className={
        "inline-flex items-center gap-1.5 px-2 py-1 text-[0.8125rem] font-medium " +
        "text-fg-muted transition-colors duration-150 hover:text-fg " +
        className
      }
    >
      {children}
    </button>
  );
}
