import { assertMinorInt } from '@/lib/finance/money';

export const FEE_RULE_VERSION = 'cost-recovery-v1';

export type LiablePartyType = 'individual' | 'legal_entity';

export type FeeCostInputs = {
  liablePartyType: LiablePartyType;
  liableLegalEntityName?: string | null;
  processorCostMinor: number;
  auditCostMinor: number;
  otherAllowedCostMinor: number;
  adjustmentMinor?: number;
};

export type FeeAssessmentResult = {
  ruleVersion: string;
  assessedUserFeeMinor: number;
  calculationNote: string;
  costBasis: {
    processorCostMinor: number;
    auditCostMinor: number;
    otherAllowedCostMinor: number;
    adjustmentMinor: number;
  };
};

/**
 * Individuals in personal capacity always pay zero.
 * Legal entities pay documented processing + auditing (+ other allowed) costs after adjustment.
 * No undisclosed margin.
 */
export function calculateTransactionFee(input: FeeCostInputs): FeeAssessmentResult {
  const processor = assertMinorInt(input.processorCostMinor, 'processorCostMinor');
  const audit = assertMinorInt(input.auditCostMinor, 'auditCostMinor');
  const other = assertMinorInt(input.otherAllowedCostMinor, 'otherAllowedCostMinor');
  const adjustment = assertMinorInt(input.adjustmentMinor ?? 0, 'adjustmentMinor');

  if (processor < 0 || audit < 0 || other < 0) {
    throw new Error('documented costs must be non-negative');
  }

  if (input.liablePartyType === 'individual') {
    return {
      ruleVersion: FEE_RULE_VERSION,
      assessedUserFeeMinor: 0,
      calculationNote:
        'Personal-capacity individual: assessed user fee is always zero (cost-recovery-v1).',
      costBasis: {
        processorCostMinor: processor,
        auditCostMinor: audit,
        otherAllowedCostMinor: other,
        adjustmentMinor: adjustment,
      },
    };
  }

  if (!input.liableLegalEntityName?.trim()) {
    throw new Error('legal entity name is required for entity fee assessment');
  }

  const assessed = Math.max(0, processor + audit + other + adjustment);
  return {
    ruleVersion: FEE_RULE_VERSION,
    assessedUserFeeMinor: assessed,
    calculationNote: `cost-recovery-v1: processor=${processor} + audit=${audit} + other=${other} + adjustment=${adjustment} = ${assessed}`,
    costBasis: {
      processorCostMinor: processor,
      auditCostMinor: audit,
      otherAllowedCostMinor: other,
      adjustmentMinor: adjustment,
    },
  };
}
