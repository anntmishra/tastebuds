/** Two circles drifting toward alignment — the "waiting for your friend" cue. */
export function WaitingMarks() {
  return (
    <svg
      viewBox="0 0 60 32"
      className="h-8 w-[60px] text-fg-muted"
      role="img"
      aria-label="Waiting"
    >
      <circle
        className="drift-r"
        cx="22"
        cy="16"
        r="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        className="drift-l"
        cx="38"
        cy="16"
        r="11"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
