-- CreateTable
CREATE TABLE "dev_profiles" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "teamMemberId" UUID NOT NULL,
    "stack" TEXT[],
    "ownershipArea" TEXT,
    "slackHandle" TEXT,
    "githubHandle" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dev_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dev_profiles_teamMemberId_key" ON "dev_profiles"("teamMemberId");

-- CreateIndex
CREATE INDEX "dev_profiles_organizationId_idx" ON "dev_profiles"("organizationId");

-- CreateIndex
CREATE INDEX "dev_profiles_stack_idx" ON "dev_profiles" USING GIN ("stack");

-- AddForeignKey
ALTER TABLE "dev_profiles" ADD CONSTRAINT "dev_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_profiles" ADD CONSTRAINT "dev_profiles_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
