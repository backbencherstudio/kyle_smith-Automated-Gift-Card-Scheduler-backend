/*
  Warnings:

  - You are about to drop the column `deleted_at` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the `social_medias` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `birthday_date` to the `contacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `contacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `contacts` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `contacts` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "contacts" DROP COLUMN "deleted_at",
DROP COLUMN "first_name",
DROP COLUMN "last_name",
DROP COLUMN "message",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "birthday_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "inventory_id" TEXT,
ADD COLUMN     "transaction_category" TEXT;

-- DropTable
DROP TABLE "social_medias";

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_card_inventory" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "card_code" TEXT NOT NULL,
    "face_value" DECIMAL(65,30) NOT NULL,
    "purchase_cost" DECIMAL(65,30) NOT NULL,
    "selling_price" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL,
    "purchase_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_card_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gifts" (
    "id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_scheduling" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "gift_id" TEXT NOT NULL,
    "inventory_id" TEXT,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "delivery_email" TEXT NOT NULL,
    "custom_message" TEXT,
    "delivery_status" TEXT NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_scheduling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "user_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "gift_card_inventory" ADD CONSTRAINT "gift_card_inventory_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "gift_card_inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_scheduling" ADD CONSTRAINT "gift_scheduling_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_scheduling" ADD CONSTRAINT "gift_scheduling_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_scheduling" ADD CONSTRAINT "gift_scheduling_gift_id_fkey" FOREIGN KEY ("gift_id") REFERENCES "gifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_scheduling" ADD CONSTRAINT "gift_scheduling_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "gift_card_inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "gift_card_inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "gift_card_inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
