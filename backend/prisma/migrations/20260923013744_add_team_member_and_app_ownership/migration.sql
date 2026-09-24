-- CreateEnum
CREATE TYPE "role" AS ENUM ('owner', 'pm_lead', 'dev_team_leader', 'developer', 'designer', 'viewer');

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "role" NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_ownerships" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "teamMemberId" UUID NOT NULL,
    "app" "app_key" NOT NULL,
    "role" "role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_members_organizationId_idx" ON "team_members"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_userId_key" ON "team_members"("userId");

-- CreateIndex
CREATE INDEX "app_ownerships_organizationId_idx" ON "app_ownerships"("organizationId");

-- CreateIndex
CREATE INDEX "app_ownerships_app_idx" ON "app_ownerships"("app");

-- CreateIndex
CREATE UNIQUE INDEX "app_ownerships_teamMemberId_app_key" ON "app_ownerships"("teamMemberId", "app");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_ownerships" ADD CONSTRAINT "app_ownerships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_ownerships" ADD CONSTRAINT "app_ownerships_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
