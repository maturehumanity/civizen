import type { AgreementRow } from '@/lib/agreements';

export type SellerEarningsKind = 'product' | 'service';

export type SellerEarningsFilter = 'all' | 'product' | 'service' | 'signed' | 'pending';

export type SellerEarningsSummary = {
  productsSold: number;
  servicesSold: number;
  pendingCount: number;
  /** Illustrative Lumen total from signed product/service agreements only. */
  signedIllustrativeLumens: number;
};

const PENDING_STATUSES = new Set(['draft', 'pending_counterparty']);

export function sellerEarningsKindFromAgreement(row: Pick<AgreementRow, 'listing_kind_snapshot' | 'template_key'>): SellerEarningsKind {
  const kind = (row.listing_kind_snapshot || row.template_key || '').toLowerCase();
  return kind === 'service' ? 'service' : 'product';
}

export function isSellerEarningsSigned(status: string): boolean {
  return status === 'signed';
}

export function isSellerEarningsPending(status: string): boolean {
  return PENDING_STATUSES.has(status);
}

export function summarizeSellerEarnings(rows: AgreementRow[]): SellerEarningsSummary {
  let productsSold = 0;
  let servicesSold = 0;
  let pendingCount = 0;
  let signedIllustrativeLumens = 0;

  for (const row of rows) {
    if (isSellerEarningsPending(row.status)) {
      pendingCount += 1;
    }
    if (!isSellerEarningsSigned(row.status)) continue;

    const kind = sellerEarningsKindFromAgreement(row);
    if (kind === 'service') servicesSold += 1;
    else productsSold += 1;

    const amount = Number(row.listing_price_lumens_snapshot);
    if (Number.isFinite(amount) && amount > 0) {
      signedIllustrativeLumens += Math.trunc(amount);
    }
  }

  return { productsSold, servicesSold, pendingCount, signedIllustrativeLumens };
}

export function filterSellerEarningsRows(rows: AgreementRow[], filter: SellerEarningsFilter): AgreementRow[] {
  if (filter === 'all') return rows;
  if (filter === 'signed') return rows.filter((row) => isSellerEarningsSigned(row.status));
  if (filter === 'pending') return rows.filter((row) => isSellerEarningsPending(row.status));
  return rows.filter((row) => sellerEarningsKindFromAgreement(row) === filter);
}

export function sellerEarningsActivityDate(row: AgreementRow): string {
  return row.signed_at || row.updated_at || row.created_at;
}
