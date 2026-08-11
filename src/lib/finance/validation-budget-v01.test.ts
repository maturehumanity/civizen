import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  VALIDATION_BUDGET_GROUPS_V01,
  VALIDATION_BUDGET_LINES_V01,
  VALIDATION_BUDGET_V01,
  summarizeValidationBudgetV01,
  validationLineTitle,
} from '@/lib/finance/validation-budget-v01';

function parseCsvBaseTotals() {
  const csvPath = resolve(
    process.cwd(),
    'docs/04-operations/funding-and-budget/14-validation-workstreams-and-budget-v0.1.csv',
  );
  const text = readFileSync(csvPath, 'utf8');
  const rows = text
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      // Simple CSV: handle quoted fields containing commas
      const cols: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
          continue;
        }
        if (ch === ',' && !inQuotes) {
          cols.push(cur);
          cur = '';
          continue;
        }
        cur += ch;
      }
      cols.push(cur);
      return {
        workstreamId: cols[0],
        baseUsdM: Number(cols[5]),
      };
    });
  return rows;
}

describe('validation budget v0.1', () => {
  it('names the separate draft budget without replacing the demonstration skeleton', () => {
    expect(VALIDATION_BUDGET_V01.name).toBe('Civizen Pre-Major-Build Validation Program v0.1');
    expect(VALIDATION_BUDGET_V01.lifecycleStatus).toBe('draft');
    expect(VALIDATION_BUDGET_V01.isDemonstration).toBe(false);
    expect(VALIDATION_BUDGET_V01.name).not.toBe('Civizen Draft Budget v0.1');
  });

  it('covers WS-01 through WS-25 with zero committed/actual semantics', () => {
    expect(VALIDATION_BUDGET_LINES_V01).toHaveLength(25);
    expect(VALIDATION_BUDGET_GROUPS_V01.length).toBeGreaterThanOrEqual(8);
    const ids = VALIDATION_BUDGET_LINES_V01.map((l) => l.workstreamId);
    expect(ids[0]).toBe('WS-01');
    expect(ids[24]).toBe('WS-25');
    expect(new Set(ids).size).toBe(25);
    for (const line of VALIDATION_BUDGET_LINES_V01) {
      expect(line.plannedMinor).toBeGreaterThan(0);
      expect(validationLineTitle(line).startsWith(`${line.workstreamId} ·`)).toBe(true);
      expect(VALIDATION_BUDGET_GROUPS_V01.some((g) => g.key === line.groupKey)).toBe(true);
    }
  });

  it('reconciles exact planned total to the canonical CSV base scenario', () => {
    const summary = summarizeValidationBudgetV01();
    const csv = parseCsvBaseTotals();
    const csvMinor = csv.reduce((acc, row) => acc + Math.round(row.baseUsdM * 1_000_000 * 100), 0);
    expect(summary.plannedMinor).toBe(44_600_000_000);
    expect(summary.plannedUsd).toBe(446_000_000);
    expect(VALIDATION_BUDGET_V01.plannedTotalMinor).toBe(summary.plannedMinor);
    expect(csvMinor).toBe(summary.plannedMinor);

    for (const line of VALIDATION_BUDGET_LINES_V01) {
      const csvRow = csv.find((r) => r.workstreamId === line.workstreamId);
      expect(csvRow).toBeTruthy();
      expect(line.plannedMinor).toBe(Math.round(csvRow!.baseUsdM * 1_000_000 * 100));
    }

    // Funding-control split matches meta base buckets
    expect(summary.byFunding.get('core')).toBe(31_200_000_000);
    expect(summary.byFunding.get('independent')).toBe(3_400_000_000);
    expect(summary.byFunding.get('grant_pass_through')).toBe(5_800_000_000);
    expect(summary.byFunding.get('reserve')).toBe(4_200_000_000);
  });

  it('keeps group subtotals equal to the sum of their workstream lines', () => {
    const summary = summarizeValidationBudgetV01();
    for (const group of VALIDATION_BUDGET_GROUPS_V01) {
      const lines = VALIDATION_BUDGET_LINES_V01.filter((l) => l.groupKey === group.key);
      const sum = lines.reduce((acc, l) => acc + l.plannedMinor, 0);
      expect(summary.byGroup.get(group.key)).toBe(sum);
    }
  });
});
