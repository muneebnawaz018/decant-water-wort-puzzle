import {
  EARNINGS,
  FREE_HINTS,
  FREE_UNDOS,
  PRICES,
  PRODUCTS,
  SKIN_PRICES,
  STARTING_COINS,
} from '../economy';

/**
 * The economy's own shape, and the reason the file exists.
 *
 * These are not arithmetic checks — they are the claims the file makes about
 * itself. A number that breaks one of them is not a typo, it is a decision
 * somebody should have to make on purpose.
 */
describe('the economy table', () => {
  it('prices an undo no higher than a star, so a mistake is never a wall', () => {
    // The Aug 2026 rebalance halved earnings and left prices alone, on
    // purpose: help now runs a real deficit, and the rewarded ad beside each
    // button is the free way to cover it. What this still refuses is an undo
    // costing more than a star — a careless pour costing more than the level
    // pays back per star turns the meter into a punishment.
    expect(PRICES.undo).toBeLessThanOrEqual(EARNINGS.coinsPerStar);
  });

  it('prices a hint above an undo, and above a star but under a typical level', () => {
    // Above an undo because it does more — it hands over the next move rather
    // than taking one back. Above a single star now (the deficit is the
    // design: it steers toward the ad), but still under the two stars an
    // ordinary finish pays, so a hinted board loses ground without hitting a
    // wall.
    expect(PRICES.hint).toBeGreaterThan(PRICES.undo);
    expect(PRICES.hint).toBeGreaterThan(EARNINGS.coinsPerStar);
    expect(PRICES.hint).toBeLessThan(EARNINGS.coinsPerStar * 2);
  });

  it('gives every level at least one free hint', () => {
    // The first "what now?" is the tutorial; only the ones after it meter.
    expect(FREE_HINTS).toBeGreaterThanOrEqual(1);
  });

  it('gives every mode at least one free undo', () => {
    for (const free of Object.values(FREE_UNDOS)) {
      expect(free).toBeGreaterThanOrEqual(1);
    }
  });

  it('hands out fewer free undos as the mode gets harder', () => {
    expect(FREE_UNDOS.gentle).toBeGreaterThan(FREE_UNDOS.classic);
    expect(FREE_UNDOS.classic).toBeGreaterThan(FREE_UNDOS.fiendish);
  });

  it('tapers the milestone rate downward, never up', () => {
    expect(EARNINGS.milestoneFloorRate).toBeLessThan(EARNINGS.milestoneTopRate);
    expect(EARNINGS.milestoneTaper).toBeGreaterThan(0);
  });

  it('pays the daily track over exactly seven days, rising to the finale', () => {
    expect(EARNINGS.daily).toHaveLength(7);
    const finale = EARNINGS.daily[6]!;
    for (const day of EARNINGS.daily.slice(0, 6)) {
      expect(day).toBeLessThan(finale);
    }
  });

  it('starts every player on nothing they did not earn', () => {
    expect(STARTING_COINS).toBe(0);
  });

  it('prices skins in whole positive coins', () => {
    // Which ids may appear here is the catalogue's business — skins.test.ts
    // holds the exact two-way match, since economy.ts imports nothing.
    for (const price of Object.values(SKIN_PRICES)) {
      expect(Number.isInteger(price)).toBe(true);
      expect(price).toBeGreaterThan(0);
    }
  });

  it('keeps any skin price above a day of play and inside a coin pack', () => {
    // Vacuous today and deliberately kept: it is the rule the next skin has to
    // land inside. A cosmetic a day's play covers is not worth saving for, and
    // a coin pack that cannot buy anything in the shop beside it is a pack
    // nobody has a reason to buy.
    const perDay = EARNINGS.coinsPerStar * 3 * 10;
    for (const price of Object.values(SKIN_PRICES)) {
      expect(price).toBeGreaterThan(perDay);
      expect(PRODUCTS.coinPackSize).toBeGreaterThan(price);
    }
  });
});
