/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { preferBudgetStructureWideLayout } from '@/lib/finance/budget-presentation';

afterEach(() => {
  cleanup();
});

describe('budget structure responsive layout helpers', () => {
  it('keeps hierarchical table for wide panel widths and stacked mode for narrow', () => {
    expect(preferBudgetStructureWideLayout(900)).toBe(true);
    expect(preferBudgetStructureWideLayout(480)).toBe(false);
  });

  it('renders aligned column headers for the wide hierarchical table', () => {
    render(
      <table data-testid="wide-budget-table">
        <thead>
          <tr>
            <th>Expense group / line item</th>
            <th>Timing</th>
            <th>Planned</th>
            <th>Committed</th>
            <th>Actual</th>
            <th>Public</th>
          </tr>
        </thead>
        <tbody>
          <tr data-budget-row="group">
            <td>Product and engineering +</td>
            <td>—</td>
            <td className="text-right">$0.00</td>
            <td className="text-right">$0.00</td>
            <td className="text-right">$0.00</td>
            <td>—</td>
          </tr>
          <tr data-budget-row="line">
            <td className="pl-6">Core platform engineering (Phase 1)</td>
            <td>TBD</td>
            <td className="text-right">$0.00</td>
            <td className="text-right">$0.00</td>
            <td className="text-right">$0.00</td>
            <td>No</td>
          </tr>
        </tbody>
      </table>,
    );

    const table = screen.getByTestId('wide-budget-table');
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent);
    expect(headers).toEqual([
      'Expense group / line item',
      'Timing',
      'Planned',
      'Committed',
      'Actual',
      'Public',
    ]);
    const groupCells = table.querySelectorAll('[data-budget-row="group"] td');
    const lineCells = table.querySelectorAll('[data-budget-row="line"] td');
    expect(groupCells).toHaveLength(6);
    expect(lineCells).toHaveLength(6);
    expect(lineCells[1]?.textContent).toBe('TBD');
    expect(lineCells[0]?.textContent).not.toMatch(/Conceptual label|Period field/i);
  });
});
