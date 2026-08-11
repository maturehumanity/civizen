import { describe, expect, it } from 'vitest';

import {
  canApproveOwnSubmission,
  canFinanceApprove,
  canFinanceEdit,
  canFinancePublish,
  canFinanceView,
  canPerformAllocationOverride,
  hasFinanceLegacyCompat,
} from '@/lib/finance/permissions';

describe('finance permissions', () => {
  it('keeps legacy settings.manage / role.assign as temporary compatibility', () => {
    expect(hasFinanceLegacyCompat(['settings.manage'])).toBe(true);
    expect(canFinanceView(['settings.manage'])).toBe(true);
    expect(canFinanceEdit(['role.assign'])).toBe(true);
    expect(canFinanceApprove(['settings.manage'])).toBe(true);
    expect(canFinancePublish(['role.assign'])).toBe(true);
  });

  it('separates edit, approve, and publish when only fine-grained keys are present', () => {
    expect(canFinanceEdit(['finance.edit'])).toBe(true);
    expect(canFinanceApprove(['finance.edit'])).toBe(false);
    expect(canFinancePublish(['finance.edit'])).toBe(false);

    expect(canFinanceApprove(['finance.approve'])).toBe(true);
    expect(canFinanceEdit(['finance.approve'])).toBe(false);
    expect(canFinancePublish(['finance.approve'])).toBe(false);

    expect(canFinancePublish(['finance.publish'])).toBe(true);
    expect(canFinanceApprove(['finance.publish'])).toBe(false);
  });

  it('blocks self-approval unless finance.admin (or legacy compat)', () => {
    expect(canApproveOwnSubmission(['finance.approve'], 'u1', 'u1')).toBe(false);
    expect(canApproveOwnSubmission(['finance.approve', 'finance.admin'], 'u1', 'u1')).toBe(true);
    expect(canApproveOwnSubmission(['settings.manage'], 'u1', 'u1')).toBe(true);
    expect(canApproveOwnSubmission(['finance.approve'], 'u1', 'u2')).toBe(true);
  });

  it('requires elevated permission and reason for allocation overrides', () => {
    expect(canPerformAllocationOverride(['finance.edit'], null, 100, 50).ok).toBe(false);
    expect(canPerformAllocationOverride(['finance.admin'], '', 100, 50).ok).toBe(false);
    expect(canPerformAllocationOverride(['finance.admin'], 'board exception', 100, 50)).toEqual({ ok: true });
    expect(canPerformAllocationOverride(['finance.edit'], null, 40, 50)).toEqual({ ok: true });
  });
});
