import { cn } from '@/lib/cn';

const SIZES = {
  sm: { box: 'size-7', text: 'text-base', gap: 'gap-2' },
  md: { box: 'size-9', text: 'text-lg', gap: 'gap-2.5' },
  lg: { box: 'size-12', text: 'text-2xl', gap: 'gap-3' },
};

/**
 * The mark: an engraved N held inside two concentric rings, the way a seal is
 * struck. Drawn rather than typeset so it stays crisp at any size.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
    >
      <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="11" className="fill-primary/12" />
      <rect
        x="0.75"
        y="0.75"
        width="46.5"
        height="46.5"
        rx="11"
        fill="none"
        className="stroke-primary/45"
        strokeWidth="1.5"
      />
      <g className="stroke-primary" fill="none">
        <circle cx="24" cy="24" r="15.5" strokeWidth="0.75" opacity="0.35" />
        <circle cx="24" cy="24" r="12" strokeWidth="0.75" opacity="0.2" />
        <path
          d="M17 32V16l14 16V16"
          strokeWidth="2.75"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </g>
    </svg>
  );
}

export function Wordmark({
  size = 'md',
  withText = true,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
  className?: string;
}) {
  const scale = SIZES[size];

  return (
    <span className={cn('inline-flex items-center', scale.gap, className)}>
      <BrandMark className={scale.box} />
      {withText ? (
        <span className={cn('font-display leading-none tracking-tight', scale.text)}>
          Nexa<span className="text-primary">Bank</span>
        </span>
      ) : null}
      <span className="sr-only">NexaBank</span>
    </span>
  );
}
