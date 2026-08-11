import { assertMinorInt, remainingPlanned, uncommittedBudget } from '@/lib/finance/money';

export const BUDGET_LIFECYCLE = ['draft', 'under_review', 'approved', 'superseded'] as const;
export type BudgetLifecycle = (typeof BUDGET_LIFECYCLE)[number];

export type LineAmountRow = {
  plannedMinor: number;
  committedMinor: number;
  actualMinor: number;
  currency: string;
  status?: 'active' | 'archived';
};

export function canEditBudgetLifecycle(status: BudgetLifecycle): boolean {
  return status === 'draft' || status === 'under_review';
}

export function nextLifecycleAfterSubmit(status: BudgetLifecycle): BudgetLifecycle | null {
  if (status === 'draft') return 'under_review';
  return null;
}

export function nextLifecycleAfterApprove(status: BudgetLifecycle): BudgetLifecycle | null {
  if (status === 'under_review' || status === 'draft') return 'approved';
  return null;
}

export function nextLifecycleAfterReturn(status: BudgetLifecycle): BudgetLifecycle | null {
  if (status === 'under_review') return 'draft';
  return null;
}

export function sumLineAmounts(
  lines: LineAmountRow[],
  currency: string,
): { plannedMinor: number; committedMinor: number; actualMinor: number; remainingPlannedMinor: number; uncommittedMinor: number } {
  let planned = 0;
  let committed = 0;
  let actual = 0;
  for (const line of lines) {
    if (line.status === 'archived') continue;
    if (line.currency.toUpperCase() !== currency.toUpperCase()) continue;
    planned += assertMinorInt(line.plannedMinor);
    committed += assertMinorInt(line.committedMinor);
    actual += assertMinorInt(line.actualMinor);
  }
  return {
    plannedMinor: planned,
    committedMinor: committed,
    actualMinor: actual,
    remainingPlannedMinor: remainingPlanned(planned, actual),
    uncommittedMinor: uncommittedBudget(planned, committed),
  };
}

/** Public allowlist projection — never includes internal notes or actor ids. */
export type PublicBudgetLine = {
  title: string;
  publicDescription: string | null;
  plannedMinor: number;
  committedMinor: number;
  actualMinor: number;
  currency: string;
};

export type PublicBudgetGroup = {
  name: string;
  description: string | null;
  displayOrder: number;
  lineItems: PublicBudgetLine[];
};

export function projectPublicBudgetGroups(
  groups: Array<{
    name: string;
    description: string | null;
    displayOrder: number;
    archivedAt?: string | null;
    lines: Array<{
      title: string;
      publicDescription: string | null;
      plannedMinor: number;
      committedMinor: number;
      actualMinor: number;
      currency: string;
      publishFlag: boolean;
      status: 'active' | 'archived';
      internalNotes?: string;
      ownerLabel?: string | null;
    }>;
  }>,
): PublicBudgetGroup[] {
  return groups
    .filter((g) => !g.archivedAt)
    .map((g) => ({
      name: g.name,
      description: g.description,
      displayOrder: g.displayOrder,
      lineItems: g.lines
        .filter((l) => l.status === 'active' && l.publishFlag)
        .map((l) => ({
          title: l.title,
          publicDescription: l.publicDescription,
          plannedMinor: l.plannedMinor,
          committedMinor: l.committedMinor,
          actualMinor: l.actualMinor,
          currency: l.currency,
        })),
    }))
    .filter((g) => g.lineItems.length > 0)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function assertNoInternalFieldsInPublic(payload: unknown): void {
  const banned = [
    'internal_notes',
    'internalNotes',
    'private_notes',
    'privateNotes',
    'actor_user_id',
    'actorUserId',
    'created_by',
    'submitted_by',
    'approved_by',
    'published_by',
    'evidence_ref',
    'evidenceRef',
    'website',
    'jurisdiction',
    'email',
    'bank',
    'contact',
    'negotiation',
  ];
  const text = JSON.stringify(payload);
  for (const key of banned) {
    if (new RegExp(`"${key}"\\s*:`, 'i').test(text)) {
      throw new Error(`public payload must not include field ${key}`);
    }
  }
}
