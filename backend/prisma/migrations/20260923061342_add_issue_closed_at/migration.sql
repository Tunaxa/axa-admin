-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "closedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "issues_organizationId_closedAt_idx" ON "issues"("organizationId", "closedAt");
