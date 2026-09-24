-- CreateTable
CREATE TABLE "daily_reports" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "reportDate" DATE NOT NULL,
    "shipped" TEXT NOT NULL,
    "blocked" TEXT,
    "next" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report_issues" (
    "reportId" UUID NOT NULL,
    "issueId" UUID NOT NULL,

    CONSTRAINT "daily_report_issues_pkey" PRIMARY KEY ("reportId","issueId")
);

-- CreateIndex
CREATE INDEX "daily_reports_organizationId_reportDate_idx" ON "daily_reports"("organizationId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_authorId_reportDate_key" ON "daily_reports"("authorId", "reportDate");

-- CreateIndex
CREATE INDEX "daily_report_issues_issueId_idx" ON "daily_report_issues"("issueId");

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_issues" ADD CONSTRAINT "daily_report_issues_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_issues" ADD CONSTRAINT "daily_report_issues_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
