/*
  Warnings:

  - The `status` column on the `gift_card_inventory` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "GiftCardStatus" AS ENUM ('AVAILABLE', 'USED', 'EXPIRED', 'RESERVED');

-- AlterTable
ALTER TABLE "gift_card_inventory" DROP COLUMN "status",
ADD COLUMN     "status" "GiftCardStatus" NOT NULL DEFAULT 'AVAILABLE';
