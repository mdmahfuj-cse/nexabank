import { differenceInCalendarDays, parseISO, startOfMonth, subMonths } from 'date-fns';
import { bank } from '@/mocks/seed';
import { convertMinor } from '@/lib/money';
import { fmtMonth, monthKey, resolvePreset, withinRange, type RangePreset } from '@/lib/dates';
import { CATEGORIES, EXPENSE_CATEGORIES, TRANSFER_SPEEDS } from '@/lib/taxonomy';
import type {
  Account,
  AnalyticsBundle,
  AppNotification,
  BankCard,
  Beneficiary,
  CashFlowPoint,
  CategoryKey,
  CategorySlice,
  CurrencyCode,
  DashboardSummary,
  Page,
  SeriesPoint,
  Transaction,
  TransactionQuery,
  Transfer,
  TransferSpeed,
  TrendPoint,
  User,
} from '@/types/domain';

/**
 * The mock API.
 *
 * It behaves like a network: it takes time, it can fail, and it does the work on
 * its side of the wire. Filtering, sorting and pagination all happen here rather
 * than in the components, so the UI is written exactly as it would be against a
 * real backend — swapping this file for `fetch` calls would not change a single
 * page.
 *
 * Amounts returned by aggregate endpoints are normalised to USD minor units.
 * The display currency is applied at the very edge, in the components.
 */

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/* ───────────────────── Network simulation ───────────────────── */

let latency: [number, number] = [220, 620];
let failureRate = 0;

export const network = {
  /** Settings exposes this so the failure states can be demonstrated. */
  setFailureRate(rate: number) {
    failureRate = Math.min(Math.max(rate, 0), 1);
  },
  getFailureRate() {
    return failureRate;
  },
  setLatency(min: number, max: number) {
    latency = [min, max];
  },
  getLatency() {
    return latency;
  },
};

function wait(): Promise<void> {
  const [min, max] = latency;
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function respond<T>(produce: () => T): Promise<T> {
  await wait();
  if (failureRate > 0 && Math.random() < failureRate) {
    throw new ApiError(
      'upstream_unavailable',
      'The banking core did not respond. Retry in a moment.',
    );
  }
  return produce();
}

/** Deep-ish copy so callers cannot mutate the store by accident. */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/* ───────────────────── Aggregation helpers ───────────────────── */

const usd = (minor: number, currency: CurrencyCode) => convertMinor(minor, currency, 'USD');

/** Internal movements are not income or expense — they are the same money. */
const countsAsFlow = (transaction: Transaction) =>
  transaction.status !== 'failed' && transaction.method !== 'internal';

const inScope = (transaction: Transaction, accountId?: string) =>
  !accountId || accountId === 'all' || transaction.accountId === accountId;

function signedUsd(transaction: Transaction): number {
  const amount = usd(transaction.amountMinor + transaction.feeMinor, transaction.currency);
  return transaction.direction === 'credit' ? amount : -amount;
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/* ───────────────────────── Endpoints ───────────────────────── */

export const api = {
  /* ── Session ── */

  signIn(email: string, password: string): Promise<User> {
    return respond(() => {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new ApiError('invalid_email', 'That does not look like an email address.');
      }
      if (password !== 'nexa1234') {
        throw new ApiError(
          'invalid_credentials',
          'Email and password do not match. This demo accepts the password nexa1234.',
        );
      }
      return clone({ ...bank.user, email });
    });
  },

  signUp(name: string, email: string): Promise<User> {
    return respond(() =>
      clone({
        ...bank.user,
        name,
        email,
        initials: name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? '')
          .join(''),
      }),
    );
  },

  verifyOtp(code: string): Promise<{ verified: true }> {
    return respond(() => {
      if (!/^\d{6}$/.test(code)) {
        throw new ApiError('invalid_code', 'Enter the six digits from your authenticator.');
      }
      return { verified: true as const };
    });
  },

  requestPasswordReset(email: string): Promise<{ sent: true }> {
    return respond(() => {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new ApiError('invalid_email', 'That does not look like an email address.');
      }
      return { sent: true as const };
    });
  },

  /* ── Accounts ── */

  getAccounts(): Promise<Account[]> {
    return respond(() => clone(bank.accounts));
  },

  getAccount(id: string): Promise<Account> {
    return respond(() => {
      const account = bank.accounts.find((item) => item.id === id);
      if (!account) throw new ApiError('not_found', 'That account does not exist.');
      return clone(account);
    });
  },

  /* ── Transactions ── */

  getTransactions(query: TransactionQuery = {}): Promise<Page<Transaction>> {
    return respond(() => {
      const {
        search,
        accountId,
        type,
        status,
        direction,
        category,
        cardId,
        from,
        to,
        minMinor,
        maxMinor,
        sortBy = 'date',
        sortDirection = 'desc',
        page = 1,
        pageSize = 12,
      } = query;

      const needle = search?.trim().toLowerCase();

      const filtered = bank.transactions.filter((transaction) => {
        if (!inScope(transaction, accountId)) return false;
        if (type && type !== 'all' && transaction.type !== type) return false;
        if (status && status !== 'all' && transaction.status !== status) return false;
        if (direction && direction !== 'all' && transaction.direction !== direction) return false;
        if (category && category !== 'all' && transaction.category !== category) return false;
        if (cardId && transaction.cardId !== cardId) return false;
        if (!withinRange(transaction.date, from, to)) return false;
        if (minMinor !== undefined && transaction.amountMinor < minMinor) return false;
        if (maxMinor !== undefined && transaction.amountMinor > maxMinor) return false;
        if (needle) {
          const haystack = `${transaction.counterparty} ${transaction.description} ${transaction.reference} ${transaction.id}`.toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        return true;
      });

      const order = sortDirection === 'asc' ? 1 : -1;
      filtered.sort((a, b) => {
        if (sortBy === 'amountMinor') {
          return (usd(a.amountMinor, a.currency) - usd(b.amountMinor, b.currency)) * order;
        }
        if (sortBy === 'counterparty') {
          return a.counterparty.localeCompare(b.counterparty) * order;
        }
        return (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) * order;
      });

      const total = filtered.length;
      const pageCount = Math.max(Math.ceil(total / pageSize), 1);
      const safePage = Math.min(Math.max(page, 1), pageCount);
      const start = (safePage - 1) * pageSize;

      return {
        rows: clone(filtered.slice(start, start + pageSize)),
        total,
        page: safePage,
        pageSize,
        pageCount,
      };
    });
  },

  getTransaction(id: string): Promise<Transaction> {
    return respond(() => {
      const transaction = bank.transactions.find((item) => item.id === id);
      if (!transaction) throw new ApiError('not_found', 'That transaction is no longer available.');
      return clone(transaction);
    });
  },

  /* ── Dashboard ── */

  getDashboard(accountId: string = 'all', preset: RangePreset = '30d'): Promise<DashboardSummary> {
    return respond(() => {
      const accounts = bank.accounts.filter(
        (account) => accountId === 'all' || account.id === accountId,
      );

      const totalBalanceMinor = accounts.reduce(
        (sum, account) => sum + usd(account.balanceMinor, account.currency),
        0,
      );
      const availableMinor = accounts.reduce(
        (sum, account) => sum + usd(account.availableMinor, account.currency),
        0,
      );
      const pendingMinor = accounts.reduce(
        (sum, account) => sum + usd(account.pendingMinor, account.currency),
        0,
      );

      const { from, to } = resolvePreset(preset);
      const spanDays = from && to ? differenceInCalendarDays(parseISO(to), parseISO(from)) : 365;
      const previousFrom = from
        ? new Date(parseISO(from).getTime() - spanDays * 86_400_000).toISOString().slice(0, 10)
        : undefined;

      const scoped = bank.transactions.filter(
        (transaction) => inScope(transaction, accountId) && countsAsFlow(transaction),
      );
      const current = scoped.filter((transaction) => withinRange(transaction.date, from, to));
      const previous = scoped.filter((transaction) =>
        withinRange(transaction.date, previousFrom, from),
      );

      const sum = (rows: Transaction[], want: 'credit' | 'debit') =>
        rows
          .filter((transaction) => transaction.direction === want)
          .reduce(
            (total, transaction) =>
              total + usd(transaction.amountMinor + transaction.feeMinor, transaction.currency),
            0,
          );

      const incomeMinor = sum(current, 'credit');
      const expenseMinor = sum(current, 'debit');

      // Walk the closing balance backwards through monthly net movement.
      const months = Array.from({ length: 12 }, (_, i) => startOfMonth(subMonths(new Date(), 11 - i)));
      const netByMonth = new Map<string, number>();
      for (const transaction of bank.transactions) {
        if (!inScope(transaction, accountId) || transaction.status !== 'settled') continue;
        const key = monthKey(transaction.date);
        netByMonth.set(key, (netByMonth.get(key) ?? 0) + signedUsd(transaction));
      }
      const balanceTrend: SeriesPoint[] = [];
      let rolling = totalBalanceMinor;
      for (let i = months.length - 1; i >= 0; i -= 1) {
        const key = monthKey(months[i].toISOString());
        balanceTrend.unshift({ label: fmtMonth(months[i].toISOString()), value: rolling });
        rolling -= netByMonth.get(key) ?? 0;
      }

      return {
        totalBalanceMinor,
        availableMinor,
        pendingMinor,
        incomeMinor,
        expenseMinor,
        netMinor: incomeMinor - expenseMinor,
        transactionCount: current.length,
        incomeChangePct: percentChange(incomeMinor, sum(previous, 'credit')),
        expenseChangePct: percentChange(expenseMinor, sum(previous, 'debit')),
        volumeChangePct: percentChange(current.length, previous.length),
        balanceChangePct: percentChange(
          incomeMinor - expenseMinor,
          sum(previous, 'credit') - sum(previous, 'debit'),
        ),
        balanceTrend,
      };
    });
  },

  /* ── Analytics ── */

  getAnalytics(accountId: string = 'all', months = 12): Promise<AnalyticsBundle> {
    return respond(() => {
      const scoped = bank.transactions.filter(
        (transaction) => inScope(transaction, accountId) && countsAsFlow(transaction),
      );

      const spine = Array.from({ length: months }, (_, i) =>
        startOfMonth(subMonths(new Date(), months - 1 - i)),
      );

      const cashFlow: CashFlowPoint[] = spine.map((month) => {
        const key = monthKey(month.toISOString());
        const rows = scoped.filter((transaction) => monthKey(transaction.date) === key);
        const income = rows
          .filter((transaction) => transaction.direction === 'credit')
          .reduce((sum, t) => sum + usd(t.amountMinor, t.currency), 0);
        const expense = rows
          .filter((transaction) => transaction.direction === 'debit')
          .reduce((sum, t) => sum + usd(t.amountMinor + t.feeMinor, t.currency), 0);
        return {
          month: fmtMonth(month.toISOString()),
          income,
          expense,
          net: income - expense,
        };
      });

      const spendRows = scoped.filter((transaction) => transaction.direction === 'debit');
      const totalSpend = spendRows.reduce(
        (sum, t) => sum + usd(t.amountMinor + t.feeMinor, t.currency),
        0,
      );

      const categories: CategorySlice[] = EXPENSE_CATEGORIES.map((key: CategoryKey) => {
        const rows = spendRows.filter((transaction) => transaction.category === key);
        const amount = rows.reduce((sum, t) => sum + usd(t.amountMinor + t.feeMinor, t.currency), 0);
        return {
          key,
          label: CATEGORIES[key].label,
          color: CATEGORIES[key].color,
          amount,
          share: totalSpend === 0 ? 0 : (amount / totalSpend) * 100,
          transactions: rows.length,
        };
      })
        .filter((slice) => slice.amount > 0)
        .sort((a, b) => b.amount - a.amount);

      // Daily transaction trend for the last 30 days.
      const trend: TrendPoint[] = Array.from({ length: 30 }, (_, i) => {
        const day = new Date();
        day.setDate(day.getDate() - (29 - i));
        const stamp = day.toISOString().slice(0, 10);
        const rows = scoped.filter((transaction) => transaction.date.slice(0, 10) === stamp);
        return {
          date: stamp,
          count: rows.length,
          volume: rows.reduce((sum, t) => sum + usd(t.amountMinor, t.currency), 0),
        };
      });

      const monthlySpend: SeriesPoint[] = cashFlow.map((point) => ({
        label: point.month.slice(0, 3),
        value: point.expense,
      }));

      const recentMonths = cashFlow.slice(-3);
      const burnRateMinor = Math.max(
        Math.round(
          recentMonths.reduce((sum, point) => sum + (point.expense - point.income), 0) /
            Math.max(recentMonths.length, 1),
        ),
        0,
      );
      const closingBalance = bank.accounts
        .filter((account) => accountId === 'all' || account.id === accountId)
        .reduce((sum, account) => sum + usd(account.balanceMinor, account.currency), 0);
      const incomeTotal = cashFlow.reduce((sum, point) => sum + point.income, 0);
      const expenseTotal = cashFlow.reduce((sum, point) => sum + point.expense, 0);
      const settled = scoped.filter((transaction) => transaction.status === 'settled').length;

      return {
        cashFlow,
        categories,
        trend,
        monthlySpend,
        kpis: {
          averageTransactionMinor:
            spendRows.length === 0 ? 0 : Math.round(totalSpend / spendRows.length),
          largestExpenseMinor: spendRows.reduce(
            (max, t) => Math.max(max, usd(t.amountMinor, t.currency)),
            0,
          ),
          burnRateMinor,
          /** 0 means the period was cash positive — runway does not apply. */
          runwayMonths: burnRateMinor === 0 ? 0 : closingBalance / burnRateMinor,
          savingsRatePct:
            incomeTotal === 0 ? 0 : ((incomeTotal - expenseTotal) / incomeTotal) * 100,
          settlementRatePct: scoped.length === 0 ? 0 : (settled / scoped.length) * 100,
        },
      };
    });
  },

  /* ── Cards ── */

  getCards(): Promise<BankCard[]> {
    return respond(() => clone(bank.cards));
  },

  setCardFrozen(cardId: string, frozen: boolean): Promise<BankCard> {
    return respond(() => {
      const card = bank.cards.find((item) => item.id === cardId);
      if (!card) throw new ApiError('not_found', 'That card is not on the account.');
      card.frozen = frozen;
      return clone(card);
    });
  },

  updateCardLimits(
    cardId: string,
    limits: { monthlyLimitMinor?: number; perTransactionLimitMinor?: number },
  ): Promise<BankCard> {
    return respond(() => {
      const card = bank.cards.find((item) => item.id === cardId);
      if (!card) throw new ApiError('not_found', 'That card is not on the account.');
      if (
        limits.monthlyLimitMinor !== undefined &&
        limits.monthlyLimitMinor < card.spentThisMonthMinor
      ) {
        throw new ApiError(
          'limit_below_spend',
          'The monthly limit cannot be lower than what the card has already spent this month.',
        );
      }
      Object.assign(card, limits);
      return clone(card);
    });
  },

  updateCardControls(
    cardId: string,
    controls: Partial<Pick<BankCard, 'contactless' | 'onlinePayments' | 'atmWithdrawals'>>,
  ): Promise<BankCard> {
    return respond(() => {
      const card = bank.cards.find((item) => item.id === cardId);
      if (!card) throw new ApiError('not_found', 'That card is not on the account.');
      Object.assign(card, controls);
      return clone(card);
    });
  },

  issueVirtualCard(input: {
    label: string;
    accountId: string;
    monthlyLimitMinor: number;
  }): Promise<BankCard> {
    return respond(() => {
      const account = bank.accounts.find((item) => item.id === input.accountId);
      if (!account) throw new ApiError('not_found', 'Pick an account to fund the card from.');
      const index = bank.cards.length + 1;
      const pan = `4024 ${String(1000 + index * 137).slice(0, 4)} ${String(
        4000 + index * 311,
      ).slice(0, 4)} ${String(5000 + index * 79).slice(0, 4)}`;
      const card: BankCard = {
        id: `card-virtual-${index}`,
        accountId: account.id,
        label: input.label,
        holder: bank.user.name,
        brand: 'visa',
        variant: 'virtual',
        tier: 'virtual',
        pan,
        last4: pan.slice(-4),
        expiry: '12/30',
        cvv: String(100 + ((index * 37) % 899)),
        currency: account.currency,
        frozen: false,
        monthlyLimitMinor: input.monthlyLimitMinor,
        spentThisMonthMinor: 0,
        perTransactionLimitMinor: Math.round(input.monthlyLimitMinor / 4),
        contactless: false,
        onlinePayments: true,
        atmWithdrawals: false,
        createdAt: new Date().toISOString(),
        seed: 3_000 + index * 419,
      };
      bank.cards.push(card);
      return clone(card);
    });
  },

  /* ── Beneficiaries ── */

  getBeneficiaries(): Promise<Beneficiary[]> {
    return respond(() => clone(bank.beneficiaries));
  },

  createBeneficiary(
    input: Omit<Beneficiary, 'id' | 'createdAt' | 'favourite'> & { favourite?: boolean },
  ): Promise<Beneficiary> {
    return respond(() => {
      const duplicate = bank.beneficiaries.some(
        (item) => item.accountNumber.replace(/\s+/g, '') === input.accountNumber.replace(/\s+/g, ''),
      );
      if (duplicate) {
        throw new ApiError('duplicate', 'A beneficiary with that account number already exists.');
      }
      const beneficiary: Beneficiary = {
        ...input,
        favourite: input.favourite ?? false,
        id: `ben-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
      };
      bank.beneficiaries.unshift(beneficiary);
      return clone(beneficiary);
    });
  },

  updateBeneficiary(id: string, patch: Partial<Beneficiary>): Promise<Beneficiary> {
    return respond(() => {
      const beneficiary = bank.beneficiaries.find((item) => item.id === id);
      if (!beneficiary) throw new ApiError('not_found', 'That beneficiary has been removed.');
      Object.assign(beneficiary, patch);
      return clone(beneficiary);
    });
  },

  deleteBeneficiary(id: string): Promise<{ id: string }> {
    return respond(() => {
      const index = bank.beneficiaries.findIndex((item) => item.id === id);
      if (index === -1) throw new ApiError('not_found', 'That beneficiary has been removed.');
      bank.beneficiaries.splice(index, 1);
      return { id };
    });
  },

  /* ── Transfers ── */

  getTransfers(): Promise<Transfer[]> {
    return respond(() => clone(bank.transfers));
  },

  createTransfer(input: {
    fromAccountId: string;
    beneficiaryId: string;
    amountMinor: number;
    currency: CurrencyCode;
    speed: TransferSpeed;
    reference: string;
    note?: string;
  }): Promise<Transfer> {
    return respond(() => {
      const account = bank.accounts.find((item) => item.id === input.fromAccountId);
      const beneficiary = bank.beneficiaries.find((item) => item.id === input.beneficiaryId);
      if (!account) throw new ApiError('not_found', 'Choose an account to send from.');
      if (!beneficiary) throw new ApiError('not_found', 'Choose who to pay.');
      if (input.amountMinor <= 0) {
        throw new ApiError('invalid_amount', 'Enter an amount greater than zero.');
      }

      const rail = TRANSFER_SPEEDS[input.speed];
      const feeMinor = convertMinor(rail.feeUsdMinor, 'USD', account.currency);
      const debitMinor =
        convertMinor(input.amountMinor, input.currency, account.currency) + feeMinor;

      if (debitMinor > account.availableMinor) {
        throw new ApiError(
          'insufficient_funds',
          'The available balance on that account will not cover this payment.',
        );
      }

      const now = new Date();
      const settles = new Date(now);
      settles.setDate(now.getDate() + rail.days);

      const transfer: Transfer = {
        id: `trf-${Date.now().toString(36)}`,
        receiptNumber: `RCPT-${now.getFullYear()}-${String(Math.floor(now.getTime() / 1000) % 100000)}`,
        fromAccountId: account.id,
        beneficiaryId: beneficiary.id,
        beneficiaryName: beneficiary.name,
        amountMinor: input.amountMinor,
        currency: input.currency,
        feeMinor: convertMinor(feeMinor, account.currency, input.currency),
        speed: input.speed,
        reference: input.reference,
        note: input.note,
        status: input.speed === 'instant' ? 'completed' : 'pending',
        createdAt: now.toISOString(),
        settlesAt: settles.toISOString(),
      };

      bank.transfers.unshift(transfer);
      beneficiary.lastUsedAt = now.toISOString();

      const settledNow = transfer.status === 'completed';
      account.balanceMinor -= settledNow ? debitMinor : 0;
      account.pendingMinor += settledNow ? 0 : debitMinor;
      account.availableMinor -= debitMinor;

      bank.transactions.push({
        id: `TXN-${now.getFullYear()}-${String(bank.transactions.length + 1).padStart(5, '0')}`,
        accountId: account.id,
        date: now.toISOString(),
        counterparty: beneficiary.name,
        description: `Transfer to ${beneficiary.name}`,
        reference: transfer.reference,
        type: 'transfer',
        status: settledNow ? 'settled' : 'pending',
        direction: 'debit',
        amountMinor: convertMinor(input.amountMinor, input.currency, account.currency),
        feeMinor,
        currency: account.currency,
        category: 'professional',
        method: beneficiary.kind === 'internal' ? 'internal' : 'wire',
        channel: 'online',
        balanceAfterMinor: account.balanceMinor,
        note: input.note,
      });

      bank.notifications.unshift({
        id: `ntf-${Date.now().toString(36)}`,
        kind: 'payment',
        title: `Payment to ${beneficiary.name} ${settledNow ? 'sent' : 'queued'}`,
        body: `Reference ${transfer.reference}. Receipt ${transfer.receiptNumber}.`,
        at: now.toISOString(),
        read: false,
      });

      return clone(transfer);
    });
  },

  /* ── Notifications ── */

  getNotifications(): Promise<AppNotification[]> {
    return respond(() => clone(bank.notifications));
  },

  markAllNotificationsRead(): Promise<AppNotification[]> {
    return respond(() => {
      for (const notification of bank.notifications) notification.read = true;
      return clone(bank.notifications);
    });
  },
};

export type Api = typeof api;
