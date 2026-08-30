export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const s = Math.round((Date.now() - then) / 1000);
  if (s < 45) return "just now";
  if (s < 90) return "a minute ago";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);
  return `${mo}mo ago`;
}

/** e.g. [2010s, 2020s, 2000s] -> "Mostly 2010s & 2020s" */
export function describeEras(
  eras: { decade: number; weight: number }[],
): string | null {
  const ranked = [...eras].sort((a, b) => b.weight - a.weight).slice(0, 2);
  if (!ranked.length) return null;
  const label = (d: number) => `${d}s`;
  if (ranked.length === 1 || ranked[0].weight >= 0.6) {
    return `Mostly ${label(ranked[0].decade)}`;
  }
  const [a, b] = ranked;
  return `Mostly ${label(a.decade)} & ${label(b.decade)}`;
}

/** popularity mean -> a short mainstream↔obscure read */
export function describePopularity(mean: number): string {
  if (mean >= 75) return "Chart-forward";
  if (mean >= 55) return "Popular picks";
  if (mean >= 35) return "A mix of hits and deep cuts";
  if (mean >= 20) return "Off the beaten path";
  return "Deep cuts only";
}
