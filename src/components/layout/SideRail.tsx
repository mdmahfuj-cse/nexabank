import { NavLink } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { NAV_ITEMS } from '@/components/layout/nav';
import { Wordmark } from '@/components/brand/Wordmark';
import { Guilloche } from '@/components/brand/Guilloche';
import { useAuth } from '@/providers/AuthProvider';
import { fmtRelative } from '@/lib/dates';
import { cn } from '@/lib/cn';

/**
 * The navigation rail.
 *
 * The active item is marked with a rule down its left edge rather than a filled
 * pill — the same way a printed index marks a section. One vertical list, no
 * collapsible groups: five destinations do not need a tree.
 */
export function SideRail({
  onNavigate,
  showBrand = true,
}: {
  onNavigate?: () => void;
  showBrand?: boolean;
}) {
  const { user } = useAuth();

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Engraving bled off the bottom corner, barely there. */}
      <Guilloche
        seed={4827193}
        layers={2}
        className="absolute -bottom-24 -left-20 size-[24rem] text-base-content/[0.05]"
      />

      {showBrand ? (
        <div className="relative flex h-16 shrink-0 items-center px-5">
          <NavLink to="/dashboard" onClick={onNavigate} aria-label="NexaBank home">
            <Wordmark size="md" />
          </NavLink>
        </div>
      ) : null}

      <nav aria-label="Main" className="relative flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-start gap-3 rounded-[var(--radius-field)] px-3 py-2.5 transition-colors',
                    isActive
                      ? 'bg-base-200/70 text-base-content'
                      : 'text-base-content/60 hover:bg-base-200/40 hover:text-base-content',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full transition-all',
                        isActive ? 'bg-primary opacity-100' : 'opacity-0',
                      )}
                    />
                    <item.icon
                      className={cn(
                        'mt-0.5 size-4 shrink-0 transition-colors',
                        isActive ? 'text-primary' : 'text-base-content/45',
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium leading-tight">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.7rem] text-base-content/40">
                        {item.hint}
                      </span>
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <footer className="relative border-t border-base-300 px-5 py-4">
        <p className="flex items-center gap-2 text-[0.7rem] text-base-content/45">
          <ShieldCheck className="size-3.5 text-primary/70" />
          Session secured
        </p>
        {user ? (
          <p className="mt-1.5 truncate text-[0.7rem] text-base-content/35">
            Last signed in {fmtRelative(user.lastSignInAt)}
          </p>
        ) : null}
      </footer>
    </div>
  );
}
