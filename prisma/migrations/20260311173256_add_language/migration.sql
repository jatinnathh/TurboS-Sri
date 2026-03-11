-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "audioUrl" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "messages" JSONB;
