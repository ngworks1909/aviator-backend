-- CreateTable
CREATE TABLE "Account" (
    "accountId" TEXT NOT NULL,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "upi" TEXT,
    "username" TEXT NOT NULL,
    "cryptoId" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "Withdrawls" (
    "withdrawlId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "currency" TEXT NOT NULL DEFAULT 'INR',

    CONSTRAINT "Withdrawls_pkey" PRIMARY KEY ("withdrawlId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_accountNumber_key" ON "Account"("accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Account_upi_key" ON "Account"("upi");

-- CreateIndex
CREATE UNIQUE INDEX "Account_cryptoId_key" ON "Account"("cryptoId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_key" ON "Account"("userId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawls" ADD CONSTRAINT "Withdrawls_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;
