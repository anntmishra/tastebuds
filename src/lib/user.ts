import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

/**
 * Resolve the DB `User.id` for a session, upserting the row if it isn't there
 * yet. `session.dbUserId` is set by the `jwt` callback on new sign-ins, but
 * sessions issued before that code shipped won't have it — this backfills.
 */
export async function ensureUser(session: Session): Promise<string | null> {
  if (session.dbUserId) return session.dbUserId;

  const spotifyId = session.user?.id;
  if (!spotifyId) return null;

  const user = await prisma.user.upsert({
    where: { spotifyId },
    create: {
      spotifyId,
      name: session.user?.name ?? null,
      email: session.user?.email ?? null,
      image: session.user?.image ?? null,
    },
    update: {},
  });
  return user.id;
}
