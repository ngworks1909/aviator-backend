/*
  Warnings:

  - You are about to drop the column `accountId` on the `Withdrawls` table. All the data in the column will be lost.
  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `Withdrawls` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Withdrawls" DROP CONSTRAINT "Withdrawls_accountId_fkey";

-- AlterTable
ALTER TABLE "Withdrawls" DROP COLUMN "accountId",
ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "cryptoId" TEXT,
ADD COLUMN     "ifsc" TEXT,
ADD COLUMN     "upi" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Account";

-- AddForeignKey
ALTER TABLE "Withdrawls" ADD CONSTRAINT "Withdrawls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
