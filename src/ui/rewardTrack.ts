/**
 * The reward track's arithmetic, kept out of the screen that draws it.
 *
 * Its own module for the same reason `src/core` is React-free: this is the only
 * logic on the Rewards screen, and the screen cannot be imported into a test
 * without pulling in Reanimated and Skia, neither of which runs outside a
 * native runtime.
 */

/** How a day tile is drawn. */
export type DayState = 'claimed' | 'today' | 'future';

/**
 * Which state a tile is in.
 *
 * The `waiting` term is the off-by-one this exists for. While the timer runs,
 * the day the track sits on is the one *just claimed*, not the one coming next
 * — drawn as "today" it would offer a reward the player has already taken,
 * directly above a button counting down to the following one.
 */
export function dayState(index: number, currentIndex: number, waiting: boolean): DayState {
  if (index < currentIndex) return 'claimed';
  if (index > currentIndex) return 'future';
  return waiting ? 'claimed' : 'today';
}
