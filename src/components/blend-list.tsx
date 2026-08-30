import Link from "next/link";
import { AlbumCover } from "@/components/album-cover";
import { relativeTime } from "@/lib/format";

type Row = {
  inviteCode: string;
  status: string;
  updatedAt: Date;
  analysis: unknown;
  participants: {
    userId: string;
    isOwner: boolean;
    user: { name: string | null };
  }[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting for a friend",
  ready: "Ready to generate",
  generated: "Blended",
  pushed: "Saved to Spotify",
};

export function BlendList({
  blends,
  currentUserId,
}: {
  blends: Row[];
  currentUserId: string;
}) {
  if (blends.length === 0) return null;

  return (
    <section className="mt-12">
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-fg-faint">
        Your blends
      </p>
      <ul
        style={{ borderRadius: "var(--r-card)" }}
        className="mt-3 divide-y divide-border overflow-hidden border border-border bg-surface"
      >
        {blends.map((b) => {
          const other = b.participants.find((p) => p.userId !== currentUserId);
          const who = other?.user.name ?? "no one yet";
          const covers =
            (b.analysis as { coverArt?: string[] } | null)?.coverArt ?? [];
          return (
            <li key={b.inviteCode}>
              <Link
                href={`/blend/${b.inviteCode}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
              >
                {covers.length > 0 ? (
                  <AlbumCover urls={covers} size={40} />
                ) : (
                  <div
                    className="h-10 w-10 shrink-0 border border-border bg-surface-2"
                    style={{ borderRadius: "var(--r-card)" }}
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.875rem] text-fg">
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                  <span className="block truncate text-[0.75rem] text-fg-faint">
                    with {who} · {relativeTime(b.updatedAt.toISOString())}
                  </span>
                </span>
                <span aria-hidden className="text-fg-faint">
                  &rsaquo;
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
