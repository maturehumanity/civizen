import { describe, expect, it } from 'vitest';

import {
  filterNestedBudgetGroupsByKeyword,
  formatBudgetLineTiming,
  formatGroupPeriodLabel,
  lineOverlapsValidationPeriodFilter,
  linesBelongOnlyToGroup,
  nestBudgetGroupsWithLines,
  parseBudgetMonthRange,
  preferBudgetStructureWideLayout,
  sortBudgetGroupsForPresentation,
  sortBudgetLinesForPresentation,
  splitBudgetLineTitle,
  sumLinesForGroup,
} from '@/lib/finance/budget-presentation';

const groups = [
  { id: 'g-b', name: 'Beta', display_order: 1 },
  { id: 'g-a', name: 'Alpha', display_order: 0 },
  { id: 'g-empty', name: 'Empty', display_order: 2 },
];

const lines = [
  {
    id: 'l-2',
    group_id: 'g-a',
    title: 'Zebra',
    planned_minor: 300,
    committed_minor: 100,
    actual_minor: 50,
    publish_flag: false,
  },
  {
    id: 'l-1',
    group_id: 'g-a',
    title: 'Apple',
    planned_minor: 200,
    committed_minor: 80,
    actual_minor: 20,
    publish_flag: true,
  },
  {
    id: 'l-3',
    group_id: 'g-b',
    title: 'Only Beta',
    planned_minor: 10,
    committed_minor: 5,
    actual_minor: 1,
    publish_flag: false,
  },
];

describe('budget presentation nesting', () => {
  it('orders groups by display_order then name', () => {
    const ordered = sortBudgetGroupsForPresentation(groups);
    expect(ordered.map((g) => g.id)).toEqual(['g-a', 'g-b', 'g-empty']);
  });

  it('orders lines by title within a group', () => {
    const ordered = sortBudgetLinesForPresentation(lines.filter((l) => l.group_id === 'g-a'));
    expect(ordered.map((l) => l.id)).toEqual(['l-1', 'l-2']);
  });

  it('nests every line under its actual group', () => {
    const nested = nestBudgetGroupsWithLines(groups, lines);
    expect(nested).toHaveLength(3);
    expect(nested[0].group.id).toBe('g-a');
    expect(nested[0].lines.map((l) => l.id)).toEqual(['l-1', 'l-2']);
    expect(nested[1].group.id).toBe('g-b');
    expect(nested[1].lines.map((l) => l.id)).toEqual(['l-3']);
    expect(nested[2].group.id).toBe('g-empty');
    expect(nested[2].lines).toEqual([]);
  });

  it('reconciles group totals to child line items', () => {
    const nested = nestBudgetGroupsWithLines(groups, lines);
    expect(nested[0].totals).toEqual({ plannedMinor: 500, committedMinor: 180, actualMinor: 70 });
    expect(sumLinesForGroup(nested[0].lines)).toEqual(nested[0].totals);
  });

  it('expanding one group does not include another group’s items', () => {
    const nested = nestBudgetGroupsWithLines(groups, lines);
    const alphaOnly = linesBelongOnlyToGroup(nested, 'g-a');
    expect(alphaOnly.every((l) => l.group_id === 'g-a')).toBe(true);
    expect(alphaOnly.some((l) => l.group_id === 'g-b')).toBe(false);
    const betaOnly = linesBelongOnlyToGroup(nested, 'g-b');
    expect(betaOnly.map((l) => l.id)).toEqual(['l-3']);
  });

  it('empty groups render with zero totals and no lines', () => {
    const nested = nestBudgetGroupsWithLines(groups, lines);
    const empty = nested.find((row) => row.group.id === 'g-empty');
    expect(empty?.lines).toEqual([]);
    expect(empty?.totals).toEqual({ plannedMinor: 0, committedMinor: 0, actualMinor: 0 });
  });

  it('group-context creation target is the selected group id', () => {
    const nested = nestBudgetGroupsWithLines(groups, lines);
    const targetGroupId = nested[1].group.id;
    expect(targetGroupId).toBe('g-b');
    // UI sets lineGroupId to this id before focusing the add-line form
    expect(groups.some((g) => g.id === targetGroupId)).toBe(true);
  });

  it('splits workstream id from line titles for hierarchical display', () => {
    expect(splitBudgetLineTitle('WS-01 · Core multidisciplinary program office')).toEqual({
      workstreamId: 'WS-01',
      displayTitle: 'Core multidisciplinary program office',
    });
    expect(splitBudgetLineTitle('Plain line')).toEqual({
      workstreamId: null,
      displayTitle: 'Plain line',
    });
  });

  it('filters nested groups by line-item keyword without inventing rows', () => {
    const nested = nestBudgetGroupsWithLines(groups, lines);

    const byLine = filterNestedBudgetGroupsByKeyword(nested, 'apple');
    expect(byLine.map((row) => row.group.id)).toEqual(['g-a']);
    expect(byLine[0].lines.map((l) => l.id)).toEqual(['l-1']);
    expect(byLine[0].totals).toEqual({ plannedMinor: 200, committedMinor: 80, actualMinor: 20 });

    const byGroupName = filterNestedBudgetGroupsByKeyword(nested, 'beta');
    expect(byGroupName.map((row) => row.group.id)).toEqual(['g-b']);
    expect(byGroupName[0].lines.map((l) => l.id)).toEqual(['l-3']);

    expect(filterNestedBudgetGroupsByKeyword(nested, '   ')).toEqual(nested);
    expect(filterNestedBudgetGroupsByKeyword(nested, 'zzznomatch')).toEqual([]);
  });

  it('labels undefined conceptual phase timing as concise TBD without inventing dates', () => {
    expect(formatBudgetLineTiming('Conceptual Phase 1 · Timing TBD · personnel_or_service')).toEqual({
      timingLabel: 'TBD',
      isUndefinedTiming: true,
      conceptualPhase: 'Phase 1',
      rawPeriodLabel: 'Conceptual Phase 1 · Timing TBD · personnel_or_service',
    });
    expect(formatBudgetLineTiming(null).timingLabel).toBe('TBD');
    expect(formatBudgetLineTiming('FY 2027 Q1').isUndefinedTiming).toBe(false);
    expect(formatBudgetLineTiming('Months 1–24 · working estimate').timingLabel).toBe('Months 1–24');
  });

  it('parses month ranges and aggregates group Period labels', () => {
    expect(parseBudgetMonthRange('Months 2–19 · working estimate')).toEqual({
      startMonth: 2,
      endMonth: 19,
    });
    expect(formatGroupPeriodLabel([
      { period_label: 'Months 1–6 · working estimate' },
      { period_label: 'Months 4–18 · working estimate' },
    ]).periodLabel).toBe('Months 1–18');
    expect(formatGroupPeriodLabel([
      { period_label: 'Months 1–12 · working estimate' },
      { period_label: 'Conceptual Phase 1 · Timing TBD' },
    ]).periodLabel).toBe('Multiple periods');
    expect(formatGroupPeriodLabel([]).periodLabel).toBe('—');
  });

  it('filters validation workstreams by timing overlap without inventing period amounts', () => {
    expect(lineOverlapsValidationPeriodFilter('Months 1–24 · working estimate', 'entire')).toBe(true);
    expect(lineOverlapsValidationPeriodFilter('Months 1–12 · working estimate', 'months-1-6')).toBe(true);
    expect(lineOverlapsValidationPeriodFilter('Months 1–12 · working estimate', 'months-19-24')).toBe(false);
    expect(lineOverlapsValidationPeriodFilter('Timing TBD', 'months-1-6')).toBe(false);
  });

  it('prefers wide hierarchical table only when panel width is sufficient', () => {
    expect(preferBudgetStructureWideLayout(719)).toBe(false);
    expect(preferBudgetStructureWideLayout(720)).toBe(true);
    expect(preferBudgetStructureWideLayout(null)).toBe(false);
  });

  it('keeps validation workstream inclusive ends within Months 1–24', async () => {
    const { VALIDATION_BUDGET_LINES_V01 } = await import('@/lib/finance/validation-budget-v01');
    const ends = VALIDATION_BUDGET_LINES_V01.map(
      (line) => line.earliestStartMonth + line.durationMonths - 1,
    );
    expect(Math.max(...ends)).toBeLessThanOrEqual(24);
    expect(VALIDATION_BUDGET_LINES_V01.find((l) => l.workstreamId === 'WS-13')?.timingLabel).toBe(
      'Months 2–24',
    );
    expect(VALIDATION_BUDGET_LINES_V01.find((l) => l.workstreamId === 'WS-23')?.timingLabel).toBe(
      'Months 2–24',
    );
  });
});
