/*
  Warnings:

  - You are about to drop the column `paymentType` on the `Payments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Payments" DROP COLUMN "paymentType";

-- DropEnum
DROP TYPE "PaymentType";
