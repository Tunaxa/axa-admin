import type { TenantScopedEntity } from './common.js';

/**
 * Stable identifiers for the applications in the AXA ecosystem.
 *
 * Permissions, account requests and usage snapshots are all scoped by app key,
 * which is what makes the `role x app` permission model possible.
 */
export const APP_KEYS = ['axa-admin', 'axacrm', 'axapass', 'website'] as const;

export type AppKey = (typeof APP_KEYS)[number];

/** A registered application that axa-admin tracks, provisions and reports on. */
export interface App extends TenantScopedEntity {
  key: AppKey;
  name: string;
  description: string | null;
  repositoryUrl: string | null;
  productionUrl: string | null;
  /** Whether this app accepts account requests through axa-admin. */
  acceptsAccountRequests: boolean;
  /** When true, approved requests are provisioned without manual review. */
  autoApproveEnabled: boolean;
}
