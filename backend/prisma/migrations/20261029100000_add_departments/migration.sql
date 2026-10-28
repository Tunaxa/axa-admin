CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "managerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "departments_organizationId_name_key" ON "departments" ("organizationId", "name");
CREATE INDEX "departments_organizationId_idx" ON "departments" ("organizationId");

ALTER TABLE "departments"
    ADD CONSTRAINT "departments_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "departments"
    ADD CONSTRAINT "departments_managerId_fkey"
    FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "team_members" ADD COLUMN "departmentId" UUID;
ALTER TABLE "projects" ADD COLUMN "departmentId" UUID;
ALTER TABLE "issues" ADD COLUMN "departmentId" UUID;

CREATE INDEX "team_members_departmentId_idx" ON "team_members" ("departmentId");
CREATE INDEX "projects_departmentId_idx" ON "projects" ("departmentId");
CREATE INDEX "issues_departmentId_idx" ON "issues" ("departmentId");

ALTER TABLE "team_members"
    ADD CONSTRAINT "team_members_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects"
    ADD CONSTRAINT "projects_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "issues"
    ADD CONSTRAINT "issues_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
