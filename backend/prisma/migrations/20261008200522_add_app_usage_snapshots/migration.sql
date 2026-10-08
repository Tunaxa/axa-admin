-- CreateTable
CREATE TABLE "app_usage_snapshots" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "app" "app_key" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deploys" INTEGER,
    "errorRate" DECIMAL(6,5),
    "signups" INTEGER,
    "mrr" DECIMAL(14,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_usage_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_usage_snapshots_organizationId_periodStart_idx" ON "app_usage_snapshots"("organizationId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "app_usage_snapshots_organizationId_app_periodStart_periodEn_key" ON "app_usage_snapshots"("organizationId", "app", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "app_usage_snapshots" ADD CONSTRAINT "app_usage_snapshots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
