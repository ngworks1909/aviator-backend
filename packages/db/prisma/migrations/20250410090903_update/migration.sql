/*
  Warnings:

  - You are about to drop the `Withdrawls` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Withdrawls" DROP CONSTRAINT "Withdrawls_userId_fkey";

-- DropTable
DROP TABLE "Withdrawls";

-- CreateTable
CREATE TABLE "Withdrawals" (
    "withdrawlId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "withdrawType" "WithdrawType" NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "upi" TEXT,
    "cryptoId" TEXT,

    CONSTRAINT "Withdrawals_pkey" PRIMARY KEY ("withdrawlId")
);

-- AddForeignKey
ALTER TABLE "Withdrawals" ADD CONSTRAINT "Withdrawals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
