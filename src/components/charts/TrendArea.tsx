import { useId } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { useChartFormatters, useChartTheme } from '@/components/charts/chartTheme';
import { useCurrency } from '@/providers/CurrencyProvider';
import { fmtDayShort } from '@/lib/dates';
import type { TrendPoint } from '@/types/domain';

/**
 * Daily transaction trend: volume as the filled area, count as the line on the
 * opposite axis. Two units on one plot is usually a mistake, but here the
 * question is exactly whether volume moved because there were more payments or
 * because there were bigger ones.
 */
export function TrendArea({
  data,
  height = 280,
  loading = false,
  error,
  onRetry,
}: {
  data: TrendPoint[];
  height?: number;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}) {
  const theme = useChartTheme();
  const { axisMoney, fullMoney, plain } = useChartFormatters();
  const { chartValue } = useCurrency();
  const gradientId = useId();

  const rows = data.map((point) => ({
    date: point.date,
    Volume: chartValue(point.volume),
    Payments: point.count,
  }));

  return (
    <ChartFrame
      height={height}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={rows.length === 0}
    >
      <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.net} stopOpacity={0.26} />
            <stop offset="100%" stopColor={theme.net} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke={theme.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={theme.tick}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
          dy={6}
          tickFormatter={fmtDayShort}
        />
        <YAxis
          yAxisId="volume"
          tick={theme.tick}
          tickLine={false}
          axisLine={false}
          width={58}
          tickFormatter={axisMoney}
        />
        <YAxis
          yAxisId="count"
          orientation="right"
          tick={theme.tick}
          tickLine={false}
          axisLine={false}
          width={34}
          allowDecimals={false}
        />
        <Tooltip
          labelFormatter={(value: unknown) => fmtDayShort(String(value))}
          formatter={(value: unknown, name: unknown) =>
            name === 'Volume' ? fullMoney(value) : plain(value)
          }
          contentStyle={theme.tooltipContent}
          labelStyle={theme.tooltipLabel}
          itemStyle={theme.tooltipItem}
          cursor={{ stroke: theme.axis, strokeDasharray: '3 3' }}
        />
        <Area
          yAxisId="volume"
          type="monotone"
          dataKey="Volume"
          stroke={theme.net}
          strokeWidth={1.6}
          fill={`url(#${gradientId})`}
          activeDot={{ r: 3.5, strokeWidth: 0 }}
          animationDuration={700}
        />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="Payments"
          stroke={theme.income}
          strokeWidth={1.4}
          strokeDasharray="4 3"
          dot={false}
          animationDuration={700}
        />
      </ComposedChart>
    </ChartFrame>
  );
}
