import { createRng, randFloat, randInt, type Rng } from '@/mocks/prng';

/**
 * Guilloché engraving.
 *
 * The rosettes printed on banknotes and share certificates are hypotrochoids:
 * a circle of radius r rolling inside a circle of radius R, with the pen offset
 * by d from the rolling centre. Choosing r = R / p for an integer p guarantees
 * the curve closes after one revolution, which is why real engraving plates use
 * whole-number petal counts.
 *
 *   x(t) = (R − r)·cos t + d·cos((p − 1)·t)
 *   y(t) = (R − r)·sin t − d·sin((p − 1)·t)
 *
 * Every account and card derives its own plate from its seed, so no two
 * engravings in the app are the same.
 */

export interface GuillocheLayer {
  d: string;
  opacity: number;
  strokeWidth: number;
}

export const GUILLOCHE_VIEWBOX = 200;

const CENTRE = GUILLOCHE_VIEWBOX / 2;
const MAX_RADIUS = 94;

function tracePlate(
  outerRadius: number,
  petals: number,
  offsetRatio: number,
  phase: number,
  samples: number,
): string {
  const r = outerRadius / petals;
  const rollingRadius = outerRadius - r;
  const offset = r * offsetRatio;

  // Keep the pen inside the plate.
  const extent = rollingRadius + offset;
  const scale = extent > MAX_RADIUS ? MAX_RADIUS / extent : 1;

  let path = '';
  for (let i = 0; i <= samples; i += 1) {
    const t = (i / samples) * Math.PI * 2 + phase;
    const x = CENTRE + scale * (rollingRadius * Math.cos(t) + offset * Math.cos((petals - 1) * t));
    const y = CENTRE + scale * (rollingRadius * Math.sin(t) - offset * Math.sin((petals - 1) * t));
    path += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${path}Z`;
}

/** A stack of nested plates, ordered outermost first. */
export function guillocheLayers(seed: number, count = 3): GuillocheLayer[] {
  const rng: Rng = createRng(seed || 1);
  const basePetals = randInt(rng, 7, 13);
  const layers: GuillocheLayer[] = [];

  for (let i = 0; i < count; i += 1) {
    const radius = 92 - i * randFloat(rng, 13, 20);
    const petals = basePetals + i * randInt(rng, 1, 3);
    const offsetRatio = randFloat(rng, 0.65, 1.35);
    const phase = randFloat(rng, 0, Math.PI);
    layers.push({
      d: tracePlate(Math.max(radius, 26), petals, offsetRatio, phase, 720),
      opacity: 0.9 - i * 0.22,
      strokeWidth: 0.5 + i * 0.18,
    });
  }
  return layers;
}

/** A single fine rosette, used behind card numbers where space is tight. */
export function guillocheRosette(seed: number): string {
  const rng = createRng(seed || 7);
  return tracePlate(88, randInt(rng, 9, 16), randFloat(rng, 0.8, 1.2), 0, 540);
}
