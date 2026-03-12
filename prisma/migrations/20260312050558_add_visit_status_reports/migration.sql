-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "reports" JSONB,
ADD COLUMN     "status" "VisitStatus" NOT NULL DEFAULT 'WAITING';
