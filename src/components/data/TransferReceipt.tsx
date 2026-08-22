import { Rosette } from '@/components/brand/Guilloche';
import { DetailRow } from '@/components/ui/Panel';
import { TransferStatusPill } from '@/components/ui/Badge';
import { convertMinor, formatMoney } from '@/lib/money';
import { fmtDate, fmtDateTime } from '@/lib/dates';
import { maskAccount } from '@/lib/masking';
import { TRANSFER_SPEEDS } from '@/lib/taxonomy';
import type { Account, Beneficiary, Transfer } from '@/types/domain';

/** A stable number from an id, so the engraving never changes between renders. */
const seedOf = (value: string) =>
  [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) % 100_000, 7);

/**
 * A receipt is a record, so every figure on it stays in the currency the payment
 * was made in. The display-currency selector deliberately does not reach in here
 * — a document that reads differently depending on a dropdown is not a receipt.
 */
export function TransferReceipt({
  transfer,
  account,
  beneficiary,
}: {
  transfer: Transfer;
  account?: Account;
  beneficiary?: Beneficiary;
}) {
  const rail = TRANSFER_SPEEDS[transfer.speed];
  const total = transfer.amountMinor + transfer.feeMinor;
  const debit = account ? convertMinor(total, transfer.currency, account.currency) : null;

  return (
    <div>
      <div className="ledger-lines relative overflow-hidden rounded-[var(--radius-box)] border border-base-300 bg-base-200/40 px-5 py-6 text-center">
        <Rosette
          seed={seedOf(transfer.id)}
          className="absolute -right-12 -top-12 size-44 text-base-content/[0.07]"
        />
        <div className="relative">
          <p className="eyebrow text-base-content/45">Payment receipt</p>
          <p className="amount mt-2 font-mono text-xs text-base-content/55">
            {transfer.receiptNumber}
          </p>
          <p className="amount mt-4 font-display text-3xl leading-none sm:text-4xl">
            {formatMoney(transfer.amountMinor, transfer.currency)}
          </p>
          <p className="mt-2 text-sm text-base-content/60">
            {transfer.currency} to {transfer.beneficiaryName}
          </p>
          <div className="mt-4 flex justify-center">
            <TransferStatusPill status={transfer.status} />
          </div>
        </div>
      </div>

      <dl className="mt-5">
        <DetailRow label="From">
          {account ? `${account.name} · ${maskAccount(account.number)}` : '—'}
        </DetailRow>
        <DetailRow label="To">
          {beneficiary
            ? `${beneficiary.bank} · ${maskAccount(beneficiary.accountNumber)}`
            : transfer.beneficiaryName}
        </DetailRow>
        {beneficiary?.swift ? (
          <DetailRow label="SWIFT / BIC">
            <span className="amount font-mono text-xs">{beneficiary.swift}</span>
          </DetailRow>
        ) : null}
        <DetailRow label="Reference">
          <span className="amount font-mono text-xs">{transfer.reference}</span>
        </DetailRow>
        {transfer.note ? <DetailRow label="Note">{transfer.note}</DetailRow> : null}
        <DetailRow label="Rail">{`${rail.label} · ${rail.description}`}</DetailRow>
        <DetailRow label="Amount">
          <span className="amount font-mono text-xs">
            {formatMoney(transfer.amountMinor, transfer.currency)} {transfer.currency}
          </span>
        </DetailRow>
        <DetailRow label="Fee">
          <span className="amount font-mono text-xs">
            {transfer.feeMinor === 0
              ? 'None'
              : `${formatMoney(transfer.feeMinor, transfer.currency)} ${transfer.currency}`}
          </span>
        </DetailRow>
        <DetailRow label="Total debited">
          <span className="amount font-mono text-xs font-medium">
            {debit !== null && account
              ? `${formatMoney(debit, account.currency)} ${account.currency}`
              : `${formatMoney(total, transfer.currency)} ${transfer.currency}`}
          </span>
        </DetailRow>
        <DetailRow label="Raised">
          <span className="amount font-mono text-xs">{fmtDateTime(transfer.createdAt)}</span>
        </DetailRow>
        <DetailRow label={transfer.status === 'completed' ? 'Settled' : 'Expected'}>
          <span className="amount font-mono text-xs">{fmtDate(transfer.settlesAt)}</span>
        </DetailRow>
      </dl>
    </div>
  );
}

/** The same receipt as plain text, for the download. */
export function receiptText(
  transfer: Transfer,
  account?: Account,
  beneficiary?: Beneficiary,
): string {
  const rail = TRANSFER_SPEEDS[transfer.speed];
  const total = transfer.amountMinor + transfer.feeMinor;
  const line = (label: string, value: string) => `${label.padEnd(18)}${value}`;

  return [
    'NEXABANK — PAYMENT RECEIPT',
    '==========================',
    '',
    line('Receipt', transfer.receiptNumber),
    line('Status', transfer.status),
    line('Raised', fmtDateTime(transfer.createdAt)),
    line(transfer.status === 'completed' ? 'Settled' : 'Expected', fmtDate(transfer.settlesAt)),
    '',
    line('From', account ? `${account.name} (${maskAccount(account.number)})` : '—'),
    line('To', transfer.beneficiaryName),
    line('Bank', beneficiary ? beneficiary.bank : '—'),
    line('Account', beneficiary ? maskAccount(beneficiary.accountNumber) : '—'),
    ...(beneficiary?.swift ? [line('SWIFT / BIC', beneficiary.swift)] : []),
    '',
    line('Reference', transfer.reference),
    ...(transfer.note ? [line('Note', transfer.note)] : []),
    line('Rail', `${rail.label} — ${rail.description}`),
    '',
    line('Amount', `${formatMoney(transfer.amountMinor, transfer.currency)} ${transfer.currency}`),
    line('Fee', `${formatMoney(transfer.feeMinor, transfer.currency)} ${transfer.currency}`),
    line('Total', `${formatMoney(total, transfer.currency)} ${transfer.currency}`),
    '',
    'This document was produced by a demonstration build of NexaBank.',
    'No money moved. No account exists.',
    '',
  ].join('\n');
}
