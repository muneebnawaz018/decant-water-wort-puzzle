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

/**
 * The tile the *following* claim pays, given the one the track sits on.
 *
 * Only meaningful while the timer is running, which is the one moment the
 * distinction matters. `economyStore.nextDayIndex` answers "which day does the
 * claim available now pay", and once today's has been collected that is the day
 * just collected — so the countdown card was advertising 10 coins on the
 * evening of the day it had already paid 10 coins.
 *
 * Wraps at the end of the week, because the track does: day seven is followed
 * by day one, not by an eighth day.
 *
 * Optimistic by design. If the player lets the run lapse instead of coming
 * back, the next claim pays day one rather than this. That is the right thing
 * to show — the number is what they get *if they return in time*, which is the
 * whole reason the card names it.
 */
export function nextRewardIndex(currentIndex: number, length: number): number {
  return (currentIndex + 1) % length;
}

/**
 * What the claim dialog offers, before anything is paid.
 *
 * Pre-claim wording on purpose. The dialog is the offer and Collect is the
 * moment of payment, so this must not speak as though the coins have already
 * moved. `dayIndex` is 0-based, straight off the track cursor.
 *
 * Plain sentences, no dashes. An em dash reads as an aside, and there is no
 * aside here: the message says what day it is, what it pays, and what to press.
 * Full stops carry that fine, and short sentences survive a narrow dialog
 * better than one long clause that wraps mid-thought.
 *
 * Here rather than in the screen so the last-day case can be tested. Day seven
 * is the one message a player waits a whole week to read, which is the last
 * place anyone wants to find placeholder text.
 */
/**
 * What the toast says once the coins have landed.
 *
 * Past tense, unlike `offerMessage` — this fires after `claimDaily`, so the
 * coins have moved and the sentence should say so. It carries the balance as
 * well as the amount because the reward screen has no coin pill of its own: the
 * player is told what they gained and what they now hold, in one line, and does
 * not have to leave to find out.
 */
export function claimToast(amount: number, balance: number): string {
  return `${amount} coins collected. You now have ${balance}.`;
}

export function offerMessage(dayIndex: number, rewards: readonly number[]): string {
  const amount = rewards[dayIndex]!;
  const day = dayIndex + 1;

  if (dayIndex === rewards.length - 1) {
    return `That's the full week. Day ${day} pays ${amount} coins, the biggest of the lot. Tap Collect to take it.`;
  }
  return `You're on day ${day}. That's worth ${amount} coins. Tap Collect to take them.`;
}
