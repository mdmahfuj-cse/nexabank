import { GUILLOCHE_VIEWBOX, guillocheLayers, guillocheRosette } from '@/lib/guilloche';
import { cn } from '@/lib/cn';

/**
 * The engraving. Drawn in `currentColor`, so it takes the colour of whatever it
 * sits inside and needs no theme awareness of its own. Always decorative —
 * hidden from assistive technology.
 */
export function Guilloche({
  seed,
  layers = 3,
  className,
}: {
  seed: number;
  layers?: number;
  className?: string;
}) {
  const plates = guillocheLayers(seed, layers);

  return (
    <svg
      viewBox={`0 0 ${GUILLOCHE_VIEWBOX} ${GUILLOCHE_VIEWBOX}`}
      aria-hidden="true"
      focusable="false"
      className={cn('pointer-events-none select-none', className)}
    >
      <g fill="none" stroke="currentColor" strokeLinejoin="round">
        {plates.map((plate, index) => (
          <path
            key={index}
            d={plate.d}
            strokeWidth={plate.strokeWidth}
            opacity={plate.opacity}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  );
}

/** A single fine rosette. Used where a full stack of plates would be noise. */
export function Rosette({ seed, className }: { seed: number; className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${GUILLOCHE_VIEWBOX} ${GUILLOCHE_VIEWBOX}`}
      aria-hidden="true"
      focusable="false"
      className={cn('pointer-events-none select-none', className)}
    >
      <path
        d={guillocheRosette(seed)}
        fill="none"
        stroke="currentColor"
        strokeWidth={0.6}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
