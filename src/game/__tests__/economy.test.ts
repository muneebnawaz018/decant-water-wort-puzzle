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
  it('prices an undo well below what a level pays', () => {
    // Otherwise a careless pour costs more than finishing the board earns, and
    // undo stops being a tool and becomes a punishment.
    expect(PRICES.undo).toBeLessThan(EARNINGS.coinsPerStar);
  });

  it('prices a hint above an undo and below a star', () => {
    // Above an undo because it does more — it hands over the next move rather
    // than taking one back. Below a star so hinting through a board is a real
    // deficit rather than a wall: the meter is meant to be usable.
    expect(PRICES.hint).toBeGreaterThan(PRICES.undo);
    expect(PRICES.hint).toBeLessThan(EARNINGS.coinsPerStar);
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

  it('has nothing priced while one skin ships', () => {
    // The catalogue was cut back to the free default, so a price here would be
    // a number for something that cannot be bought.
    expect(Object.keys(SKIN_PRICES)).toHaveLength(0);
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
