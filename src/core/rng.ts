/** Deterministic seeded RNG (mulberry32) so levels are reproducible from a seed. */
export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: T[]): T[];
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (maxExclusive: number) => Math.floor(next() * maxExclusive);

  return {
    next,
    int,
    pick: (items) => items[int(items.length)]!,
    shuffle: (items) => {
      for (let i = items.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [items[i], items[j]] = [items[j]!, items[i]!];
      }
      return items;
    },
  };
}

/**
 * Stable seed from a level number, so level N is the same board on every
 * device and every install — there is no stored board, only this number.
 *
 * `salt` separates difficulty modes: the same level number yields a different
 * board per mode, still deterministically.
 */
export function seedForLevel(level: number, salt = 0): number {
  return (Math.imul(level, 2654435761) ^ salt) >>> 0;
}
