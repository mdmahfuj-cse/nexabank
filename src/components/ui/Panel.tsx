import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * A panel is the only container in the app. Hairline border, inset highlight,
 * no drop shadow — the surfaces should read like plates on a press sheet, not
 * like floating cards.
 */

export function Panel({
  children,
  className,
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article' | 'aside';
}) {
  return <Tag className={cn('panel overflow-hidden', className)}>{children}</Tag>;
}

export function PanelHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-base-300 px-4 py-3.5 sm:px-5',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="eyebrow text-base-content/45">{eyebrow}</p>
        ) : null}
        {title ? (
          <h2 className="mt-1.5 truncate font-display text-lg leading-tight font-medium">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p className="mt-1 max-w-prose text-sm text-base-content/60">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function PanelBody({
  children,
  className,
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return <div className={cn(flush ? '' : 'p-4 sm:p-5', className)}>{children}</div>;
}

/** Label above a figure, used across KPI tiles and detail rows. */
export function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('eyebrow text-base-content/45', className)}>{children}</p>;
}

/** A key/value line, as it would appear on a statement. */
export function DetailRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-6 border-b border-[var(--rule)] py-2.5 last:border-0',
        className,
      )}
    >
      <dt className="text-sm text-base-content/55">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium">{children}</dd>
    </div>
  );
}
