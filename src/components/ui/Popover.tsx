import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type PopoverChildren = ReactNode | ((state: { close: () => void }) => ReactNode);

/**
 * Anchored panel for the notification tray, the account menu and filter groups.
 *
 * Closes on outside pointer-down, on Escape, and on route-level actions via the
 * `close` argument. It deliberately does not trap focus — a popover is not a
 * modal, and trapping focus in one makes keyboard users fight it.
 */
export function Popover({
  trigger,
  children,
  label,
  align = 'end',
  panelClassName,
  triggerClassName,
}: {
  trigger: ReactNode;
  children: PopoverChildren;
  /** Accessible name for the trigger. */
  label: string;
  align?: 'start' | 'end';
  panelClassName?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className={cn('block', triggerClassName)}
      >
        {trigger}
      </button>

      {open ? (
        <div
          className={cn(
            'panel absolute z-40 mt-2 w-72 animate-rise overflow-hidden',
            align === 'end' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
        </div>
      ) : null}
    </div>
  );
}
