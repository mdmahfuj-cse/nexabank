import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Form primitives.
 *
 * Every control is a plain DOM element under the hood so React Hook Form's
 * `{...register(name)}` spread — name, onChange, onBlur, ref — lands directly on
 * it. React 19 passes ref as a prop, so no forwardRef anywhere in this file.
 */

const CONTROL_BASE =
  'w-full rounded-[var(--radius-field)] border bg-base-100 text-sm text-base-content transition-colors placeholder:text-base-content/35 disabled:cursor-not-allowed disabled:opacity-55';

const CONTROL_TONE = {
  normal: 'border-base-300 hover:border-base-content/25 focus:border-primary',
  invalid: 'border-error/70 focus:border-error',
};

function controlClasses(invalid: boolean | undefined, className: string | undefined) {
  return cn(CONTROL_BASE, invalid ? CONTROL_TONE.invalid : CONTROL_TONE.normal, className);
}

/**
 * Label, control, then either a hint or an error — never both, so the space
 * below a control never changes height when validation fires.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional = false,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="eyebrow text-base-content/55">
          {label}
        </label>
        {optional ? (
          <span className="text-[0.7rem] text-base-content/35">Optional</span>
        ) : null}
      </div>

      {children}

      <p
        className={cn(
          'min-h-[1.05rem] text-xs leading-tight',
          error ? 'text-error' : 'text-base-content/45',
        )}
        role={error ? 'alert' : undefined}
      >
        {error ?? hint ?? ''}
      </p>
    </div>
  );
}

export function Input({
  invalid,
  className,
  leading,
  trailing,
  ...rest
}: { invalid?: boolean; leading?: ReactNode; trailing?: ReactNode } & ComponentProps<'input'>) {
  if (leading || trailing) {
    return (
      <div className="relative">
        {leading ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base-content/40">
            {leading}
          </span>
        ) : null}
        <input
          aria-invalid={invalid || undefined}
          className={controlClasses(
            invalid,
            cn('h-10', leading ? 'pl-9' : 'pl-3', trailing ? 'pr-11' : 'pr-3', className),
          )}
          {...rest}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span>
        ) : null}
      </div>
    );
  }

  return (
    <input
      aria-invalid={invalid || undefined}
      className={controlClasses(invalid, cn('h-10 px-3', className))}
      {...rest}
    />
  );
}

export function Select({
  invalid,
  className,
  children,
  ...rest
}: { invalid?: boolean } & ComponentProps<'select'>) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={controlClasses(invalid, cn('h-10 cursor-pointer px-3', className))}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea({
  invalid,
  className,
  ...rest
}: { invalid?: boolean } & ComponentProps<'textarea'>) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={controlClasses(invalid, cn('min-h-[5.5rem] resize-y px-3 py-2', className))}
      {...rest}
    />
  );
}

/**
 * Amount entry. Currency symbol is printed inside the field, the value sits in
 * tabular monospace and right-aligned — the way an amount appears on a
 * statement, so the figure you type looks like the figure you will be shown.
 */
export function AmountInput({
  symbol,
  invalid,
  className,
  ...rest
}: { symbol: string; invalid?: boolean } & ComponentProps<'input'>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-mono text-sm text-base-content/45">
        {symbol}
      </span>
      <input
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={invalid || undefined}
        className={controlClasses(
          invalid,
          cn('amount h-14 pl-10 pr-4 text-right font-mono text-2xl tracking-tight', className),
        )}
        {...rest}
      />
    </div>
  );
}

/** Switch for card controls and preferences. The whole row is the hit target. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'group flex w-full items-start justify-between gap-4 rounded-[var(--radius-field)] px-1 py-2 text-left transition-colors',
        disabled ? 'cursor-not-allowed opacity-55' : 'hover:bg-base-200/60',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-base-content/55">
            {description}
          </span>
        ) : null}
      </span>

      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors',
          checked ? 'border-primary bg-primary/85' : 'border-base-300 bg-base-300/60',
        )}
      >
        <span
          className={cn(
            'size-4 rounded-full bg-base-100 shadow-sm transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </span>
    </button>
  );
}

/** Radio-style choice rendered as cards — used for transfer speed and card type. */
export function ChoiceGroup<T extends string>({
  name,
  value,
  onChange,
  options,
  columns = 2,
}: {
  name: string;
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string; description?: string; meta?: string }[];
  columns?: 1 | 2 | 3;
}) {
  const grid = { 1: 'grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' };

  return (
    <div className={cn('grid gap-2', grid[columns])} role="radiogroup" aria-label={name}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-[var(--radius-box)] border px-3.5 py-3 text-left transition-colors',
              active
                ? 'border-primary/70 bg-primary/10'
                : 'border-base-300 hover:border-base-content/25',
            )}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{option.label}</span>
              {option.meta ? (
                <span className="amount font-mono text-xs text-base-content/55">{option.meta}</span>
              ) : null}
            </span>
            {option.description ? (
              <span className="mt-1 block text-xs leading-relaxed text-base-content/55">
                {option.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
