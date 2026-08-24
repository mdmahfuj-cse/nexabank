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

  );
}
