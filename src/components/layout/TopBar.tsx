import { Bell, Check, LogOut, Menu, Moon, ShieldCheck, Sun } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Wordmark } from '@/components/brand/Wordmark';
import { DemoMenu } from '@/components/layout/DemoMenu';
import { Button, IconButton } from '@/components/ui/Button';
import { Popover } from '@/components/ui/Popover';
import { Skeleton } from '@/components/ui/Feedback';
import { useApi } from '@/hooks/useApi';
import { api } from '@/mocks/api';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useCurrency } from '@/providers/CurrencyProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { CURRENCIES, CURRENCY_CODES } from '@/lib/money';
import { fmtRelative } from '@/lib/dates';
import { maskEmail } from '@/lib/masking';
import { cn } from '@/lib/cn';
import type { CurrencyCode } from '@/types/domain';

/**
 * Top bar: the controls that belong to the session rather than to any one page —
 * display currency, theme, notifications, account. It stays put while the page
 * scrolls, because the currency selector is the kind of thing you reach for
 * halfway down a table.
 */
export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-base-300 bg-base-100/85 px-4 backdrop-blur-md sm:px-6">
      <IconButton label="Open navigation" variant="ghost" onClick={onOpenNav} className="lg:hidden">
        <Menu className="size-5" />
      </IconButton>

      {/* Hidden on the narrowest screens: the bottom bar and the drawer both
          carry the brand, and the session controls need the room more. */}
      <NavLink to="/dashboard" className="hidden sm:block lg:hidden" aria-label="NexaBank home">
        <Wordmark size="sm" />
      </NavLink>

      <div className="flex-1" />

      <CurrencyMenu />
      <DemoMenu />
      <ThemeToggle />
      <NotificationTray />
      <AccountMenu />
    </header>
  );
}

/** Reformats every figure in the app. Rates are indicative and shown as such. */
function CurrencyMenu() {
  const { currency, setCurrency, symbol } = useCurrency();

  return (
    <Popover
      label="Display currency"
      panelClassName="w-64"
      trigger={
        <span className="flex h-9 items-center gap-1.5 rounded-[var(--radius-field)] border border-base-300 px-2.5 text-sm transition-colors hover:border-base-content/25">
          <span className="font-mono text-xs text-base-content/50">{symbol}</span>
          <span className="font-medium">{currency}</span>
        </span>
      }
    >
      {({ close }) => (
        <div>
          <p className="eyebrow border-b border-base-300 px-3.5 py-2.5 text-base-content/45">
            Display currency
          </p>
          <ul className="p-1.5">
            {CURRENCY_CODES.map((code: CurrencyCode) => {
              const meta = CURRENCIES[code];
              const active = code === currency;
              return (
                <li key={code}>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrency(code);
                      close();
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-[var(--radius-field)] px-2.5 py-2 text-left text-sm transition-colors',
                      active ? 'bg-base-200 text-base-content' : 'hover:bg-base-200/60',
                    )}
                  >
                    <span className="w-4 text-center font-mono text-xs text-base-content/50">
                      {meta.symbol}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium leading-tight">{code}</span>
                      <span className="block truncate text-[0.7rem] text-base-content/45">
                        {meta.name}
                      </span>
                    </span>
                    {active ? <Check className="size-3.5 text-primary" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-base-300 px-3.5 py-2.5 text-[0.7rem] leading-relaxed text-base-content/40">
            Indicative rates. Balances are held in the account's own currency.
          </p>
        </div>
      )}
    </Popover>
  );
}

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <IconButton
      label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      variant="outline"
      onClick={toggleTheme}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </IconButton>
  );
}

function NotificationTray() {
  const { data, loading, setData } = useApi(() => api.getNotifications(), []);
  const toast = useToast();
  const notifications = data ?? [];
  const unread = notifications.filter((item) => !item.read).length;

  const markAll = async () => {
    try {
      setData(await api.markAllNotificationsRead());
    } catch (error) {
      toast.error(
        'Could not clear notifications',
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  return (
    <Popover
      label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      panelClassName="w-[21rem]"
      trigger={
        <span className="relative grid size-9 place-items-center rounded-[var(--radius-field)] border border-base-300 transition-colors hover:border-base-content/25">
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-primary text-[0.6rem] font-semibold text-primary-content">
              {unread}
            </span>
          ) : null}
        </span>
      }
    >
      {() => (
        <div>
          <div className="flex items-center justify-between gap-3 border-b border-base-300 px-3.5 py-2.5">
            <p className="eyebrow text-base-content/45">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAll}
                className="text-[0.7rem] text-primary transition-opacity hover:opacity-75"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <ul className="max-h-[22rem] divide-y divide-[var(--rule)] overflow-y-auto">
            {loading && notifications.length === 0
              ? Array.from({ length: 3 }, (_, index) => (
                  <li key={index} className="px-3.5 py-3">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="mt-2 h-3 w-full" />
                  </li>
                ))
              : notifications.map((item) => (
                  <li
                    key={item.id}
                    className={cn('px-3.5 py-3', !item.read && 'bg-primary/[0.04]')}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium leading-tight">{item.title}</p>
                      {!item.read ? (
                        <span
                          aria-label="Unread"
                          className="mt-1 size-1.5 shrink-0 rounded-full bg-primary"
                        />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-base-content/55">{item.body}</p>
                    <p className="mt-1.5 font-mono text-[0.65rem] text-base-content/35">
                      {fmtRelative(item.at)}
                    </p>
                  </li>
                ))}
          </ul>

          {!loading && notifications.length === 0 ? (
            <p className="px-3.5 py-6 text-center text-sm text-base-content/45">
              Nothing needs your attention.
            </p>
          ) : null}
        </div>
      )}
    </Popover>
  );
}

function AccountMenu() {
  const { user, signOut } = useAuth();
  const confirm = useConfirm();

  const leave = async () => {
    const ok = await confirm({
      title: 'Sign out of NexaBank?',
      description: 'Your session ends on this device. Nothing else changes.',
      confirmLabel: 'Sign out',
    });
    if (ok) signOut();
  };

  if (!user) return null;

  return (
    <Popover
      label="Account menu"
      panelClassName="w-72"
      trigger={
        <span className="flex items-center gap-2 rounded-[var(--radius-field)] border border-base-300 py-1 pl-1 pr-2.5 transition-colors hover:border-base-content/25">
          <span className="grid size-7 place-items-center rounded-[calc(var(--radius-field)-1px)] bg-primary/15 font-mono text-[0.7rem] font-semibold text-primary">
            {user.initials}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-xs font-medium leading-tight">{user.name}</span>
            <span className="block text-[0.65rem] leading-tight text-base-content/45">
              {user.role}
            </span>
          </span>
        </span>
      }
    >
      {({ close }) => (
        <div>
          <div className="border-b border-base-300 px-4 py-3.5">
            <p className="font-display text-base leading-tight">{user.name}</p>
            <p className="mt-1 truncate font-mono text-xs text-base-content/50">
              {maskEmail(user.email)}
            </p>
            <p className="mt-2 text-xs text-base-content/55">
              {user.role} · {user.organisation}
            </p>
          </div>

          <div className="space-y-1.5 px-4 py-3 text-xs text-base-content/55">
            <p className="flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-primary/70" />
              Two-factor {user.twoFactorEnabled ? 'enabled' : 'disabled'}
            </p>
            <p className="pl-5.5 text-base-content/40">
              Last signed in {fmtRelative(user.lastSignInAt)}
            </p>
          </div>

          <div className="border-t border-base-300 p-2">
            <Button
              variant="quiet"
              size="sm"
              block
              icon={<LogOut className="size-3.5" />}
              onClick={() => {
                close();
                void leave();
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      )}
    </Popover>
  );
}
