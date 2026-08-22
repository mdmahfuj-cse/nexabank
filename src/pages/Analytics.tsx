import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Controls';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { StatGrid, StatTile } from '@/components/data/StatTile';
import { AccountPicker } from '@/components/data/AccountPicker';
import { ChartLegend } from '@/components/charts/ChartFrame';
import { FlowBars } from '@/components/charts/FlowBars';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { TrendArea } from '@/components/charts/TrendArea';
import { SpendBars } from '@/components/charts/SpendBars';
import { useApi } from '@/hooks/useApi';
import { useCurrency } from '@/providers/CurrencyProvider';
import { api } from '@/mocks/api';
import { cn } from '@/lib/cn';
import { formatPercent, toMajor } from '@/lib/money';
import { downloadCsv, toCsv } from '@/lib/csv';

type Period = '6' | '12' | '24';

const PERIODS: { value: Period; label: string }[] = [
  { value: '6', label: '6M' },
  { value: '12', label: '12M' },
  { value: '24', label: '24M' },
];

/**
 * Analytics.
 *
 * The API hands every aggregate back in USD minor units and the currency
 * provider converts at the point of display, so switching the selector restates
 * the whole page without a refetch.
 */
export default function Analytics() {
  const { money, currency, rateNote } = useCurrency();
  const [accountId, setAccountId] = useState('all');
  const [period, setPeriod] = useState<Period>('12');

  const months = Number(period);
  const accounts = useApi(() => api.getAccounts(), []);
  const analytics = useApi(
    () => api.getAnalytics(accountId, months),
    [accountId, months],
  );

  const data = analytics.data;
  const kpis = data?.kpis;
  const dimmed = analytics.loading && !analytics.initialLoading;

  const totals = useMemo(() => {
    const flow = data?.cashFlow ?? [];
    const income = flow.reduce((sum, point) => sum + point.income, 0);
    const expense = flow.reduce((sum, point) => sum + point.expense, 0);
    return { income, expense, net: income - expense };
  }, [data]);

  const categories = data?.categories ?? [];
  const scopeLabel =
    accountId === 'all'
      ? 'all accounts'
      : (accounts.data?.find((item) => item.id === accountId)?.name ?? 'this account');

  const note = rateNote('USD');

  const exportCategories = () => {
    downloadCsv(
      `nexabank-categories-${months}m-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(categories, [
        { header: 'Category', value: (row) => row.label },
        { header: 'Payments', value: (row) => row.transactions },
        { header: 'Share (%)', value: (row) => row.share.toFixed(2) },
        { header: 'Amount (USD)', value: (row) => toMajor(row.amount, 'USD') },
      ]),
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        title="Analytics"
        description={`Where the money came from and where it went across ${scopeLabel}, over the last ${months} months.`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <AccountPicker
              accounts={accounts.data ?? []}
              value={accountId}
              onChange={setAccountId}
              id="analytics-scope"
              label="Scope"
            />
            <Segmented
              label="Period"
              size="sm"
              value={period}
              onChange={setPeriod}
              options={PERIODS}
            />
          </div>
        }
      />

      {analytics.error && !data ? (
        <Panel>
          <ErrorState
            title="Analytics did not load"
            error={analytics.error}
            onRetry={analytics.refetch}
          />
        </Panel>
      ) : (
        <div className={cn('transition-opacity', dimmed && 'opacity-55')}>
          <StatGrid className="mb-4">
            <StatTile
              label="Average payment"
              loading={analytics.initialLoading}
              value={money(kpis?.averageTransactionMinor ?? 0)}
              hint="Mean outgoing payment, fees included."
            />
            <StatTile
              label="Largest single expense"
              loading={analytics.initialLoading}
              value={money(kpis?.largestExpenseMinor ?? 0)}
              hint="The one payment worth explaining."
            />
            <StatTile
              label="Savings rate"
              loading={analytics.initialLoading}
              value={formatPercent(kpis?.savingsRatePct ?? 0, 1, false)}
              hint="Share of income still on the balance sheet."
            />
            <StatTile
              label="Settlement rate"
              loading={analytics.initialLoading}
              value={formatPercent(kpis?.settlementRatePct ?? 0, 1, false)}
              hint="Payments that cleared without a return or a hold."
            />
          </StatGrid>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel className="xl:col-span-2">
              <PanelHeader
                eyebrow="Cash flow"
                title="In, out and net"
                description={`Money in above the line, money out below it, net as the line across. Shown in ${currency}.`}
              />
              <PanelBody>
                <FlowBars
                  data={data?.cashFlow ?? []}
                  loading={analytics.initialLoading}
                  error={analytics.error}
                  onRetry={analytics.refetch}
                />
              </PanelBody>
              <div className="rule-t grid grid-cols-3 divide-x divide-[var(--rule)]">
                <FlowTotal label="Income" value={money(totals.income)} />
                <FlowTotal label="Expense" value={money(totals.expense)} />
                <FlowTotal
                  label="Net"
                  value={money(totals.net)}
                  tone={totals.net >= 0 ? 'text-success' : 'text-error'}
                />
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                eyebrow="Distribution"
                title="Where the money went"
                description="Outgoing payments grouped by category for the period."
              />
              <PanelBody>
                <CategoryDonut
                  data={categories}
                  loading={analytics.initialLoading}
                  error={analytics.error}
                  onRetry={analytics.refetch}
                />
                {categories.length > 0 ? (
                  <ChartLegend
                    className="mt-4"
                    items={categories.slice(0, 6).map((slice) => ({
                      label: slice.label,
                      color: slice.color,
                      value: money(slice.amount, 'USD', { compact: true }),
                    }))}
                  />
                ) : null}
              </PanelBody>
            </Panel>

            <Panel className="xl:col-span-2">
              <PanelHeader
                eyebrow="Trend"
                title="Thirty days of activity"
                description="Volume as the filled area, payment count as the dashed line — so a busy month reads differently from an expensive one."
              />
              <PanelBody>
                <TrendArea
                  data={data?.trend ?? []}
                  loading={analytics.initialLoading}
                  error={analytics.error}
                  onRetry={analytics.refetch}
                />
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                eyebrow="Monthly spending"
                title="Outgoings by month"
                description="Fees included, transfers between your own accounts excluded."
              />
              <PanelBody>
                <SpendBars
                  data={data?.monthlySpend ?? []}
                  height={240}
                  loading={analytics.initialLoading}
                  error={analytics.error}
                  onRetry={analytics.refetch}
                />
                <p className="rule-t mt-4 pt-4 text-xs leading-relaxed text-base-content/55">
                  {kpis && kpis.burnRateMinor > 0
                    ? `Net burn is running at ${money(
                        kpis.burnRateMinor,
                      )} a month across the last three. At that rate the closing balance covers ${kpis.runwayMonths.toFixed(
                        1,
                      )} months.`
                    : 'The last three months were cash positive, so there is no burn to project.'}
                </p>
              </PanelBody>
            </Panel>
          </div>

          <Panel className="mt-4">
            <PanelHeader
              eyebrow="Category detail"
              title="Every category, ranked"
              description={`${categories.length} categories with spending in this period.`}
              actions={
                categories.length > 0 ? (
                  <Button
                    size="sm"
                    variant="quiet"
                    icon={<Download className="size-3.5" />}
                    onClick={exportCategories}
                  >
                    Export
                  </Button>
                ) : undefined
              }
            />

            {categories.length === 0 ? (
              <EmptyState
                title="Nothing to break down"
                description="No outgoing payments were recorded for this scope and period."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-base-300 text-left">
                      <th scope="col" className="eyebrow px-4 py-2.5 text-base-content/45 sm:px-5">
                        Category
                      </th>
                      <th scope="col" className="eyebrow px-4 py-2.5 text-right text-base-content/45">
                        Payments
                      </th>
                      <th scope="col" className="eyebrow w-2/5 px-4 py-2.5 text-base-content/45">
                        Share
                      </th>
                      <th
                        scope="col"
                        className="eyebrow px-4 py-2.5 text-right text-base-content/45 sm:px-5"
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--rule)]">
                    {categories.map((slice) => (
                      <tr key={slice.key} className="transition-colors hover:bg-base-200/40">
                        <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                          <span className="flex items-center gap-2.5">
                            <span
                              aria-hidden="true"
                              className="size-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: slice.color }}
                            />
                            <span className="font-medium">{slice.label}</span>
                          </span>
                        </td>
                        <td className="amount whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-base-content/65">
                          {slice.transactions}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-3">
                            <span className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-base-300">
                              <span
                                className="block h-full rounded-full"
                                style={{
                                  width: `${Math.max(slice.share, 1)}%`,
                                  backgroundColor: slice.color,
                                }}
                              />
                            </span>
                            <span className="amount w-12 shrink-0 text-right font-mono text-xs text-base-content/55">
                              {slice.share.toFixed(1)}%
                            </span>
                          </span>
                        </td>
                        <td className="amount whitespace-nowrap px-4 py-3 text-right font-mono font-medium sm:px-5">
                          {money(slice.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {note ? (
            <p className="mt-4 text-xs text-base-content/40">
              Figures are held in US dollars and converted for display at an indicative rate of{' '}
              {note}.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** One of the three figures struck under the cash-flow chart. */
function FlowTotal({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="px-4 py-3.5 sm:px-5">
      <p className="eyebrow text-base-content/45">{label}</p>
      <p className={cn('amount mt-1.5 font-mono text-sm', tone)}>{value}</p>
    </div>
  );
}
