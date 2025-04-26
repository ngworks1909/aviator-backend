/*
  Warnings:

  - Added the required column `paymentType` to the `Payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payments" ADD COLUMN     "paymentType" "PaymentType" NOT NULL;
