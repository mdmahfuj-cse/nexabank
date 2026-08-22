import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Plus,
  Receipt,
  SlidersHorizontal,
  Snowflake,
  Unlock,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DetailRow, Panel, PanelBody, PanelHeader } from '@/components/ui/Panel';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AmountInput, Field, Input, Select, Toggle } from '@/components/ui/Form';
import { CopyButton, Progress } from '@/components/ui/Controls';
import { Dialog } from '@/components/ui/Overlay';
import { Pagination } from '@/components/ui/Table';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '@/components/ui/Feedback';
import { StatGrid, StatTile } from '@/components/data/StatTile';
import { TransactionLedger } from '@/components/data/TransactionLedger';
import { TransactionDrawer } from '@/components/data/TransactionDrawer';
import { CardFace } from '@/components/brand/CardFace';
import { AmountRoll } from '@/components/brand/AmountRoll';
import { SpendBars } from '@/components/charts/SpendBars';
import { useApi } from '@/hooks/useApi';
import { useCurrency } from '@/providers/CurrencyProvider';
import { useToast } from '@/providers/ToastProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { api } from '@/mocks/api';
import { cn } from '@/lib/cn';
import {
  CURRENCIES,
  convertMinor,
  formatMoney,
  parseAmountInput,
  toMajor,
  toMinor,
} from '@/lib/money';
import { maskAccount, maskPan } from '@/lib/masking';
import { fmtDate, fmtMonth, lastMonths, monthKey } from '@/lib/dates';
import type { BankCard, SeriesPoint, Transaction } from '@/types/domain';

/** Which mutation is in flight, so only the button that started it spins. */
type Busy = 'freeze' | 'limits' | 'issue' | null;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again in a moment.';

/** Card details reveal themselves for twenty seconds and then hide again. */
const REVEAL_MS = 20_000;

/** How many card payments the ledger shows at a time. */
const LEDGER_PAGE_SIZE = 6;

/**
 * Cards.
 *
 * The plates come first, because that is how people identify a card — by the
 * thing in their wallet, not by a row in a table. Everything below the carousel
 * belongs to whichever plate is selected: its details, its limits, its controls,
 * its payments. Numbers stay masked until asked for, and the reveal expires on
 * its own so a screen left open does not keep a PAN on it.
 */
export default function Cards() {
  const { money } = useCurrency();
  const toast = useToast();
  const confirm = useConfirm();

  const accounts = useApi(() => api.getAccounts(), []);
  const cards = useApi(() => api.getCards(), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const list = cards.data ?? [];
  // Selection falls back to the first card rather than being synced in an
  // effect, so there is no frame where a loaded wallet has nothing selected.
  const card = list.find((item) => item.id === selectedId) ?? list[0];
  const cardId = card?.id;

  const plates = useRef(new Map<string, HTMLDivElement>());

  const select = (id: string) => {
    setSelectedId(id);
    plates.current.get(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  };

  const step = (delta: number) => {
    const index = list.findIndex((item) => item.id === cardId);
    const next = list[Math.min(Math.max(index + delta, 0), list.length - 1)];
    if (next && next.id !== cardId) select(next.id);
  };

  // A different card is a different question: hide the digits, start again at
  // the first page of its payments.
  useEffect(() => {
    setRevealed(false);
    setLedgerPage(1);
  }, [cardId]);

  useEffect(() => {
    if (!revealed) return;
    const timer = window.setTimeout(() => setRevealed(false), REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [revealed]);

  const ledger = useApi(
    () =>
      api.getTransactions({
        cardId,
        page: ledgerPage,
        pageSize: LEDGER_PAGE_SIZE,
        sortBy: 'date',
        sortDirection: 'desc',
      }),
    [cardId, ledgerPage],
    { enabled: Boolean(cardId) },
  );

  /** The card's whole history, for the spend bars. */
  const history = useApi(
    () => api.getTransactions({ cardId, pageSize: 2_000, sortBy: 'date', sortDirection: 'asc' }),
    [cardId],
    { enabled: Boolean(cardId) },
  );

  const spend = useMemo<SeriesPoint[]>(() => {
    const rows = history.data?.rows ?? [];
    return lastMonths(6).map((month) => {
      const key = monthKey(month.toISOString());
      const value = rows
        .filter(
          (transaction) =>
            transaction.direction === 'debit' &&
            transaction.status !== 'failed' &&
            monthKey(transaction.date) === key,
        )
        .reduce(
          (total, transaction) =>
            total +
            convertMinor(
              transaction.amountMinor + transaction.feeMinor,
              transaction.currency,
              'USD',
            ),
          0,
        );
      return { label: fmtMonth(month.toISOString()).slice(0, 3), value };
    });
  }, [history.data]);

  /** Wallet-wide figures, normalised to USD so mixed-currency cards can add up. */
  const totals = useMemo(() => {
    const spent = list.reduce(
      (sum, item) => sum + convertMinor(item.spentThisMonthMinor, item.currency, 'USD'),
      0,
    );
    const limit = list.reduce(
      (sum, item) => sum + convertMinor(item.monthlyLimitMinor, item.currency, 'USD'),
      0,
    );
    return {
      spent,
      limit,
      remaining: Math.max(limit - spent, 0),
      utilisation: limit > 0 ? (spent / limit) * 100 : 0,
      frozen: list.filter((item) => item.frozen).length,
      virtual: list.filter((item) => item.variant === 'virtual').length,
      count: list.length,
    };
  }, [list]);

  const fundingAccount = (accounts.data ?? []).find((item) => item.id === card?.accountId);

  /* ─────────────────────────── Mutations ─────────────────────────── */

  /** Write a server response straight into the cache; no refetch needed. */
  const replaceCard = (next: BankCard) =>
    cards.setData((cards.data ?? []).map((item) => (item.id === next.id ? next : item)));

  const toggleFreeze = async () => {
    if (!card) return;
    const freeze = !card.frozen;

    const confirmed = await confirm(
      freeze
        ? {
            title: `Freeze ${card.label}?`,
            description:
              'Every payment on this card will be declined until you unfreeze it. Standing orders and subscriptions resume where they left off.',
            confirmLabel: 'Freeze card',
          }
        : {
            title: `Unfreeze ${card.label}?`,
            description: 'The card will start authorising payments again immediately.',
            confirmLabel: 'Unfreeze card',
          },
    );
    if (!confirmed) return;

    setBusy('freeze');
    try {
      replaceCard(await api.setCardFrozen(card.id, freeze));
      if (freeze) {
        toast.warning('Card frozen', `${card.label} will decline payments until you unfreeze it.`);
      } else {
        toast.success('Card unfrozen', `${card.label} can be used again.`);
      }
    } catch (error) {
      toast.error('The card did not change', errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  /**
   * Controls flip on screen first and roll back if the call fails. A switch that
   * waits half a second before moving feels broken, so it moves now and tells
   * the truth later.
   */
  const setControls = async (
    patch: Partial<Pick<BankCard, 'contactless' | 'onlinePayments' | 'atmWithdrawals'>>,
  ) => {
    if (!card) return;
    const previous = card;
    replaceCard({ ...card, ...patch });

    try {
      replaceCard(await api.updateCardControls(card.id, patch));
    } catch (error) {
      replaceCard(previous);
      toast.error('That control did not change', errorMessage(error));
    }
  };

  /* ───────────────────────── Limits dialog ───────────────────────── */

  const [limitsOpen, setLimitsOpen] = useState(false);
  const [monthlyInput, setMonthlyInput] = useState('');
  const [perInput, setPerInput] = useState('');
  const [limitError, setLimitError] = useState<string | null>(null);

  const openLimits = () => {
    if (!card) return;
    setMonthlyInput(String(toMajor(card.monthlyLimitMinor, card.currency)));
    setPerInput(String(toMajor(card.perTransactionLimitMinor, card.currency)));
    setLimitError(null);
    setLimitsOpen(true);
  };

  const saveLimits = async () => {
    if (!card) return;

    const monthly = parseAmountInput(monthlyInput);
    const per = parseAmountInput(perInput);

    if (!Number.isFinite(monthly) || monthly <= 0) {
      setLimitError('Enter a monthly limit greater than zero.');
      return;
    }
    if (!Number.isFinite(per) || per <= 0) {
      setLimitError('Enter a per-transaction limit greater than zero.');
      return;
    }

    const monthlyLimitMinor = toMinor(monthly, card.currency);
    const perTransactionLimitMinor = toMinor(per, card.currency);

    if (perTransactionLimitMinor > monthlyLimitMinor) {
      setLimitError('A single payment cannot be allowed to exceed the whole month.');
      return;
    }
    // The API enforces this too; catching it here saves a round trip and a
    // dialog that flashes an error after the fact.
    if (monthlyLimitMinor < card.spentThisMonthMinor) {
      setLimitError(
        `This card has already spent ${formatMoney(card.spentThisMonthMinor, card.currency)} ${
          card.currency
        } this month.`,
      );
      return;
    }

    setBusy('limits');
    try {
      replaceCard(
        await api.updateCardLimits(card.id, { monthlyLimitMinor, perTransactionLimitMinor }),
      );
      setLimitsOpen(false);
      toast.success(
        'Limits updated',
        `${card.label} now allows ${formatMoney(monthlyLimitMinor, card.currency)} ${
          card.currency
        } a month.`,
      );
    } catch (error) {
      setLimitError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  /* ──────────────────── Issue a virtual card ──────────────────── */

  const [issueOpen, setIssueOpen] = useState(false);
  const [issueLabel, setIssueLabel] = useState('');
  const [issueAccountId, setIssueAccountId] = useState('');
  const [issueLimitInput, setIssueLimitInput] = useState('2500');
  const [issueError, setIssueError] = useState<string | null>(null);

  const openIssue = () => {
    setIssueLabel('');
    setIssueAccountId(accounts.data?.[0]?.id ?? '');
    setIssueLimitInput('2500');
    setIssueError(null);
    setIssueOpen(true);
  };

  const issueCard = async () => {
    const account = (accounts.data ?? []).find((item) => item.id === issueAccountId);

    if (!issueLabel.trim()) {
      setIssueError('Give the card a name you will recognise on a statement.');
      return;
    }
    if (!account) {
      setIssueError('Choose an account to fund the card from.');
      return;
    }

    const limit = parseAmountInput(issueLimitInput);
    if (!Number.isFinite(limit) || limit <= 0) {
      setIssueError('Set a monthly limit greater than zero.');
      return;
    }

    setBusy('issue');
    try {
      const issued = await api.issueVirtualCard({
        label: issueLabel.trim(),
        accountId: account.id,
        monthlyLimitMinor: toMinor(limit, account.currency),
      });
      cards.setData([...(cards.data ?? []), issued]);
      setSelectedId(issued.id);
      setIssueOpen(false);
      toast.success('Virtual card issued', `${issued.label} · ${maskPan(issued.pan)}`);
    } catch (error) {
      setIssueError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  /* ─────────────────────────── Render ─────────────────────────── */

  const index = list.findIndex((item) => item.id === cardId);

  return (
    <>
      <PageHeader
        eyebrow="Cards"
        title="Cards"
        description="Physical and virtual cards on the account, with the controls a real portal would put behind them."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={openIssue}>
            Issue virtual card
          </Button>
        }
      />

      <StatGrid className="mb-4">
        <StatTile
          label="Cards on account"
          loading={cards.initialLoading}
          icon={<CreditCard className="size-4" />}
          value={totals.count.toLocaleString('en-US')}
          hint={`${totals.virtual} virtual · ${totals.count - totals.virtual} physical`}
        />
        <StatTile
          label="Spent this month"
          loading={cards.initialLoading}
          icon={<Receipt className="size-4" />}
          value={<AmountRoll minor={totals.spent} />}
          hint={`${totals.utilisation.toFixed(0)}% of the combined limit`}
        />
        <StatTile
          label="Left to spend"
          loading={cards.initialLoading}
          icon={<Wallet className="size-4" />}
          value={<AmountRoll minor={totals.remaining} />}
          hint={`of ${money(totals.limit)} allowed across all cards`}
        />
        <StatTile
          label="Frozen"
          loading={cards.initialLoading}
          icon={<Snowflake className="size-4" />}
          value={totals.frozen.toLocaleString('en-US')}
          hint={
            totals.frozen === 0
              ? 'Every card is live and authorising payments.'
              : 'Frozen cards decline everything, online and in person.'
          }
        />
      </StatGrid>

      {/* The wallet */}
      <Panel className="mb-4">
        <PanelHeader
          eyebrow="Wallet"
          title="Your cards"
          description="Select a plate to work on it."
          actions={
            list.length > 1 ? (
              <div className="flex items-center gap-1">
                <IconButton
                  label="Previous card"
                  variant="outline"
                  disabled={index <= 0}
                  onClick={() => step(-1)}
                >
                  <ChevronLeft className="size-4" />
                </IconButton>
                <p className="amount px-1 font-mono text-xs text-base-content/55">
                  {index + 1}
                  <span className="text-base-content/30"> / {list.length}</span>
                </p>
                <IconButton
                  label="Next card"
                  variant="outline"
                  disabled={index >= list.length - 1}
                  onClick={() => step(1)}
                >
                  <ChevronRight className="size-4" />
                </IconButton>
              </div>
            ) : null
          }
        />
        <PanelBody flush>
          {cards.error && list.length === 0 ? (
            <ErrorState title="Your cards did not load" error={cards.error} onRetry={cards.refetch} />
          ) : cards.initialLoading ? (
            <div className="flex gap-4 px-4 py-5 sm:px-5">
              {[0, 1, 2].map((placeholder) => (
                <Skeleton
                  key={placeholder}
                  className="aspect-[1.586/1] w-[17.5rem] shrink-0 rounded-[1.15rem] sm:w-[20rem]"
                />
              ))}
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              title="No cards yet"
              description="Issue a virtual card and it will appear here immediately."
              icon={<CreditCard className="size-5" />}
              action={
                <Button variant="primary" icon={<Plus className="size-4" />} onClick={openIssue}>
                  Issue virtual card
                </Button>
              }
            />
          ) : (
            <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 py-5 sm:px-5">
              {list.map((item) => {
                const active = item.id === cardId;
                return (
                  <div
                    key={item.id}
                    ref={(node) => {
                      if (node) plates.current.set(item.id, node);
                      else plates.current.delete(item.id);
                    }}
                    className="w-[17.5rem] shrink-0 snap-center sm:w-[20rem]"
                  >
                    <button
                      type="button"
                      onClick={() => select(item.id)}
                      aria-pressed={active}
                      aria-label={`${item.label}, ending ${item.last4}`}
                      className={cn(
                        'block w-full rounded-[1.15rem] transition-all duration-300',
                        active
                          ? 'ring-2 ring-primary/70 ring-offset-2 ring-offset-base-100'
                          : 'opacity-55 hover:opacity-85',
                      )}
                    >
                      <CardFace card={item} revealed={active && revealed} size="sm" />
                    </button>

                    <div className="mt-2.5 flex items-baseline justify-between gap-3 px-1">
                      <p className="min-w-0 truncate text-xs text-base-content/60">{item.label}</p>
                      <p className="amount shrink-0 font-mono text-xs text-base-content/45">
                        {money(item.spentThisMonthMinor, item.currency, { compact: true })} /{' '}
                        {money(item.monthlyLimitMinor, item.currency, { compact: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PanelBody>
      </Panel>

      {card ? (
        <>
          {/* Detail and controls */}
          <div className="mb-4 grid gap-4 xl:grid-cols-3">
            <Panel className="xl:col-span-2">
              <PanelHeader
                eyebrow={card.variant === 'virtual' ? 'Virtual card' : 'Physical card'}
                title={card.label}
                actions={
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={
                        revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />
                      }
                      onClick={() => setRevealed((value) => !value)}
                    >
                      {revealed ? 'Hide' : 'Reveal'}
                    </Button>
                    <CopyButton value={card.pan} label="Copy number" className="ml-1" />
                  </>
                }
              />
              <PanelBody>
                <div className="grid gap-6 sm:grid-cols-2">
                  <dl>
                    <DetailRow label="Status">
                      {card.frozen ? (
                        <Badge tone="warning">Frozen</Badge>
                      ) : (
                        <Badge tone="success">Active</Badge>
                      )}
                    </DetailRow>
                    <DetailRow label="Card number">
                      <span className="amount font-mono text-xs tracking-wider">
                        {revealed ? card.pan : maskPan(card.pan)}
                      </span>
                    </DetailRow>
                    <DetailRow label="Expires">
                      <span className="amount font-mono text-xs">{card.expiry}</span>
                    </DetailRow>
                    <DetailRow label="Security code">
                      <span className="amount font-mono text-xs">
                        {revealed ? card.cvv : '•••'}
                      </span>
                    </DetailRow>
                    <DetailRow label="Cardholder">{card.holder}</DetailRow>
                    <DetailRow label="Funding account">
                      {fundingAccount
                        ? `${fundingAccount.name} · ${maskAccount(fundingAccount.number)}`
                        : '—'}
                    </DetailRow>
                    <DetailRow label="Currency">{card.currency}</DetailRow>
                    <DetailRow label="Issued">
                      <span className="amount font-mono text-xs">{fmtDate(card.createdAt)}</span>
                    </DetailRow>
                  </dl>

                  <div className="flex flex-col gap-5">
                    <Progress
                      value={card.spentThisMonthMinor}
                      max={card.monthlyLimitMinor}
                      label="Spent this month"
                      caption={`${money(card.spentThisMonthMinor, card.currency)} of ${money(
                        card.monthlyLimitMinor,
                        card.currency,
                      )}`}
                    />

                    <dl>
                      <DetailRow label="Monthly limit">
                        <span className="amount font-mono text-xs">
                          {money(card.monthlyLimitMinor, card.currency)}
                        </span>
                      </DetailRow>
                      <DetailRow label="Per transaction">
                        <span className="amount font-mono text-xs">
                          {money(card.perTransactionLimitMinor, card.currency)}
                        </span>
                      </DetailRow>
                      <DetailRow label="Remaining">
                        <span className="amount font-mono text-xs">
                          {money(
                            Math.max(card.monthlyLimitMinor - card.spentThisMonthMinor, 0),
                            card.currency,
                          )}
                        </span>
                      </DetailRow>
                    </dl>

                    <Button
                      size="sm"
                      variant="outline"
                      className="self-start"
                      icon={<SlidersHorizontal className="size-3.5" />}
                      onClick={openLimits}
                    >
                      Adjust limits
                    </Button>

                    {revealed ? (
                      <p className="text-xs leading-relaxed text-base-content/45">
                        Full details hide themselves again after twenty seconds.
                      </p>
                    ) : null}
                  </div>
                </div>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                eyebrow="Controls"
                title="What this card can do"
                description="Changes apply the moment you make them."
              />
              <PanelBody>
                <div className="space-y-1">
                  <Toggle
                    checked={card.contactless}
                    onChange={(next) => setControls({ contactless: next })}
                    label="Contactless"
                    description="Tap to pay at terminals."
                    disabled={card.frozen || card.variant === 'virtual'}
                  />
                  <Toggle
                    checked={card.onlinePayments}
                    onChange={(next) => setControls({ onlinePayments: next })}
                    label="Online payments"
                    description="Card-not-present purchases and subscriptions."
                    disabled={card.frozen}
                  />
                  <Toggle
                    checked={card.atmWithdrawals}
                    onChange={(next) => setControls({ atmWithdrawals: next })}
                    label="ATM withdrawals"
                    description="Cash machines, at home and abroad."
                    disabled={card.frozen || card.variant === 'virtual'}
                  />
                </div>

                {card.variant === 'virtual' ? (
                  <p className="mt-3 text-xs leading-relaxed text-base-content/45">
                    Virtual cards exist online only, so contactless and ATM access stay off.
                  </p>
                ) : null}

                <div
                  className={cn(
                    'mt-5 flex items-start gap-3 rounded-[var(--radius-box)] border p-3.5',
                    card.frozen
                      ? 'border-warning/30 bg-warning/10'
                      : 'border-base-300 bg-base-200/50',
                  )}
                >
                  <Snowflake
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      card.frozen ? 'text-warning' : 'text-base-content/40',
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {card.frozen ? 'This card is frozen' : 'Freeze this card'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-base-content/60">
                      {card.frozen
                        ? 'Payments are being declined. Nothing else about the card has changed — the number and limits are intact.'
                        : 'Stops every payment at once, without cancelling the card. Reversible whenever you like.'}
                    </p>
                    <Button
                      className="mt-3"
                      size="sm"
                      variant={card.frozen ? 'primary' : 'outline'}
                      loading={busy === 'freeze'}
                      icon={
                        card.frozen ? (
                          <Unlock className="size-3.5" />
                        ) : (
                          <Snowflake className="size-3.5" />
                        )
                      }
                      onClick={toggleFreeze}
                    >
                      {card.frozen ? 'Unfreeze card' : 'Freeze card'}
                    </Button>
                  </div>
                </div>
              </PanelBody>
            </Panel>
          </div>

          {/* Spend and payments */}
          <div className="grid gap-4 xl:grid-cols-3">
            <Panel>
              <PanelHeader
                eyebrow="Spend"
                title="Last six months"
                description="Settled and pending card payments, month by month."
              />
              <PanelBody>
                <SpendBars
                  data={spend}
                  loading={history.initialLoading}
                  error={history.error}
                  onRetry={history.refetch}
                  height={224}
                />
              </PanelBody>
            </Panel>

            <Panel className="xl:col-span-2">
              <PanelHeader
                eyebrow="Activity"
                title="Card payments"
                actions={
                  ledger.data ? (
                    <p className="amount font-mono text-sm text-base-content/45">
                      {ledger.data.total.toLocaleString('en-US')}
                    </p>
                  ) : null
                }
              />
              <PanelBody flush>
                <div
                  className={cn(
                    'transition-opacity duration-200',
                    ledger.loading && !ledger.initialLoading && 'opacity-55',
                  )}
                >
                  <TransactionLedger
                    rows={ledger.data?.rows ?? []}
                    loading={ledger.initialLoading}
                    error={ledger.error}
                    onRetry={ledger.refetch}
                    onSelect={setSelectedTransaction}
                    skeletonRows={LEDGER_PAGE_SIZE}
                    empty={
                      <EmptyState
                        title="Nothing on this card yet"
                        description="Card payments appear here as soon as the first one is authorised."
                        icon={<CreditCard className="size-5" />}
                      />
                    }
                  />
                </div>
              </PanelBody>

              {ledger.data && ledger.data.total > 0 ? (
                <Pagination
                  page={ledger.data.page}
                  pageCount={ledger.data.pageCount}
                  total={ledger.data.total}
                  pageSize={ledger.data.pageSize}
                  onPage={setLedgerPage}
                  noun="card payments"
                />
              ) : null}
            </Panel>
          </div>

          {/* Limits */}
          <Dialog
            open={limitsOpen}
            onClose={() => setLimitsOpen(false)}
            title="Spending limits"
            description={`Both limits are set in ${CURRENCIES[card.currency].name.toLowerCase()}, the card's own currency.`}
            footer={
              <>
                <Button variant="ghost" onClick={() => setLimitsOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" loading={busy === 'limits'} onClick={saveLimits}>
                  Save limits
                </Button>
              </>
            }
          >
            <div className="space-y-1">
              <Field
                label="Monthly limit"
                htmlFor="limit-monthly"
                hint={`Spent so far this month: ${formatMoney(
                  card.spentThisMonthMinor,
                  card.currency,
                )} ${card.currency}`}
              >
                <AmountInput
                  id="limit-monthly"
                  symbol={CURRENCIES[card.currency].symbol}
                  value={monthlyInput}
                  onChange={(event) => setMonthlyInput(event.target.value)}
                />
              </Field>

              <Field
                label="Per transaction"
                htmlFor="limit-per"
                hint="The largest single payment this card will authorise."
              >
                <AmountInput
                  id="limit-per"
                  symbol={CURRENCIES[card.currency].symbol}
                  value={perInput}
                  onChange={(event) => setPerInput(event.target.value)}
                />
              </Field>

              {limitError ? <InlineAlert>{limitError}</InlineAlert> : null}
            </div>
          </Dialog>
        </>
      ) : null}

      {/* Issue */}
      <Dialog
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title="Issue a virtual card"
        description="Virtual cards are made for one merchant or one subscription. Freeze or delete it and nothing else on the account is affected."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIssueOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy === 'issue'} onClick={issueCard}>
              Issue card
            </Button>
          </>
        }
      >
        <div className="space-y-1">
          <Field
            label="Card name"
            htmlFor="issue-label"
            hint="This is what you will see next to the payments."
          >
            <Input
              id="issue-label"
              value={issueLabel}
              placeholder="Cloud infrastructure"
              maxLength={32}
              onChange={(event) => setIssueLabel(event.target.value)}
            />
          </Field>

          <Field label="Funded from" htmlFor="issue-account">
            <Select
              id="issue-account"
              value={issueAccountId}
              onChange={(event) => setIssueAccountId(event.target.value)}
            >
              {(accounts.data ?? []).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {maskAccount(account.number)} · {account.currency}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Monthly limit"
            htmlFor="issue-limit"
            hint="Per-transaction cap is set to a quarter of this, and can be changed afterwards."
          >
            <AmountInput
              id="issue-limit"
              symbol={
                CURRENCIES[
                  (accounts.data ?? []).find((account) => account.id === issueAccountId)
                    ?.currency ?? 'USD'
                ].symbol
              }
              value={issueLimitInput}
              onChange={(event) => setIssueLimitInput(event.target.value)}
            />
          </Field>

          {issueError ? <InlineAlert>{issueError}</InlineAlert> : null}
        </div>
      </Dialog>

      <TransactionDrawer
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </>
  );
}
