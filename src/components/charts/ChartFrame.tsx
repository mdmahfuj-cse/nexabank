import type { ReactElement, ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { Skeleton, ErrorState } from '@/components/ui/Feedback';
import { cn } from '@/lib/cn';

/**
 * Everything a chart needs around it: a fixed height so the layout never
 * reflows when data arrives, a skeleton shaped like a chart rather than a grey
 * slab, and the same error treatment the tables use.
 */
export function ChartFrame({
  height = 260,
  loading = false,
  error,
  onRetry,
  empty = false,
  emptyLabel = 'Nothing to plot for this period.',
  children,
  className,
}: {
  height?: number;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  empty?: boolean;
  emptyLabel?: string;
  children: ReactElement;
  className?: string;
}) {
  if (error) {
    return (
      <div style={{ height }} className={cn('grid place-items-center', className)}>
        <ErrorState title="Chart unavailable" error={error} onRetry={onRetry} className="py-0" />
      </div>
    );
  }

  if (loading) {
    return <ChartSkeleton height={height} className={className} />;
  }

  if (empty) {
    return (
      <div
        style={{ height }}
        className={cn('grid place-items-center px-6 text-center', className)}
      >
        <p className="max-w-xs text-sm text-base-content/45">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div style={{ height }} className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/** Bars of varying height — reads as "a chart is coming", not "something broke". */
function ChartSkeleton({ height, className }: { height: number; className?: string }) {
  const heights = [46, 68, 34, 82, 58, 74, 41, 63, 88, 52, 70, 38];

  return (
    <div
      style={{ height }}
      className={cn('flex items-end gap-2 px-1 pb-6 pt-2', className)}
      aria-hidden="true"
    >
      {heights.map((percent, index) => (
        <Skeleton key={index} className="w-full rounded-sm" style={{ height: `${percent}%` }} />
      ))}
    </div>
  );
}

/**
 * Hand-built legend. Recharts' own legend cannot show a value beside each key,
 * and on a distribution chart the value is the point.
 */
export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string; value?: ReactNode; muted?: boolean }[];
  className?: string;
}) {
  return (
    <ul className={cn('space-y-1.5', className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-baseline justify-between gap-4 text-sm">
          <span className="flex min-w-0 items-baseline gap-2">
            <span
              aria-hidden="true"
              className="mt-1 size-2 shrink-0 rounded-[2px]"
              style={{ background: item.color }}
            />
            <span className={cn('truncate', item.muted && 'text-base-content/50')}>
              {item.label}
            </span>
          </span>
          {item.value !== undefined ? (
            <span className="amount shrink-0 font-mono text-xs text-base-content/70">
              {item.value}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
