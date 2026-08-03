export type FundingInterestCsvRow = {
  id: string;
  lane: string;
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
  created_at: string;
};

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function fundingInterestRowsToCsv(rows: FundingInterestCsvRow[]): string {
  const headers = [
    'id',
    'lane',
    'full_name',
    'email',
    'organization',
    'country',
    'indicated_amount_usd',
    'currency',
    'message',
    'accredited_investor_interest',
    'accept_risk_disclosure',
    'status',
    'created_at',
  ];

  const lines = [headers.join(',')];
  for (const row of rows) {
    const cells = [
      row.id,
      row.lane,
      row.full_name,
      row.email,
      row.organization ?? '',
      row.country ?? '',
      row.indicated_amount_usd == null ? '' : String(row.indicated_amount_usd),
      row.currency ?? '',
      row.message ?? '',
      row.accredited_investor_interest == null ? '' : String(row.accredited_investor_interest),
      String(row.accept_risk_disclosure),
      row.status,
      row.created_at,
    ].map((cell) => escapeCsvCell(cell));
    lines.push(cells.join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function downloadTextFile(filename: string, contents: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
