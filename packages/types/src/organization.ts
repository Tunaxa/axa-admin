import type { BaseEntity, IsoDateTime, SoftDeletable, TenantScopedEntity } from './common.js';

/**
 * The tenant root. Every other tenant-owned record points back to an
 * `Organization` through `organizationId`.
 */
export interface Organization extends BaseEntity, SoftDeletable {
  /** URL-safe unique identifier, e.g. `axa`. */
  slug: string;
  name: string;
  /** Primary domain used for e-mail based membership inference, if any. */
  primaryDomain: string | null;
  plan: OrganizationPlan;
  status: OrganizationStatus;
}

export type OrganizationPlan = 'internal' | 'starter' | 'growth' | 'enterprise';

export type OrganizationStatus = 'active' | 'suspended' | 'archived';

/**
 * A container inside an organization that owns projects, issues and cycles.
 * Workspaces let a single tenant separate divisions or product lines.
 */
export interface Workspace extends TenantScopedEntity, SoftDeletable {
  /** Unique within the parent organization. */
  slug: string;
  name: string;
  description: string | null;
  /** Prefix used to build human-readable issue keys, e.g. `ADM` -> `ADM-142`. */
  issueKeyPrefix: string;
}

/** Company-level profile information surfaced by the Company module. */
export interface CompanyProfile extends TenantScopedEntity {
  legalName: string;
  registrationNumber: string | null;
  taxId: string | null;
  headquarters: string | null;
  websiteUrl: string | null;
  foundedOn: IsoDateTime | null;
}
