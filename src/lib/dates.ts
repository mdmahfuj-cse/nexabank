import {
  format,
  formatDistanceToNowStrict,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  startOfMonth,
} from 'date-fns';

/** 21 Aug 2026 */
export const fmtDate = (iso: string) => format(parseISO(iso), 'dd MMM yyyy');

/** 21 Aug 2026, 14:08 */
export const fmtDateTime = (iso: string) =>
  format(parseISO(iso), 'dd MMM yyyy, HH:mm');

/** 14:08 */
export const fmtTime = (iso: string) => format(parseISO(iso), 'HH:mm');

/** Aug 2026 */
export const fmtMonth = (iso: string) => format(parseISO(iso), 'MMM yyyy');

/** 21 Aug — compact enough for a chart axis. */
export const fmtDayShort = (iso: string) => format(parseISO(iso), 'd MMM');

/** 2026-08 — stable key for grouping. */
export const monthKey = (iso: string) => format(parseISO(iso), 'yyyy-MM');

/** yyyy-MM-dd, the shape date inputs expect. */
export const toInputDate = (date: Date) => format(date, 'yyyy-MM-dd');

/** "3 days ago" */
export const fmtRelative = (iso: string) =>
  formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });

export function withinRange(iso: string, from?: string, to?: string): boolean {
  const date = parseISO(iso);
  if (from && isBefore(date, startOfDay(parseISO(from)))) return false;
  if (to && isAfter(date, endOfDay(parseISO(to)))) return false;
  return true;
}

export type RangePreset = '7d' | '30d' | '90d' | '12m' | 'ytd' | 'all';

export const RANGE_PRESETS: Array<{ id: RangePreset; label: string }> = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '12m', label: '12 months' },
  { id: 'ytd', label: 'Year to date' },
  { id: 'all', label: 'All time' },
];

/** Turn a preset into concrete from/to input dates. */
export function resolvePreset(
  preset: RangePreset,
  now = new Date(),
): { from?: string; to?: string } {
  const to = toInputDate(now);
  switch (preset) {
    case '7d':
      return { from: toInputDate(subDays(now, 7)), to };
    case '30d':
      return { from: toInputDate(subDays(now, 30)), to };
    case '90d':
      return { from: toInputDate(subDays(now, 90)), to };
    case '12m':
      return { from: toInputDate(subMonths(now, 12)), to };
    case 'ytd':
      return { from: toInputDate(new Date(now.getFullYear(), 0, 1)), to };
    case 'all':
      return {};
  }
}

/** Last n month boundaries, oldest first — the spine of every monthly chart. */
export function lastMonths(count: number, now = new Date()): Date[] {
  const months: Date[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    months.push(startOfMonth(subMonths(now, i)));
  }
  return months;
}
