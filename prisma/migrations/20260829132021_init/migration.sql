-- CreateEnum
CREATE TYPE "BlendType" AS ENUM ('pair', 'group');

-- CreateEnum
CREATE TYPE "BlendStatus" AS ENUM ('pending', 'ready', 'generated', 'pushed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blend" (
    "id" TEXT NOT NULL,
    "type" "BlendType" NOT NULL,
    "status" "BlendStatus" NOT NULL DEFAULT 'pending',
    "inviteCode" TEXT NOT NULL,
    "generatedName" TEXT,
    "spotifyPlaylistId" TEXT,
    "compatibility" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlendParticipant" (
    "id" TEXT NOT NULL,
    "blendId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlendParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlendTrack" (
    "id" TEXT NOT NULL,
    "blendId" TEXT NOT NULL,
    "spotifyTrackId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "artists" TEXT NOT NULL,
    "matchReason" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "BlendTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTasteSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timeRange" TEXT NOT NULL DEFAULT 'medium_term',
    "topTracks" JSONB NOT NULL,
    "topArtists" JSONB NOT NULL,
    "genres" JSONB NOT NULL,
    "eras" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTasteSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_spotifyId_key" ON "User"("spotifyId");

-- CreateIndex
CREATE UNIQUE INDEX "Blend_inviteCode_key" ON "Blend"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "BlendParticipant_blendId_userId_key" ON "BlendParticipant"("blendId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BlendTrack_blendId_spotifyTrackId_key" ON "BlendTrack"("blendId", "spotifyTrackId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTasteSnapshot_userId_timeRange_key" ON "UserTasteSnapshot"("userId", "timeRange");

-- AddForeignKey
ALTER TABLE "BlendParticipant" ADD CONSTRAINT "BlendParticipant_blendId_fkey" FOREIGN KEY ("blendId") REFERENCES "Blend"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlendParticipant" ADD CONSTRAINT "BlendParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlendTrack" ADD CONSTRAINT "BlendTrack_blendId_fkey" FOREIGN KEY ("blendId") REFERENCES "Blend"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTasteSnapshot" ADD CONSTRAINT "UserTasteSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
