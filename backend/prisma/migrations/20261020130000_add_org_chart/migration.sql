-- CreateTable
CREATE TABLE "org_charts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Organigramme',
    "data" JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_charts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_charts_organizationId_key" ON "org_charts"("organizationId");

-- CreateIndex
CREATE INDEX "org_charts_organizationId_idx" ON "org_charts"("organizationId");

-- AddForeignKey
ALTER TABLE "org_charts" ADD CONSTRAINT "org_charts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
