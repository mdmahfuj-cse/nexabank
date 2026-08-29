import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  CURRENCIES,
  convertMinor,
  formatMoney,
  fxRate,
  majorForChart,
  type FormatMoneyOptions,
} from "@/lib/money";
import type { CurrencyCode } from "@/types/domain";

interface CurrencyContextValue {
  /** The currency every figure on screen is shown in. */
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  symbol: string;
  /** Format minor units held in `from` for display. Aggregates arrive in USD. */
  money: (
    minor: number,
    from?: CurrencyCode,
    options?: FormatMoneyOptions,
  ) => string;
  /** Plain number in display-currency major units, for chart axes. */
  chartValue: (minor: number, from?: CurrencyCode) => number;
  /** Indicative rate line, e.g. "1 USD = 119.50 BDT". */
  rateNote: (from: CurrencyCode) => string | null;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [storedCurrency, setStoredCurrency] = useLocalStorage<CurrencyCode>(
    "nexabank.currency",
    "BDT",
  );

  const currency = storedCurrency === "USD" ? "BDT" : storedCurrency;
  const setCurrency = (code: CurrencyCode) =>
    setStoredCurrency(code === "USD" ? "BDT" : code);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      symbol: CURRENCIES[currency].symbol,
      money: (minor, from = "USD", options) =>
        formatMoney(convertMinor(minor, from, currency), currency, options),
      chartValue: (minor, from = "USD") => majorForChart(minor, from, currency),
      rateNote: (from) =>
        from === currency
          ? null
          : `1 ${from} = ${fxRate(from, currency).toFixed(
              CURRENCIES[currency].exponent === 0 ? 2 : 4,
            )} ${currency}`,
    }),
    [currency, setCurrency],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context)
    throw new Error("useCurrency must be used inside CurrencyProvider");
  return context;
}
