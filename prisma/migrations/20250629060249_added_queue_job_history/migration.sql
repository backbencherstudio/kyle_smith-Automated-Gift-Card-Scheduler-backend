/*
  Warnings:

  - Changed the type of `job_status` on the `queue_job_history` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('WAITING', 'ACTIVE', 'COMPLETED', 'FAILED', 'DELAYED', 'CANCELLED');

-- AlterTable
ALTER TABLE "queue_job_history" ADD COLUMN     "delivery_error" TEXT,
ADD COLUMN     "email_delivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "email_sent_at" TIMESTAMP(3),
ADD COLUMN     "max_retries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "job_status",
ADD COLUMN     "job_status" "JobStatus" NOT NULL;

-- CreateIndex
CREATE INDEX "queue_job_history_user_id_idx" ON "queue_job_history"("user_id");

-- CreateIndex
CREATE INDEX "queue_job_history_gift_scheduling_id_idx" ON "queue_job_history"("gift_scheduling_id");

-- CreateIndex
CREATE INDEX "queue_job_history_job_status_idx" ON "queue_job_history"("job_status");

-- CreateIndex
CREATE INDEX "queue_job_history_created_at_idx" ON "queue_job_history"("created_at");

-- CreateIndex
CREATE INDEX "queue_job_history_completed_at_idx" ON "queue_job_history"("completed_at");
