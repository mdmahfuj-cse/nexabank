import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { Rosette } from '@/components/brand/Guilloche';
import { ButtonLink } from '@/components/ui/Button';
import { NAV_ITEMS } from '@/components/layout/nav';

/**
 * A dead end is still a page in the portal — it keeps the frame and offers the
 * five places anyone could have meant instead.
 */
export default function NotFound() {
  return (
    <div className="relative overflow-hidden py-10 text-center sm:py-16">
      <Rosette
        seed={550217}
        className="pointer-events-none absolute -top-24 left-1/2 size-[30rem] -translate-x-1/2 text-base-content/[0.05]"
      />

      <div className="relative mx-auto max-w-lg">
        <span className="inline-grid size-11 place-items-center rounded-full border border-base-300 text-base-content/45">
          <Compass className="size-5" />
        </span>
        <p className="eyebrow mt-6 text-base-content/45">Error 404</p>
        <h1 className="mt-2.5 font-display text-3xl tracking-tight sm:text-4xl">
          This page is not on the ledger
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-base-content/60">
          The address you followed does not match anything in the portal. Nothing has moved and no
          balance is affected.
        </p>

        <ButtonLink
          className="mt-7"
          to="/dashboard"
          variant="primary"
          icon={<ArrowLeft className="size-4" />}
        >
          Back to dashboard
        </ButtonLink>

        <div className="mt-10 border-t border-[var(--rule)] pt-6">
          <p className="eyebrow text-base-content/40">Or head to</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="inline-flex items-center gap-1.5 rounded-full border border-base-300 px-3 py-1.5 text-sm text-base-content/70 transition-colors hover:border-base-content/25 hover:text-base-content"
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
