import type { Session } from "next-auth";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectSpotify, createPairBlend, disconnect } from "@/app/actions";
import { BlendList } from "@/components/blend-list";
import { GhostButton, PrimaryButton } from "@/components/button";
import { TasteSummary } from "@/components/taste-summary";
import { Wordmark } from "@/components/wordmark";
import { prisma } from "@/lib/prisma";
import { SpotifyAuthError } from "@/lib/spotify";
import { getTasteSnapshot, type TasteSnapshot } from "@/lib/taste";
import { ensureUser } from "@/lib/user";

type BlendRow = Awaited<ReturnType<typeof loadBlends>>[number];

function loadBlends(userId: string) {
  return prisma.blend.findMany({
    where: { participants: { some: { userId } } },
    include: { participants: { include: { user: true } } },
    orderBy: { updatedAt: "desc" },
    take: 6,
  });
}

export default async function StartPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  let needsReconnect = Boolean(session.error);
  let snapshot: TasteSnapshot | null = null;
  let tasteFailed = false;
  let userId: string | null = null;
  let blends: BlendRow[] = [];

  if (!needsReconnect) {
    userId = await ensureUser(session);
    if (userId) {
      blends = await loadBlends(userId);
      if (session.accessToken) {
        try {
          snapshot = await getTasteSnapshot({
            userId,
            accessToken: session.accessToken,
          });
        } catch (err) {
          if (err instanceof SpotifyAuthError) needsReconnect = true;
          else tasteFailed = true;
        }
      }
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-1 flex-col px-6 sm:px-10">
      <header className="flex items-center justify-between pt-6 sm:pt-8">
        <Wordmark />
        <form action={disconnect}>
          <GhostButton type="submit">Sign out</GhostButton>
        </form>
      </header>

      <main className="flex flex-1 items-start py-12 sm:py-16">
        <div className="w-full max-w-xl">
          {needsReconnect ? (
            <Reconnect />
          ) : (
            <Connected
              session={session}
              userId={userId}
              blends={blends}
              snapshot={snapshot}
              tasteFailed={tasteFailed}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function Connected({
  session,
  userId,
  blends,
  snapshot,
  tasteFailed,
}: {
  session: Session;
  userId: string | null;
  blends: BlendRow[];
  snapshot: TasteSnapshot | null;
  tasteFailed: boolean;
}) {
  const name = session.user?.name ?? "your Spotify";

  return (
    <>
      <div className="reveal reveal-1 flex items-center gap-3">
        {session.user?.image ? (
          <Image
            src={session.user.image}
            alt=""
            width={36}
            height={36}
            className="rounded-full ring-1 ring-border"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-surface-2 ring-1 ring-border" />
        )}
        <p className="text-[0.8125rem] text-fg-muted">
          Connected as <span className="font-medium text-fg">{name}</span>
        </p>
      </div>

      <h1 className="tb-display reveal reveal-2 mt-7 text-[length:var(--text-h1)] leading-[1.03]">
        Start a blend.
      </h1>
      <p className="reveal reveal-3 mt-5 max-w-md text-[length:var(--text-base)] leading-relaxed text-fg-muted">
        Invite a friend and I&rsquo;ll blend what you both listen to into one
        playlist, then push it to your real Spotify.
      </p>

      <form className="reveal reveal-4 mt-9" action={createPairBlend}>
        <PrimaryButton type="submit">Blend with a friend</PrimaryButton>
      </form>

      {userId && <BlendList blends={blends} currentUserId={userId} />}

      <div className="reveal reveal-5 mt-12">
        {snapshot ? (
          <TasteSummary snapshot={snapshot} />
        ) : tasteFailed ? (
          <p className="text-[0.8125rem] text-fg-faint">
            Couldn&rsquo;t reach Spotify for your taste data just now &mdash;
            it&rsquo;ll load next time.
          </p>
        ) : null}
      </div>
    </>
  );
}

function Reconnect() {
  return (
    <div className="tb-card reveal p-7">
      <h1 className="tb-display text-[length:var(--text-h2)]">Reconnect Spotify</h1>
      <p className="mt-2 max-w-sm text-[0.875rem] leading-relaxed text-fg-muted">
        Your Spotify session expired and couldn&rsquo;t refresh. Connect again
        to pick up where you left off.
      </p>
      <form className="mt-6" action={connectSpotify}>
        <PrimaryButton type="submit">Reconnect</PrimaryButton>
      </form>
    </div>
  );
}
