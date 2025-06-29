/*
  Warnings:

  - You are about to drop the column `deleted_at` on the `queue_job_history` table. All the data in the column will be lost.
  - You are about to drop the column `max_retries` on the `queue_job_history` table. All the data in the column will be lost.
  - You are about to drop the column `retry_count` on the `queue_job_history` table. All the data in the column will be lost.
  - Made the column `completed_at` on table `queue_job_history` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "queue_job_history" DROP COLUMN "deleted_at",
DROP COLUMN "max_retries",
DROP COLUMN "retry_count",
ADD COLUMN     "custom_message" TEXT,
ADD COLUMN     "delivery_email" TEXT,
ADD COLUMN     "face_value" DECIMAL(65,30),
ADD COLUMN     "gift_card_code" TEXT,
ADD COLUMN     "recipient_email" TEXT,
ADD COLUMN     "recipient_name" TEXT,
ADD COLUMN     "sender_name" TEXT,
ADD COLUMN     "vendor_name" TEXT,
ALTER COLUMN "completed_at" SET NOT NULL,
ALTER COLUMN "completed_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "email_delivered" SET DEFAULT true,
ALTER COLUMN "job_status" SET DEFAULT 'COMPLETED';

-- CreateIndex
CREATE INDEX "queue_job_history_recipient_email_idx" ON "queue_job_history"("recipient_email");
