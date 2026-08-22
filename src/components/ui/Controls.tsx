import { useState, type ComponentProps, type ReactNode } from 'react';
import { Check, Copy, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Small controls that appear across several pages. */

/** Range and scope switcher. One row, current option engraved rather than filled. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-[var(--radius-field)] border border-base-300 bg-base-200/50 p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-[calc(var(--radius-field)-2px)] font-medium transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[0.8rem]',
              active
                ? 'bg-base-100 text-base-content shadow-[var(--inset)]'
                : 'text-base-content/55 hover:text-base-content',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Underlined tabs for sections inside a page. */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="no-scrollbar flex items-center gap-6 overflow-x-auto border-b border-base-300"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 pb-2.5 text-sm transition-colors',
              active
                ? 'border-primary text-base-content'
                : 'border-transparent text-base-content/50 hover:text-base-content/80',
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className="amount font-mono text-[0.7rem] text-base-content/40">
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Search field with a clear affordance that only appears once there is text. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  className,
  ...rest
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
} & Omit<ComponentProps<'input'>, 'value' | 'onChange'>) {
  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-base-content/35"
      />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-[var(--radius-field)] border border-base-300 bg-base-100 pl-9 pr-9 text-sm transition-colors placeholder:text-base-content/35 hover:border-base-content/25 focus:border-primary"
        {...rest}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-base-content/40 transition-colors hover:text-base-content"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/** Utilisation meter for spending limits. Turns amber then red as it fills. */
export function Progress({
  value,
  max,
  label,
  caption,
}: {
  value: number;
  max: number;
  label?: string;
  caption?: ReactNode;
}) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const pct = Math.round(ratio * 100);
  const tone =
    ratio >= 0.9 ? 'bg-error' : ratio >= 0.7 ? 'bg-warning' : 'bg-primary';

  return (
    <div>
      {label || caption ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label ? <span className="text-xs text-base-content/55">{label}</span> : null}
          {caption ? (
            <span className="amount font-mono text-xs text-base-content/70">{caption}</span>
          ) : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
        className="h-1.5 w-full overflow-hidden rounded-full bg-base-300"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Copy-to-clipboard for account numbers, IBANs and reference codes. */
export function CopyButton({
  value,
  label = 'Copy',
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      // Clipboard is blocked in some embedded contexts; failing quietly is
      // better than an error toast for something this incidental.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-base-content/50 transition-colors hover:text-base-content',
        className,
      )}
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-success" />
          Copied
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          {label}
        </>
      )}
    </button>
  );
}

/** Removable filter token, shown above result tables. */
export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-200/60 py-1 pl-2.5 pr-1.5 text-xs text-base-content/75">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="rounded-full p-0.5 text-base-content/45 transition-colors hover:bg-base-300 hover:text-base-content"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
