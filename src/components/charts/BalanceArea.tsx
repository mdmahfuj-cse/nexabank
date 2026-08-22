import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { useChartFormatters, useChartTheme } from '@/components/charts/chartTheme';
import { useCurrency } from '@/providers/CurrencyProvider';
import type { SeriesPoint } from '@/types/domain';

/**
 * Balance over the selected period.
 *
 * Filled area rather than a bare line: the quantity is a level, not a rate, and
 * the fill is what makes that read at a glance. Axis starts at the data's own
 * floor — a treasury balance chart that starts at zero shows nothing.
 */
export function BalanceArea({
  data,
  height = 240,
  loading = false,
  error,
  onRetry,
}: {
  /** Values are USD minor units, as every aggregate from the API is. */
  data: SeriesPoint[];
  height?: number;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}) {
  const theme = useChartTheme();
  const { axisMoney, fullMoney } = useChartFormatters();
  const { chartValue } = useCurrency();
  const gradientId = useId();

  const rows = data.map((point) => ({
    label: point.label,
    value: chartValue(point.value),
  }));

  return (
    <ChartFrame
      height={height}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={rows.length === 0}
    >
      <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.income} stopOpacity={0.28} />
            <stop offset="100%" stopColor={theme.income} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke={theme.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={theme.tick}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          dy={6}
        />
        <YAxis
          tick={theme.tick}
          tickLine={false}
          axisLine={false}
          width={58}
          domain={['auto', 'auto']}
          tickFormatter={axisMoney}
        />
        <Tooltip
          formatter={fullMoney}
          contentStyle={theme.tooltipContent}
          labelStyle={theme.tooltipLabel}
          itemStyle={theme.tooltipItem}
          cursor={{ stroke: theme.axis, strokeDasharray: '3 3' }}
        />
        <Area
          type="monotone"
          dataKey="value"
          name="Balance"
          stroke={theme.income}
          strokeWidth={1.75}
          fill={`url(#${gradientId})`}
          activeDot={{ r: 3.5, strokeWidth: 0 }}
          animationDuration={700}
        />
      </AreaChart>
    </ChartFrame>
  );
}
