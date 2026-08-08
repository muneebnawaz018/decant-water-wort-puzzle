import { claimToast, dayState, offerMessage } from '../rewardTrack';

const REWARDS = [10, 15, 20, 30, 50, 75, 150] as const;

describe('dayState', () => {
  it('marks the days behind the cursor as claimed', () => {
    expect(dayState(0, 3, false)).toBe('claimed');
    expect(dayState(2, 3, false)).toBe('claimed');
  });

  it('marks the days ahead as future', () => {
    expect(dayState(4, 3, false)).toBe('future');
    expect(dayState(6, 3, false)).toBe('future');
  });

  /**
   * The off-by-one the module exists for. While the timer runs, the day the
   * track sits on has already been taken — drawn as "today" it would offer a
   * reward the player claimed hours ago, directly above a button counting down
   * to the next one.
   */
  it('draws the cursor as today only when there is something to claim', () => {
    expect(dayState(3, 3, false)).toBe('today');
    expect(dayState(3, 3, true)).toBe('claimed');
  });
});

describe('claimToast', () => {
  it('speaks in the past tense, and names the new balance', () => {
    // Fires after `claimDaily`, so the coins have moved. The balance is there
    // because the Rewards screen has no coin pill: this line is the only place
    // the player is told what they now hold.
    expect(claimToast(30, 415)).toBe('30 coins collected. You now have 415.');
  });

  it('never uses a dash', () => {
    expect(claimToast(150, 1000)).not.toMatch(/[—–-]/);
  });
});

describe('offerMessage', () => {
  it('names the day and the amount, before anything is paid', () => {
    // Pre-claim wording: the dialog is the offer, Collect is the payment, so
    // the message must not speak as though the coins have already moved.
    expect(offerMessage(0, REWARDS)).toBe(
      "You're on day 1. That's worth 10 coins. Tap Collect to take them."
    );
    expect(offerMessage(3, REWARDS)).toBe(
      "You're on day 4. That's worth 30 coins. Tap Collect to take them."
    );
  });

  it('marks day seven as the biggest, not another weekday', () => {
    // The one message a player waits a whole week to read.
    expect(offerMessage(6, REWARDS)).toBe(
      "That's the full week. Day 7 pays 150 coins, the biggest of the lot. Tap Collect to take it."
    );
  });

  it('never uses a dash', () => {
    // Not style policing: an em dash reads as an aside, and none of these
    // sentences has one. It also wraps badly in a 300dp dialog.
    for (let day = 0; day < REWARDS.length; day++) {
      expect(offerMessage(day, REWARDS)).not.toMatch(/[—–-]/);
    }
  });
});
