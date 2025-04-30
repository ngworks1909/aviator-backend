/*
  Warnings:

  - The primary key for the `Visitors` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `visiterId` on the `Visitors` table. All the data in the column will be lost.
  - Added the required column `visitorId` to the `Visitors` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Visitors" DROP CONSTRAINT "Visitors_pkey",
DROP COLUMN "visiterId",
ADD COLUMN     "visitorId" TEXT NOT NULL,
ADD CONSTRAINT "Visitors_pkey" PRIMARY KEY ("visitorId");
