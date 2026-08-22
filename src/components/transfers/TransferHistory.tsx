import { useMemo, useState } from 'react';
import { Download, Receipt } from 'lucide-react';
import { PanelBody, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { TransferStatusPill } from '@/components/ui/Badge';
import { SearchInput, Segmented } from '@/components/ui/Controls';
import { Drawer } from '@/components/ui/Overlay';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { TransferReceipt, receiptText } from '@/components/data/TransferReceipt';
import { cn } from '@/lib/cn';
import { formatMoney, toMajor } from '@/lib/money';
import { fmtDate, fmtDateTime } from '@/lib/dates';
import { downloadCsv, downloadText, toCsv } from '@/lib/csv';
import { TRANSFER_SPEEDS } from '@/lib/taxonomy';
import type { Account, Beneficiary, Transfer } from '@/types/domain';

type Filter = 'all' | 'completed' | 'pending' | 'scheduled' | 'failed';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'In flight' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'failed', label: 'Failed' },
];

/**
 * Everything that has been sent from this profile.
 *
 * Amounts stay in the currency each payment was made in — a history of
 * instructions, not a report, so the display-currency selector leaves it alone.
 */
export function TransferHistory({
  transfers,
  accounts,
  beneficiaries,
  loading,
  initialLoading,
  error,
  onRetry,
}: {
  transfers: Transfer[];
  accounts: Account[];
  beneficiaries: Beneficiary[];
  loading: boolean;
  initialLoading: boolean;
  error?: Error | undefined;
  onRetry: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return transfers
      .filter((item) => (filter === 'all' ? true : item.status === filter))
      .filter((item) =>
        needle
          ? [item.beneficiaryName, item.reference, item.receiptNumber, item.note ?? '']
              .join(' ')
              .toLowerCase()
              .includes(needle)
          : true,
      )
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [transfers, search, filter]);

  const selected = openId ? (transfers.find((item) => item.id === openId) ?? null) : null;
  const selectedAccount = selected
    ? accounts.find((item) => item.id === selected.fromAccountId)
    : undefined;
  const selectedBeneficiary = selected
    ? beneficiaries.find((item) => item.id === selected.beneficiaryId)
    : undefined;

  const accountName = (id: string) => accounts.find((item) => item.id === id)?.name ?? '—';

  const exportCsv = () => {
    downloadCsv(
      `nexabank-transfers-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(rows, [
        { header: 'Receipt', value: (row) => row.receiptNumber },
        { header: 'Raised', value: (row) => row.createdAt },
        { header: 'Settles', value: (row) => row.settlesAt },
        { header: 'From', value: (row) => accountName(row.fromAccountId) },
        { header: 'Beneficiary', value: (row) => row.beneficiaryName },
        { header: 'Reference', value: (row) => row.reference },
        { header: 'Rail', value: (row) => TRANSFER_SPEEDS[row.speed].label },
        { header: 'Status', value: (row) => row.status },
        { header: 'Currency', value: (row) => row.currency },
        { header: 'Amount', value: (row) => toMajor(row.amountMinor, row.currency) },
        { header: 'Fee', value: (row) => toMajor(row.feeMinor, row.currency) },
      ]),
    );
  };

  return (
    <>
      <PanelHeader
        eyebrow="Transfer history"
        title="Payments sent"
        description={
          transfers.length > 0
            ? `${transfers.length} payments raised from this profile.`
            : undefined
        }
        actions={
          rows.length > 0 ? (
            <Button
              size="sm"
              variant="quiet"
              icon={<Download className="size-3.5" />}
              onClick={exportCsv}
            >
              Export
            </Button>
          ) : undefined
        }
      />

      {error && transfers.length === 0 ? (
        <ErrorState title="History did not load" error={error} onRetry={onRetry} />
      ) : initialLoading ? (
        <SkeletonRows rows={5} columns={5} />
      ) : transfers.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Send the first one and its receipt will be filed here."
          icon={<Receipt className="size-5" />}
        />
      ) : (
        <>
          <PanelBody className="!py-3">
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search payee, reference or receipt"
                aria-label="Search transfers"
                className="min-w-0 flex-1 sm:max-w-xs"
              />
              <div className="no-scrollbar -mx-1 max-w-full overflow-x-auto px-1">
                <Segmented
                  label="Filter by status"
                  size="sm"
                  value={filter}
                  onChange={setFilter}
                  options={FILTERS}
                />
              </div>
            </div>
          </PanelBody>

          {rows.length === 0 ? (
            <EmptyState
              title="Nothing matches"
              description="No payment in the history matches those filters."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div
              className={cn(
                'overflow-x-auto transition-opacity',
                loading && !initialLoading && 'opacity-55',
              )}
            >
              <table className="w-full min-w-[46rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-base-300 text-left">
                    <th scope="col" className="eyebrow px-4 py-2.5 text-base-content/45 sm:px-5">
                      Raised
                    </th>
                    <th scope="col" className="eyebrow px-4 py-2.5 text-base-content/45">
                      Beneficiary
                    </th>
                    <th scope="col" className="eyebrow px-4 py-2.5 text-base-content/45">
                      From
                    </th>
                    <th scope="col" className="eyebrow px-4 py-2.5 text-base-content/45">
                      Rail
                    </th>
                    <th scope="col" className="eyebrow px-4 py-2.5 text-base-content/45">
                      Status
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
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Receipt for ${row.beneficiaryName}, ${formatMoney(
                        row.amountMinor,
                        row.currency,
                      )} ${row.currency}`}
                      onClick={() => setOpenId(row.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setOpenId(row.id);
                        }
                      }}
                      className="cursor-pointer transition-colors hover:bg-base-200/40 focus-visible:bg-base-200/60"
                    >
                      <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                        <span className="amount font-mono text-xs text-base-content/70">
                          {fmtDate(row.createdAt)}
                        </span>
                      </td>
                      <td className="max-w-[16rem] px-4 py-3">
                        <p className="truncate font-medium">{row.beneficiaryName}</p>
                        <p className="amount truncate font-mono text-[0.7rem] text-base-content/45">
                          {row.reference} · {row.receiptNumber}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-base-content/65">
                        {accountName(row.fromAccountId)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-base-content/65">
                        {TRANSFER_SPEEDS[row.speed].label}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <TransferStatusPill status={row.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right sm:px-5">
                        <span className="amount font-mono font-medium">
                          {formatMoney(row.amountMinor, row.currency)}
                        </span>{' '}
                        <span className="text-[0.7rem] text-base-content/45">{row.currency}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Drawer
        open={selected !== null}
        onClose={() => setOpenId(null)}
        eyebrow="Receipt"
        title={selected ? selected.beneficiaryName : 'Receipt'}
        footer={
          selected ? (
            <>
              <Button variant="ghost" onClick={() => setOpenId(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                icon={<Download className="size-4" />}
                onClick={() =>
                  downloadText(
                    `nexabank-receipt-${selected.receiptNumber}.txt`,
                    receiptText(selected, selectedAccount, selectedBeneficiary),
                  )
                }
              >
                Download
              </Button>
            </>
          ) : undefined
        }
      >
        {selected ? (
          <>
            <TransferReceipt
              transfer={selected}
              account={selectedAccount}
              beneficiary={selectedBeneficiary}
            />
            <p className="mt-4 text-xs leading-relaxed text-base-content/40">
              Filed {fmtDateTime(selected.createdAt)}. Receipts are kept for seven years.
            </p>
          </>
        ) : null}
      </Drawer>
    </>
  );
}
