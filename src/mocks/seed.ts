import { addDays, isAfter, startOfMonth, subMonths } from 'date-fns';
import {
  chance,
  createRng,
  pick,
  randFloat,
  randInt,
  weighted,
  type Rng,
} from '@/mocks/prng';
import { toMinor } from '@/lib/money';
import { monthKey } from '@/lib/dates';
import type {
  Account,
  AccountType,
  AppNotification,
  BankCard,
  Beneficiary,
  CategoryKey,
  Channel,
  CurrencyCode,
  PaymentMethod,
  Transaction,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
  Transfer,
  User,
} from '@/types/domain';

/**
 * The bank, built once from a single seed.
 *
 * Everything downstream — pages, charts, filters — reads this and nothing else,
 * so the app behaves like a real client against a real ledger: balances are the
 * consequence of the transaction history rather than a number typed into a
 * fixture.
 */

const SEED = 4827193;
const MONTHS_OF_HISTORY = 15;
const NOW = new Date();

/* ───────────────────────── Reference data ───────────────────────── */

const COUNTERPARTIES: Record<CategoryKey, readonly string[]> = {
  revenue: [
    'Halden Logistics',
    'Orbital Freight Ltd',
    'Kestrel Analytics',
    'Nordvik Marine AS',
    'Tamura Instruments',
    'Bluecrest Retail Group',
    'Sable & Co',
    'Highbury Systems',
    'Ferrovia Sud SpA',
  ],
  payroll: ['Payroll disbursement'],
  software: [
    'Figma Inc',
    'GitHub',
    'Linear Orbit Inc',
    'Vercel Inc',
    'Datadog',
    'Notion Labs',
    'Snowflake Computing',
    'Atlassian Pty',
    'Twilio Ireland',
  ],
  marketing: [
    'Meta Platforms Ireland',
    'Google Ireland Ltd',
    'LinkedIn Corporation',
    'Intercom R&D',
    'DevConf Sponsorship',
    'Hartline Media',
  ],
  travel: [
    'Emirates Airline',
    'Lufthansa Group',
    'Hilton Garden Inn',
    'Uber BV',
    'Grand Central Rail',
    'Biman Bangladesh',
    'Marriott Bonvoy',
  ],
  facilities: [
    'Fern & Foyle Property',
    'Metro Water Authority',
    'Nordic Energy AB',
    'Kestrel Facilities Ltd',
    'Lantern Security Co',
  ],
  equipment: [
    'Apple Distribution Intl',
    'Dell Technologies',
    'Lenovo EMEA',
    'Elgato Systems',
    'Herman Miller',
  ],
  professional: [
    'Ravensworth LLP',
    'Meridian Audit Partners',
    'Coyle Tax Advisory',
    'Hale Recruitment',
    'Brookmere Consulting',
  ],
  banking: [
    'Account maintenance fee',
    'Outbound wire fee',
    'FX margin',
    'Card scheme fee',
    'Statement archive fee',
  ],
};

const CITIES = [
  'London, GB',
  'Dublin, IE',
  'Berlin, DE',
  'Singapore, SG',
  'Dhaka, BD',
  'New York, US',
  'Amsterdam, NL',
  'Tokyo, JP',
];

const NOTES = [
  'Matched to invoice in the ledger.',
  'Approved by the second signatory.',
  'Recurring commitment, annual review in Q4.',
  'Split across two cost centres.',
  'Receipt attached by the cardholder.',
];

/* ───────────────────────── Account setup ───────────────────────── */

interface AccountSpec {
  id: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  openingMajor: number;
  number: string;
  iban: string;
}

const ACCOUNT_SPECS: readonly AccountSpec[] = [
  {
    id: 'acc-operating',
    name: 'Operating account',
    type: 'operating',
    currency: 'USD',
    openingMajor: 486_200,
    number: '0071 3925 4821',
    iban: 'GB84NEXA60161331926819',
  },
  {
    id: 'acc-payroll',
    name: 'Payroll account',
    type: 'payroll',
    currency: 'USD',
    openingMajor: 128_400,
    number: '0071 3925 5107',
    iban: 'GB84NEXA60161331927204',
  },
  {
    id: 'acc-treasury',
    name: 'Treasury reserve',
    type: 'treasury',
    currency: 'USD',
    openingMajor: 1_240_000,
    number: '0071 3925 6640',
    iban: 'GB84NEXA60161331928815',
  },
  {
    id: 'acc-eur',
    name: 'EUR holding',
    type: 'fx',
    currency: 'EUR',
    openingMajor: 214_500,
    number: '0071 3925 7318',
    iban: 'DE21NEXA37040044053201',
  },
  {
    id: 'acc-savings',
    name: 'Growth savings',
    type: 'savings',
    currency: 'GBP',
    openingMajor: 96_750,
    number: '0071 3925 8002',
    iban: 'GB84NEXA60161331930440',
  },
];

/* ─────────────────── Monthly activity blueprint ─────────────────── */

interface TxSpec {
  category: CategoryKey;
  type: TransactionType;
  direction: TransactionDirection;
  /** How many of these per month, inclusive range. */
  count: [number, number];
  /** Amount range in major units of the account currency. */
  amount: [number, number];
  method: PaymentMethod;
  channel?: Channel;
  /** Attach to one of the cards and record a city. */
  onCard?: boolean;
}

const BLUEPRINT: Record<AccountType, readonly TxSpec[]> = {
  operating: [
    {
      category: 'revenue',
      type: 'deposit',
      direction: 'credit',
      count: [3, 6],
      amount: [8_400, 74_000],
      method: 'wire',
      channel: 'api',
    },
    {
      category: 'software',
      type: 'card',
      direction: 'debit',
      count: [4, 7],
      amount: [39, 2_950],
      method: 'card',
      onCard: true,
    },
    {
      category: 'marketing',
      type: 'payment',
      direction: 'debit',
      count: [2, 4],
      amount: [1_200, 16_400],
      method: 'ach',
      channel: 'online',
    },
    {
      category: 'travel',
      type: 'card',
      direction: 'debit',
      count: [1, 5],
      amount: [180, 4_800],
      method: 'card',
      onCard: true,
    },
    {
      category: 'facilities',
      type: 'payment',
      direction: 'debit',
      count: [1, 2],
      amount: [2_400, 9_600],
      method: 'ach',
      channel: 'online',
    },
    {
      category: 'equipment',
      type: 'card',
      direction: 'debit',
      count: [0, 3],
      amount: [240, 7_400],
      method: 'card',
      onCard: true,
    },
    {
      category: 'professional',
      type: 'payment',
      direction: 'debit',
      count: [0, 2],
      amount: [1_800, 24_000],
      method: 'wire',
      channel: 'online',
    },
    {
      category: 'banking',
      type: 'fee',
      direction: 'debit',
      count: [1, 3],
      amount: [12, 240],
      method: 'internal',
      channel: 'api',
    },
    {
      category: 'revenue',
      type: 'refund',
      direction: 'credit',
      count: [0, 1],
      amount: [90, 2_400],
      method: 'card',
      channel: 'online',
    },
  ],
  payroll: [
    {
      category: 'payroll',
      type: 'payroll',
      direction: 'debit',
      count: [1, 1],
      amount: [148_000, 176_000],
      method: 'ach',
      channel: 'api',
    },
    {
      category: 'revenue',
      type: 'transfer',
      direction: 'credit',
      count: [1, 1],
      amount: [150_000, 180_000],
      method: 'internal',
      channel: 'online',
    },
  ],
  treasury: [
    {
      category: 'revenue',
      type: 'deposit',
      direction: 'credit',
      count: [1, 1],
      amount: [3_100, 5_400],
      method: 'internal',
      channel: 'api',
    },
    {
      category: 'revenue',
      type: 'transfer',
      direction: 'credit',
      count: [0, 2],
      amount: [40_000, 160_000],
      method: 'internal',
      channel: 'online',
    },
    {
      category: 'banking',
      type: 'fee',
      direction: 'debit',
      count: [0, 1],
      amount: [45, 180],
      method: 'internal',
      channel: 'api',
    },
  ],
  fx: [
    {
      category: 'software',
      type: 'payment',
      direction: 'debit',
      count: [1, 3],
      amount: [420, 6_800],
      method: 'sepa',
      channel: 'online',
    },
    {
      category: 'professional',
      type: 'payment',
      direction: 'debit',
      count: [0, 2],
      amount: [900, 14_000],
      method: 'sepa',
      channel: 'online',
    },
    {
      category: 'revenue',
      type: 'deposit',
      direction: 'credit',
      count: [1, 2],
      amount: [12_000, 58_000],
      method: 'sepa',
      channel: 'api',
    },
    {
      category: 'equipment',
      type: 'card',
      direction: 'debit',
      count: [0, 2],
      amount: [190, 3_200],
      method: 'card',
      onCard: true,
    },
  ],
  savings: [
    {
      category: 'revenue',
      type: 'deposit',
      direction: 'credit',
      count: [1, 1],
      amount: [190, 420],
      method: 'internal',
      channel: 'api',
    },
    {
      category: 'revenue',
      type: 'transfer',
      direction: 'credit',
      count: [0, 1],
      amount: [4_000, 22_000],
      method: 'internal',
      channel: 'mobile',
    },
  ],
};

/* ───────────────────────── Generators ───────────────────────── */

function reference(rng: Rng): string {
  const block = () =>
    Array.from({ length: 4 }, () => pick(rng, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split(''))).join('');
  return `NX-${block()}-${block()}`;
}

function timestampIn(monthStart: Date, rng: Rng): Date {
  const day = randInt(rng, 1, 28);
  return new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    day,
    randInt(rng, 7, 20),
    randInt(rng, 0, 59),
    randInt(rng, 0, 59),
  );
}

function statusFor(date: Date, rng: Rng): TransactionStatus {
  const ageDays = (NOW.getTime() - date.getTime()) / 86_400_000;
  if (ageDays < 0) return 'scheduled';
  if (ageDays < 2) return weighted(rng, [['pending', 5], ['settled', 4], ['failed', 1]] as const);
  if (ageDays < 5) return weighted(rng, [['settled', 7], ['pending', 2], ['failed', 1]] as const);
  return weighted(rng, [['settled', 46], ['failed', 1]] as const);
}

function describe(
  spec: TxSpec,
  counterparty: string,
  accountName: string,
  rng: Rng,
): string {
  switch (spec.type) {
    case 'payroll':
      return 'Monthly payroll run · 34 employees';
    case 'transfer':
      return `Internal funding from ${accountName}`;
    case 'fee':
      return counterparty;
    case 'refund':
      return `Refund from ${counterparty}`;
    case 'deposit':
      return spec.category === 'revenue' && spec.method === 'internal'
        ? 'Interest credited'
        : `Invoice settlement · ${counterparty}`;
    case 'card':
      return `${counterparty}${chance(rng, 0.4) ? ' · subscription' : ''}`;
    default:
      return counterparty;
  }
}

function buildCards(rng: Rng, holder: string): BankCard[] {
  const specs: Array<{
    id: string;
    label: string;
    accountId: string;
    brand: BankCard['brand'];
    variant: BankCard['variant'];
    tier: BankCard['tier'];
    pan: string;
    currency: CurrencyCode;
    monthly: number;
    perTxn: number;
    expiry: string;
  }> = [
    {
      id: 'card-metal',
      label: 'Corporate Metal',
      accountId: 'acc-operating',
      brand: 'visa',
      variant: 'physical',
      tier: 'metal',
      pan: '4024 0071 3925 4821',
      currency: 'USD',
      monthly: 60_000,
      perTxn: 15_000,
      expiry: '09/29',
    },
    {
      id: 'card-business',
      label: 'Team Business',
      accountId: 'acc-operating',
      brand: 'mastercard',
      variant: 'physical',
      tier: 'business',
      pan: '5412 7508 3364 1290',
      currency: 'USD',
      monthly: 25_000,
      perTxn: 5_000,
      expiry: '02/28',
    },
    {
      id: 'card-virtual-ads',
      label: 'Virtual · Ad spend',
      accountId: 'acc-operating',
      brand: 'visa',
      variant: 'virtual',
      tier: 'virtual',
      pan: '4024 9931 5578 7043',
      currency: 'USD',
      monthly: 18_000,
      perTxn: 6_000,
      expiry: '11/27',
    },
    {
      id: 'card-virtual-eur',
      label: 'Virtual · EU suppliers',
      accountId: 'acc-eur',
      brand: 'mastercard',
      variant: 'virtual',
      tier: 'virtual',
      pan: '5412 3390 8817 6624',
      currency: 'EUR',
      monthly: 12_000,
      perTxn: 4_000,
      expiry: '06/28',
    },
  ];

  return specs.map((spec, index) => ({
    id: spec.id,
    accountId: spec.accountId,
    label: spec.label,
    holder,
    brand: spec.brand,
    variant: spec.variant,
    tier: spec.tier,
    pan: spec.pan,
    last4: spec.pan.slice(-4),
    expiry: spec.expiry,
    cvv: String(randInt(rng, 100, 999)),
    currency: spec.currency,
    frozen: index === 3,
    monthlyLimitMinor: toMinor(spec.monthly, spec.currency),
    spentThisMonthMinor: 0,
    perTransactionLimitMinor: toMinor(spec.perTxn, spec.currency),
    contactless: spec.variant === 'physical',
    onlinePayments: true,
    atmWithdrawals: spec.variant === 'physical' && index === 0,
    createdAt: subMonths(NOW, 24 - index * 5).toISOString(),
    seed: 1_000 + index * 977,
  }));
}

function buildBeneficiaries(rng: Rng): Beneficiary[] {
  const rows: Array<Omit<Beneficiary, 'createdAt' | 'lastUsedAt'>> = [
    {
      id: 'ben-halden',
      name: 'Halden Logistics',
      nickname: 'Halden ops',
      bank: 'Barclays Bank PLC',
      accountNumber: 'GB29 NWBK 6016 1331 9268 19',
      swift: 'BARCGB22',
      country: 'United Kingdom',
      currency: 'GBP',
      kind: 'international',
      favourite: true,
    },
    {
      id: 'ben-ferrovia',
      name: 'Ferrovia Sud SpA',
      bank: 'Intesa Sanpaolo',
      accountNumber: 'IT60 X054 2811 1010 0000 0123 456',
      swift: 'BCITITMM',
      country: 'Italy',
      currency: 'EUR',
      kind: 'international',
      favourite: false,
    },
    {
      id: 'ben-ravensworth',
      name: 'Ravensworth LLP',
      nickname: 'Legal counsel',
      bank: 'First Republic',
      accountNumber: '4471 0092 3318',
      country: 'United States',
      currency: 'USD',
      kind: 'domestic',
      favourite: true,
    },
    {
      id: 'ben-tamura',
      name: 'Tamura Instruments',
      bank: 'MUFG Bank',
      accountNumber: '0140 7789 2261',
      swift: 'BOTKJPJT',
      country: 'Japan',
      currency: 'JPY',
      kind: 'international',
      favourite: false,
    },
    {
      id: 'ben-payroll-bureau',
      name: 'Northgate Payroll Bureau',
      nickname: 'Payroll bureau',
      bank: 'Wells Fargo',
      accountNumber: '8813 2204 5567',
      country: 'United States',
      currency: 'USD',
      kind: 'domestic',
      favourite: true,
    },
    {
      id: 'ben-fern-foyle',
      name: 'Fern & Foyle Property',
      nickname: 'Office landlord',
      bank: 'Citibank NA',
      accountNumber: '3390 1147 8820',
      country: 'United States',
      currency: 'USD',
      kind: 'domestic',
      favourite: false,
    },
    {
      id: 'ben-nordvik',
      name: 'Nordvik Marine AS',
      bank: 'DNB Bank ASA',
      accountNumber: 'NO93 8601 1117 947',
      swift: 'DNBANOKK',
      country: 'Norway',
      currency: 'EUR',
      kind: 'international',
      favourite: false,
    },
    {
      id: 'ben-treasury',
      name: 'Treasury reserve',
      nickname: 'Own account',
      bank: 'NexaBank',
      accountNumber: '0071 3925 6640',
      country: 'United States',
      currency: 'USD',
      kind: 'internal',
      favourite: true,
    },
  ];

  return rows.map((row) => ({
    ...row,
    createdAt: subMonths(NOW, randInt(rng, 6, 30)).toISOString(),
    lastUsedAt: chance(rng, 0.75)
      ? addDays(NOW, -randInt(rng, 1, 90)).toISOString()
      : undefined,
  }));
}

function buildTransfers(rng: Rng, beneficiaries: Beneficiary[]): Transfer[] {
  const speeds: Array<Transfer['speed']> = ['standard', 'express', 'instant'];
  return Array.from({ length: 14 }, (_, index) => {
    const beneficiary = pick(rng, beneficiaries);
    const created = addDays(NOW, -randInt(rng, 1, 140));
    const status = weighted(rng, [
      ['completed', 8],
      ['pending', 2],
      ['failed', 1],
    ] as const) as Transfer['status'];
    const speed = pick(rng, speeds);
    return {
      id: `trf-${String(index + 1).padStart(4, '0')}`,
      receiptNumber: `RCPT-${created.getFullYear()}-${String(4100 + index * 7)}`,
      fromAccountId: pick(rng, ['acc-operating', 'acc-operating', 'acc-treasury']),
      beneficiaryId: beneficiary.id,
      beneficiaryName: beneficiary.name,
      amountMinor: toMinor(randFloat(rng, 850, 68_000), 'USD'),
      currency: 'USD' as CurrencyCode,
      feeMinor: toMinor(speed === 'instant' ? 24 : speed === 'express' ? 12 : 0, 'USD'),
      speed,
      reference: reference(rng),
      note: chance(rng, 0.4) ? pick(rng, NOTES) : undefined,
      status,
      createdAt: created.toISOString(),
      settlesAt: addDays(created, speed === 'instant' ? 0 : speed === 'express' ? 1 : 2).toISOString(),
    };
  }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function buildNotifications(): AppNotification[] {
  const rows: Array<Omit<AppNotification, 'id' | 'at'> & { daysAgo: number }> = [
    {
      kind: 'security',
      title: 'New device signed in',
      body: 'Chrome on macOS, Dhaka BD. If this was not you, revoke the session in Settings.',
      read: false,
      daysAgo: 0,
    },
    {
      kind: 'payment',
      title: 'Wire to Halden Logistics settled',
      body: '$42,900.00 credited to the beneficiary account.',
      read: false,
      daysAgo: 1,
    },
    {
      kind: 'card',
      title: 'Virtual · EU suppliers frozen',
      body: 'The card was frozen manually. Transactions will decline until it is unfrozen.',
      read: false,
      daysAgo: 2,
    },
    {
      kind: 'payment',
      title: 'Payroll run scheduled',
      body: '34 employees, releasing on the 28th at 09:00 local time.',
      read: true,
      daysAgo: 4,
    },
    {
      kind: 'system',
      title: 'Statement ready',
      body: 'Your Operating account statement for last month is available to download.',
      read: true,
      daysAgo: 8,
    },
    {
      kind: 'security',
      title: 'Beneficiary added',
      body: 'Nordvik Marine AS was added by you and cleared the 12-hour hold.',
      read: true,
      daysAgo: 15,
    },
  ];

  return rows.map((row, index) => ({
    id: `ntf-${index + 1}`,
    kind: row.kind,
    title: row.title,
    body: row.body,
    read: row.read,
    at: addDays(NOW, -row.daysAgo).toISOString(),
  }));
}

/* ───────────────────────── Assembly ───────────────────────── */

export interface BankData {
  user: User;
  accounts: Account[];
  transactions: Transaction[];
  cards: BankCard[];
  beneficiaries: Beneficiary[];
  transfers: Transfer[];
  notifications: AppNotification[];
}

function buildBank(): BankData {
  const rng = createRng(SEED);

  const user: User = {
    id: 'usr-ada',
    name: 'Ada Okonkwo',
    email: 'ada@nexabank.io',
    role: 'Treasury lead',
    organisation: 'Meridian Robotics',
    initials: 'AO',
    lastSignInAt: addDays(NOW, -1).toISOString(),
    twoFactorEnabled: true,
  };

  const accounts: Account[] = ACCOUNT_SPECS.map((spec, index) => ({
    id: spec.id,
    name: spec.name,
    type: spec.type,
    number: spec.number,
    iban: spec.iban,
    currency: spec.currency,
    balanceMinor: 0,
    availableMinor: 0,
    pendingMinor: 0,
    openedAt: subMonths(NOW, 38 - index * 4).toISOString(),
    status: 'active',
    seed: 2_500 + index * 613,
  }));

  const cards = buildCards(rng, user.name);
  const beneficiaries = buildBeneficiaries(rng);
  const transfers = buildTransfers(rng, beneficiaries);

  // Walk month by month so recurring commitments land in a believable rhythm.
  const draft: Transaction[] = [];
  const months = Array.from({ length: MONTHS_OF_HISTORY }, (_, i) =>
    startOfMonth(subMonths(NOW, MONTHS_OF_HISTORY - 1 - i)),
  );

  for (const monthStart of months) {
    for (const account of accounts) {
      const specs = BLUEPRINT[account.type];
      for (const spec of specs) {
        const count = randInt(rng, spec.count[0], spec.count[1]);
        for (let i = 0; i < count; i += 1) {
          const date = timestampIn(monthStart, rng);
          // Nothing posts in the future except a handful of scheduled payments.
          if (isAfter(date, NOW) && !chance(rng, 0.12)) continue;

          const counterparty =
            spec.type === 'transfer'
              ? 'Internal transfer'
              : pick(rng, COUNTERPARTIES[spec.category]);
          const cardsForAccount = cards.filter((card) => card.accountId === account.id);
          const card =
            spec.onCard && cardsForAccount.length > 0 ? pick(rng, cardsForAccount) : undefined;

          draft.push({
            id: '',
            accountId: account.id,
            cardId: card?.id,
            date: date.toISOString(),
            counterparty,
            description: describe(spec, counterparty, 'Operating account', rng),
            reference: reference(rng),
            type: spec.type,
            status: statusFor(date, rng),
            direction: spec.direction,
            amountMinor: toMinor(randFloat(rng, spec.amount[0], spec.amount[1]), account.currency),
            feeMinor:
              spec.method === 'wire' && spec.direction === 'debit'
                ? toMinor(randFloat(rng, 8, 32), account.currency)
                : 0,
            currency: account.currency,
            category: spec.category,
            method: spec.method,
            channel: spec.channel ?? 'online',
            balanceAfterMinor: 0,
            location: card ? pick(rng, CITIES) : undefined,
            note: chance(rng, 0.18) ? pick(rng, NOTES) : undefined,
          });
        }
      }
    }
  }

  draft.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Running balances per account, then the closing balance becomes the account's.
  const running = new Map<string, number>();
  for (const spec of ACCOUNT_SPECS) {
    running.set(spec.id, toMinor(spec.openingMajor, spec.currency));
  }

  const transactions = draft.map((transaction, index) => {
    const signed =
      transaction.direction === 'credit'
        ? transaction.amountMinor
        : -(transaction.amountMinor + transaction.feeMinor);
    let balance = running.get(transaction.accountId) ?? 0;
    if (transaction.status === 'settled') {
      balance += signed;
      running.set(transaction.accountId, balance);
    }
    return {
      ...transaction,
      id: `TXN-${monthKey(transaction.date).slice(0, 4)}-${String(index + 1).padStart(5, '0')}`,
      balanceAfterMinor: balance,
    };
  });

  for (const account of accounts) {
    const own = transactions.filter((transaction) => transaction.accountId === account.id);
    const pending = own
      .filter((transaction) => transaction.status === 'pending')
      .reduce(
        (sum, transaction) =>
          sum +
          (transaction.direction === 'debit'
            ? transaction.amountMinor + transaction.feeMinor
            : 0),
        0,
      );
    account.balanceMinor = running.get(account.id) ?? 0;
    account.pendingMinor = pending;
    account.availableMinor = account.balanceMinor - pending;
  }

  const currentMonth = monthKey(NOW.toISOString());
  for (const card of cards) {
    card.spentThisMonthMinor = transactions
      .filter(
        (transaction) =>
          transaction.cardId === card.id &&
          transaction.direction === 'debit' &&
          transaction.status !== 'failed' &&
          monthKey(transaction.date) === currentMonth,
      )
      .reduce((sum, transaction) => sum + transaction.amountMinor, 0);
  }

  return {
    user,
    accounts,
    transactions,
    cards,
    beneficiaries,
    transfers,
    notifications: buildNotifications(),
  };
}

/** The one and only dataset. Mutated in place by the mock API. */
export const bank: BankData = buildBank();
