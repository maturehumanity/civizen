/**
 * Pure presentation helpers for nested Budget expense groups.
 * Does not change finance records or calculations — only how they are ordered/grouped for display.
 */

export type BudgetPresentationGroup = {
  id: string;
  name: string;
  display_order: number;
};

export type BudgetPresentationLine = {
  id: string;
  group_id: string;
  title: string;
  planned_minor: number | string;
  committed_minor: number | string;
  actual_minor: number | string;
  publish_flag: boolean;
  status?: string;
  currency?: string;
  period_label?: string | null;
  description?: string | null;
  public_description?: string | null;
  owner_label?: string | null;
  funding_restriction_tag?: string | null;
};

/** Extract WS-xx from a validation line title when present. */
export function parseWorkstreamIdFromTitle(title: string): string | null {
  const match = title.trim().match(/^(WS-\d{2})\b/);
  return match?.[1] ?? null;
}

/** Split `WS-01 · Title` for hierarchical display (id muted, title primary). */
export function splitBudgetLineTitle(title: string): {
  workstreamId: string | null;
  displayTitle: string;
} {
  const trimmed = title.trim();
  const workstreamId = parseWorkstreamIdFromTitle(trimmed);
  if (!workstreamId) return { workstreamId: null, displayTitle: trimmed };
  const displayTitle = trimmed
    .replace(new RegExp(`^${workstreamId}\\s*[·\\-–—:]?\\s*`), '')
    .trim();
  return { workstreamId, displayTitle: displayTitle || trimmed };
}

/** Purpose text from a seeded validation description, if encoded. */
export function parsePurposeFromDescription(description: string | null | undefined): string | null {
  if (!description) return null;
  const match = description.match(/Purpose:\s*(.+?)\s*Funding responsibility:/i);
  if (match) return match[1].trim();
  return description.trim() || null;
}

/** Inclusive month window parsed from a workstream `period_label` (e.g. Months 2–19). */
export type BudgetMonthRange = { startMonth: number; endMonth: number };

/**
 * Validation program duration windows used only to filter workstreams by timing overlap.
 * Canonical model stores full-program planned amounts — not periodized cash by window.
 */
export const VALIDATION_BUDGET_PERIOD_FILTERS = [
  { id: 'entire', startMonth: 1, endMonth: 24 },
  { id: 'months-1-6', startMonth: 1, endMonth: 6 },
  { id: 'months-7-12', startMonth: 7, endMonth: 12 },
  { id: 'months-13-18', startMonth: 13, endMonth: 18 },
  { id: 'months-19-24', startMonth: 19, endMonth: 24 },
] as const;

export type ValidationBudgetPeriodFilterId = (typeof VALIDATION_BUDGET_PERIOD_FILTERS)[number]['id'];

export function parseBudgetMonthRange(
  periodLabel: string | null | undefined,
): BudgetMonthRange | null {
  const raw = periodLabel?.trim() || '';
  if (!raw || /\bTBD\b/i.test(raw)) return null;
  const rangeMatch = raw.match(/\bMonths?\s+(\d+)\s*[–-]\s*(\d+)/i);
  if (rangeMatch) {
    const startMonth = Number(rangeMatch[1]);
    const endMonth = Number(rangeMatch[2]);
    if (!Number.isFinite(startMonth) || !Number.isFinite(endMonth) || startMonth < 1 || endMonth < startMonth) {
      return null;
    }
    return { startMonth, endMonth };
  }
  const singleMatch = raw.match(/\bMonths?\s+(\d+)\b/i);
  if (singleMatch) {
    const month = Number(singleMatch[1]);
    if (!Number.isFinite(month) || month < 1) return null;
    return { startMonth: month, endMonth: month };
  }
  return null;
}

export function monthRangesOverlap(a: BudgetMonthRange, b: BudgetMonthRange): boolean {
  return a.startMonth <= b.endMonth && b.startMonth <= a.endMonth;
}

export function formatMonthsRangeLabel(range: BudgetMonthRange): string {
  if (range.startMonth === range.endMonth) return `Months ${range.startMonth}`;
  return `Months ${range.startMonth}–${range.endMonth}`;
}

/**
 * Aggregate Period cell for a group row from child line timings.
 * Prefers a combined month span when all children have defined windows.
 */
export function formatGroupPeriodLabel(
  lines: Array<{ period_label?: string | null }>,
): { periodLabel: string; isUndefined: boolean } {
  if (lines.length === 0) {
    return { periodLabel: '—', isUndefined: true };
  }

  const ranges: BudgetMonthRange[] = [];
  let undefinedCount = 0;
  for (const line of lines) {
    const range = parseBudgetMonthRange(line.period_label);
    if (range) ranges.push(range);
    else undefinedCount += 1;
  }

  if (ranges.length === 0) {
    return { periodLabel: 'TBD', isUndefined: true };
  }
  if (undefinedCount > 0) {
    return { periodLabel: 'Multiple periods', isUndefined: false };
  }

  const startMonth = Math.min(...ranges.map((r) => r.startMonth));
  const endMonth = Math.max(...ranges.map((r) => r.endMonth));
  return {
    periodLabel: formatMonthsRangeLabel({ startMonth, endMonth }),
    isUndefined: false,
  };
}

/** Whether a line’s timing overlaps a validation period filter window. */
export function lineOverlapsValidationPeriodFilter(
  periodLabel: string | null | undefined,
  filterId: ValidationBudgetPeriodFilterId,
): boolean {
  if (filterId === 'entire') return true;
  const filter = VALIDATION_BUDGET_PERIOD_FILTERS.find((row) => row.id === filterId);
  if (!filter) return true;
  const range = parseBudgetMonthRange(periodLabel);
  if (!range) return false;
  return monthRangesOverlap(range, { startMonth: filter.startMonth, endMonth: filter.endMonth });
}

/** Concise user-facing period/timing. Prefer `TBD` over repeating “Timing TBD”. */
export function formatBudgetLineTiming(periodLabel: string | null | undefined): {
  timingLabel: string;
  isUndefinedTiming: boolean;
  conceptualPhase: string | null;
  rawPeriodLabel: string | null;
} {
  const raw = periodLabel?.trim() || null;
  if (!raw) {
    return {
      timingLabel: 'TBD',
      isUndefinedTiming: true,
      conceptualPhase: null,
      rawPeriodLabel: null,
    };
  }

  const phaseMatch = raw.match(/\bPhase\s*([123](?:\s*[–-]\s*[123])?)\b/i);
  const conceptualPhase = phaseMatch ? `Phase ${phaseMatch[1].replace(/\s+/g, '')}` : null;
  const hasTbd = /\bTBD\b/i.test(raw);
  const monthRange = parseBudgetMonthRange(raw);
  const monthsMatch = raw.match(/\bMonths?\s+\d+(?:\s*[–-]\s*\d+)?/i);
  const hasConcreteDate =
    /\b20\d{2}([-/]\d{1,2}){1,2}\b/.test(raw)
    || /\b(Q[1-4]\s*20\d{2}|FY\s*20\d{2})\b/i.test(raw)
    || Boolean(monthsMatch);

  if (monthRange && !hasTbd) {
    return {
      timingLabel: formatMonthsRangeLabel(monthRange),
      isUndefinedTiming: false,
      conceptualPhase,
      rawPeriodLabel: raw,
    };
  }

  if (hasTbd || conceptualPhase || !hasConcreteDate) {
    return {
      timingLabel: 'TBD',
      isUndefinedTiming: true,
      conceptualPhase,
      rawPeriodLabel: raw,
    };
  }

  return {
    timingLabel: raw,
    isUndefinedTiming: false,
    conceptualPhase,
    rawPeriodLabel: raw,
  };
}

/** Prefer hierarchical table when the structure panel is at least this wide (px). */
export const BUDGET_STRUCTURE_WIDE_MIN_PX = 720;

export function preferBudgetStructureWideLayout(widthPx: number | null | undefined): boolean {
  if (widthPx == null || !Number.isFinite(widthPx)) return false;
  return widthPx >= BUDGET_STRUCTURE_WIDE_MIN_PX;
}

export type NestedBudgetGroupView = {
  group: BudgetPresentationGroup;
  lines: BudgetPresentationLine[];
  totals: {
    plannedMinor: number;
    committedMinor: number;
    actualMinor: number;
  };
};

function asMinor(value: number | string): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Stable group order: display_order ascending, then name, then id. */
export function sortBudgetGroupsForPresentation<T extends BudgetPresentationGroup>(groups: T[]): T[] {
  return [...groups].sort((a, b) => {
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) return byName;
    return a.id.localeCompare(b.id);
  });
}

/** Stable line order within a group: title ascending, then id. */
export function sortBudgetLinesForPresentation<T extends BudgetPresentationLine>(lines: T[]): T[] {
  return [...lines].sort((a, b) => {
    const byTitle = a.title.localeCompare(b.title);
    if (byTitle !== 0) return byTitle;
    return a.id.localeCompare(b.id);
  });
}

export function sumLinesForGroup(lines: BudgetPresentationLine[]): {
  plannedMinor: number;
  committedMinor: number;
  actualMinor: number;
} {
  return lines.reduce(
    (acc, line) => {
      if (line.status === 'archived') return acc;
      acc.plannedMinor += asMinor(line.planned_minor);
      acc.committedMinor += asMinor(line.committed_minor);
      acc.actualMinor += asMinor(line.actual_minor);
      return acc;
    },
    { plannedMinor: 0, committedMinor: 0, actualMinor: 0 },
  );
}

/**
 * Nest every line under its group. Orphan lines (unknown group_id) are omitted from
 * nested view — callers can surface them separately if needed.
 */
export function nestBudgetGroupsWithLines(
  groups: BudgetPresentationGroup[],
  lines: BudgetPresentationLine[],
): NestedBudgetGroupView[] {
  const orderedGroups = sortBudgetGroupsForPresentation(groups);
  return orderedGroups.map((group) => {
    const groupLines = sortBudgetLinesForPresentation(lines.filter((line) => line.group_id === group.id));
    return {
      group,
      lines: groupLines,
      totals: sumLinesForGroup(groupLines),
    };
  });
}

export function linesBelongOnlyToGroup(
  nested: NestedBudgetGroupView[],
  groupId: string,
): BudgetPresentationLine[] {
  const match = nested.find((row) => row.group.id === groupId);
  return match?.lines ?? [];
}
