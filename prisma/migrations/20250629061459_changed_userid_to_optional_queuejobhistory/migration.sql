-- DropForeignKey
ALTER TABLE "queue_job_history" DROP CONSTRAINT "queue_job_history_user_id_fkey";

-- AlterTable
ALTER TABLE "queue_job_history" ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "queue_job_history" ADD CONSTRAINT "queue_job_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
