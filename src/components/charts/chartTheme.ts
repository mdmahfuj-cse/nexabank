import type { CSSProperties } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import { useCurrency } from '@/providers/CurrencyProvider';
import { compactNumber, formatMoney, toMinor } from '@/lib/money';

/**
 * Chart chrome.
 *
 * Recharts draws to SVG attributes rather than classes, so the palette has to be
 * handed to it as values. These are the same colours the CSS themes use; keeping
 * them in one place is what stops the charts from drifting away from the app.
 */

export interface ChartTheme {
  axis: string;
  grid: string;
  cursor: string;
  income: string;
  expense: string;
  net: string;
  neutral: string;
  tooltipContent: CSSProperties;
  tooltipLabel: CSSProperties;
  tooltipItem: CSSProperties;
  tick: { fill: string; fontSize: number; fontFamily: string };
}

const TOOLTIP_BASE: CSSProperties = {
  background: 'var(--color-base-100)',
  border: '1px solid var(--color-base-300)',
  borderRadius: 'var(--radius-box)',
  boxShadow: 'var(--inset)',
  padding: '0.6rem 0.75rem',
  fontSize: '0.78rem',
  fontFamily: 'var(--font-sans)',
};

export function useChartTheme(): ChartTheme {
  const { isDark } = useTheme();

  const axis = isDark ? 'rgba(219,228,234,0.42)' : 'rgba(22,32,42,0.5)';

  return {
    axis,
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,32,42,0.08)',
    cursor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(16,32,42,0.045)',
    income: isDark ? '#2FBF8F' : '#0F7355',
    expense: isDark ? '#E06A5C' : '#B4453A',
    net: isDark ? '#5B8DD9' : '#2B5FA8',
    neutral: axis,
    tooltipContent: TOOLTIP_BASE,
    tooltipLabel: {
      color: 'var(--color-base-content)',
      fontWeight: 600,
      marginBottom: '0.25rem',
      letterSpacing: '0.02em',
    },
    tooltipItem: {
      fontFamily: 'var(--font-mono)',
      fontVariantNumeric: 'tabular-nums',
      padding: 0,
    },
    tick: {
      fill: axis,
      fontSize: 11,
      fontFamily: 'var(--font-mono)',
    },
  };
}

/**
 * Chart values arrive as plain numbers in *major* units of the display
 * currency — Recharts cannot scale an axis over integer cents without losing
 * the plot. These two formatters put the currency back on the way out.
 */
export function useChartFormatters() {
  const { currency, symbol } = useCurrency();

  return {
    /** Axis ticks: short, symbol-prefixed. "$1.24M" */
    axisMoney: (value: number) => `${symbol}${compactNumber(value)}`,
    /** Tooltip values: exact, in full. */
    fullMoney: (value: unknown) => formatMoney(toMinor(Number(value) || 0, currency), currency),
    /** Counts, not money. */
    plain: (value: unknown) => Number(value).toLocaleString('en-US'),
  };
}
