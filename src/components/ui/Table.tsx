import type { ComponentProps, ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from '@/components/ui/Button';
import type { SortDirection } from '@/types/domain';

/**
 * Statement-style table. Hairline rules, sticky head, numerals right-aligned
 * and tabular so the columns hold their shape as you scroll.
 */

export function TableScroll({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full min-w-[46rem] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-base-100">
      <tr className="border-b border-base-300">{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  numeric = false,
  className,
  ...rest
}: { numeric?: boolean } & ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      data-numeric={numeric ? '' : undefined}
      className={cn(
        'eyebrow px-4 py-2.5 text-base-content/45 sm:px-5',
        numeric ? 'text-right' : 'text-left',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-[var(--rule)]">{children}</tbody>;
}

export function Tr({
  children,
  interactive = false,
  className,
  ...rest
}: { interactive?: boolean } & ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        'transition-colors',
        interactive && 'cursor-pointer hover:bg-base-200 focus-visible:bg-base-200',
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  numeric = false,
  className,
  ...rest
}: { numeric?: boolean } & ComponentProps<'td'>) {
  return (
    <td
      data-numeric={numeric ? '' : undefined}
      className={cn('px-4 py-3 align-middle sm:px-5', numeric && 'text-right', className)}
      {...rest}
    >
      {children}
    </td>
  );
}

/** Column header that sorts. Announces its state to screen readers. */
export function SortButton({
  label,
  active,
  direction,
  onClick,
  numeric = false,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  numeric?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(
        'eyebrow inline-flex items-center gap-1 transition-colors hover:text-base-content',
        numeric && 'flex-row-reverse',
        active ? 'text-base-content' : 'text-base-content/45',
      )}
    >
      {label}
      {active ? (
        direction === 'asc' ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <span className="size-3" aria-hidden="true" />
      )}
    </button>
  );
}

const PAGE_SIZES = [12, 24, 48];

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
  onPageSize,
  noun = 'transactions',
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize?: (size: number) => void;
  noun?: string;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-base-300 px-4 py-3 sm:px-5">
      <p className="font-mono text-xs text-base-content/55">
        <span className="amount">{first}</span>–<span className="amount">{last}</span> of{' '}
        <span className="amount">{total.toLocaleString('en-US')}</span> {noun}
      </p>

      <div className="flex items-center gap-3">
        {onPageSize ? (
          <label className="flex items-center gap-2 text-xs text-base-content/55">
            Rows
            <select
              className="h-8 rounded-[var(--radius-field)] border border-base-300 bg-base-100 px-2 text-xs"
              value={pageSize}
              onChange={(event) => onPageSize(Number(event.target.value))}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex items-center gap-1">
          <IconButton
            label="Previous page"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeft className="size-4" />
          </IconButton>
          <p className="px-2 font-mono text-xs text-base-content/70">
            <span className="amount">{page}</span>
            <span className="text-base-content/35"> / {pageCount}</span>
          </p>
          <IconButton
            label="Next page"
            variant="outline"
            disabled={page >= pageCount}
            onClick={() => onPage(page + 1)}
          >
            <ChevronRight className="size-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
