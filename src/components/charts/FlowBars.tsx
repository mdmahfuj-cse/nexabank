import { Bar, CartesianGrid, ComposedChart, Legend, Line, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { useChartFormatters, useChartTheme } from '@/components/charts/chartTheme';
import { useCurrency } from '@/providers/CurrencyProvider';
import type { CashFlowPoint } from '@/types/domain';

/**
 * Cash flow: money in as bars up, money out as bars down, net as a line across.
 *
 * Expense is plotted negative so the zero line means something — you can see
 * which months the business funded itself and which it drew down, without
 * reading a single number.
 */
export function FlowBars({
  data,
  height = 300,
  loading = false,
  error,
  onRetry,
  showNet = true,
}: {
  data: CashFlowPoint[];
  height?: number;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  showNet?: boolean;
}) {
  const theme = useChartTheme();
  const { axisMoney, fullMoney } = useChartFormatters();
  const { chartValue } = useCurrency();

  const rows = data.map((point) => ({
    // `month` already arrives display-ready from the API ("Aug 2026").
    label: point.month,
    Income: chartValue(point.income),
    Expense: -chartValue(point.expense),
    Net: chartValue(point.net),
  }));

  return (
    <ChartFrame
      height={height}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={rows.length === 0}
    >
      <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} stackOffset="sign">
        <CartesianGrid stroke={theme.grid} vertical={false} />
        <XAxis dataKey="label" tick={theme.tick} tickLine={false} axisLine={false} dy={6} />
        <YAxis
          tick={theme.tick}
          tickLine={false}
          axisLine={false}
          width={62}
          tickFormatter={axisMoney}
        />
        <Tooltip
          formatter={fullMoney}
          contentStyle={theme.tooltipContent}
          labelStyle={theme.tooltipLabel}
          itemStyle={theme.tooltipItem}
          cursor={{ fill: theme.cursor }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={28}
          iconType="square"
          iconSize={8}
          wrapperStyle={{ fontSize: '0.75rem', color: theme.axis }}
        />
        <Bar dataKey="Income" fill={theme.income} radius={[2, 2, 0, 0]} animationDuration={650} />
        <Bar dataKey="Expense" fill={theme.expense} radius={[0, 0, 2, 2]} animationDuration={650} />
        {showNet ? (
          <Line
            type="monotone"
            dataKey="Net"
            stroke={theme.net}
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
            animationDuration={700}
          />
        ) : null}
      </ComposedChart>
    </ChartFrame>
  );
}
