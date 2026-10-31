CREATE TYPE "notification_type" AS ENUM (
    'task_assigned',
    'task_status_changed',
    'task_mentioned',
    'team_joined',
    'member_invited',
    'request_decided',
    'system'
);

CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "actorId" UUID,
    "type" "notification_type" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_organizationId_recipientId_readAt_idx"
    ON "notifications" ("organizationId", "recipientId", "readAt");
CREATE INDEX "notifications_organizationId_createdAt_idx"
    ON "notifications" ("organizationId", "createdAt");

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_recipientId_fkey"
    FOREIGN KEY ("recipientId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
