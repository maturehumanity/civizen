import { assertMinorInt } from '@/lib/finance/money';

export const FUNDING_SOURCE_CATEGORIES = [
  'government',
  'multilateral',
  'grant',
  'philanthropy',
  'private_capital',
  'contributor',
  'system_revenue',
  'other',
] as const;

export type FundingSourceCategory = (typeof FUNDING_SOURCE_CATEGORIES)[number];

export const RELATIONSHIP_STATUSES = [
  'identified',
  'researching',
  'contact_planned',
  'contacted',
  'engaged',
  'application_or_proposal',
  'due_diligence',
  'decision_pending',
  'committed',
  'declined',
  'paused',
  'closed',
] as const;

export type RelationshipStatus = (typeof RELATIONSHIP_STATUSES)[number];

export const COMMITMENT_STATUSES = [
  'proposed',
  'confirmed',
  'amended',
  'cancelled',
  'fulfilled',
] as const;

export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];

/** Relationship status `committed` never implies cash received. */
export function statusImpliesReceipt(status: RelationshipStatus): boolean {
  void status;
  return false;
}

export function commitmentIncreasesReceived(status: CommitmentStatus): boolean {
  void status;
  return false;
}

export type ReceiptLike = {
  id: string;
  amountMinor: number;
  currency: string;
  reversesReceiptId?: string | null;
};

export type AllocationLike = {
  amountMinor: number;
  currency: string;
  receiptId: string;
  reversesAllocationId?: string | null;
};

export function netReceivedMinor(receipts: ReceiptLike[], currency: string): number {
  let total = 0;
  for (const r of receipts) {
    if (r.currency.toUpperCase() !== currency.toUpperCase()) continue;
    const amount = assertMinorInt(r.amountMinor);
    total += r.reversesReceiptId ? -amount : amount;
  }
  return total;
}

export function netAllocatedForReceipt(allocations: AllocationLike[], receiptId: string): number {
  let total = 0;
  for (const a of allocations) {
    if (a.receiptId !== receiptId) continue;
    const amount = assertMinorInt(a.amountMinor);
    total += a.reversesAllocationId ? -amount : amount;
  }
  return total;
}

export function unallocatedReceiptBalance(
  receipt: ReceiptLike,
  allocations: AllocationLike[],
): number {
  return assertMinorInt(receipt.amountMinor) - netAllocatedForReceipt(allocations, receipt.id);
}

export function canAllocateWithoutOverride(
  receipt: ReceiptLike,
  allocations: AllocationLike[],
  amountMinor: number,
): boolean {
  return assertMinorInt(amountMinor) <= unallocatedReceiptBalance(receipt, allocations);
}

export function reconcileFundingTotals(args: {
  requested: Array<{ amountMinor: number; currency: string }>;
  committed: Array<{ amountMinor: number; currency: string; status: CommitmentStatus }>;
  receipts: ReceiptLike[];
  allocations: AllocationLike[];
  currency: string;
}): {
  requestedMinor: number;
  committedMinor: number;
  receivedMinor: number;
  allocatedMinor: number;
  unallocatedMinor: number;
} {
  const currency = args.currency.toUpperCase();
  const requestedMinor = args.requested
    .filter((r) => r.currency.toUpperCase() === currency)
    .reduce((sum, r) => sum + assertMinorInt(r.amountMinor), 0);

  const committedMinor = args.committed
    .filter(
      (c) =>
        c.currency.toUpperCase() === currency &&
        (c.status === 'confirmed' || c.status === 'fulfilled' || c.status === 'amended'),
    )
    .reduce((sum, c) => sum + assertMinorInt(c.amountMinor), 0);

  const receivedMinor = netReceivedMinor(args.receipts, currency);
  const allocatedMinor = args.allocations
    .filter((a) => a.currency.toUpperCase() === currency)
    .reduce((sum, a) => sum + (a.reversesAllocationId ? -assertMinorInt(a.amountMinor) : assertMinorInt(a.amountMinor)), 0);

  return {
    requestedMinor,
    committedMinor,
    receivedMinor,
    allocatedMinor,
    unallocatedMinor: receivedMinor - allocatedMinor,
  };
}
