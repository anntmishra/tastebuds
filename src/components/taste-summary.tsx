import { refreshTaste } from "@/app/actions";
import { AlbumCover } from "@/components/album-cover";
import { describeEras, describePopularity, relativeTime } from "@/lib/format";
import type { TasteSnapshot } from "@/lib/taste";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-fg-faint">
      {children}
    </p>
  );
}

export function TasteSummary({ snapshot }: { snapshot: TasteSnapshot }) {
  const artists = snapshot.topArtists.slice(0, 5);
  const genres = snapshot.genres.slice(0, 6);
  const eraLine = describeEras(snapshot.eras);
  const covers = snapshot.topTracks
    .map((t) => t.albumArt)
    .filter(Boolean)
    .slice(0, 4);

  return (
    <section className="tb-card p-6">
      <div className="flex items-baseline justify-between gap-3">
        <Label>What I&rsquo;m seeing in your Spotify</Label>
        <span className="text-[0.6875rem] text-fg-faint">
          {snapshot.stale ? "showing last saved · " : ""}
          {relativeTime(snapshot.fetchedAt)}
        </span>
      </div>

      {covers.length > 0 && (
        <div className="mt-4">
          <AlbumCover urls={covers} size={72} />
        </div>
      )}

      <div className="mt-5 space-y-5">
        <div>
          <Label>Top artists</Label>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-fg">
            {artists.map((a, i) => (
              <span key={a.id}>
                {a.name}
                {i < artists.length - 1 ? (
                  <span className="text-fg-faint"> · </span>
                ) : null}
              </span>
            ))}
          </p>
        </div>

        {genres.length > 0 && (
          <div>
            <Label>Top genres</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {genres.map((g, i) => (
                <span
                  key={g.name}
                  style={{ borderRadius: "var(--r-pill)" }}
                  className={
                    "px-2.5 py-1 text-[0.75rem] " +
                    (i === 0
                      ? "bg-accent-tint text-accent"
                      : "border border-border text-fg-muted")
                  }
                >
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-x-8 gap-y-4">
          {eraLine && (
            <div>
              <Label>Era</Label>
              <p className="mt-1.5 text-[0.875rem] text-fg">{eraLine}</p>
            </div>
          )}
          <div>
            <Label>Reach</Label>
            <p className="mt-1.5 text-[0.875rem] text-fg">
              {describePopularity(snapshot.popularity.mean)}
            </p>
          </div>
        </div>
      </div>

      <form action={refreshTaste} className="mt-6 border-t border-border pt-4">
        <button
          type="submit"
          className="text-[0.75rem] font-medium text-fg-muted transition-colors hover:text-accent"
        >
          Refresh from Spotify
        </button>
      </form>
    </section>
  );
}
