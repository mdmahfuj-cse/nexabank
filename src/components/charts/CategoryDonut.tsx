import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { useChartFormatters, useChartTheme } from '@/components/charts/chartTheme';
import { useCurrency } from '@/providers/CurrencyProvider';
import { cn } from '@/lib/cn';
import type { CategorySlice } from '@/types/domain';

/**
 * Category distribution.
 *
 * A ring rather than a pie, with the period total struck in the middle — the
 * hole in a donut chart is the most valuable space on it, so it holds the one
 * figure every other slice is a fraction of.
 */
export function CategoryDonut({
  data,
  height = 240,
  loading = false,
  error,
  onRetry,
  className,
}: {
  data: CategorySlice[];
  height?: number;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}) {
  const theme = useChartTheme();
  const { fullMoney } = useChartFormatters();
  const { chartValue, money } = useCurrency();

  const rows = data.map((slice) => ({
    name: slice.label,
    value: chartValue(slice.amount),
    color: slice.color,
  }));

  const totalMinor = data.reduce((sum, slice) => sum + slice.amount, 0);
  const settled = !loading && !error && rows.length > 0;

  return (
    <div className={cn('relative', className)}>
      <ChartFrame
        height={height}
        loading={loading}
        error={error}
        onRetry={onRetry}
        empty={rows.length === 0}
        emptyLabel="No spending recorded in this period."
      >
        <PieChart>
          <Tooltip
            formatter={fullMoney}
            contentStyle={theme.tooltipContent}
            labelStyle={theme.tooltipLabel}
            itemStyle={theme.tooltipItem}
          />
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={1.5}
            stroke="none"
            animationDuration={700}
          >
            {rows.map((row) => (
              <Cell key={row.name} fill={row.color} />
            ))}
          </Pie>
        </PieChart>
      </ChartFrame>

      {settled ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="eyebrow text-base-content/45">Total</p>
            <p className="amount mt-1 font-mono text-lg">
              {money(totalMinor, 'USD', { compact: true })}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
