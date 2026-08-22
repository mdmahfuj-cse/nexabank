import type { CurrencyCode } from '@/types/domain';

/**
 * Money handling. Two rules, enforced by keeping every helper here:
 *
 *   1. Amounts travel as integers in minor units. No floats, no accumulated
 *      rounding drift.
 *   2. Conversion happens once, at the display edge, through `convertMinor`.
 *
 * Rates are static and indicative — this is a frontend demo, not a dealing desk.
 */

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
  /** Digits after the decimal point. JPY has none. */
  exponent: number;
  /** Units of this currency per 1 USD. */
  perUsd: number;
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US dollar',
    exponent: 2,
    perUsd: 1,
    locale: 'en-US',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    exponent: 2,
    perUsd: 0.92,
    locale: 'de-DE',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'Pound sterling',
    exponent: 2,
    perUsd: 0.79,
    locale: 'en-GB',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese yen',
    exponent: 0,
    perUsd: 147,
    locale: 'ja-JP',
  },
  BDT: {
    code: 'BDT',
    symbol: '৳',
    name: 'Bangladeshi taka',
    exponent: 2,
    perUsd: 119.5,
    locale: 'en-BD',
  },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

const pow10 = (n: number) => 10 ** n;

/** 1299.5 → 129950 for a 2-digit currency. */
export function toMinor(value: number, currency: CurrencyCode): number {
  return Math.round(value * pow10(CURRENCIES[currency].exponent));
}

/** 129950 → 1299.5 for a 2-digit currency. */
export function toMajor(minor: number, currency: CurrencyCode): number {
  return minor / pow10(CURRENCIES[currency].exponent);
}

/**
 * Read an amount the way it was typed. People put separators in — "12,500" and
 * "12 500" are the same instruction — and an empty field is not zero, it is
 * nothing, so it comes back as NaN for the caller to reject.
 */
export function parseAmountInput(raw: string): number {
  const cleaned = raw.replace(/[\s,]/g, '');
  return cleaned === '' ? Number.NaN : Number(cleaned);
}

/** Convert between currencies, keeping integer minor units on both sides. */
export function convertMinor(
  minor: number,
  from: CurrencyCode,
  to: CurrencyCode,
): number {
  if (from === to) return minor;
  const usd = toMajor(minor, from) / CURRENCIES[from].perUsd;
  return toMinor(usd * CURRENCIES[to].perUsd, to);
}

export interface FormatMoneyOptions {
  /** Force a leading + on positive amounts. */
  signed?: boolean;
  /** 1.2M instead of 1,240,000.00. */
  compact?: boolean;
  /** Drop the currency symbol, keep the digits. */
  bare?: boolean;
  /** Round to whole units. */
  whole?: boolean;
}

const MINUS = '−'; // typographic minus, aligns with digit widths

/** Format minor units as a currency string. */
export function formatMoney(
  minor: number,
  currency: CurrencyCode,
  options: FormatMoneyOptions = {},
): string {
  const meta = CURRENCIES[currency];
  const negative = minor < 0;
  const value = Math.abs(toMajor(minor, currency));
  const digits = options.whole ? 0 : meta.exponent;

  let body: string;
  if (options.compact) {
    body = compactNumber(value, meta.exponent);
  } else {
    body = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  const symbol = options.bare ? '' : meta.symbol;
  const sign = negative ? MINUS : options.signed ? '+' : '';
  return `${sign}${symbol}${body}`;
}

/** 1_240_000 → "1.24M". Keeps two significant decimals under 10. */
export function compactNumber(value: number, exponent = 2): string {
  const abs = Math.abs(value);
  const units: Array<[number, string]> = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const scaled = value / size;
      const decimals = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
      return `${scaled.toFixed(decimals)}${suffix}`;
    }
  }
  return value.toFixed(abs >= 1 ? Math.min(exponent, 2) : exponent);
}

/** Percentages: 4.238 → "+4.24%". */
export function formatPercent(value: number, digits = 1, signed = true): string {
  const sign = value < 0 ? MINUS : signed && value > 0 ? '+' : '';
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

/** Signed amount for chart axes and CSV: plain number in major units. */
export function majorForChart(
  minor: number,
  from: CurrencyCode,
  display: CurrencyCode,
): number {
  return toMajor(convertMinor(minor, from, display), display);
}

/** Indicative FX rate between two currencies, e.g. 0.92 EUR per USD. */
export function fxRate(from: CurrencyCode, to: CurrencyCode): number {
  return CURRENCIES[to].perUsd / CURRENCIES[from].perUsd;
}
