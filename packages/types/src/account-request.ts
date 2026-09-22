import type { AppKey } from './app.js';
import type {
  AccountRequestId,
  IsoDateTime,
  OrganizationId,
  TenantScopedEntity,
  UserId,
} from './common.js';

/**
 * The provisioning workflow: request -> review -> accept -> billing -> notify -> track.
 *
 * `AccountRequest` is the bridge between an inbound request for one of the
 * customer-facing apps and an active, billed account.
 */
export const ACCOUNT_REQUEST_STATUSES = [
  'submitted',
  'in_review',
  'needs_info',
  'approved',
  'rejected',
  'awaiting_payment',
  'provisioned',
  'cancelled',
] as const;

export type AccountRequestStatus = (typeof ACCOUNT_REQUEST_STATUSES)[number];

export interface AccountRequest extends TenantScopedEntity {
  /** Application the account is being requested for. */
  app: AppKey;
  status: AccountRequestStatus;
  /** Requested plan, which also determines auto-approval eligibility. */
  requestedPlan: string;
  applicant: AccountRequestApplicant;
  /**
   * Organization provisioned as a result of this request. Null until the
   * request reaches `provisioned`.
   */
  provisionedOrganizationId: OrganizationId | null;
  /** True when the request was approved by rule rather than by a person. */
  autoApproved: boolean;
  decidedByUserId: UserId | null;
  decidedAt: IsoDateTime | null;
  decisionNote: string | null;
  billing: AccountRequestBilling | null;
}

export interface AccountRequestApplicant {
  email: string;
  fullName: string;
  companyName: string | null;
  companySize: string | null;
  message: string | null;
}

/** Billing state, populated once the request moves into the billing step. */
export interface AccountRequestBilling {
  provider: 'stripe';
  checkoutSessionId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  paidAt: IsoDateTime | null;
}

/**
 * Append-only audit entry.
 *
 * Every transition of an account request is recorded so the full history of who
 * decided what, and why, can be reconstructed.
 */
export interface AccountRequestAuditEntry extends TenantScopedEntity {
  accountRequestId: AccountRequestId;
  fromStatus: AccountRequestStatus | null;
  toStatus: AccountRequestStatus;
  /** Null when the transition was performed by an automated rule. */
  actorUserId: UserId | null;
  /** Identifier of the rule that acted, when `actorUserId` is null. */
  actorRule: string | null;
  note: string | null;
  occurredAt: IsoDateTime;
}
