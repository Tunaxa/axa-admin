import { AccountRequestStatus } from '@prisma/client';

/**
 * Where a request can go from where it is.
 *
 * One table rather than a condition at each call site. Scattered `if`s are
 * how a state machine acquires a transition nobody meant to allow — and this
 * one decides whether somebody gets charged, so it is worth being able to
 * read the whole thing at once.
 */
export const TRANSITIONS: Record<
  AccountRequestStatus,
  readonly AccountRequestStatus[]
> = {
  // Waiting on an approver.
  [AccountRequestStatus.pending]: [
    AccountRequestStatus.approved,
    AccountRequestStatus.rejected,
    AccountRequestStatus.needs_more_info,
    AccountRequestStatus.withdrawn,
  ],
  // Open, but waiting on the requester. Editing it sends it back to pending.
  [AccountRequestStatus.needs_more_info]: [
    AccountRequestStatus.pending,
    AccountRequestStatus.approved,
    AccountRequestStatus.rejected,
    AccountRequestStatus.withdrawn,
  ],
  // Final. An approved request may already have been paid, so reversing it is
  // not a status change — it is a refund, and nothing here does refunds.
  [AccountRequestStatus.approved]: [],
  [AccountRequestStatus.rejected]: [],
  [AccountRequestStatus.withdrawn]: [],
};

/** Still waiting on somebody, either side. */
export const OPEN_STATUSES: readonly AccountRequestStatus[] = [
  AccountRequestStatus.pending,
  AccountRequestStatus.needs_more_info,
];

export function isOpen(status: AccountRequestStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export function canTransition(
  from: AccountRequestStatus,
  to: AccountRequestStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}
