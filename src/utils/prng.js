/**
 * Linear Congruential Generator (LCG) Pseudo-Random Number Generator
 * Provides fast, deterministic, reproducible pseudo-random numbers from a seed.
 */

export function createLCG(seed = 1) {
  let s = Math.abs(Number(seed) || 1) % 2147483647;
  if (s <= 0) s = 1;

  return function next() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
