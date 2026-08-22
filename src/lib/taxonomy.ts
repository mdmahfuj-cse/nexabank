import type {
  BeneficiaryKind,
  CategoryKey,
  Channel,
  PaymentMethod,
  TransactionStatus,
  TransactionType,
  TransferSpeed,
  AccountType,
} from '@/types/domain';

/**
 * Display metadata for domain enums, kept in one place so a label or colour is
 * never invented twice. Chart colours are fixed hex rather than theme tokens:
 * a category has to read as the same colour in both themes, or a reader who
 * flips the switch loses the thread.
 */

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  color: string;
  /** Revenue is the only inbound category; the rest are spend. */
  flow: 'income' | 'expense';
}

export const CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  revenue: { key: 'revenue', label: 'Revenue', color: '#2FBF8F', flow: 'income' },
  payroll: { key: 'payroll', label: 'Payroll', color: '#5B8DD9', flow: 'expense' },
  software: { key: 'software', label: 'Software', color: '#7C6FD0', flow: 'expense' },
  marketing: { key: 'marketing', label: 'Marketing', color: '#D98A4B', flow: 'expense' },
  travel: { key: 'travel', label: 'Travel', color: '#4FB0A8', flow: 'expense' },
  facilities: { key: 'facilities', label: 'Facilities', color: '#C9A227', flow: 'expense' },
  equipment: { key: 'equipment', label: 'Equipment', color: '#C4657F', flow: 'expense' },
  professional: {
    key: 'professional',
    label: 'Professional fees',
    color: '#6B8CA3',
    flow: 'expense',
  },
  banking: { key: 'banking', label: 'Banking & fees', color: '#8A8F98', flow: 'expense' },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

export const EXPENSE_CATEGORIES = CATEGORY_KEYS.filter(
  (key) => CATEGORIES[key].flow === 'expense',
);

export const TRANSACTION_TYPES: Record<TransactionType, string> = {
  payment: 'Payment',
  deposit: 'Deposit',
  transfer: 'Transfer',
  withdrawal: 'Withdrawal',
  card: 'Card purchase',
  payroll: 'Payroll run',
  fee: 'Fee',
  refund: 'Refund',
};

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export const TRANSACTION_STATUSES: Record<
  TransactionStatus,
  { label: string; tone: StatusTone; hint: string }
> = {
  settled: {
    label: 'Settled',
    tone: 'success',
    hint: 'Funds have cleared and the balance is final.',
  },
  pending: {
    label: 'Pending',
    tone: 'warning',
    hint: 'Authorised and held. It will post within one business day.',
  },
  scheduled: {
    label: 'Scheduled',
    tone: 'info',
    hint: 'Queued to send on its value date.',
  },
  failed: {
    label: 'Failed',
    tone: 'error',
    hint: 'The receiving bank rejected it. Nothing left the account.',
  },
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  ach: 'ACH',
  wire: 'Wire',
  sepa: 'SEPA',
  card: 'Card',
  internal: 'Internal',
  cheque: 'Cheque',
};

export const CHANNELS: Record<Channel, string> = {
  online: 'Online banking',
  mobile: 'Mobile app',
  branch: 'Branch',
  atm: 'ATM',
  api: 'Payments API',
};

export const ACCOUNT_TYPES: Record<AccountType, string> = {
  operating: 'Operating',
  savings: 'Savings',
  treasury: 'Treasury',
  payroll: 'Payroll',
  fx: 'FX holding',
};

/**
 * The rails a payment can take. Fee and settlement time live here rather than in
 * the API or the transfer form, because a screen that quotes a fee the backend
 * does not charge is worse than no quote at all — both read this table.
 */
export const TRANSFER_SPEEDS: Record<
  TransferSpeed,
  { label: string; description: string; feeUsdMinor: number; days: number }
> = {
  standard: {
    label: 'Standard',
    description: 'Clears in two business days. No fee.',
    feeUsdMinor: 0,
    days: 2,
  },
  express: {
    label: 'Express',
    description: 'Next business day.',
    feeUsdMinor: 1_200,
    days: 1,
  },
  instant: {
    label: 'Instant',
    description: 'Settles within seconds, around the clock.',
    feeUsdMinor: 2_400,
    days: 0,
  },
};

export const TRANSFER_SPEED_KEYS = Object.keys(TRANSFER_SPEEDS) as TransferSpeed[];

/** How a beneficiary is reached, which decides what details are required. */
export const BENEFICIARY_KINDS: Record<
  BeneficiaryKind,
  { label: string; description: string; tone: StatusTone }
> = {
  internal: {
    label: 'Internal',
    description: 'Another account inside NexaBank.',
    tone: 'info',
  },
  domestic: {
    label: 'Domestic',
    description: 'A bank in the same country.',
    tone: 'neutral',
  },
  international: {
    label: 'International',
    description: 'Cross-border. A SWIFT/BIC code is required.',
    tone: 'warning',
  },
};

export const BENEFICIARY_KIND_KEYS = Object.keys(BENEFICIARY_KINDS) as BeneficiaryKind[];

/** Ordered colour ramp for charts that are not category-based. */
export const SERIES_COLORS = [
  '#2FBF8F',
  '#5B8DD9',
  '#D98A4B',
  '#7C6FD0',
  '#4FB0A8',
  '#C9A227',
  '#C4657F',
  '#6B8CA3',
];
