import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Every page opens the same way: what this is, one line of orientation, then
 * the controls that belong to it. Consistency here is what makes the app feel
 * like one product rather than five screens.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-5',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow text-base-content/45">{eyebrow}</p> : null}
        <h1 className="mt-2 font-display text-2xl leading-none tracking-tight sm:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-base-content/55">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
