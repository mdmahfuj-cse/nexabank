import { Snowflake } from 'lucide-react';
import { Rosette } from '@/components/brand/Guilloche';
import { cn } from '@/lib/cn';
import { maskPan } from '@/lib/masking';
import type { BankCard, CardTier } from '@/types/domain';

/**
 * The card plate.
 *
 * Built the way a real card is: a dark engraved ground, a rosette struck off
 * centre, a foil band whose colour marks the tier, and the number set in
 * monospace with wide tracking. Numbers stay masked until asked for — the
 * reveal is a deliberate act, not a default.
 */

const TIER: Record<CardTier, { label: string; foil: string; text: string }> = {
  metal: { label: 'Metal', foil: 'from-[#D98A4B] to-[#B06427]', text: 'text-[#E3AC7A]' },
  platinum: { label: 'Platinum', foil: 'from-[#C7D2DA] to-[#8695A1]', text: 'text-[#CBD6DE]' },
  business: { label: 'Business', foil: 'from-[#5B8DD9] to-[#2B5FA8]', text: 'text-[#93B4E5]' },
  virtual: { label: 'Virtual', foil: 'from-[#2FBF8F] to-[#0F7355]', text: 'text-[#6FD9B4]' },
};

const BRAND_LABEL = { visa: 'VISA', mastercard: 'Mastercard' };

export function CardFace({
  card,
  revealed = false,
  size = 'md',
  className,
}: {
  card: BankCard;
  revealed?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const tier = TIER[card.tier];
  const compact = size === 'sm';

  return (
    <div
      className={cn(
        'engraved-plate relative isolate w-full overflow-hidden rounded-[1.15rem] border border-white/10 text-white',
        'aspect-[1.586/1]',
        card.frozen && 'saturate-[0.35]',
        className,
      )}
    >
      {/* Engraving, struck off centre the way a security print is. */}
      <Rosette
        seed={card.seed}
        className="absolute -right-16 -top-20 size-[22rem] text-white/[0.09]"
      />
      {/* Foil gradient across the plate. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-white/[0.09] via-transparent to-black/25"
      />
      {/* And the light travelling over it. A frozen card does not catch light. */}
      {!card.frozen ? (
        <div
          aria-hidden="true"
          className="absolute -inset-y-10 left-0 w-1/4 animate-sheen bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />
      ) : null}

      <div
        className={cn(
          'relative flex h-full flex-col justify-between',
          compact ? 'p-4' : 'p-5 sm:p-6',
        )}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow text-white/45">NexaBank</p>
            <p
              className={cn(
                'mt-1 truncate font-display leading-tight',
                compact ? 'text-sm' : 'text-base sm:text-lg',
              )}
            >
              {card.label}
            </p>
          </div>

          <span
            className={cn(
              'eyebrow shrink-0 rounded-full bg-gradient-to-r px-2.5 py-1 text-[0.6rem] text-black/80',
              tier.foil,
            )}
          >
            {card.variant === 'virtual' ? 'Virtual' : tier.label}
          </span>
        </header>

        {!compact ? (
          <div
            aria-hidden="true"
            className="h-7 w-11 rounded-[0.35rem] bg-gradient-to-br from-[#D8C08A] to-[#9A7F45]"
          >
            <div className="mx-auto mt-1 h-5 w-8 rounded-[0.2rem] border border-black/20" />
          </div>
        ) : null}

        <div>
          <p
            className={cn(
              'amount font-mono tracking-[0.18em] text-white/90',
              compact ? 'text-xs' : 'text-sm sm:text-base',
            )}
          >
            {revealed ? card.pan : maskPan(card.pan)}
          </p>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow text-[0.6rem] text-white/40">Cardholder</p>
              <p className="mt-0.5 truncate text-xs uppercase tracking-wide text-white/85">
                {card.holder}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="eyebrow text-[0.6rem] text-white/40">Expires</p>
              <p className="amount mt-0.5 font-mono text-xs text-white/85">{card.expiry}</p>
            </div>

            <p
              className={cn(
                'shrink-0 font-display text-sm italic tracking-tight',
                tier.text,
              )}
            >
              {BRAND_LABEL[card.brand]}
            </p>
          </div>
        </div>
      </div>

      {card.frozen ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#0B1014]/55 backdrop-blur-[3px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-medium text-white">
            <Snowflake className="size-3.5" />
            Frozen
          </span>
        </div>
      ) : null}
    </div>
  );
}
