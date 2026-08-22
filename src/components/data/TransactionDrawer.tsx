import { Landmark, MapPin, StickyNote } from 'lucide-react';
import { Drawer } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/Controls';
import { StatusPill } from '@/components/ui/Badge';
import { DetailRow } from '@/components/ui/Panel';
import { Rosette } from '@/components/brand/Guilloche';
import { useCurrency } from '@/providers/CurrencyProvider';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';
import { fmtDateTime } from '@/lib/dates';
import { CATEGORIES, CHANNELS, PAYMENT_METHODS, TRANSACTION_STATUSES, TRANSACTION_TYPES } from '@/lib/taxonomy';
import type { Transaction } from '@/types/domain';

/**
 * One record, in full.
 *
 * Opens beside the ledger rather than on a page of its own, so closing it puts
 * you back exactly where you were in a list you may have scrolled a long way
 * down. The amount is stated in the account's own currency as well as the
 * display one whenever those differ — a converted figure is an estimate, and
 * the statement figure is the fact.
 */
export function TransactionDrawer({
  transaction,
  onClose,
  accountName,
}: {
  transaction: Transaction | null;
  onClose: () => void;
  accountName?: (accountId: string) => string;
}) {
  const { money, currency, rateNote } = useCurrency();

  // Nothing selected: render nothing at all rather than an empty overlay.
  if (!transaction) return null;

  const credit = transaction.direction === 'credit';
  const category = CATEGORIES[transaction.category];
  const signedMinor = credit ? transaction.amountMinor : -transaction.amountMinor;
  const note = rateNote(transaction.currency);

  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow={credit ? 'Money in' : 'Money out'}
      title={transaction.counterparty}
      footer={
        <>
          <CopyButton value={transaction.id} label="Copy ID" />
          <Button variant="quiet" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {/* Amount plate */}
      <div className="panel relative overflow-hidden p-5">
        <Rosette
          seed={transaction.amountMinor + transaction.id.length * 977}
          className="pointer-events-none absolute -right-16 -top-16 size-56 text-base-content/[0.06]"
        />
        <div className="relative">
          <p className="eyebrow text-base-content/45">Amount</p>
          <p
            className={cn(
              'amount mt-2 font-mono text-3xl leading-none tracking-tight',
              credit ? 'text-success' : 'text-base-content',
            )}
          >
            {money(signedMinor, transaction.currency, { signed: credit })}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusPill status={transaction.status} />
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-base-300 px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-base-content/70"
              style={{ borderColor: `${category.color}55` }}
            >
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.label}
            </span>
          </div>

          {transaction.currency !== currency ? (
            <p className="amount mt-3 font-mono text-xs text-base-content/45">
              Booked as {formatMoney(transaction.amountMinor, transaction.currency)}{' '}
              {transaction.currency}
              {note ? ` · ${note}` : ''}
            </p>
          ) : null}

          <p className="mt-3 text-sm leading-relaxed text-base-content/60">
            {TRANSACTION_STATUSES[transaction.status].hint}
          </p>
        </div>
      </div>

      {/* Record */}
      <dl className="mt-5">
        <DetailRow label="Description">{transaction.description}</DetailRow>
        <DetailRow label="Date and time">
          <span className="amount font-mono text-xs">{fmtDateTime(transaction.date)}</span>
        </DetailRow>
        <DetailRow label="Reference">
          <span className="amount font-mono text-xs">{transaction.reference}</span>
        </DetailRow>
        <DetailRow label="Transaction ID">
          <span className="amount font-mono text-xs">{transaction.id}</span>
        </DetailRow>
        <DetailRow label="Type">{TRANSACTION_TYPES[transaction.type]}</DetailRow>
        <DetailRow label="Method">{PAYMENT_METHODS[transaction.method]}</DetailRow>
        <DetailRow label="Channel">{CHANNELS[transaction.channel]}</DetailRow>
        {accountName ? (
          <DetailRow label="Account">
            <span className="inline-flex items-center gap-1.5">
              <Landmark className="size-3.5 text-base-content/40" />
              {accountName(transaction.accountId)}
            </span>
          </DetailRow>
        ) : null}
        <DetailRow label="Fee">
          <span className="amount font-mono text-xs">
            {transaction.feeMinor > 0
              ? money(transaction.feeMinor, transaction.currency)
              : 'None'}
          </span>
        </DetailRow>
        <DetailRow label="Balance after">
          <span className="amount font-mono text-xs">
            {transaction.status === 'settled'
              ? money(transaction.balanceAfterMinor, transaction.currency)
              : 'Not yet posted'}
          </span>
        </DetailRow>
        {transaction.location ? (
          <DetailRow label="Location">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-base-content/40" />
              {transaction.location}
            </span>
          </DetailRow>
        ) : null}
      </dl>

      {transaction.note ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-[var(--radius-box)] border border-base-300 bg-base-200/50 px-3.5 py-3">
          <StickyNote className="mt-0.5 size-4 shrink-0 text-base-content/40" />
          <p className="text-sm leading-relaxed text-base-content/70">{transaction.note}</p>
        </div>
      ) : null}
    </Drawer>
  );
}
