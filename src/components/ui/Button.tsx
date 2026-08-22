import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-content hover:brightness-110 active:brightness-95 border border-transparent',
  outline:
    'border border-base-300 bg-transparent hover:bg-base-200 text-base-content',
  ghost: 'border border-transparent hover:bg-base-200 text-base-content',
  quiet:
    'border border-transparent bg-base-200 hover:bg-base-300 text-base-content',
  danger:
    'bg-error text-error-content hover:brightness-110 border border-transparent',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[0.8125rem] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-[0.9375rem] gap-2',
};

const BASE =
  'inline-flex shrink-0 items-center justify-center rounded-[var(--radius-field)] font-medium tracking-[-0.01em] transition-[background-color,border-color,filter,opacity] duration-150 disabled:pointer-events-none disabled:opacity-45 whitespace-nowrap';

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('size-4 animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface ButtonOwnProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({
  variant = 'outline',
  size = 'md',
  loading = false,
  block = false,
  icon,
  children,
  className,
  disabled,
  ...rest
}: ButtonOwnProps & ComponentProps<'button'>) {
  return (
    <button
      className={cn(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

/** Same skin, but it navigates. */
export function ButtonLink({
  to,
  variant = 'outline',
  size = 'md',
  block = false,
  icon,
  children,
  className,
  ...rest
}: Omit<ButtonOwnProps, 'loading'> & { to: string } & Omit<ComponentProps<typeof Link>, 'to'>) {
  return (
    <Link
      to={to}
      className={cn(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className)}
      {...rest}
    >
      {icon}
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  children,
  className,
  variant = 'ghost',
  ...rest
}: {
  label: string;
  variant?: Variant;
} & ComponentProps<'button'>) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        BASE,
        VARIANTS[variant],
        'size-9 p-0 text-base-content/70 hover:text-base-content',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
