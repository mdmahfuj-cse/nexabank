import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, KeyRound, LineChart, Moon, ShieldCheck, Sun } from 'lucide-react';
import { Guilloche } from '@/components/brand/Guilloche';
import { Wordmark } from '@/components/brand/Wordmark';
import { useTheme } from '@/providers/ThemeProvider';
import { IconButton } from '@/components/ui/Button';

const POINTS = [
  {
    icon: ShieldCheck,
    title: 'Verified sign-in',
    body: 'Password, then a one-time code. The session is scoped to this device.',
  },
  {
    icon: LineChart,
    title: 'Treasury in one view',
    body: 'Five accounts, four cards and fifteen months of ledger history.',
  },
  {
    icon: KeyRound,
    title: 'Controls that hold',
    body: 'Freeze a card, cap a limit, confirm a payment — every action is reversible.',
  },
];

/**
 * Authentication frame.
 *
 * Left plate carries the engraving and the argument; right plate carries the
 * form and nothing else. On a phone the plate collapses to a header — the form
 * should never be below the fold on the screen where people are in a hurry.
 */
export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Plate */}
      <aside className="engraved-plate relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-14">
        <Guilloche
          seed={918273}
          layers={3}
          className="absolute -right-40 -top-32 size-[42rem] animate-engrave text-white/[0.07]"
        />
        <Guilloche
          seed={4827193}
          layers={2}
          className="absolute -bottom-48 -left-32 size-[34rem] text-white/[0.05]"
        />

        <div className="relative">
          <Wordmark size="md" className="text-white" />
        </div>

        <div className="relative max-w-md">
          <p className="eyebrow text-white/45">Digital banking, engraved</p>
          <h2 className="mt-4 font-display text-4xl leading-[1.1] tracking-tight xl:text-[2.75rem]">
            The portal your treasury team actually opens every morning.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Balances, cards, transfers and analytics in one plate — built to read
            like a bank, not like a dashboard template.
          </p>

          <ul className="mt-10 space-y-5">
            {POINTS.map((point) => (
              <li key={point.title} className="flex gap-3.5">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5">
                  <point.icon className="size-4 text-[#6FD9B4]" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{point.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-white/50">
                    {point.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-mono text-[0.7rem] text-white/35">
          Demo build · seeded data · no live banking connection
        </p>
      </aside>

      {/* Form */}
      <main className="flex min-h-dvh flex-col px-5 py-7 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link to="/sign-in" className="lg:invisible" aria-label="NexaBank">
            <Wordmark size="sm" />
          </Link>
          <IconButton
            label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            variant="outline"
            onClick={toggleTheme}
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </IconButton>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[26rem] animate-fade-up">
            <p className="eyebrow text-base-content/45">{eyebrow}</p>
            <h1 className="mt-2.5 font-display text-3xl leading-tight tracking-tight">{title}</h1>
            {description ? (
              <p className="mt-3 text-sm leading-relaxed text-base-content/60">{description}</p>
            ) : null}

            <div className="mt-8">{children}</div>
          </div>
        </div>

        {footer ? (
          <div className="flex justify-center text-sm text-base-content/55">{footer}</div>
        ) : null}
      </main>
    </div>
  );
}

/** The one-line link that sits under every auth form. */
export function AuthSwitch({ to, label, action }: { to: string; label: string; action: string }) {
  return (
    <p className="flex items-center gap-1.5">
      {label}
      <Link
        to={to}
        className="inline-flex items-center gap-1 font-medium text-primary transition-opacity hover:opacity-75"
      >
        {action}
        <ArrowRight className="size-3.5" />
      </Link>
    </p>
  );
}
