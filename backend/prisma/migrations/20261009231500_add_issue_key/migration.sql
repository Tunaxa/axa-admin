-- Issue keys: the human-readable reference a branch name can carry.

-- The prefix and the counter live on the tenant.
ALTER TABLE "organizations" ADD COLUMN "issuePrefix" TEXT NOT NULL DEFAULT 'AXA';
ALTER TABLE "organizations" ADD COLUMN "issueCounter" INTEGER NOT NULL DEFAULT 0;

-- Added nullable first, because existing issues have no key and a required
-- column with no default cannot be added to a table with rows in it.
ALTER TABLE "issues" ADD COLUMN "key" TEXT;

-- Backfill in creation order, per tenant, so the oldest issue becomes AXA-1.
WITH numbered AS (
  SELECT id,
         "organizationId",
         row_number() OVER (
           PARTITION BY "organizationId" ORDER BY "createdAt", id
         ) AS n
  FROM "issues"
)
UPDATE "issues" i
SET "key" = o."issuePrefix" || '-' || numbered.n
FROM numbered
JOIN "organizations" o ON o.id = numbered."organizationId"
WHERE i.id = numbered.id;

-- Each tenant's counter has to start above the keys just handed out, or the
-- next issue created would collide with one of them.
UPDATE "organizations" o
SET "issueCounter" = COALESCE(
  (SELECT count(*) FROM "issues" i WHERE i."organizationId" = o.id), 0
);

ALTER TABLE "issues" ALTER COLUMN "key" SET NOT NULL;

CREATE UNIQUE INDEX "issues_organizationId_key_key" ON "issues"("organizationId", "key");
