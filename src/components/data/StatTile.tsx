import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Delta } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Feedback';

/**
 * A single figure with its context.
 *
 * The number is the loudest thing in the tile and everything else is quiet
 * around it: label above, movement below, no chrome. Tiles keep their height
 * whether they are loading, empty or full, so a row of them never reflows.
 */
export function StatTile({
  label,
  value,
  delta,
  deltaSuffix,
  invertDelta = false,
  hint,
  icon,
  loading = false,
  className,
}: {
  label: string;
  value: ReactNode;
  /** Percent change against the previous period. */
  delta?: number;
  deltaSuffix?: string;
  /** For costs, where a fall is the good news. */
  invertDelta?: boolean;
  hint?: ReactNode;
  icon?: ReactNode;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('panel flex flex-col justify-between gap-3 p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow text-base-content/45">{label}</p>
        {icon ? <span className="shrink-0 text-base-content/30">{icon}</span> : null}
      </div>

      {loading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-7 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      ) : (
        <div>
          <p className="amount font-mono text-[1.45rem] leading-none tracking-tight sm:text-[1.6rem]">
            {value}
          </p>
          {delta !== undefined ? (
            <Delta
              className="mt-2.5"
              value={delta}
              invert={invertDelta}
              suffix={deltaSuffix ?? 'vs previous period'}
            />
          ) : hint ? (
            <p className="mt-2.5 text-xs leading-relaxed text-base-content/45">{hint}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Row of tiles. Two up on a phone, four on a desktop — never one long column. */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</div>
  );
}
