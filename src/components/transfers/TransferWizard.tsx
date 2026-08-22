import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Check, Download, RotateCcw, Send, ShieldCheck, UserPlus } from 'lucide-react';
import { PanelBody, PanelHeader, DetailRow } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { AmountInput, ChoiceGroup, Field, Input, Select } from '@/components/ui/Form';
import { CopyButton } from '@/components/ui/Controls';
import { OtpInput } from '@/components/ui/OtpInput';
import { Stepper, type Step } from '@/components/ui/Stepper';
import { EmptyState, InlineAlert, Skeleton } from '@/components/ui/Feedback';
import { TransferReceipt, receiptText } from '@/components/data/TransferReceipt';
import { api } from '@/mocks/api';
import { cn } from '@/lib/cn';
import {
  CURRENCIES,
  convertMinor,
  formatMoney,
  parseAmountInput,
  toMinor,
} from '@/lib/money';
import { maskAccount } from '@/lib/masking';
import { fmtDate } from '@/lib/dates';
import { downloadText } from '@/lib/csv';
import {
  ACCOUNT_TYPES,
  BENEFICIARY_KINDS,
  BENEFICIARY_KIND_KEYS,
  TRANSFER_SPEEDS,
  TRANSFER_SPEED_KEYS,
} from '@/lib/taxonomy';
import type { Account, Beneficiary, Transfer, TransferSpeed } from '@/types/domain';

const speedValues = TRANSFER_SPEED_KEYS as [TransferSpeed, ...TransferSpeed[]];

const schema = z.object({
  fromAccountId: z.string().min(1, 'Choose an account to send from'),
  beneficiaryId: z.string().min(1, 'Choose who to pay'),
  amount: z
    .string()
    .min(1, 'Enter an amount')
    .refine((raw) => parseAmountInput(raw) > 0, 'Enter an amount greater than zero'),
  speed: z.enum(speedValues),
  reference: z
    .string()
    .trim()
    .min(3, 'A reference of three characters or more helps both sides reconcile')
    .max(35, 'References are capped at 35 characters'),
  note: z.string().trim().max(140, 'Notes are capped at 140 characters'),
});

type Values = z.infer<typeof schema>;

const DEFAULTS: Values = {
  fromAccountId: '',
  beneficiaryId: '',
  amount: '',
  speed: 'standard',
  reference: '',
  note: '',
};

const STEPS: Step[] = [
  { id: 'details', label: 'Details' },
  { id: 'review', label: 'Review' },
  { id: 'verify', label: 'Verify' },
  { id: 'receipt', label: 'Receipt' },
];

/** A request from the beneficiary book to pay someone. */
export interface PayRequest {
  beneficiaryId: string;
  /** New on every click, so asking twice for the same payee still resets the form. */
  token: number;
}

/**
 * The payment flow: details, review, verify, receipt.
 *
 * Money screens quote currencies natively — the amount in what the beneficiary
 * receives, the debit in what the account holds. The display-currency selector
 * governs reporting screens; it has no business rewriting an instruction.
 */
export function TransferWizard({
  accounts,
  beneficiaries,
  loading,
  payRequest,
  onAddBeneficiary,
  onSent,
}: {
  accounts: Account[];
  beneficiaries: Beneficiary[];
  loading: boolean;
  payRequest: PayRequest | null;
  onAddBeneficiary: () => void;
  onSent: (transfer: Transfer) => void;
}) {
  const [step, setStep] = useState(0);
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Transfer | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
    mode: 'onTouched',
  });

  const values = watch();
  const account = accounts.find((item) => item.id === values.fromAccountId);
  const beneficiary = beneficiaries.find((item) => item.id === values.beneficiaryId);
  const rail = TRANSFER_SPEEDS[values.speed];

  // Everything downstream is derived from the form, so the review screen cannot
  // disagree with what was typed.
  const typed = parseAmountInput(values.amount);
  const amountMinor = beneficiary && typed > 0 ? toMinor(typed, beneficiary.currency) : 0;
  const feeMinor = account ? convertMinor(rail.feeUsdMinor, 'USD', account.currency) : 0;
  const debitMinor =
    account && beneficiary
      ? convertMinor(amountMinor, beneficiary.currency, account.currency) + feeMinor
      : 0;
  const shortfall = account ? debitMinor - account.availableMinor : 0;
  const crossCurrency = Boolean(account && beneficiary && account.currency !== beneficiary.currency);

  const settlesAt = (() => {
    const date = new Date();
    date.setDate(date.getDate() + rail.days);
    return date.toISOString();
  })();

  /** Send from the first account until told otherwise. */
  useEffect(() => {
    if (!values.fromAccountId && accounts[0]) {
      setValue('fromAccountId', accounts[0].id);
    }
  }, [accounts, values.fromAccountId, setValue]);

  /** The book asked for a payment; take the payee and start at the top. */
  useEffect(() => {
    if (!payRequest) return;
    setValue('beneficiaryId', payRequest.beneficiaryId, { shouldValidate: true });
    setReceipt(null);
    setFailure(null);
    setStep(0);
  }, [payRequest, setValue]);

  const toReview = handleSubmit(() => {
    setFailure(null);
    setStep(1);
  });

  /**
   * The code is passed in by the input on auto-submit rather than read from
   * state: `onChange` and `onComplete` fire in the same tick, so state still
   * holds five digits at that point.
   */
  const send = async (submitted?: string) => {
    const entered = submitted ?? code;
    if (!account || !beneficiary || sending || entered.length < 6) return;

    setSending(true);
    setFailure(null);
    try {
      // The code is checked before the payment is raised, not alongside it — a
      // failed check must not leave a transfer behind.
      await api.verifyOtp(entered);
      const transfer = await api.createTransfer({
        fromAccountId: account.id,
        beneficiaryId: beneficiary.id,
        amountMinor,
        currency: beneficiary.currency,
        speed: values.speed,
        reference: values.reference,
        note: values.note ? values.note : undefined,
      });
      setReceipt(transfer);
      setStep(3);
      onSent(transfer);
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : 'The payment could not be raised.',
      );
    } finally {
      setSending(false);
    }
  };

  const startAgain = () => {
    reset({ ...DEFAULTS, fromAccountId: accounts[0]?.id ?? '' });
    setCode('');
    setReceipt(null);
    setFailure(null);
    setStep(0);
  };

  const receiptAccount = receipt
    ? accounts.find((item) => item.id === receipt.fromAccountId)
    : undefined;
  const receiptBeneficiary = receipt
    ? beneficiaries.find((item) => item.id === receipt.beneficiaryId)
    : undefined;

  const favourites = beneficiaries.filter((item) => item.favourite);

  /** Native formatting with the code spelled out — this is an instruction, not a report. */
  const native = (minor: number, currency: Account['currency']) =>
    `${formatMoney(minor, currency)} ${currency}`;

  return (
    <>
      <PanelHeader
        eyebrow="New transfer"
        title={
          step === 3 ? 'Payment raised' : step === 2 ? 'Verify it is you' : 'Send money'
        }
        description={
          step === 3
            ? 'Keep the receipt number — it is how this payment is traced.'
            : 'Four steps, and nothing leaves the account until the code is checked.'
        }
      />

      <div className="border-b border-base-300 px-4 py-3.5 sm:px-5">
        <Stepper steps={STEPS} current={step} />
      </div>

      <PanelBody>
        {/* ── Step 1 · Details ── */}
        {step === 0 ? (
          loading && beneficiaries.length === 0 ? (
            <div className="space-y-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : beneficiaries.length === 0 ? (
            <EmptyState
              title="No beneficiaries yet"
              description="A payment needs somebody to pay. Add the first one and it will be saved for next time."
              icon={<UserPlus className="size-5" />}
              action={
                <Button
                  variant="primary"
                  icon={<UserPlus className="size-4" />}
                  onClick={onAddBeneficiary}
                >
                  Add a beneficiary
                </Button>
              }
            />
          ) : (
            <form onSubmit={toReview} noValidate>
              {favourites.length > 0 ? (
                <div className="mb-5">
                  <p className="eyebrow mb-2 text-base-content/45">Quick pay</p>
                  <div className="flex flex-wrap gap-2">
                    {favourites.map((item) => {
                      const active = item.id === values.beneficiaryId;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            setValue('beneficiaryId', item.id, { shouldValidate: true })
                          }
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-xs transition-colors',
                            active
                              ? 'border-primary/70 bg-primary/10 text-base-content'
                              : 'border-base-300 text-base-content/65 hover:border-base-content/25',
                          )}
                        >
                          {item.nickname ?? item.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-x-4 sm:grid-cols-2">
                <Field
                  label="From"
                  htmlFor="from-account"
                  error={errors.fromAccountId?.message}
                  hint={
                    account
                      ? `${native(account.availableMinor, account.currency)} available`
                      : undefined
                  }
                >
                  <Select
                    id="from-account"
                    invalid={Boolean(errors.fromAccountId)}
                    {...register('fromAccountId')}
                  >
                    <option value="">Choose an account</option>
                    {accounts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {ACCOUNT_TYPES[item.type]} · {maskAccount(item.number)}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="To"
                  htmlFor="to-beneficiary"
                  error={errors.beneficiaryId?.message}
                  hint={
                    beneficiary
                      ? `${beneficiary.bank} · ${maskAccount(beneficiary.accountNumber)}`
                      : undefined
                  }
                >
                  <Select
                    id="to-beneficiary"
                    invalid={Boolean(errors.beneficiaryId)}
                    {...register('beneficiaryId')}
                  >
                    <option value="">Choose who to pay</option>
                    {BENEFICIARY_KIND_KEYS.map((kind) => {
                      const group = beneficiaries.filter((item) => item.kind === kind);
                      if (group.length === 0) return null;
                      return (
                        <optgroup key={kind} label={BENEFICIARY_KINDS[kind].label}>
                          {group.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.nickname ?? item.name} · {maskAccount(item.accountNumber)} ·{' '}
                              {item.currency}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </Select>
                </Field>
              </div>

              <Field
                label={`Amount${beneficiary ? ` in ${beneficiary.currency}` : ''}`}
                htmlFor="amount"
                error={errors.amount?.message}
                hint={
                  beneficiary
                    ? `${beneficiary.nickname ?? beneficiary.name} receives ${
                        CURRENCIES[beneficiary.currency].name
                      }.`
                    : 'Pick a beneficiary and the currency follows.'
                }
              >
                <AmountInput
                  id="amount"
                  symbol={CURRENCIES[beneficiary?.currency ?? 'USD'].symbol}
                  placeholder="0.00"
                  invalid={Boolean(errors.amount)}
                  {...register('amount')}
                />
              </Field>

              <Field label="Rail" hint={rail.description}>
                <ChoiceGroup
                  name="Rail"
                  columns={3}
                  value={values.speed}
                  onChange={(next) => setValue('speed', next)}
                  options={TRANSFER_SPEED_KEYS.map((key) => ({
                    value: key,
                    label: TRANSFER_SPEEDS[key].label,
                    meta:
                      TRANSFER_SPEEDS[key].feeUsdMinor === 0
                        ? 'Free'
                        : account
                          ? formatMoney(
                              convertMinor(
                                TRANSFER_SPEEDS[key].feeUsdMinor,
                                'USD',
                                account.currency,
                              ),
                              account.currency,
                            )
                          : formatMoney(TRANSFER_SPEEDS[key].feeUsdMinor, 'USD'),
                  }))}
                />
              </Field>

              <div className="grid gap-x-4 sm:grid-cols-2">
                <Field
                  label="Reference"
                  htmlFor="reference"
                  error={errors.reference?.message}
                  hint="Shown on both statements."
                >
                  <Input
                    id="reference"
                    placeholder="INV-4417"
                    maxLength={35}
                    invalid={Boolean(errors.reference)}
                    {...register('reference')}
                  />
                </Field>

                <Field
                  label="Note"
                  htmlFor="note"
                  optional
                  error={errors.note?.message}
                  hint="For your own records only."
                >
                  <Input
                    id="note"
                    placeholder="Q3 freight, second instalment"
                    maxLength={140}
                    invalid={Boolean(errors.note)}
                    {...register('note')}
                  />
                </Field>
              </div>

              {account && beneficiary && amountMinor > 0 ? (
                <div className="mt-1 rounded-[var(--radius-box)] border border-base-300 bg-base-200/50 p-4">
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-base-content/60">They receive</dt>
                      <dd className="amount font-mono">
                        {native(amountMinor, beneficiary.currency)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-base-content/60">Fee · {rail.label.toLowerCase()}</dt>
                      <dd className="amount font-mono">
                        {feeMinor === 0 ? 'None' : native(feeMinor, account.currency)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 border-t border-[var(--rule)] pt-1.5">
                      <dt className="font-medium">Debited from {account.name}</dt>
                      <dd className="amount font-mono font-medium">
                        {native(debitMinor, account.currency)}
                      </dd>
                    </div>
                  </dl>

                  {crossCurrency ? (
                    <p className="mt-2.5 text-xs leading-relaxed text-base-content/45">
                      Converted at an indicative rate of 1 {beneficiary.currency} ={' '}
                      {(
                        CURRENCIES[account.currency].perUsd /
                        CURRENCIES[beneficiary.currency].perUsd
                      ).toFixed(4)}{' '}
                      {account.currency}. A real payment would quote a firm rate at execution.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {shortfall > 0 && account ? (
                <InlineAlert tone="warning" className="mt-4">
                  This payment is {native(shortfall, account.currency)} more than{' '}
                  {account.name} has available. Lower the amount, choose a cheaper rail, or send
                  from another account.
                </InlineAlert>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button type="submit" variant="primary" icon={<ArrowRight className="size-4" />}>
                  Review payment
                </Button>
                <Button variant="ghost" onClick={startAgain} type="button">
                  Clear
                </Button>
                <Button
                  variant="quiet"
                  type="button"
                  className="ml-auto"
                  icon={<UserPlus className="size-4" />}
                  onClick={onAddBeneficiary}
                >
                  New beneficiary
                </Button>
              </div>
            </form>
          )
        ) : null}

        {/* ── Step 2 · Review ── */}
        {step === 1 && account && beneficiary ? (
          <div>
            <div className="rounded-[var(--radius-box)] border border-base-300 bg-base-200/40 px-5 py-6 text-center">
              <p className="eyebrow text-base-content/45">You are sending</p>
              <p className="amount mt-2 font-display text-3xl leading-none sm:text-4xl">
                {formatMoney(amountMinor, beneficiary.currency)}
              </p>
              <p className="mt-2 text-sm text-base-content/60">
                {beneficiary.currency} to {beneficiary.name}
              </p>
            </div>

            <dl className="mt-5">
              <DetailRow label="From">
                {`${account.name} · ${maskAccount(account.number)}`}
              </DetailRow>
              <DetailRow label="To">
                {`${beneficiary.bank} · ${maskAccount(beneficiary.accountNumber)}`}
              </DetailRow>
              {beneficiary.swift ? (
                <DetailRow label="SWIFT / BIC">
                  <span className="amount font-mono text-xs">{beneficiary.swift}</span>
                </DetailRow>
              ) : null}
              <DetailRow label="Rail">{`${rail.label} · ${rail.description}`}</DetailRow>
              <DetailRow label="Reference">
                <span className="amount font-mono text-xs">{values.reference}</span>
              </DetailRow>
              {values.note ? <DetailRow label="Note">{values.note}</DetailRow> : null}
              <DetailRow label="Fee">
                <span className="amount font-mono text-xs">
                  {feeMinor === 0 ? 'None' : native(feeMinor, account.currency)}
                </span>
              </DetailRow>
              <DetailRow label="Total debited">
                <span className="amount font-mono text-xs font-medium">
                  {native(debitMinor, account.currency)}
                </span>
              </DetailRow>
              <DetailRow label={rail.days === 0 ? 'Settles' : 'Expected'}>
                <span className="amount font-mono text-xs">
                  {rail.days === 0 ? 'Immediately' : fmtDate(settlesAt)}
                </span>
              </DetailRow>
            </dl>

            {shortfall > 0 ? (
              <InlineAlert className="mt-4">
                {account.name} no longer has enough available for this payment. Go back and
                adjust it.
              </InlineAlert>
            ) : (
              <p className="mt-4 text-xs leading-relaxed text-base-content/45">
                Check the account number. A payment sent to the wrong account can only be
                recalled with the receiving bank's cooperation.
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button
                variant="primary"
                icon={<Send className="size-4" />}
                disabled={shortfall > 0}
                onClick={() => {
                  setCode('');
                  setFailure(null);
                  setStep(2);
                }}
              >
                Confirm and send
              </Button>
            </div>
          </div>
        ) : null}

        {/* ── Step 3 · Verify ── */}
        {step === 2 && account && beneficiary ? (
          <div>
            <div className="flex items-start gap-3 rounded-[var(--radius-box)] border border-base-300 bg-base-200/50 p-4">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Approve {formatMoney(amountMinor, beneficiary.currency)}{' '}
                  {beneficiary.currency} to {beneficiary.name}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-base-content/60">
                  We have sent a six-digit code to the number ending 4417. Nothing has left{' '}
                  {account.name} yet.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="eyebrow mb-2.5 text-base-content/55">Verification code</p>
              <OtpInput
                value={code}
                onChange={(next) => {
                  setCode(next);
                  if (failure) setFailure(null);
                }}
                onComplete={(next) => void send(next)}
                invalid={Boolean(failure)}
                disabled={sending}
              />
              <p className="mt-2.5 text-xs text-base-content/45">
                Any six digits are accepted in this demonstration build.
              </p>
            </div>

            {failure ? <InlineAlert className="mt-4">{failure}</InlineAlert> : null}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={sending}>
                Back
              </Button>
              <Button
                variant="primary"
                loading={sending}
                disabled={code.length < 6}
                icon={<Check className="size-4" />}
                onClick={() => void send()}
              >
                Verify and pay
              </Button>
              <button
                type="button"
                className="ml-auto text-xs text-primary transition-opacity hover:opacity-75"
                onClick={() => setCode('')}
              >
                Clear code
              </button>
            </div>
          </div>
        ) : null}

        {/* ── Step 4 · Receipt ── */}
        {step === 3 && receipt ? (
          <div>
            <TransferReceipt
              transfer={receipt}
              account={receiptAccount}
              beneficiary={receiptBeneficiary}
            />

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                icon={<Download className="size-4" />}
                onClick={() =>
                  downloadText(
                    `nexabank-receipt-${receipt.receiptNumber}.txt`,
                    receiptText(receipt, receiptAccount, receiptBeneficiary),
                  )
                }
              >
                Download receipt
              </Button>
              <CopyButton value={receipt.receiptNumber} label="Copy receipt number" />
              <Button
                variant="primary"
                className="ml-auto"
                icon={<RotateCcw className="size-4" />}
                onClick={startAgain}
              >
                Make another payment
              </Button>
            </div>
          </div>
        ) : null}

        {/* A step that lost its account or payee — recoverable, so say so plainly. */}
        {(step === 1 || step === 2) && (!account || !beneficiary) ? (
          <InlineAlert>
            The account or beneficiary for this payment is no longer available.{' '}
            <button type="button" className="underline" onClick={startAgain}>
              Start again
            </button>
            .
          </InlineAlert>
        ) : null}
      </PanelBody>
    </>
  );
}
