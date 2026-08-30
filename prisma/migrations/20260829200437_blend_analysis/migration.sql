-- AlterTable
ALTER TABLE "Blend" ADD COLUMN     "analysis" JSONB;

-- AlterTable
ALTER TABLE "BlendTrack" ADD COLUMN     "lean" TEXT,
ADD COLUMN     "vibe" TEXT;
