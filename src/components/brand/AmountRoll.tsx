import { useCurrency } from "@/providers/CurrencyProvider";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/cn";
import type { FormatMoneyOptions } from "@/lib/money";
import type { CurrencyCode } from "@/types/domain";

/**
 * An amount that settles into place, like a counter coming to rest.
 *
 * The count runs on minor units and is formatted on every frame, so the digits
 * stay in the display currency and keep their tabular width — the figure never
 * shifts sideways while it climbs.
 */
export function AmountRoll({
  minor,
  from = "BDT",
  options,
  animate = true,
  duration,
  className,
}: {
  minor: number;
  from?: CurrencyCode;
  options?: FormatMoneyOptions;
  animate?: boolean;
  duration?: number;
  className?: string;
}) {
  const { money } = useCurrency();
  const rolled = useCountUp(minor, duration);
  const shown = animate ? Math.round(rolled) : minor;

  return (
    <span className={cn("amount", className)}>
      {money(shown, from, options)}
    </span>
  );
}
