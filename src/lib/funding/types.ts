export const FUNDING_LANES = [
  'donation',
  'investor',
  'institutional',
  'contributor',
  'sponsorship',
  'other',
] as const;

export type FundingInterestLane = (typeof FUNDING_LANES)[number];

export type FundingInterestPayload = {
  lane: FundingInterestLane;
  fullName: string;
  email: string;
  organization?: string;
  country?: string;
  indicatedAmountUsd?: number | null;
  currency?: string;
  message?: string;
  accreditedInvestorInterest?: boolean;
  acceptRiskDisclosure?: boolean;
  userId?: string | null;
};

export type FundingInterestRow = {
  id: string;
  lane: FundingInterestLane;
  full_name: string;
  email: string;
  organization: string | null;
  country: string | null;
  indicated_amount_usd: number | null;
  currency: string | null;
  message: string | null;
  accredited_investor_interest: boolean | null;
  accept_risk_disclosure: boolean;
  status: string;
  user_id: string | null;
  converted_commitment_id?: string | null;
  created_at: string;
  updated_at: string;
};

export const LEDGER_FUNDER_TYPES = [
  'individual',
  'organization',
  'foundation',
  'government',
  'institution',
  'other',
] as const;

export type LedgerFunderType = (typeof LEDGER_FUNDER_TYPES)[number];

export const LEDGER_LANES = [
  'investor',
  'donation',
  'grant',
  'government',
  'commercial',
  'sponsorship',
  'other',
] as const;

export type LedgerFundingLane = (typeof LEDGER_LANES)[number];

export const LEDGER_COMMITMENT_STATUSES = [
  'pledged',
  'received',
  'partially_received',
  'refunded',
  'cancelled',
] as const;

export type LedgerCommitmentStatus = (typeof LEDGER_COMMITMENT_STATUSES)[number];

export const LEDGER_PAYMENT_METHODS = [
  'wire',
  'ach',
  'card',
  'check',
  'usdt',
  'other_crypto',
  'in_kind',
  'other',
] as const;

export type LedgerPaymentMethod = (typeof LEDGER_PAYMENT_METHODS)[number];

export type FunderRow = {
  id: string;
  legal_name: string;
  public_display_name: string | null;
  funder_type: LedgerFunderType;
  country: string | null;
  email: string | null;
  kyc_status: string;
  accredited_investor_status: string;
  sanctions_status: string;
  tax_profile_status: string;
  created_at: string;
};

export type FundingCommitmentRow = {
  id: string;
  funder_id: string;
  lane: LedgerFundingLane;
  amount_original: number;
  currency: string;
  amount_usd: number | null;
  payment_method: string | null;
  status: LedgerCommitmentStatus;
  restrictions: string | null;
  restriction_code: string | null;
  agreement_id: string | null;
  receipt_id: string | null;
  date_pledged: string | null;
  date_received: string | null;
  notes: string | null;
  created_at: string;
  funders?: Pick<FunderRow, 'legal_name' | 'public_display_name' | 'funder_type' | 'country' | 'email'> | null;
};

export type FundingLaneTotalRow = {
  lane: LedgerFundingLane;
  status: LedgerCommitmentStatus;
  commitment_count: number;
  total_amount_usd: number;
};

export type RecordFundingCommitmentInput = {
  legalName: string;
  funderType: LedgerFunderType;
  lane: LedgerFundingLane;
  amountOriginal: number;
  currency?: string;
  amountUsd?: number | null;
  publicDisplayName?: string;
  country?: string;
  email?: string;
  paymentMethod?: LedgerPaymentMethod | '';
  status?: LedgerCommitmentStatus;
  restrictions?: string;
  restrictionCode?: string;
  agreementId?: string;
  receiptId?: string;
  datePledged?: string;
  dateReceived?: string;
  bankReference?: string;
  transactionHash?: string;
  kycStatus?: string;
  accreditedInvestorStatus?: string;
  sanctionsStatus?: string;
  taxProfileStatus?: string;
  debitAccount?: string;
  notes?: string;
  existingFunderId?: string | null;
  interestInquiryId?: string | null;
  roundId?: string;
  legalInstrumentId?: string;
};

export type RecordFundingCommitmentResult = {
  funder_id: string;
  commitment_id: string;
  ledger_entry_id: string | null;
  investor_position_id: string | null;
};
