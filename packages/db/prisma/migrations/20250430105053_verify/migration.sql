/*
  Warnings:

  - A unique constraint covering the columns `[referredBy]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `referralId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referredBy" TEXT,
ALTER COLUMN "referralId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_referredBy_key" ON "User"("referredBy");
