/*
  Warnings:

  - Added the required column `stripe_customer_id` to the `user_payment_methods` table without a default value. This is not possible if the table is not empty.
  - Made the column `user_id` on table `user_payment_methods` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "user_payment_methods" DROP CONSTRAINT "user_payment_methods_user_id_fkey";

-- AlterTable
ALTER TABLE "user_payment_methods" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripe_customer_id" TEXT NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
