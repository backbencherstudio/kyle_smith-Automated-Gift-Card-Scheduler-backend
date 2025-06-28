-- CreateTable
CREATE TABLE "queue_job_history" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_name" TEXT NOT NULL,
    "job_status" TEXT NOT NULL,
    "job_data" JSONB NOT NULL,
    "gift_scheduling_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "processing_time_ms" INTEGER,
    "error_message" TEXT,

    CONSTRAINT "queue_job_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "queue_job_history" ADD CONSTRAINT "queue_job_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_job_history" ADD CONSTRAINT "queue_job_history_gift_scheduling_id_fkey" FOREIGN KEY ("gift_scheduling_id") REFERENCES "gift_scheduling"("id") ON DELETE SET NULL ON UPDATE CASCADE;
