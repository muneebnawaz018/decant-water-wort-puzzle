/**
 * How full a vessel sounds — doc §7, "pour sound pitched by how full the
 * destination is. Higher as it fills."
 *
 * Pure and free of the native module, the same rule `src/core` follows for React and
 * `render/liquid.ts` follows for Skia: importing the audio module outside a
 * native runtime is a risk, and the arithmetic that decides what a pour sounds
 * like should be testable without one.
 *
 * **This is real acoustics, not a flourish.** The air column above the liquid is
 * what resonates when something disturbs it, and a shorter column resonates
 * higher — which is why filling a bottle rises in pitch, and why anyone can hear
 * a glass is nearly full without looking. Getting the direction wrong would
 * sound wrong to a player who could not tell you why.
 */

/**
 * Rate at an empty destination, and at a full one.
 *
 * Rate is the only lever available, and both engines behind
 * `modules/system-sound` are tape-style by construction — iOS's varispeed unit
 * and Android's `SoundPool` both resample, so pitch and speed move together,
 * exactly as tape does.
 *
 * That coupling sets the range. A little over an octave would be the interesting
 * musical span and is unusable here: at 2.0 the 340ms pour is gone in 170ms,
 * ahead of the liquid it belongs to. These are roughly ±3 semitones, which is
 * audible on a back-to-back pour without ever detaching the sound from the
 * animation.
 */
const EMPTY_RATE = 0.92;
const FULL_RATE = 1.18;

/**
 * Playback rate for a pour landing in a destination at `fill` (0 to 1).
 *
 * Clamped rather than trusted: `fill` is a ratio computed from tube contents,
 * and a rate outside the platform range (Android floors at 0.1) throws rather
 * than saturating.
 */
export function rateForFill(fill: number): number {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(fill) ? fill : 0));
  return EMPTY_RATE + (FULL_RATE - EMPTY_RATE) * clamped;
}

/**
 * How full the destination ends up, as a ratio — what `rateForFill` wants.
 *
 * **The fill *after* the pour lands, not before.** The pitch a player hears is
 * the one the vessel settles at, and §7 pins the sound to the moment the liquid
 * arrives — which is also when the receiving level has finished rising on
 * screen. Measuring before the pour would fall a step flat on every move and
 * would be most wrong on the pour that fills a vial, the one worth hearing.
 */
export function fillAfterPour(height: number, poured: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(1, Math.max(0, (height + poured) / capacity));
}
