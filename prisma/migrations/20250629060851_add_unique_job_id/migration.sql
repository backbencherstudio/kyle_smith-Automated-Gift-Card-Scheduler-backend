/*
  Warnings:

  - A unique constraint covering the columns `[job_id]` on the table `queue_job_history` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "queue_job_history_job_id_key" ON "queue_job_history"("job_id");
