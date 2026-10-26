-- CreateEnum
CREATE TYPE "account_request_status" AS ENUM ('pending', 'approved', 'rejected', 'needs_more_info');

-- CreateTable
CREATE TABLE "account_requests" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "app" "app_key" NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "note" TEXT,
    "raisedById" UUID,
    "status" "account_request_status" NOT NULL DEFAULT 'pending',
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "checkoutSessionId" TEXT,
    "checkoutUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_requests_organizationId_status_createdAt_idx" ON "account_requests"("organizationId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "account_requests" ADD CONSTRAINT "account_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_requests" ADD CONSTRAINT "account_requests_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_requests" ADD CONSTRAINT "account_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
