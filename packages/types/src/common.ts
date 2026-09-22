/**
 * Primitives shared by every AXA Admin domain entity.
 *
 * Multi-tenancy is modelled from day one: every tenant-owned record carries an
 * `organizationId`, which is the `org_id` / `tenant_id` column the persistence
 * layer indexes and filters on.
 */

/** ISO-8601 timestamp, e.g. `2026-09-22T08:30:00.000Z`. */
export type IsoDateTime = string;

/** ISO-8601 calendar date without a time component, e.g. `2026-09-22`. */
export type IsoDate = string;

export type OrganizationId = string;
export type WorkspaceId = string;
export type UserId = string;
export type ProjectId = string;
export type IssueId = string;
export type CycleId = string;
export type MilestoneId = string;
export type AccountRequestId = string;
export type DailyReportId = string;
export type ActivityEventId = string;
export type AppUsageSnapshotId = string;

/** Fields present on every persisted entity. */
export interface BaseEntity {
  id: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Fields present on every entity owned by a tenant.
 *
 * `organizationId` is the tenant isolation boundary and must be part of the
 * query predicate for every read and write.
 */
export interface TenantScopedEntity extends BaseEntity {
  organizationId: OrganizationId;
}

/** Entities that are additionally scoped to a workspace inside the tenant. */
export interface WorkspaceScopedEntity extends TenantScopedEntity {
  workspaceId: WorkspaceId;
}

/** Soft-deletion marker, used instead of destructive deletes for auditable records. */
export interface SoftDeletable {
  archivedAt: IsoDateTime | null;
}

/** Cursor-based pagination request. */
export interface PageRequest {
  cursor?: string | null;
  limit?: number;
}

/** Cursor-based pagination response. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type SortDirection = 'asc' | 'desc';
