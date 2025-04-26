/*
  Warnings:

  - Added the required column `withdrawType` to the `Withdrawls` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WithdrawType" AS ENUM ('Bank', 'UPI', 'Crypto');

-- AlterTable
ALTER TABLE "Withdrawls" ADD COLUMN     "withdrawType" "WithdrawType" NOT NULL;
