import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Form';
import { FilterChip, SearchInput, Segmented, Tabs } from '@/components/ui/Controls';
import { Drawer } from '@/components/ui/Overlay';
import { Pagination } from '@/components/ui/Table';
import { AccountPicker } from '@/components/data/AccountPicker';
import { TransactionDrawer } from '@/components/data/TransactionDrawer';
import { TransactionLedger, type LedgerSortKey } from '@/components/data/TransactionLedger';
import { useApi } from '@/hooks/useApi';
import { useDebounce } from '@/hooks/useDebounce';
import { useCurrency } from '@/providers/CurrencyProvider';
import { useToast } from '@/providers/ToastProvider';
import { api } from '@/mocks/api';
import { cn } from '@/lib/cn';
import { downloadCsv, toCsv, type CsvColumn } from '@/lib/csv';
import { convertMinor, toMajor } from '@/lib/money';
import { RANGE_PRESETS, resolvePreset, type RangePreset } from '@/lib/dates';
import { CATEGORIES, CATEGORY_KEYS, TRANSACTION_STATUSES, TRANSACTION_TYPES } from '@/lib/taxonomy';
import type {
  CategoryKey,
  SortDirection,
  Transaction,
  TransactionDirection,
  TransactionQuery,
  TransactionStatus,
  TransactionType,
} from '@/types/domain';

/* ───────────────────────── Filter state ───────────────────────── */

interface Filters {
  search: string;
  accountId: string;
  type: TransactionType | 'all';
  status: TransactionStatus | 'all';
  direction: TransactionDirection | 'all';
  category: CategoryKey | 'all';
  /** A named window, or `custom` when the two date fields are driving. */
  preset: RangePreset | 'custom';
  from: string;
  to: string;
  sortBy: LedgerSortKey;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
}

const DEFAULTS: Filters = {
  search: '',
  accountId: 'all',
  type: 'all',
  status: 'all',
  direction: 'all',
  category: 'all',
  preset: '90d',
  from: '',
  to: '',
  sortBy: 'date',
  sortDirection: 'desc',
  page: 1,
  pageSize: 12,
};

const TYPE_VALUES = ['all', ...(Object.keys(TRANSACTION_TYPES) as TransactionType[])] as const;
const STATUS_VALUES = [
  'all',
  ...(Object.keys(TRANSACTION_STATUSES) as TransactionStatus[]),
] as const;
const DIRECTION_VALUES = ['all', 'credit', 'debit'] as const;
const CATEGORY_VALUES = ['all', ...CATEGORY_KEYS] as const;
const PRESET_VALUES = [...RANGE_PRESETS.map((preset) => preset.id), 'custom'] as const;
const SORT_KEYS = ['date', 'counterparty', 'amountMinor'] as const;
const SORT_DIRECTIONS = ['asc', 'desc'] as const;

/** Accept a query-string value only if it is one the app actually understands. */
function oneOf<T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

function toInt(raw: string | null, fallback: number, allowed?: readonly number[]): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  const value = Math.floor(parsed);
  return allowed && !allowed.includes(value) ? fallback : value;
}

/** The row counts the pagination control offers. */
const PAGE_SIZES = [12, 24, 48] as const;

/**
 * The query string is the state.
 *
 * A filtered statement is something people send to a colleague or come back to
 * tomorrow, so the address bar has to hold the whole question. Deriving the
 * filters from the URL rather than mirroring them into `useState` also means the
 * two can never disagree, and the back button steps through filter changes —
 * which is what everyone expects it to do and almost no dashboard delivers.
 */
function readFilters(params: URLSearchParams): Filters {
  return {
    search: params.get('q') ?? DEFAULTS.search,
    accountId: params.get('account') ?? DEFAULTS.accountId,
    type: oneOf(params.get('type'), TYPE_VALUES, DEFAULTS.type),
    status: oneOf(params.get('status'), STATUS_VALUES, DEFAULTS.status),
    direction: oneOf(params.get('flow'), DIRECTION_VALUES, DEFAULTS.direction),
    category: oneOf(params.get('category'), CATEGORY_VALUES, DEFAULTS.category),
    preset: oneOf(params.get('range'), PRESET_VALUES, DEFAULTS.preset),
    from: params.get('from') ?? DEFAULTS.from,
    to: params.get('to') ?? DEFAULTS.to,
    sortBy: oneOf(params.get('sort'), SORT_KEYS, DEFAULTS.sortBy),
    sortDirection: oneOf(params.get('dir'), SORT_DIRECTIONS, DEFAULTS.sortDirection),
    page: toInt(params.get('page'), DEFAULTS.page),
    pageSize: toInt(params.get('size'), DEFAULTS.pageSize, PAGE_SIZES),
  };
}

/** Only what differs from the defaults, so an untouched page has a clean URL. */
function writeFilters(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  const put = (key: string, value: string | number, fallback: string | number) => {
    if (String(value) !== String(fallback)) params.set(key, String(value));
  };

  put('q', filters.search, DEFAULTS.search);
  put('account', filters.accountId, DEFAULTS.accountId);
  put('type', filters.type, DEFAULTS.type);
  put('status', filters.status, DEFAULTS.status);
  put('flow', filters.direction, DEFAULTS.direction);
  put('category', filters.category, DEFAULTS.category);
  put('range', filters.preset, DEFAULTS.preset);
  put('from', filters.from, DEFAULTS.from);
  put('to', filters.to, DEFAULTS.to);
  put('sort', filters.sortBy, DEFAULTS.sortBy);
  put('dir', filters.sortDirection, DEFAULTS.sortDirection);
  put('page', filters.page, DEFAULTS.page);
  put('size', filters.pageSize, DEFAULTS.pageSize);

  return params;
}

/* ───────────────────────────── CSV ───────────────────────────── */

/**
 * An export is a record, not a conversion: amounts leave in the account's own
 * currency and in major units, so the file reconciles against a real statement
 * whatever the display currency happens to be set to.
 */
const CSV_COLUMNS: CsvColumn<Transaction>[] = [
  { header: 'Date', value: (row) => row.date },
  { header: 'Counterparty', value: (row) => row.counterparty },
  { header: 'Description', value: (row) => row.description },
  { header: 'Reference', value: (row) => row.reference },
  { header: 'Type', value: (row) => TRANSACTION_TYPES[row.type] },
  { header: 'Status', value: (row) => TRANSACTION_STATUSES[row.status].label },
  { header: 'Direction', value: (row) => (row.direction === 'credit' ? 'Credit' : 'Debit') },
  { header: 'Currency', value: (row) => row.currency },
  { header: 'Amount', value: (row) => toMajor(row.amountMinor, row.currency) },
  { header: 'Fee', value: (row) => toMajor(row.feeMinor, row.currency) },
  {
    header: 'Balance after',
    value: (row) =>
      row.status === 'settled' ? toMajor(row.balanceAfterMinor, row.currency) : '',
  },
];

/* ─────────────────────────── The page ─────────────────────────── */

const STATUS_TABS = [
  { value: 'all' as const, label: 'All' },
  { value: 'settled' as const, label: 'Settled' },
  { value: 'pending' as const, label: 'Pending' },
  { value: 'scheduled' as const, label: 'Scheduled' },
  { value: 'failed' as const, label: 'Failed' },
];

const FLOW_OPTIONS = [
  { value: 'all' as const, label: 'Everything' },
  { value: 'credit' as const, label: 'Money in' },
  { value: 'debit' as const, label: 'Money out' },
];

/**
 * Transactions.
 *
 * A statement, not a feed. Filtering, sorting and paging all happen on the API's
 * side of the wire, so this page only ever holds one page of rows and a question
 * about them. The totals strip answers that question over the whole match rather
 * than the visible page — a filtered total that only counts twelve rows is worse
 * than no total at all.
 */
export default function Transactions() {
  const [params, setParams] = useSearchParams();
  const { money } = useCurrency();
  const toast = useToast();

  const filters = useMemo(() => readFilters(params), [params]);

  const [searchText, setSearchText] = useState(filters.search);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);

  /**
   * Patches merge against whatever the URL currently says, not against a stale
   * render, so two controls changed in quick succession cannot clobber each
   * other. Explicit control changes push a history entry; only the debounced
   * search replaces, or typing eight characters would bury the previous page
   * under eight of them.
   */
  const commit = useCallback(
    (patch: Partial<Filters>, options: { replace?: boolean } = {}) => {
      setParams(
        (current) =>
          // Any change other than paging returns you to page one: page 7 of a
          // different question is meaningless.
          writeFilters({ ...readFilters(current), ...patch, page: patch.page ?? 1 }),
        { replace: options.replace ?? false },
      );
    },
    [setParams],
  );

  const update = useCallback((patch: Partial<Filters>) => commit(patch), [commit]);

  // Follow the URL when it changes underneath us — back, forward, or a reset.
  useEffect(() => {
    setSearchText(filters.search);
  }, [filters.search]);

  /**
   * Typing should not fire a request per keystroke. Two guards, both load
   * bearing: the first waits for the field to stop moving, the second stops a
   * settled value from being written back over a URL that has since changed —
   * without it, pressing Back would be immediately undone by the debounce.
   */
  const debouncedSearch = useDebounce(searchText, 250);
  useEffect(() => {
    if (debouncedSearch !== searchText) return;
    if (debouncedSearch === filters.search) return;
    commit({ search: debouncedSearch }, { replace: true });
  }, [debouncedSearch, searchText, filters.search, commit]);

  const range =
    filters.preset === 'custom'
      ? { from: filters.from || undefined, to: filters.to || undefined }
      : resolvePreset(filters.preset);

  const query: TransactionQuery = {
    search: filters.search || undefined,
    accountId: filters.accountId,
    type: filters.type,
    status: filters.status,
    direction: filters.direction,
    category: filters.category,
    from: range.from,
    to: range.to,
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection,
    page: filters.page,
    pageSize: filters.pageSize,
  };

  // One string beats a twelve-item dependency array, and it is stable by value.
  const pageKey = JSON.stringify(query);
  const scopeQuery: TransactionQuery = { ...query, page: 1, pageSize: 5_000 };
  const scopeKey = JSON.stringify(scopeQuery);

  const accounts = useApi(() => api.getAccounts(), []);
  const page = useApi(() => api.getTransactions(query), [pageKey]);
  /** The whole match, for the totals strip and the export. */
  const matched = useApi(() => api.getTransactions(scopeQuery), [scopeKey]);

  const accountName = useCallback(
    (id: string) => accounts.data?.find((account) => account.id === id)?.name ?? 'Account',
    [accounts.data],
  );

  const totals = useMemo(() => {
    const rows = matched.data?.rows ?? [];
    let credit = 0;
    let debit = 0;

    for (const transaction of rows) {
      if (transaction.direction === 'credit') {
        credit += convertMinor(transaction.amountMinor, transaction.currency, 'USD');
      } else {
        // Fees are part of what leaving costs, so they sit on the debit side.
        debit += convertMinor(
          transaction.amountMinor + transaction.feeMinor,
          transaction.currency,
          'USD',
        );
      }
    }

    return { credit, debit, net: credit - debit, count: rows.length };
  }, [matched.data]);

  const onSort = useCallback(
    (key: LedgerSortKey) =>
      commit({
        sortBy: key,
        // Re-clicking the active column flips it; a new column starts descending,
        // which is what you want for both dates and amounts.
        sortDirection:
          filters.sortBy === key ? (filters.sortDirection === 'asc' ? 'desc' : 'asc') : 'desc',
      }),
    [commit, filters.sortBy, filters.sortDirection],
  );

  const resetAll = useCallback(() => {
    setSearchText('');
    setParams(new URLSearchParams());
  }, [setParams]);

  const exportCsv = useCallback(() => {
    const rows = matched.data?.rows ?? [];
    if (rows.length === 0) return;

    downloadCsv(
      `nexabank-statement-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(rows, CSV_COLUMNS),
    );
    toast.success(
      `Exported ${rows.length.toLocaleString('en-US')} transactions`,
      'Amounts are in each account’s own currency, unconverted.',
    );
  }, [matched.data, toast]);

  /* Active filters, as removable tokens. */
  const chips: { label: string; clear: () => void }[] = [];
  if (filters.search) {
    chips.push({
      label: `“${filters.search}”`,
      clear: () => {
        setSearchText('');
        update({ search: '' });
      },
    });
  }
  if (filters.accountId !== 'all') {
    chips.push({ label: accountName(filters.accountId), clear: () => update({ accountId: 'all' }) });
  }
  if (filters.type !== 'all') {
    chips.push({ label: TRANSACTION_TYPES[filters.type], clear: () => update({ type: 'all' }) });
  }
  if (filters.direction !== 'all') {
    chips.push({
      label: filters.direction === 'credit' ? 'Money in' : 'Money out',
      clear: () => update({ direction: 'all' }),
    });
  }
  if (filters.category !== 'all') {
    chips.push({
      label: CATEGORIES[filters.category].label,
      clear: () => update({ category: 'all' }),
    });
  }
  if (filters.preset === 'custom') {
    chips.push({
      label: `${filters.from || 'the beginning'} → ${filters.to || 'today'}`,
      clear: () => update({ preset: DEFAULTS.preset, from: '', to: '' }),
    });
  } else if (filters.preset !== DEFAULTS.preset) {
    chips.push({
      label: RANGE_PRESETS.find((preset) => preset.id === filters.preset)?.label ?? filters.preset,
      clear: () => update({ preset: DEFAULTS.preset }),
    });
  }

  const stale = page.loading && !page.initialLoading;

  return (
    <>
      <PageHeader
        eyebrow="Transactions"
        title="Statement"
        description="Every posting across all accounts, filtered on the server the way a real statement search would be."
        actions={
          <>
            <Button
              variant="outline"
              icon={<Download className="size-4" />}
              onClick={exportCsv}
              disabled={matched.loading || totals.count === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              icon={<SlidersHorizontal className="size-4" />}
              onClick={() => setPanelOpen(true)}
            >
              Filters
              {chips.length > 0 ? (
                <span className="amount ml-0.5 font-mono text-xs opacity-70">{chips.length}</span>
              ) : null}
            </Button>
          </>
        }
      />

      {/* Search and scope */}
      <div className="panel mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center sm:px-4">
        <SearchInput
          value={searchText}
          onChange={setSearchText}
          placeholder="Counterparty, description, reference or ID"
          aria-label="Search transactions"
          className="w-full lg:max-w-md"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:ml-auto">
          <AccountPicker
            accounts={accounts.data ?? []}
            value={filters.accountId}
            onChange={(next) => update({ accountId: next })}
          />
          <Segmented
            label="Direction"
            value={filters.direction}
            onChange={(next) => update({ direction: next })}
            options={FLOW_OPTIONS}
            size="sm"
            className="self-start sm:self-auto"
          />
        </div>
      </div>

      {/* Active filters */}
      {chips.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <FilterChip key={chip.label} label={chip.label} onRemove={chip.clear} />
          ))}
          <button
            type="button"
            onClick={resetAll}
            className="ml-1 text-xs text-primary transition-opacity hover:opacity-75"
          >
            Clear all
          </button>
        </div>
      ) : null}

      <Panel>
        <PanelHeader
          title={
            <span className="flex items-baseline gap-2">
              Results
              <span className="amount font-mono text-sm font-normal text-base-content/45">
                {page.initialLoading ? '—' : (page.data?.total ?? 0).toLocaleString('en-US')}
              </span>
            </span>
          }
          actions={
            matched.data && !matched.error ? (
              <dl
                className={cn(
                  'flex items-baseline gap-4 transition-opacity duration-200',
                  matched.loading && 'opacity-55',
                )}
              >
                <div className="text-right">
                  <dt className="eyebrow text-base-content/40">In</dt>
                  <dd className="amount mt-0.5 font-mono text-sm text-success">
                    {money(totals.credit, 'USD', { compact: true })}
                  </dd>
                </div>
                <div className="text-right">
                  <dt className="eyebrow text-base-content/40">Out</dt>
                  <dd className="amount mt-0.5 font-mono text-sm">
                    {money(totals.debit, 'USD', { compact: true })}
                  </dd>
                </div>
                <div className="text-right">
                  <dt className="eyebrow text-base-content/40">Net</dt>
                  <dd
                    className={cn(
                      'amount mt-0.5 font-mono text-sm',
                      totals.net < 0 ? 'text-error' : 'text-success',
                    )}
                  >
                    {money(totals.net, 'USD', { compact: true, signed: true })}
                  </dd>
                </div>
              </dl>
            ) : null
          }
        />

        <div className="px-4 pt-3 sm:px-5">
          <Tabs
            label="Status"
            value={filters.status}
            onChange={(next) => update({ status: next })}
            options={STATUS_TABS}
          />
        </div>

        <PanelBody flush>
          <div className={cn('transition-opacity duration-200', stale && 'opacity-55')}>
            <TransactionLedger
              rows={page.data?.rows ?? []}
              loading={page.initialLoading}
              error={page.error}
              onRetry={page.refetch}
              onSelect={setSelected}
              accountName={filters.accountId === 'all' ? accountName : undefined}
              showBalance={filters.accountId !== 'all'}
              skeletonRows={Math.min(filters.pageSize, 12)}
              sort={{ by: filters.sortBy, direction: filters.sortDirection, onSort }}
            />
          </div>
        </PanelBody>

        {page.data && page.data.total > 0 ? (
          <Pagination
            page={page.data.page}
            pageCount={page.data.pageCount}
            total={page.data.total}
            pageSize={page.data.pageSize}
            onPage={(next) => update({ page: next })}
            onPageSize={(size) => update({ pageSize: size })}
          />
        ) : null}
      </Panel>

      {/* Everything else, in a drawer — six selects in a toolbar is a cockpit. */}
      <Drawer
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        eyebrow="Refine"
        title="Filters"
        footer={
          <>
            <Button variant="quiet" onClick={resetAll}>
              Reset
            </Button>
            <Button variant="primary" onClick={() => setPanelOpen(false)}>
              Show {(page.data?.total ?? 0).toLocaleString('en-US')} results
            </Button>
          </>
        }
      >
        <Field label="Date range" htmlFor="filter-range" hint="Presets are relative to today.">
          <Select
            id="filter-range"
            value={filters.preset}
            onChange={(event) => update({ preset: event.target.value as RangePreset | 'custom' })}
          >
            {RANGE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
            <option value="custom">Custom range</option>
          </Select>
        </Field>

        {filters.preset === 'custom' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" htmlFor="filter-from">
              <Input
                id="filter-from"
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(event) => update({ from: event.target.value })}
              />
            </Field>
            <Field label="To" htmlFor="filter-to">
              <Input
                id="filter-to"
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(event) => update({ to: event.target.value })}
              />
            </Field>
          </div>
        ) : null}

        <Field label="Type" htmlFor="filter-type">
          <Select
            id="filter-type"
            value={filters.type}
            onChange={(event) => update({ type: event.target.value as TransactionType | 'all' })}
          >
            <option value="all">Every type</option>
            {(Object.keys(TRANSACTION_TYPES) as TransactionType[]).map((key) => (
              <option key={key} value={key}>
                {TRANSACTION_TYPES[key]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Category" htmlFor="filter-category">
          <Select
            id="filter-category"
            value={filters.category}
            onChange={(event) => update({ category: event.target.value as CategoryKey | 'all' })}
          >
            <option value="all">Every category</option>
            {CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>
                {CATEGORIES[key].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status" htmlFor="filter-status">
          <Select
            id="filter-status"
            value={filters.status}
            onChange={(event) =>
              update({ status: event.target.value as TransactionStatus | 'all' })
            }
          >
            <option value="all">Any status</option>
            {(Object.keys(TRANSACTION_STATUSES) as TransactionStatus[]).map((key) => (
              <option key={key} value={key}>
                {TRANSACTION_STATUSES[key].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Sort by" htmlFor="filter-sort">
          <Select
            id="filter-sort"
            value={`${filters.sortBy}:${filters.sortDirection}`}
            onChange={(event) => {
              const [by, direction] = event.target.value.split(':');
              update({
                sortBy: by as LedgerSortKey,
                sortDirection: direction as SortDirection,
              });
            }}
          >
            <option value="date:desc">Newest first</option>
            <option value="date:asc">Oldest first</option>
            <option value="amountMinor:desc">Largest amount</option>
            <option value="amountMinor:asc">Smallest amount</option>
            <option value="counterparty:asc">Counterparty A–Z</option>
            <option value="counterparty:desc">Counterparty Z–A</option>
          </Select>
        </Field>
      </Drawer>

      <TransactionDrawer
        transaction={selected}
        onClose={() => setSelected(null)}
        accountName={accountName}
      />
    </>
  );
}
