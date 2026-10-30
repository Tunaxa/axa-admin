CREATE TABLE "docs_pages" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" UUID,
    "ancestors" UUID[] DEFAULT ARRAY[]::UUID[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "blocks" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "authorId" UUID NOT NULL,
    "lastEditedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "docs_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "docs_pages_organizationId_slug_key"
    ON "docs_pages" ("organizationId", "slug");

CREATE INDEX "docs_pages_organizationId_parentId_order_idx"
    ON "docs_pages" ("organizationId", "parentId", "order");

CREATE INDEX "docs_pages_ancestors_idx"
    ON "docs_pages" USING GIN ("ancestors");

CREATE INDEX "docs_pages_authorId_idx" ON "docs_pages" ("authorId");

CREATE INDEX "docs_pages_lastEditedById_idx" ON "docs_pages" ("lastEditedById");

ALTER TABLE "docs_pages"
    ADD CONSTRAINT "docs_pages_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "docs_pages"
    ADD CONSTRAINT "docs_pages_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "docs_pages"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "docs_pages"
    ADD CONSTRAINT "docs_pages_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "docs_pages"
    ADD CONSTRAINT "docs_pages_lastEditedById_fkey"
    FOREIGN KEY ("lastEditedById") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
