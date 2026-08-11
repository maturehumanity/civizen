import { describe, expect, it } from 'vitest';

import {
  assertNoInternalFieldsInPublic,
  canEditBudgetLifecycle,
  nextLifecycleAfterApprove,
  projectPublicBudgetGroups,
  sumLineAmounts,
} from '@/lib/finance/budget-rules';
import { calculateTransactionFee } from '@/lib/finance/fees';
import {
  formatMinor,
  parseMajorToMinor,
  remainingPlanned,
  sumMinorByCurrency,
  uncommittedBudget,
} from '@/lib/finance/money';
import {
  canAllocateWithoutOverride,
  commitmentIncreasesReceived,
  reconcileFundingTotals,
  statusImpliesReceipt,
  unallocatedReceiptBalance,
} from '@/lib/finance/source-rules';

describe('money minor units', () => {
  it('parses major to minor without float drift', () => {
    expect(parseMajorToMinor('10.50')).toBe(1050);
    expect(parseMajorToMinor('0.01')).toBe(1);
    expect(parseMajorToMinor('1,234.56')).toBe(123456);
  });

  it('formats and sums per currency', () => {
    expect(formatMinor(1050, 'USD')).toContain('10.50');
    expect(sumMinorByCurrency([
      { amountMinor: 100, currency: 'usd' },
      { amountMinor: 50, currency: 'USD' },
      { amountMinor: 20, currency: 'EUR' },
    ])).toEqual({ USD: 150, EUR: 20 });
  });

  it('keeps planned/committed/actual math integer', () => {
    expect(remainingPlanned(1000, 250)).toBe(750);
    expect(uncommittedBudget(1000, 400)).toBe(600);
  });
});

describe('budget rules', () => {
  it('blocks edits on approved/superseded', () => {
    expect(canEditBudgetLifecycle('draft')).toBe(true);
    expect(canEditBudgetLifecycle('approved')).toBe(false);
    expect(nextLifecycleAfterApprove('under_review')).toBe('approved');
  });

  it('sums only matching currency active lines', () => {
    const totals = sumLineAmounts(
      [
        { plannedMinor: 1000, committedMinor: 200, actualMinor: 100, currency: 'USD' },
        { plannedMinor: 500, committedMinor: 0, actualMinor: 0, currency: 'EUR' },
        { plannedMinor: 50, committedMinor: 0, actualMinor: 0, currency: 'USD', status: 'archived' },
      ],
      'USD',
    );
    expect(totals.plannedMinor).toBe(1000);
    expect(totals.remainingPlannedMinor).toBe(900);
    expect(totals.uncommittedMinor).toBe(800);
  });

  it('public projection excludes unpublished and internal fields', () => {
    const groups = projectPublicBudgetGroups([
      {
        name: 'Ops',
        description: 'Operations',
        displayOrder: 1,
        lines: [
          {
            title: 'Hosting',
            publicDescription: 'Cloud hosting',
            plannedMinor: 1000,
            committedMinor: 0,
            actualMinor: 0,
            currency: 'USD',
            publishFlag: true,
            status: 'active',
            internalNotes: 'secret',
          },
          {
            title: 'Secret line',
            publicDescription: null,
            plannedMinor: 999,
            committedMinor: 0,
            actualMinor: 0,
            currency: 'USD',
            publishFlag: false,
            status: 'active',
          },
        ],
      },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].lineItems).toHaveLength(1);
    expect(JSON.stringify(groups)).not.toContain('secret');
    expect(() => assertNoInternalFieldsInPublic({ internal_notes: 'x' })).toThrow();
    expect(() => assertNoInternalFieldsInPublic({ private_notes: 'x' })).toThrow();
    expect(() => assertNoInternalFieldsInPublic({ evidence_ref: 'doc' })).toThrow();
    expect(() => assertNoInternalFieldsInPublic({ submitted_by: 'u1' })).toThrow();
    expect(() => assertNoInternalFieldsInPublic({ name: 'ok', planned_minor: 1 })).not.toThrow();
  });
});

describe('funding source rules', () => {
  it('never treats prospect/commitment status as cash', () => {
    expect(statusImpliesReceipt('committed')).toBe(false);
    expect(commitmentIncreasesReceived('confirmed')).toBe(false);
  });

  it('blocks over-allocation without override and reconciles totals', () => {
    const receipt = { id: 'r1', amountMinor: 1000, currency: 'USD' };
    const allocations = [{ amountMinor: 600, currency: 'USD', receiptId: 'r1' }];
    expect(unallocatedReceiptBalance(receipt, allocations)).toBe(400);
    expect(canAllocateWithoutOverride(receipt, allocations, 400)).toBe(true);
    expect(canAllocateWithoutOverride(receipt, allocations, 401)).toBe(false);

    const totals = reconcileFundingTotals({
      requested: [{ amountMinor: 5000, currency: 'USD' }],
      committed: [{ amountMinor: 2000, currency: 'USD', status: 'confirmed' }],
      receipts: [receipt],
      allocations,
      currency: 'USD',
    });
    expect(totals.requestedMinor).toBe(5000);
    expect(totals.committedMinor).toBe(2000);
    expect(totals.receivedMinor).toBe(1000);
    expect(totals.allocatedMinor).toBe(600);
    expect(totals.unallocatedMinor).toBe(400);
  });
});

describe('fee liability', () => {
  it('always assesses zero for individuals', () => {
    const result = calculateTransactionFee({
      liablePartyType: 'individual',
      processorCostMinor: 250,
      auditCostMinor: 100,
      otherAllowedCostMinor: 0,
    });
    expect(result.assessedUserFeeMinor).toBe(0);
    expect(result.ruleVersion).toBe('cost-recovery-v1');
  });

  it('reproduces legal-entity cost-recovery fee from documented basis', () => {
    const result = calculateTransactionFee({
      liablePartyType: 'legal_entity',
      liableLegalEntityName: 'Example LLC',
      processorCostMinor: 250,
      auditCostMinor: 100,
      otherAllowedCostMinor: 50,
      adjustmentMinor: -25,
    });
    expect(result.assessedUserFeeMinor).toBe(375);
    expect(result.calculationNote).toContain('250');
    expect(result.calculationNote).toContain('375');
    expect(result.costBasis.processorCostMinor).toBe(250);
  });
});
