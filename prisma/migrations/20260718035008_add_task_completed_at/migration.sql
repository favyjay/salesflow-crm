-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "value" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "completed_at" TIMESTAMP(3);
