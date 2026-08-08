/**
 * Every number the coin economy runs on, in one file.
 *
 * **This is the tuning dial. Nothing else states a price or a payout.** The
 * charge, the badge on the button, the refusal toast, the shop row, the daily
 * track and the tests all read from here, so a rebalance is one edit and
 * nothing can drift out of step with anything else.
 *
 * The rules that *use* these numbers stay where they are: `stars.ts` decides
 * how many stars a run earned and which block it completed, `undoCost.ts`
 * decides which undos have been paid for, `economyStore` holds the balance and
 * the streak. What each of them was carrying, and no longer is, is the
 * arithmetic constant — a rate, a price, a reward. Rules here, numbers there was
 * the wrong split: it put `20` in one file, `2500` in another and `[10, 15, …]`
 * in a third, so the only way to see whether the game paid enough to afford
 * what it sold was to open three of them.
 *
 * Pure data and no imports, deliberately. A price must not depend on anything,
 * least of all on another price — that is how a rebalance becomes an afternoon.
 * Anything that has to be *computed* from these (a tapering rate, a bonus) is a
 * function elsewhere that reads them.
 */

/**
 * What actions cost.
 *
 * Judge these against `EARNINGS` below rather than against each other: 5 is a
 * rounding error next to a finished level, 50 is most of one, and 200 is a
 * day's play.
 */
export const PRICES = {
  /**
   * Taking back one move.
   *
   * Charged once per move rather than per press — undo, redo, undo again is one
   * decision revisited, and only the first is billed. `undoCost.ts` holds that
   * rule and the bookkeeping it needs.
   *
   * The first few undos on each level are free — see `FREE_UNDOS`. This is what
   * the ones after that cost.
   *
   * Undo is how a player explores a board they do not yet understand, so the
   * allowance is what keeps exploration free and this is what stops it being
   * unlimited. Ten rather than five because it now has to mean something at the
   * point it starts applying: a player who has already had their free ones is
   * past exploring and into rewinding a board they have made a mess of.
   */
  undo: 10,

  /**
   * Pointing at a pour that lies on a winning line.
   *
   * Above an undo and below a star, and both edges are the design. A hint does
   * more for the player than an undo — it hands over the next move rather than
   * taking one back — so it cannot cost less. And a level's first star pays 20,
   * so at 15 a player who hints their way through a whole board is spending
   * roughly what the board pays back per move of help: solving with hints is
   * *allowed* but runs a real deficit, funded by daily rewards and milestones.
   * That is the intended shape — an escape valve with a meter, not a cheat.
   *
   * The first each level is free — see `FREE_HINTS`.
   */
  hint: 15,

  /**
   * The level's one spare vial — doc §10's rewarded-ad slot.
   *
   * Zero for now, and not because it is worth nothing. This is the escape hatch
   * on a stuck board, and spec §8 puts the ad SDK in phase 2; until an ad can
   * pay for it, the alternative to free is a hatch that cannot be opened. When
   * ads land this becomes a watch, not a charge.
   */
  spareVial: 0,
} as const;

/**
 * Hints each level gives away before `PRICES.hint` starts applying.
 *
 * Flat across modes, unlike `FREE_UNDOS`. The undo allowance scales because a
 * gentle board forgives a bad pour and a fiendish one does not — the *need*
 * varies. A hint answers "what now?", and that question is the same question on
 * every mode; one free answer per level is the tutorial, everything after it is
 * the meter.
 */
export const FREE_HINTS = 1;

/**
 * Undos each level gives away before `PRICES.undo` starts applying.
 *
 * **Fewer as the mode gets harder, which is the opposite of what it looks
 * like.** A gentle board has spare tubes and forgives a bad pour; a fiendish
 * one has a single spare and does not, so the undo is worth more there — and a
 * thing worth more should not also be handed out more often. The allowance is
 * for the mistakes anyone makes while reading a new board, not for playing the
 * hard mode by trial and error.
 *
 * Per level, not per session: it resets whenever a level loads or is restarted,
 * so a long board is not stingier than a short one.
 *
 * Keyed by the ids in `game/difficulty.ts`. Not typed against `Difficulty`
 * because this file imports nothing — `freeUndosFor` in `undoCost.ts` is where
 * the two meet, and it fails the build if a mode is ever added without a number
 * here.
 */
export const FREE_UNDOS = {
  gentle: 3,
  classic: 2,
  fiendish: 1,
} as const;

/**
 * What the game pays.
 *
 * Together these set the ceiling every price is judged against. An engaged
 * player earns roughly 630 coins a day: a level averages about 49 with its
 * stars, and a block of ten with its milestone bonus comes to 535–632.
 */
export const EARNINGS = {
  /**
   * Coins per star on a finished level, so 20 to 60 a level.
   *
   * Per star rather than per completion, because completion is guaranteed —
   * there is no fail state — and paying for it flat would pay for elapsed time
   * rather than for playing well.
   */
  coinsPerStar: 20,

  /**
   * The milestone bonus rate, per star, in the first block of ten levels.
   *
   * It has to be worth noticing early, when a player has nothing saved and the
   * levels are short.
   */
  milestoneTopRate: 6,

  /**
   * Where that rate stops falling.
   *
   * The bonus has to stay a *bonus* later rather than becoming the main income,
   * or the economy pays for time served. At the floor a block is worth about
   * one extra level on top of the ten levels' own payouts.
   */
  milestoneFloorRate: 2,

  /** Blocks the rate takes to fall by one coin. */
  milestoneTaper: 2,

  /**
   * The seven-day claim track.
   *
   * Front-loaded but not flat, so the streak is worth keeping rather than worth
   * starting. Day seven is the point of the week: 150 coins, double day six,
   * fifteen times day one, and 43% of everything the week pays — breaking a
   * streak on day six has to cost something real or the streak is decoration.
   *
   * The values land on fives and tens because prices do. Anything finer reads
   * as a number that fell out of a formula rather than one somebody chose.
   */
  daily: [10, 15, 20, 30, 50, 75, 150],

  /**
   * What watching a rewarded ad pays — doc §8's highest-value slot.
   *
   * Here rather than on the screen that shows it because two screens quote it:
   * the Rewards row and Home's chip. They had drifted apart already, one naming
   * a constant and the other printing `+50` into a title.
   *
   * The ad SDK is phase 2, so nothing pays this yet; both places mark it as
   * coming rather than offering it.
   */
  rewardedAd: 50,
} as const;

/**
 * Real-money products, and what they hand over.
 *
 * Here for the same reason everything else is: the coin pack's size is a payout
 * and has to be judged against the earnings above — 8,000 is about thirteen
 * days of play, which is what makes it worth $1.99 rather than an insult or a
 * shortcut past the whole economy.
 *
 * **The prices are display strings, and only display strings.** A store SDK
 * quotes the real, localised price at runtime — in the player's currency, with
 * the platform's tax rules applied — and these are what the row shows until one
 * is wired up. Spec §10 puts that in phase 2, so both rows are marked as coming
 * rather than sold. Never charge from a number in this file.
 */
export const PRODUCTS = {
  /** Coins handed over by the pack. A payout, so it belongs with the others. */
  coinPackSize: 8000,
  /** Placeholder copy, replaced by the store's own quote when the SDK lands. */
  coinPackPrice: '$1.99',
  removeAdsPrice: '$2.99',
} as const;

/**
 * What a new player starts with.
 *
 * Zero, deliberately. The daily reward and the first few levels pay within
 * minutes, and a starting float would mean the first thing the economy teaches
 * is that coins arrive for doing nothing.
 */
export const STARTING_COINS = 0;

/**
 * Shop prices, by skin id.
 *
 * `null` is free — every player has those without buying anything. A skin's
 * artwork lives with the skin in `theme/skins.ts`; only its price is here, so
 * the shop can be repriced without touching a vessel path.
 *
 * Priced against the earnings above rather than at a flat rate: at ~630 a day
 * the first paid skin is a few days out and the second a few weeks, which is
 * the point of having a currency at all. Nothing is worth buying on day one,
 * and nothing takes a month.
 */
export const SKIN_PRICES: Record<string, number | null> = {
  'skin.vial': null,
  'skin.flask': null,
  'skin.beaker': 2500,
  'skin.ampoule': 6000,
};
