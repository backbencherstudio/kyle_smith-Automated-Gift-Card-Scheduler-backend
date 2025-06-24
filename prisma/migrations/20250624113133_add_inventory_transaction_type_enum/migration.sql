/*
  Warnings:

  - Changed the type of `transaction_type` on the `inventory_transactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('PURCHASE', 'SALE', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "inventory_transactions" DROP COLUMN "transaction_type",
ADD COLUMN     "transaction_type" "InventoryTransactionType" NOT NULL;
