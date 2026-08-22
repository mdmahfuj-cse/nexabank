import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/components/layout/nav';
import { cn } from '@/lib/cn';

/**
 * Bottom bar for phones. Five destinations, thumb-reachable, with the safe-area
 * inset respected so the labels clear the home indicator.
 */
export function MobileNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-base-300 bg-base-100/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-1 py-2.5 transition-colors',
                  isActive ? 'text-primary' : 'text-base-content/50',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-0.5 w-6 rounded-full transition-colors',
                      isActive ? 'bg-primary' : 'bg-transparent',
                    )}
                  />
                  <item.icon className="size-[1.15rem]" />
                  <span className="text-[0.65rem] leading-none">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
