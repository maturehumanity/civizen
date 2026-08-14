import type { AgreementContent } from '@/lib/agreements-model';

export type ExecutedAgreementPdfInput = {
  referenceCode: string;
  title: string;
  agreementTypeLabel: string;
  versionNumber: number;
  fingerprint: string;
  statusLabel: string;
  effectiveAt?: string | null;
  endAt?: string | null;
  relatedSummary?: string | null;
  parties: { displayName: string; role?: string | null; kindLabel?: string | null }[];
  content: AgreementContent;
  signatures: {
    signerName: string;
    partyName: string;
    capacity?: string | null;
    signedAt: string;
    method: string;
  }[];
  executionNote?: string | null;
};

function pdfEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapLine(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function collectLines(input: ExecutedAgreementPdfInput): string[] {
  const lines: string[] = [
    'CIVIZEN AGREEMENT RECORD',
    input.referenceCode,
    input.title,
    `${input.agreementTypeLabel} · Version ${input.versionNumber} · ${input.statusLabel}`,
    `Integrity fingerprint (SHA-256): ${input.fingerprint}`,
    'This fingerprint identifies the exact executed version. It is not a PKI digital signature.',
    '',
    'Parties',
  ];
  for (const party of input.parties) {
    lines.push(`- ${party.displayName}${party.role ? ` (${party.role})` : ''}`);
  }
  if (input.relatedSummary) {
    lines.push('', `Related activity: ${input.relatedSummary}`);
  }
  if (input.effectiveAt) lines.push(`Effective: ${input.effectiveAt}`);
  if (input.endAt) lines.push(`End: ${input.endAt}`);
  if (input.content.purpose) {
    lines.push('', 'Purpose', input.content.purpose);
  }
  const structured = input.content.structured;
  if (structured) {
    const extras: [string, string | null | undefined][] = [
      ['Roles and responsibilities', structured.rolesResponsibilities],
      ['Term', structured.term],
      ['Renewal', structured.renewal],
      ['Financial terms', structured.financialTerms],
      ['Confidentiality', structured.confidentiality],
      ['Intellectual property', structured.intellectualProperty],
      ['Data and privacy', structured.dataPrivacy],
      ['Termination', structured.termination],
    ];
    for (const [label, value] of extras) {
      if (value?.trim()) {
        lines.push('', label, value);
      }
    }
  }
  for (const section of input.content.sections) {
    if (!section.title && !section.body) continue;
    lines.push('', section.title || 'Section');
    if (section.body) lines.push(section.body);
  }
  lines.push('', 'Signatures');
  if (input.signatures.length === 0) {
    lines.push('No native electronic signatures recorded.');
  }
  for (const signature of input.signatures) {
    lines.push(
      `${signature.signerName} for ${signature.partyName}${signature.capacity ? `, ${signature.capacity}` : ''} — ${signature.signedAt} (${signature.method})`,
    );
  }
  if (input.executionNote) {
    lines.push('', input.executionNote);
  }
  lines.push(
    '',
    'Civizen provides an electronic agreement record. This document does not certify legal enforceability in any jurisdiction.',
  );
  return lines.flatMap((line) => wrapLine(line.replace(/\s+/g, ' ').trim() || ' ', 88));
}

/** Minimal single-font PDF for download/print/retention. */
export function buildExecutedAgreementPdf(input: ExecutedAgreementPdfInput): Uint8Array {
  const wrapped = collectLines(input);
  const header = 760;
  const leading = 14;
  const linesPerPage = 48;
  const pages: string[][] = [];
  for (let index = 0; index < wrapped.length; index += linesPerPage) {
    pages.push(wrapped.slice(index, index + linesPerPage));
  }
  if (pages.length === 0) pages.push(['']);

  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');

  const pageIds = pages.map((_, index) => 4 + index * 2);
  const contentIds = pages.map((_, index) => 5 + index * 2);
  objects.push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>');

  pages.forEach((pageLines, index) => {
    const commands = [
      'BT',
      '/F1 11 Tf',
      `${leading} TL`,
      `50 ${header} Td`,
      ...pageLines.map((line, lineIndex) => `${lineIndex === 0 ? '' : 'T* '}(${pdfEscape(line)}) Tj`),
      'ET',
    ].join('\n');
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentIds[index]} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`,
    );
    objects.push(`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`);
  });

  const parts: string[] = ['%PDF-1.4\n'];
  const positions = [0];
  let running = parts[0].length;
  for (let index = 0; index < objects.length; index += 1) {
    positions.push(running);
    const body = `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
    parts.push(body);
    running += body.length;
  }
  const xrefTable = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...positions.slice(1).map((position) => `${String(position).padStart(10, '0')} 00000 n `),
  ].join('\n');
  const trailer = `\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${running}\n%%EOF\n`;
  return new TextEncoder().encode(`${parts.join('')}${xrefTable}${trailer}`);
}

export function executedAgreementFilename(referenceCode: string, versionNumber: number): string {
  const safe = referenceCode.replace(/[^A-Za-z0-9-]+/g, '-');
  return `${safe}-v${versionNumber}.pdf`;
}

export function downloadPdfBytes(filename: string, bytes: Uint8Array): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
