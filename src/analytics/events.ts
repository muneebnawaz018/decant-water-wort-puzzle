/**
 * What the app is allowed to record about itself.
 *
 * A closed union rather than free-form strings, so the set of events is
 * something you can read in one place and a typo is a build error instead of a
 * row nobody ever queries.
 *
 * **Nothing here identifies a player**, and that is a constraint rather than a
 * current state of affairs — see `src/analytics/log.ts` for what enforces it,
 * and `docs/07-privacy-policy.md` for the promise it keeps.
 */
export type AnalyticsEvent =
  /** A board was opened. `level` is the day index when `bonus` is true. */
  | 'level_start'
  /** A board was solved, with the stars and moves it took. */
  | 'level_complete'
  /** The player left a board unfinished. */
  | 'level_abandon'
  /** A hint was delivered, whether or not it was billed. */
  | 'hint_shown'
  /** A move was taken back. */
  | 'undo'
  /** The level's one spare vial was taken. */
  | 'spare_vial'
  /** An advert reached the screen. */
  | 'ad_shown'
  /** A rewarded advert was offered and how it ended. */
  | 'ad_outcome'
  /** The daily reward was claimed. */
  | 'daily_claim'
  /** A shop item was bought with coins. */
  | 'purchase';

/**
 * What may travel with an event.
 *
 * Numbers, short strings and booleans only. The restriction is the point: it
 * keeps a record small enough to hold thousands of, and it makes it impossible
 * to accidentally attach a board, a settings object or anything else that grows
 * without anyone noticing.
 */
export type EventProps = Record<string, number | string | boolean>;

/** One recorded event. */
export interface LoggedEvent {
  /** Milliseconds since the epoch, device clock. */
  at: number;
  event: AnalyticsEvent;
  props?: EventProps;
}
