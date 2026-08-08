import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { alpha, colours, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s, WINDOW_WIDTH } from '@/theme/scale';
import { section } from '@/ui/chrome/styles/section.styles';

/**
 * Days across the reward track.
 *
 * Three, matching the stage grid. Six tiles divide by it exactly now that day
 * seven has a row of its own, so the week is two clean rows with nothing to pad
 * — the previous layout spent a `ORPHAN_SLOTS` computation on the remainder.
 */
const DAY_COLUMNS = 3;
export const FLAME_SIZE = s(26);
export const COIN_SIZE = s(28);
const GRAND_COIN = s(44);

const GAP = s(10);

/**
 * The gap between blocks, and the whole of this screen's vertical rhythm.
 *
 * There were six values doing this job — 18, 10, 10, 18, 14, 24 — each lifted
 * from the mockup's CSS a block at a time, and the result reads as uneven
 * because it is. Three spacings now, and each one means something:
 *
 * - `BLOCK` between blocks: streak, track, claim, advert, bonus.
 * - `GAP` within the track, where the tiles and day seven are one group.
 * - The 6 under a heading, from `section.title`, shared with every other screen.
 *
 * `SPACE.section`, not a new number — this is the same "gap between blocks" the
 * rest of the app already spends.
 */
const BLOCK = SPACE.section;

/**
 * A slot's share of the row, gaps removed first.
 *
 * Percentages alone cannot express this: three tiles at 33% plus two gaps is
 * wider than the row, so the last wraps and the track silently becomes two
 * across. The gaps are in dp and there is no `calc`, so the row's real width is
 * measured and the share falls out of it.
 *
 * `ROUNDING_SLACK` is shaved off first. React Native resolves a percentage to a
 * float and Android rounds each resolved width *up* to a whole physical pixel;
 * at a 2.75 density that is a third of a dp per view, enough for a row that
 * needs its full width to wrap on Android while iOS sits flush. Half a dp is
 * below anything visible and above the error it absorbs.
 */
const ROW_WIDTH = WINDOW_WIDTH - SPACE.screen * 2;
const ROUNDING_SLACK = 0.5;
const SLOT = (ROW_WIDTH - GAP * (DAY_COLUMNS - 1) - ROUNDING_SLACK) / DAY_COLUMNS;
const DAY_SLOT_WIDTH = `${(SLOT / ROW_WIDTH) * 100}%` as const;

/**
 * The washes the two special cards carry, as `Panel`'s `tint` rather than as a
 * `backgroundColor`.
 *
 * They were background colours in `contentStyle` and neither had ever rendered:
 * that style lands on `Panel`'s `LinearGradient`, which paints over its own
 * background. Today's tile was a plain card with a gold border and the grand row
 * was a plain card with a gold border, where the mockup gives both a lit surface.
 */
export const TODAY_TINT = alpha('gold', 0.12);
export const GRAND_TINT = alpha('gold', 0.08);

export const styles = StyleSheet.create({
  /**
   * The streak, first thing on the page.
   *
   * Above the track rather than tucked into its last row. The track is seven
   * tiles the player scans; the streak is the one sentence that says what those
   * tiles are worth to them right now, and a summary that reads after the thing
   * it summarises is a footnote.
   */
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
    padding: s(16),
  },
  streakText: { flex: 1 },
  streakTitle: {
    fontFamily: POPPINS.semibold,
    fontSize: s(16),
    color: apothecary.ink,
    includeFontPadding: false,
  },
  streakDetail: {
    fontFamily: POPPINS.regular,
    fontSize: s(11),
    color: apothecary.inkMuted,
    includeFontPadding: false,
    marginTop: s(6),
  },
  /** The week's progress, as a bar rather than as "3 of 7". */
  streakBar: {
    height: s(6),
    borderRadius: s(4),
    backgroundColor: ui.wellDeep,
    overflow: 'hidden',
    marginTop: s(8),
  },
  streakBarFill: { height: '100%' },

  flame: { width: s(48), height: s(48), alignItems: 'center', justifyContent: 'center' },
  flameHalo: {
    position: 'absolute',
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: alpha('mango', 0.28),
  },
  flameGlyph: { transformOrigin: 'bottom' },

  /**
   * The coin's hot spot, where the mockup's radial gradient peaks.
   *
   * Percentages, so one style serves the 28dp tile coin and the 44dp grand one.
   * Round and offset up-left rather than centred: a highlight in the middle of
   * a disc reads as a hole, and the whole job of this layer is to say the
   * surface is curved and lit from somewhere.
   */
  coinSpecular: {
    position: 'absolute',
    top: '12%',
    left: '14%',
    width: '46%',
    height: '46%',
    borderRadius: 999,
    backgroundColor: alpha('goldPale', 0.75),
  },

  /**
   * Section eyebrow — now literally the one Shop, Stats and Settings use.
   *
   * It claimed to be that and was not: it re-stated `text.eyebrow` with its own
   * 18/10 margins, while `section.title` puts 6 under a heading. Both appear on
   * this screen — "7-DAY REWARDS" from here, "BONUS" from `SettingGroup` — so
   * the page had two heading rhythms twelve dp apart, which is most of what
   * reads as uneven.
   *
   * `marginTop` on top of the shared object rather than baked into it: the gap
   * *above* a heading is the block rhythm, and that belongs to the page.
   */
  label: { ...section.title, marginTop: BLOCK },

  track: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  daySlot: { flexGrow: 0, flexBasis: DAY_SLOT_WIDTH },
  day: { alignItems: 'center', paddingVertical: s(12), paddingHorizontal: s(6) },
  /**
   * Claimed and future both dim, and they are different things.
   *
   * Claimed carries a tick, so the fade reads as "done". A future day has
   * nothing on it but the amount, and the same fade reads as "not yet" — which
   * is the whole of what a locked tile has to say.
   */
  dayClaimed: { opacity: 0.5 },
  dayFuture: { opacity: 0.5 },
  /**
   * Today, ringed rather than merely brighter.
   *
   * A gold border plus a wash: on a page of six panels that differ only in
   * opacity, a colour shift alone was not enough to find at a glance.
   */
  dayToday: {
    borderWidth: 1,
    borderColor: apothecary.gold,
  },
  dayNumber: {
    fontFamily: POPPINS.semibold,
    fontSize: s(9),
    letterSpacing: s(0.5),
    color: apothecary.inkMuted,
    includeFontPadding: false,
  },
  dayNumberToday: { color: apothecary.goldLight },
  dayCoin: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    marginVertical: s(7),
    overflow: 'hidden',
  },
  dayAmount: {
    fontFamily: POPPINS.bold,
    fontSize: s(14),
    color: apothecary.ink,
    includeFontPadding: false,
  },
  /** The claimed tick, in the corner rather than over the coin. */
  check: {
    position: 'absolute',
    top: s(6),
    right: s(6),
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    backgroundColor: apothecary.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /**
   * Day seven, given a row of its own.
   *
   * It is ten times day one and the reason the streak is worth keeping, and as
   * a seventh tile in a grid of six it was the same 104dp square as the 10-coin
   * Monday. A reward that anchors a week has to look unlike the days leading to
   * it.
   */
  /**
   * The two boxes a `Panel` has, and which one a margin belongs in.
   *
   * `style` is the outer shadow view; `contentStyle` is the gradient inside it.
   * A margin in `contentStyle` moves the gradient *within* its own wrapper — so
   * the wrapper stays flush against whatever is above, and its bare surface
   * shows through as a band that reads as two cards overlapping. That is what
   * both of these were doing.
   *
   * The same split `StatsScreen` already uses for its mode cards: `modeCardBox`
   * carries the margin, `modeCard` carries the padding.
   */
  grandBox: { marginTop: s(10) },
  grand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
    padding: s(14),
    borderWidth: 1,
    borderColor: alpha('gold', 0.45),
  },
  grandCoin: {
    width: GRAND_COIN,
    height: GRAND_COIN,
    borderRadius: GRAND_COIN / 2,
    overflow: 'hidden',
  },
  grandText: { flex: 1 },
  grandLabel: {
    fontFamily: POPPINS.bold,
    fontSize: s(9),
    letterSpacing: s(0.7),
    color: apothecary.goldLight,
    includeFontPadding: false,
  },
  grandAmount: {
    fontFamily: POPPINS.bold,
    fontSize: s(17),
    color: apothecary.ink,
    includeFontPadding: false,
    marginTop: s(2),
  },

  claim: { marginTop: BLOCK },

  /**
   * The rewarded slot, doc §8's highest-value one.
   *
   * Blue, alone among gold and green surfaces. It is the one thing on the page
   * that is not the game paying you — it is an offer — and the palette says so
   * before the label does.
   */
  advertBox: { marginTop: BLOCK },
  advert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
    padding: s(14),
    borderWidth: 1,
    borderColor: alpha('blueberryLight', 0.45),
  },
  advertIcon: {
    width: s(42),
    height: s(42),
    borderRadius: s(12),
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  advertText: { flex: 1 },
  advertTitle: {
    fontFamily: POPPINS.semibold,
    fontSize: s(14),
    color: apothecary.ink,
    includeFontPadding: false,
  },
  advertNote: {
    fontFamily: POPPINS.regular,
    fontSize: s(11),
    color: apothecary.inkMuted,
    includeFontPadding: false,
    marginTop: s(2),
  },
  advertBadge: {
    fontFamily: POPPINS.bold,
    fontSize: s(12),
    color: colours.blueberryLight,
    includeFontPadding: false,
    borderWidth: 1,
    borderColor: alpha('blueberryLight', 0.5),
    borderRadius: s(9),
    paddingHorizontal: s(9),
    paddingVertical: s(4),
    overflow: 'hidden',
  },

  /** The gap `SettingGroup` cannot carry itself — it has no `marginTop`. */
  spacer: { height: BLOCK },
});
