import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { SortButton, Tbody, Td, TableScroll, Th, Thead, Tr } from '@/components/ui/Table';
import { StatusPill } from '@/components/ui/Badge';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { useCurrency } from '@/providers/CurrencyProvider';
import { cn } from '@/lib/cn';
import { fmtDate, fmtTime } from '@/lib/dates';
import { CATEGORIES, PAYMENT_METHODS, TRANSACTION_TYPES } from '@/lib/taxonomy';
import type { SortDirection, Transaction } from '@/types/domain';

/** The three columns worth sorting on. Type and status are filters, not orders. */
export type LedgerSortKey = 'date' | 'counterparty' | 'amountMinor';

export interface LedgerSort {
  by: LedgerSortKey;
  direction: SortDirection;
  onSort: (key: LedgerSortKey) => void;
}

/**
 * The ledger, in two shapes.
 *
 * A table on anything wider than a phone, because the columns are the point —
 * you scan down amounts, not across records. Below that it becomes a stack of
 * rows, since a five-column table on a 380px screen is a horizontal scroll
 * nobody performs. Both shapes render the same records and open the same detail.
 */
export function TransactionLedger({
  rows,
  loading = false,
  error,
  onRetry,
  onSelect,
  accountName,
  showBalance = false,
  skeletonRows = 6,
  sort,
  empty,
}: {
  rows: Transaction[];
  loading?: boolean;
  error?: Error;
  onRetry?: () => void;
  onSelect: (transaction: Transaction) => void;
  /** Resolve an account id to a name; omit to hide the account column. */
  accountName?: (accountId: string) => string;
  showBalance?: boolean;
  skeletonRows?: number;
  /** Omit for a fixed order — the headers then render as plain labels. */
  sort?: LedgerSort;
  empty?: ReactNode;
}) {
  const { money } = useCurrency();

  if (error) {
    return <ErrorState title="The ledger did not load" error={error} onRetry={onRetry} />;
  }

  if (loading) {
    return <SkeletonRows rows={skeletonRows} columns={showBalance ? 6 : 5} />;
  }

  if (rows.length === 0) {
    return (
      empty ?? (
        <EmptyState
          title="No transactions match"
          description="Widen the date range or clear a filter — the ledger is filtered, not empty."
        />
      )
    );
  }

  /** Signed, in the display currency. Debits carry the minus. */
  const amountOf = (transaction: Transaction) =>
    money(
      transaction.direction === 'credit' ? transaction.amountMinor : -transaction.amountMinor,
      transaction.currency,
      { signed: transaction.direction === 'credit' },
    );

  /** A sortable header when the caller owns an order, a plain one otherwise. */
  const header = (key: LedgerSortKey, label: string, numeric = false) =>
    sort ? (
      <SortButton
        label={label}
        numeric={numeric}
        active={sort.by === key}
        direction={sort.direction}
        onClick={() => sort.onSort(key)}
      />
    ) : (
      label
    );

  return (
    <>
      {/* Table, from sm up */}
      <div className="hidden sm:block">
        <TableScroll>
          <Thead>
            <Th>{header('date', 'Date')}</Th>
            <Th>{header('counterparty', 'Counterparty')}</Th>
            {accountName ? <Th>Account</Th> : null}
            <Th>Type</Th>
            <Th>Status</Th>
            <Th numeric>{header('amountMinor', 'Amount', true)}</Th>
            {showBalance ? <Th numeric>Balance</Th> : null}
            <Th className="w-10" aria-label="Open" />
          </Thead>
          <Tbody>
            {rows.map((transaction) => (
              <Tr key={transaction.id} interactive onClick={() => onSelect(transaction)}>
                <Td>
                  <span className="amount whitespace-nowrap font-mono text-xs text-base-content/70">
                    {fmtDate(transaction.date)}
                  </span>
                  <span className="amount mt-0.5 block font-mono text-[0.7rem] text-base-content/35">
                    {fmtTime(transaction.date)}
                  </span>
                </Td>

                <Td>
                  <span className="block max-w-[18rem] truncate font-medium">
                    {transaction.counterparty}
                  </span>
                  <span className="mt-0.5 block max-w-[18rem] truncate text-xs text-base-content/50">
                    {transaction.description}
                  </span>
                </Td>

                {accountName ? (
                  <Td>
                    <span className="text-xs text-base-content/60">
                      {accountName(transaction.accountId)}
                    </span>
                  </Td>
                ) : null}

                <Td>
                  <span className="whitespace-nowrap text-xs text-base-content/70">
                    {TRANSACTION_TYPES[transaction.type]}
                  </span>
                  <span className="mt-0.5 block text-[0.7rem] text-base-content/35">
                    {PAYMENT_METHODS[transaction.method]}
                  </span>
                </Td>

                <Td>
                  <StatusPill status={transaction.status} />
                </Td>

                <Td numeric>
                  <span
                    className={cn(
                      'amount whitespace-nowrap font-mono font-medium',
                      transaction.direction === 'credit' ? 'text-success' : 'text-base-content',
                    )}
                  >
                    {amountOf(transaction)}
                  </span>
                  {transaction.feeMinor > 0 ? (
                    <span className="amount mt-0.5 block font-mono text-[0.7rem] text-base-content/35">
                      fee {money(transaction.feeMinor, transaction.currency)}
                    </span>
                  ) : null}
                </Td>

                {showBalance ? (
                  <Td numeric>
                    <span className="amount whitespace-nowrap font-mono text-xs text-base-content/55">
                      {transaction.status === 'settled'
                        ? money(transaction.balanceAfterMinor, transaction.currency)
                        : '—'}
                    </span>
                  </Td>
                ) : null}

                <Td className="pl-0 text-right">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(transaction);
                    }}
                    aria-label={`Open ${transaction.counterparty} ${transaction.id}`}
                    className="rounded p-1 text-base-content/30 transition-colors hover:text-base-content"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </TableScroll>
      </div>

      {/* Stack, on phones */}
      <ul className="divide-y divide-[var(--rule)] sm:hidden">
        {rows.map((transaction) => (
          <li key={transaction.id}>
            <button
              type="button"
              onClick={() => onSelect(transaction)}
              className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition-colors active:bg-base-200"
            >
              <span className="min-w-0">
                <span className="block max-w-[13rem] truncate font-medium">
                  {transaction.counterparty}
                </span>
                <span className="mt-1 flex items-center gap-2">
                  <span className="amount font-mono text-[0.7rem] text-base-content/45">
                    {fmtDate(transaction.date)}
                  </span>
                  <span
                    aria-hidden="true"
                    className="size-1 rounded-full"
                    style={{ backgroundColor: CATEGORIES[transaction.category].color }}
                  />
                  <span className="truncate text-[0.7rem] text-base-content/45">
                    {TRANSACTION_TYPES[transaction.type]}
                  </span>
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span
                  className={cn(
                    'amount block font-mono text-sm font-medium',
                    transaction.direction === 'credit' ? 'text-success' : 'text-base-content',
                  )}
                >
                  {amountOf(transaction)}
                </span>
                {transaction.status === 'settled' ? (
                  <span className="mt-1 block text-[0.7rem] text-base-content/35">
                    {fmtTime(transaction.date)}
                  </span>
                ) : (
                  <span className="mt-1 inline-block">
                    <StatusPill status={transaction.status} />
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
