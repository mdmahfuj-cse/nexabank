/**
 * Domain model for NexaBank.
 *
 * Money is always an integer in minor units (cents, pence, satang) and never a
 * float. `amountMinor: 129950` means 1,299.50 in the stated currency. Anything
 * that reaches the screen goes through `lib/money.ts` for conversion and
 * formatting; nothing multiplies or divides money inline.
 */

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'BDT';

export type AccountType =
  | 'operating'
  | 'savings'
  | 'treasury'
  | 'payroll'
  | 'fx';

export type AccountStatus = 'active' | 'restricted' | 'closed';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** Full number. Mask it for display with `maskAccount`. */
  number: string;
  iban: string;
  currency: CurrencyCode;
  balanceMinor: number;
  availableMinor: number;
  /** Held funds not yet settled. */
  pendingMinor: number;
  openedAt: string;
  status: AccountStatus;
  /** Drives the account's own guilloché engraving. */
  seed: number;
}

export type TransactionType =
  | 'payment'
  | 'deposit'
  | 'transfer'
  | 'withdrawal'
  | 'card'
  | 'payroll'
  | 'fee'
  | 'refund';

export type TransactionStatus = 'settled' | 'pending' | 'failed' | 'scheduled';

export type TransactionDirection = 'credit' | 'debit';

export type PaymentMethod =
  | 'ach'
  | 'wire'
  | 'sepa'
  | 'card'
  | 'internal'
  | 'cheque';

export type Channel = 'online' | 'mobile' | 'branch' | 'atm' | 'api';

export type CategoryKey =
  | 'software'
  | 'payroll'
  | 'travel'
  | 'marketing'
  | 'facilities'
  | 'equipment'
  | 'professional'
  | 'revenue'
  | 'banking';

export interface Transaction {
  id: string;
  accountId: string;
  cardId?: string;
  /** ISO timestamp of the transaction. */
  date: string;
  counterparty: string;
  description: string;
  reference: string;
  type: TransactionType;
  status: TransactionStatus;
  direction: TransactionDirection;
  /** Always positive. `direction` carries the sign. */
  amountMinor: number;
  feeMinor: number;
  currency: CurrencyCode;
  category: CategoryKey;
  method: PaymentMethod;
  channel: Channel;
  /** Running account balance after posting, for settled rows. */
  balanceAfterMinor: number;
  location?: string;
  note?: string;
}

export type CardBrand = 'visa' | 'mastercard';
export type CardVariant = 'physical' | 'virtual';
export type CardTier = 'metal' | 'platinum' | 'business' | 'virtual';

export interface BankCard {
  id: string;
  accountId: string;
  label: string;
  holder: string;
  brand: CardBrand;
  variant: CardVariant;
  tier: CardTier;
  /** Full PAN in groups of four. Mask for display. */
  pan: string;
  last4: string;
  expiry: string;
  cvv: string;
  currency: CurrencyCode;
  frozen: boolean;
  monthlyLimitMinor: number;
  spentThisMonthMinor: number;
  perTransactionLimitMinor: number;
  contactless: boolean;
  onlinePayments: boolean;
  atmWithdrawals: boolean;
  createdAt: string;
  seed: number;
}

export type BeneficiaryKind = 'internal' | 'domestic' | 'international';

export interface Beneficiary {
  id: string;
  name: string;
  nickname?: string;
  bank: string;
  accountNumber: string;
  swift?: string;
  country: string;
  currency: CurrencyCode;
  kind: BeneficiaryKind;
  favourite: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export type TransferSpeed = 'standard' | 'express' | 'instant';
export type TransferStatus = 'completed' | 'pending' | 'failed' | 'scheduled';

export interface Transfer {
  id: string;
  receiptNumber: string;
  fromAccountId: string;
  beneficiaryId: string;
  beneficiaryName: string;
  amountMinor: number;
  currency: CurrencyCode;
  feeMinor: number;
  speed: TransferSpeed;
  reference: string;
  note?: string;
  status: TransferStatus;
  createdAt: string;
  settlesAt: string;
}

export type NotificationKind = 'security' | 'payment' | 'system' | 'card';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organisation: string;
  initials: string;
  lastSignInAt: string;
  twoFactorEnabled: boolean;
}

/* ───────────────── Query + response shapes ───────────────── */

export interface Page<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export type SortDirection = 'asc' | 'desc';

export interface TransactionQuery {
  search?: string;
  accountId?: string | 'all';
  type?: TransactionType | 'all';
  status?: TransactionStatus | 'all';
  direction?: TransactionDirection | 'all';
  category?: CategoryKey | 'all';
  cardId?: string;
  /** Inclusive ISO date, yyyy-MM-dd. */
  from?: string;
  to?: string;
  minMinor?: number;
  maxMinor?: number;
  sortBy?: 'date' | 'amountMinor' | 'counterparty';
  sortDirection?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface DashboardSummary {
  /** Every figure below is normalised to USD minor units. */
  totalBalanceMinor: number;
  availableMinor: number;
  pendingMinor: number;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  transactionCount: number;
  /** Percent change against the previous period, e.g. -4.2. */
  incomeChangePct: number;
  expenseChangePct: number;
  volumeChangePct: number;
  balanceChangePct: number;
  balanceTrend: SeriesPoint[];
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface CashFlowPoint {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategorySlice {
  key: CategoryKey;
  label: string;
  color: string;
  amount: number;
  share: number;
  transactions: number;
}

export interface TrendPoint {
  date: string;
  count: number;
  volume: number;
}

export interface AnalyticsBundle {
  cashFlow: CashFlowPoint[];
  categories: CategorySlice[];
  trend: TrendPoint[];
  monthlySpend: SeriesPoint[];
  kpis: {
    averageTransactionMinor: number;
    largestExpenseMinor: number;
    burnRateMinor: number;
    runwayMonths: number;
    savingsRatePct: number;
    settlementRatePct: number;
  };
}
