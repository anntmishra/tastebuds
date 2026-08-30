import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const PAIR_CAPACITY = 2;

// URL-safe, no easily-confused characters (0/1/i/l/o).
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export function generateInviteCode(length = 9): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

export function getBlendByCode(code: string) {
  return prisma.blend.findUnique({
    where: { inviteCode: code },
    include: {
      participants: {
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      },
      tracks: { orderBy: { position: "asc" } },
    },
  });
}

export type BlendWithParticipants = NonNullable<
  Awaited<ReturnType<typeof getBlendByCode>>
>;

export function isParticipant(blend: BlendWithParticipants, userId: string) {
  return blend.participants.some((p) => p.userId === userId);
}

export function blendOwner(blend: BlendWithParticipants) {
  return blend.participants.find((p) => p.isOwner) ?? blend.participants[0];
}
