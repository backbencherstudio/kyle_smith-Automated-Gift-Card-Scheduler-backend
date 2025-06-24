/*
  Warnings:

  - A unique constraint covering the columns `[card_code_hash,vendor_id]` on the table `gift_card_inventory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "gift_card_inventory_card_code_vendor_id_key";

-- AlterTable
ALTER TABLE "gift_card_inventory" ADD COLUMN     "card_code_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "gift_card_inventory_card_code_hash_vendor_id_key" ON "gift_card_inventory"("card_code_hash", "vendor_id");
