import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { alpha, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { text } from '@/theme/typography';
import { s, WINDOW_WIDTH } from '@/theme/scale';

/**
 * Days across the reward track. Seven rewards do not divide by it.
 *
 * Three, matching the stage grid. Four fitted the week into two neat rows and
 * made every tile 76dp — a day number and an amount in a box too narrow to say
 * what the amount is, which is why the unit was abbreviated to "c". At three
 * the tile is the one the stage grid uses and the word fits.
 */
export const DAY_COLUMNS = 3;

/** The 12 every other grid in the app uses. This track was on 10. */
const GAP = SPACE.tile;

/**
 * A slot's share of the row, gaps removed first.
 *
 * Percentages alone cannot express this: four tiles at 25% plus three gaps is
 * wider than the row, so the fourth wraps and the track silently becomes three
 * across. The gaps are in dp and there is no `calc`, so the row's real width is
 * measured and the share falls out of it — the same derivation `theme/grid.ts`
 * does for the two-across grids, which cannot be reused here because it returns
 * a phone percentage verbatim and this track's was hand-tuned to a different
 * gap.
 */
const ROW_WIDTH = WINDOW_WIDTH - SPACE.screen * 2;

/**
 * Shaved off the row before the slots are cut from it.
 *
 * Day 7 and the two-slot streak card add up to exactly the row, which is
 * correct arithmetic and wrong in practice: React Native resolves a percentage
 * to a float and Android rounds each resolved width *up* to a whole physical
 * pixel. At a 2.75 density that is a third of a dp per view, and a row that
 * needs its full width to fit is then a third of a dp too wide — so the streak
 * card wrapped to its own line on Android while iOS, which keeps subpixel
 * layout, sat flush.
 *
 * Half a dp is below the threshold of anything visible and above the rounding
 * error it exists to absorb.
 */
const ROUNDING_SLACK = 0.5;
const SLOT = (ROW_WIDTH - GAP * (DAY_COLUMNS - 1) - ROUNDING_SLACK) / DAY_COLUMNS;
const DAY_SLOT_WIDTH = `${(SLOT / ROW_WIDTH) * 100}%` as const;

/**
 * Two slots and the gap between them — the streak card's width.
 *
 * Seven days across three columns leaves day 7 alone beside two empty slots,
 * and the streak is exactly two slots wide. Putting it there fills the row and
 * lands the card at the end of the week it is counting, rather than above a
 * track the reader has not seen yet.
 *
 * Two slots plus one gap, not two-thirds of the row: the gap is dp and the
 * slots are a percentage, so adding them is the only way the card lines up with
 * the column boundary above it.
 */
export const STREAK_SPAN = 2;
const DAY_SLOT_WIDE = `${((SLOT * STREAK_SPAN + GAP) / ROW_WIDTH) * 100}%` as const;

/** The streak glyph. */
export const FLAME_SIZE = s(24);

/** The play glyph on the ad ribbon. */
export const RIBBON_ICON = s(11);

/**
 * The ribbon's two halves: what shows above the claim button, and what hides
 * behind it.
 *
 * A tab is only a tab if something overlaps it. The lip has to clear the text
 * it holds — 20dp around an 11dp line — and the tuck only has to reach far
 * enough under the button that no gap opens between them at any rounding, which
 * 10dp does with room to spare.
 */
const RIBBON_LIP = s(20);
const RIBBON_TUCK = s(10);

/**
 * A tile's shape, and the wide tile's — same height, twice the width.
 *
 * 1.4, not the 1.25 it was. At 1.25 the tile stood 85dp tall around 42dp of
 * type, so half of it was empty and the day read as a small label adrift in a
 * large box. The type below grew and the box shrank to meet it: the content now
 * sits about a `SPACE.tile` inset from each edge, which is what every other
 * grid tile in the app looks like.
 */
const DAY_RATIO = 1.4;
const DAY_HEIGHT = SLOT / DAY_RATIO;

export const styles = StyleSheet.create({
  // A tile of the track, not a panel above it — so it takes the tile's height
  // and inset rather than `SPACE.panel`, and sits level with day 7 beside it.
  /**
   * Gold, because it is not a day.
   *
   * Sat in the grid at a tile's height after a run of seven identical tiles, an
   * untinted card reads as day 8 — the eye groups it with them before it reads
   * the words. The wash and the edge are the same pair `dayToday` uses to mark
   * itself out of the row.
   */
  streak: {
    height: DAY_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    padding: SPACE.tile,
    borderWidth: 1,
    borderColor: alpha('gold', 0.35),
    backgroundColor: alpha('gold', 0.12),
  },
  flame: {
    width: FLAME_SIZE * 1.35,
    height: FLAME_SIZE * 1.35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** The pivot goes on the view that is transformed, not on the box holding it. */
  flameGlyph: { transformOrigin: 'bottom' },
  /**
   * The heat the fire throws, behind it.
   *
   * On the slower of the two loops, so the light and the flame drift in and out
   * of step rather than pulsing as one object.
   *
   * Sat low in the box, where the base of the flame is — the glyph is widest
   * there and its tip is a point, so a centred glow lights empty air.
   */
  flameHalo: {
    position: 'absolute',
    bottom: 0,
    width: FLAME_SIZE * 0.9,
    height: FLAME_SIZE * 0.9,
    borderRadius: FLAME_SIZE * 0.45,
    backgroundColor: alpha('mango', 0.22),
  },
  streakText: { flex: 1 },
  /**
   * The card's two lines, at the presets' sizes.
   *
   * The detail was 11 against a 12 caption — a size that exists nowhere else in
   * the app, set to squeeze under a title that was itself a point short. Both
   * now match what the rest of the screens use, and the second line takes a
   * small `marginTop` instead of relying on Poppins' leading to separate them.
   */
  streakTitle: { ...text.cardTitle, fontSize: s(16), color: apothecary.goldLight },
  streakDetail: { ...text.caption, marginTop: s(2) },

  // Same frame as the Shop and Progress grids: a tile gap between tiles, a
  // section gap under the finished block. No top margin — `ScrollPage` already
  // opens the page with one, and the track is now the first thing on it.
  track: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    marginBottom: SPACE.section,
  },

  /**
   * Four across, seven days — so the last row holds three and the grid has to
   * be told what to do with the empty fourth slot.
   *
   * It used to hold `width`, `flexBasis` and `flexGrow: 1` together, which is
   * three answers to one question. `flexBasis` wins over `width` in flex
   * layout, so the width was dead, and `flexGrow: 1` handed the leftover space
   * to whatever was in the row: four tiles came out 78dp wide and the last
   * three came out 107dp. The comment above it claimed the row was not
   * stretched, which is exactly what it was.
   *
   * This is the failure `src/theme/grid.ts` exists to prevent — the shop hit
   * it first, with one skin alone on a row at three times the size of the one
   * above. The rule it records: an explicit width has to come with an explicit
   * `flexGrow: 0`. Daily missed it by hand-rolling its grid.
   *
   * `DailyScreen` now pads the short row with an empty slot, the same fix
   * `StagesScreen` uses for a 50-tile page that never divides by four.
   */
  daySlot: { flexGrow: 0, flexBasis: DAY_SLOT_WIDTH },
  /** The streak card's slot, two columns wide. */
  daySlotWide: { flexGrow: 0, flexBasis: DAY_SLOT_WIDE },

  // A height, not an `aspectRatio`, because the streak card shares it and is
  // twice as wide — a ratio would make it twice as tall too. `SPACE.tile` is
  // the inset every other grid tile in the app uses; this track was on 12
  // vertical against 4 horizontal, which is why it read as a different
  // component from the grids on Shop and Progress.
  day: {
    height: DAY_HEIGHT,
    padding: SPACE.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayClaimed: { backgroundColor: ui.accentWash },
  dayToday: { borderColor: apothecary.gold, borderWidth: 2 },
  /**
   * The same eyebrow/figure pairing the Progress tiles use, at the preset's own
   * sizes rather than shrunk below them.
   *
   * The day number was 9.5 and the amount 15 — a figure two thirds the size of
   * a card title, which is not a figure. The amount is the only thing on the
   * tile a player is comparing across the week, so it carries the weight and
   * the day number sits above it as a label. `lineHeight` is set because
   * Poppins' natural leading at this size opens a gap the tile cannot spare.
   */
  dayNumber: { ...text.eyebrow },
  dayAmount: {
    ...text.figure,
    fontSize: s(21),
    lineHeight: s(26),
    marginTop: s(5),
  },
  /**
   * The unit, held down while the figure went up.
   *
   * "150 coins" is the widest line the tile ever holds and it has to survive
   * the narrowest phone: at 375pt the slot is 101dp and the `SPACE.tile` inset
   * leaves about 77 for the text. A 21dp figure spends 39 of that, so the unit
   * has roughly 30 to work in — which is where 10 comes from rather than
   * taste. Raise either number and day 7 wraps on an SE while looking fine on
   * every simulator anybody opens.
   */
  dayUnit: {
    fontFamily: POPPINS.medium,
    fontSize: s(10),
    color: apothecary.inkMuted,
  },

  /**
   * The claim button and the ribbon hanging off it.
   *
   * `paddingTop` rather than a negative offset on the ribbon: an absolutely
   * positioned child that sticks out past its parent's box is clipped on
   * Android in the cases where the parent gets a background or an elevation
   * later, and nothing warns you — it renders correctly on iOS the whole time.
   * Reserving the lip inside the wrapper keeps the ribbon in bounds by
   * construction.
   */
  claim: { paddingTop: RIBBON_LIP },

  /**
   * The rewarded slot, as a tab tucked under the button's top edge.
   *
   * It was a settings row three blocks down the page, which is the wrong place
   * for the only other way to earn coins on a screen about earning coins — the
   * player is looking at the countdown, and the answer to "not for another
   * sixteen hours" belongs where they are looking.
   *
   * Order does the layering, not `zIndex`: the ribbon is rendered before the
   * button, so iOS paints the button over it, and on Android the button's own
   * `elevation` puts it above a ribbon that has none. Nothing has to be told
   * twice.
   *
   * `right` clears the button's 16dp corner radius, so the tab meets a straight
   * edge rather than hanging over the curve.
   *
   * Opaque, in the button's own top-of-gradient colour. Translucent gold over
   * the ground was tried and reads as a sticker: the tab has to look cut from
   * the same material as the thing it is attached to.
   */
  ribbon: {
    position: 'absolute',
    top: 0,
    right: s(18),
    height: RIBBON_LIP + RIBBON_TUCK,
    paddingBottom: RIBBON_TUCK,
    paddingHorizontal: s(9),
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    borderTopLeftRadius: s(9),
    borderTopRightRadius: s(9),
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: alpha('gold', 0.45),
    backgroundColor: apothecary.surfaceTop,
  },
  /**
   * `includeFontPadding: false` on both, with the line heights stated.
   *
   * Android reserves an ascender/descender band this line never uses, and it is
   * asymmetric — inside a 20dp lip that is the difference between lettering on
   * the centre line and lettering sitting visibly high in the tab. The same fix
   * `SoonBadge` carries, for the same reason.
   */
  ribbonAmount: {
    fontFamily: POPPINS.bold,
    fontSize: s(12),
    lineHeight: s(15),
    includeFontPadding: false,
    color: apothecary.goldLight,
  },
  /**
   * The ad has no SDK behind it — spec §8 puts it in phase 2 — so the tab says
   * so on itself rather than promising fifty coins it cannot pay. It is also
   * why the ribbon takes no press: a marked control that still swallows a tap
   * is the thing `SoonBadge` exists to avoid.
   */
  ribbonNote: {
    ...text.eyebrow,
    fontSize: s(8.5),
    lineHeight: s(11),
    includeFontPadding: false,
  },

  spacer: { height: SPACE.section },
});
