/* eslint-disable @next/next/no-img-element */

/** One cover, or a 2×2 mosaic if 4+ are supplied — like a playlist cover.
 *  Plain <img> on purpose: Spotify's CDN already serves small, cached art,
 *  so the image optimizer just adds a failure mode. Frame follows the pack. */
export function AlbumCover({
  urls,
  size = 200,
  className = "",
}: {
  urls: string[];
  size?: number;
  className?: string;
}) {
  const imgs = (urls ?? []).filter(Boolean).slice(0, 4);
  if (imgs.length === 0) return null;

  const style = {
    width: size,
    height: size,
    borderRadius: "var(--r-card)",
  } as const;

  if (imgs.length < 4) {
    return (
      <img
        src={imgs[0]}
        alt=""
        loading="lazy"
          decoding="async"
        style={style}
        className={
          "shrink-0 border border-border object-cover shadow-card " + className
        }
      />
    );
  }

  return (
    <div
      style={style}
      className={
        "grid shrink-0 grid-cols-2 overflow-hidden border border-border shadow-card " +
        className
      }
    >
      {imgs.map((u, i) => (
        <img
          key={i}
          src={u}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ))}
    </div>
  );
}
