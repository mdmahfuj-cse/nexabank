import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { SideRail } from '@/components/layout/SideRail';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Wordmark } from '@/components/brand/Wordmark';
import { IconButton } from '@/components/ui/Button';
import { RouteFallback } from '@/components/ui/Feedback';

/**
 * The application frame.
 *
 * Fixed rail on the left from lg up, sticky top bar, and a bottom bar on
 * phones. The main column is the only thing that scrolls, which keeps the
 * currency selector and the account menu reachable at any depth.
 */
export function Shell() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile rail on navigation, and scroll the new page to the top —
  // arriving halfway down a page you have never seen is disorienting.
  useEffect(() => {
    setNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-[var(--radius-field)] focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-content"
      >
        Skip to content
      </a>

      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-base-300 bg-base-100 lg:block">
        <SideRail />
      </aside>

      {/* Mobile rail */}
      {navOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-[2px]"
          />
          <div className="relative h-full w-[17rem] animate-slide-over border-r border-base-300 bg-base-100">
            <div className="flex h-16 items-center justify-between px-5">
              <Wordmark size="sm" />
              <IconButton label="Close navigation" onClick={() => setNavOpen(false)}>
                <X className="size-4" />
              </IconButton>
            </div>
            <div className="h-[calc(100%-4rem)]">
              <SideRail showBrand={false} onNavigate={() => setNavOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <TopBar onOpenNav={() => setNavOpen(true)} />
        <main id="main" className="px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8">
          <div className="mx-auto w-full max-w-[86rem]">
            {/* One boundary for every lazily-loaded page in the app. */}
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
