-- CreateEnum
CREATE TYPE "github_link_kind" AS ENUM ('pull_request', 'issue');

-- CreateTable
CREATE TABLE "github_repositories" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_links" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "issueId" UUID NOT NULL,
    "kind" "github_link_kind" NOT NULL,
    "repository" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "branch" TEXT,
    "mergedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "github_repositories_organizationId_idx" ON "github_repositories"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "github_repositories_fullName_key" ON "github_repositories"("fullName");

-- CreateIndex
CREATE INDEX "github_links_organizationId_idx" ON "github_links"("organizationId");

-- CreateIndex
CREATE INDEX "github_links_issueId_idx" ON "github_links"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "github_links_repository_kind_number_issueId_key" ON "github_links"("repository", "kind", "number", "issueId");

-- AddForeignKey
ALTER TABLE "github_repositories" ADD CONSTRAINT "github_repositories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_links" ADD CONSTRAINT "github_links_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_links" ADD CONSTRAINT "github_links_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
