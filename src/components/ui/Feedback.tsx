import type { CSSProperties, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Inbox, Info, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';

/** Loading placeholder shaped like the content it stands in for. */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn('animate-shimmer rounded-[var(--radius-field)] bg-base-300/70', className)}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3.5', index === lines - 1 ? 'w-2/5' : index % 2 ? 'w-4/5' : 'w-full')}
        />
      ))}
    </div>
  );
}

/** Table-shaped skeleton so rows do not jump when data lands. */
export function SkeletonRows({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-[var(--rule)]">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn(
                'h-3.5',
                columnIndex === 0 ? 'w-2/6' : columnIndex === columns - 1 ? 'ml-auto w-16' : 'w-1/6',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * An empty screen is an invitation to act, so it always offers the action.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <div className="mb-4 grid size-11 place-items-center rounded-full border border-base-300 text-base-content/40">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <p className="font-display text-lg">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-base-content/55">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/**
 * Errors say what happened and what to do next, in the interface's voice.
 * No apologies, no stack traces.
 */
export function ErrorState({
  title = 'This did not load',
  error,
  onRetry,
  className,
}: {
  title?: string;
  error?: Error | string;
  onRetry?: () => void;
  className?: string;
}) {
  const message =
    typeof error === 'string'
      ? error
      : (error?.message ?? 'The connection dropped before the data arrived.');

  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="mb-4 grid size-11 place-items-center rounded-full border border-error/30 bg-error/10 text-error">
        <AlertTriangle className="size-5" />
      </div>
      <p className="font-display text-lg">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-base-content/55">{message}</p>
      {onRetry ? (
        <Button
          className="mt-5"
          size="sm"
          variant="outline"
          onClick={onRetry}
          icon={<RotateCcw className="size-3.5" />}
        >
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Full-bleed loading state for a whole route. */
export function RouteFallback({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-base-content/50">
        <span className="size-6 animate-spin rounded-full border-2 border-base-300 border-t-primary" />
        <p className="eyebrow">{label}</p>
      </div>
    </div>
  );
}

const ALERT_TONES = {
  error: { ring: 'border-error/30 bg-error/10 text-error', icon: AlertTriangle },
  warning: { ring: 'border-warning/30 bg-warning/10 text-warning', icon: AlertTriangle },
  info: { ring: 'border-info/30 bg-info/10 text-info', icon: Info },
  success: { ring: 'border-success/30 bg-success/10 text-success', icon: CheckCircle2 },
};

/**
 * A message attached to the thing that caused it. Forms use this instead of a
 * toast, because a validation failure has to still be on screen when you look
 * back at the field.
 */
export function InlineAlert({
  tone = 'error',
  children,
  className,
}: {
  tone?: keyof typeof ALERT_TONES;
  children: ReactNode;
  className?: string;
}) {
  const { ring, icon: Icon } = ALERT_TONES[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-[var(--radius-box)] border px-3.5 py-3 text-sm',
        ring,
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
