import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Step {
  id: string;
  label: string;
}

/**
 * Progress rail for the transfer flow. Says where you are, what you have
 * cleared, and what is still ahead — the reassurance a payment screen owes you.
 */
export function Stepper({
  steps,
  current,
  className,
}: {
  steps: Step[];
  /** Index of the active step. */
  current: number;
  className?: string;
}) {
  return (
    <ol
      className={cn('flex items-center gap-2 sm:gap-3', className)}
      aria-label={`Step ${current + 1} of ${steps.length}`}
    >
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;

        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[0.7rem] transition-colors',
                  done && 'border-primary bg-primary text-primary-content',
                  active && 'border-primary text-primary',
                  !done && !active && 'border-base-300 text-base-content/35',
                )}
                aria-hidden="true"
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  'truncate text-xs transition-colors sm:text-[0.8rem]',
                  active ? 'font-medium text-base-content' : 'text-base-content/45',
                )}
              >
                {step.label}
                {active ? <span className="sr-only"> (current step)</span> : null}
              </span>
            </div>

            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'h-px min-w-4 flex-1 transition-colors',
                  done ? 'bg-primary/50' : 'bg-base-300',
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
