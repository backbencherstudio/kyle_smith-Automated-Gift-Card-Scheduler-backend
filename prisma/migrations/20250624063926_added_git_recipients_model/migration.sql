/*
  Warnings:

  - You are about to drop the column `address` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `birthday_date` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `contact_id` on the `gift_scheduling` table. All the data in the column will be lost.
  - Added the required column `first_name` to the `contacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `contacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `message` to the `contacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipient_id` to the `gift_scheduling` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "contacts" DROP CONSTRAINT "contacts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "gift_scheduling" DROP CONSTRAINT "gift_scheduling_contact_id_fkey";

-- AlterTable
ALTER TABLE "contacts" DROP COLUMN "address",
DROP COLUMN "birthday_date",
DROP COLUMN "name",
DROP COLUMN "user_id",
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL,
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "gift_scheduling" DROP COLUMN "contact_id",
ADD COLUMN     "recipient_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "gift_recipients" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT,
    "birthday_date" TIMESTAMP(3) NOT NULL,
    "address" TEXT,

    CONSTRAINT "gift_recipients_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "gift_scheduling" ADD CONSTRAINT "gift_scheduling_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "gift_recipients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_recipients" ADD CONSTRAINT "gift_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
