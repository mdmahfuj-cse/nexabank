/**
 * Deterministic pseudo-randomness.
 *
 * The whole bank is generated from a single seed, so every reload — and every
 * visitor's screenshot — shows the same figures. That matters for a demo: the
 * dashboard should not tell a different story each time it is opened.
 */

export type Rng = () => number;

/** mulberry32 — small, fast, good enough distribution for fixtures. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max]. */
export const randInt = (rng: Rng, min: number, max: number): number =>
  Math.floor(rng() * (max - min + 1)) + min;

/** Float in [min, max). */
export const randFloat = (rng: Rng, min: number, max: number): number =>
  rng() * (max - min) + min;

export const pick = <T>(rng: Rng, items: readonly T[]): T =>
  items[Math.floor(rng() * items.length)];

export const chance = (rng: Rng, probability: number): boolean =>
  rng() < probability;

/** Pick by relative weight: [['a', 5], ['b', 1]] picks 'a' five times as often. */
export function weighted<T>(rng: Rng, entries: ReadonlyArray<readonly [T, number]>): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

/** Fisher–Yates, seeded. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Stable numeric seed from any string id. */
export function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
