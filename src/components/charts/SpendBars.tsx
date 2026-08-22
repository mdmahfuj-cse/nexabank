import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { useChartFormatters, useChartTheme } from '@/components/charts/chartTheme';
import { useCurrency } from '@/providers/CurrencyProvider';
import type { SeriesPoint } from '@/types/domain';

/**
 * Monthly spend. The heaviest month is picked out in full colour and the rest
 * held back — one comparison, made for you, instead of twelve bars of the same
 * weight and no argument.
 */
export function SpendBars({
  data,
  height = 240,
  loading = false,
  error,
  onRetry,
}: {
  data: SeriesPoint[];
  height?: number;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}) {
  const theme = useChartTheme();
  const { axisMoney, fullMoney } = useChartFormatters();
  const { chartValue } = useCurrency();

  const rows = data.map((point) => ({ label: point.label, value: chartValue(point.value) }));
  const peak = rows.reduce((max, row) => Math.max(max, row.value), 0);

  return (
    <ChartFrame
      height={height}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={rows.length === 0}
    >
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={theme.grid} vertical={false} />
        <XAxis dataKey="label" tick={theme.tick} tickLine={false} axisLine={false} dy={6} />
        <YAxis
          tick={theme.tick}
          tickLine={false}
          axisLine={false}
          width={58}
          tickFormatter={axisMoney}
        />
        <Tooltip
          formatter={fullMoney}
          contentStyle={theme.tooltipContent}
          labelStyle={theme.tooltipLabel}
          itemStyle={theme.tooltipItem}
          cursor={{ fill: theme.cursor }}
        />
        <Bar dataKey="value" name="Spend" radius={[2, 2, 0, 0]} animationDuration={650}>
          {rows.map((row) => (
            <Cell
              key={row.label}
              fill={theme.expense}
              fillOpacity={row.value === peak ? 0.95 : 0.42}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}
