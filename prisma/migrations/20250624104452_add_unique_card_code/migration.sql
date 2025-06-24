/*
  Warnings:

  - A unique constraint covering the columns `[card_code,vendor_id]` on the table `gift_card_inventory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "gift_card_inventory_card_code_vendor_id_key" ON "gift_card_inventory"("card_code", "vendor_id");
