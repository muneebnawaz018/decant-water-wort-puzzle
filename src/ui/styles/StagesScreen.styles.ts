import { StyleSheet } from 'react-native';

import { apothecary, GRADIENT_BORDER_FILL, SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { columnsFor, s, WINDOW_WIDTH } from '@/theme/scale';

/** The 12 every other grid in the app uses. Was 14, for no reason it kept. */
const GAP = s(12);

/**
 * Spec §4.3 shows a four-across grid; this is three, and the difference is
 * tile size. At four the tiles came out 75dp on a 390pt phone — a level
 * number, three stars and a lot of nothing, sized by the column count
 * rather than by what is in them. Three gives 106dp, which is the tile the
 * artwork was drawn at.
 *
 * The cost is real and was weighed: a 50-level page is 17 rows instead of 13,
 * so more scrolling to reach the frontier. Worth it — the page arrows are how
 * players actually move between blocks of levels, not the scroll.
 *
 * On a tablet the count is derived instead. Held at three, a 1024pt iPad would
 * make 310dp squares each holding one number: the grid grows, its content does
 * not, and a screen whose whole job is showing many levels at once shows nine.
 * `minWidth` is the phone's own tile, so a tablet shows more levels at the same
 * size rather than the same levels at a silly one.
 */
export const COLUMNS = columnsFor(WINDOW_WIDTH - SPACE.screen * 2, s(100), GAP, 3);

export const styles = StyleSheet.create({
  root: { flex: 1 },

  // `section` under the header and again under the tabs, the same gap
  // `ScrollPage` puts above the first card on every other screen. This screen
  // builds its own frame, so it was the one that had to be told.
  tabs: {
    flexDirection: 'row',
    gap: s(8),
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.section,
    paddingBottom: SPACE.section,
  },
  tabPress: { flex: 1 },
  tab: {
    paddingVertical: s(11),
    borderRadius: s(14),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: apothecary.line,
    // Android insets the background by the border width, leaving a ring of
    // the screen showing between the stroke and the gradient. See
    // `GRADIENT_BORDER_FILL`.
    backgroundColor: GRADIENT_BORDER_FILL,
  },
  // Same style, a gold gradient instead of the panel one, so it needs its own
  // border fill — the panel fill would ring a gold tab in purple.
  tabActive: { borderColor: ui.buttonGloss, backgroundColor: apothecary.gold },
  tabText: {
    fontFamily: POPPINS.semibold,
    fontSize: s(13),
    color: apothecary.inkMuted,
  },
  tabTextActive: {
    fontFamily: POPPINS.semibold,
    fontSize: s(13),
    color: ui.onGold,
  },

  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.screen,
    paddingBottom: SPACE.section,
  },
  pageLabel: {
    fontFamily: POPPINS.semibold,
    fontSize: s(14),
    color: apothecary.inkMuted,
  },

  /**
   * The top padding is not decoration — it is clearance.
   *
   * The current level's ring is drawn 3dp outside its tile, and a scroll view
   * clips at its own top edge, so on the first row the ring came out with a
   * flat top. Android showed it worst: `elevation` renders the tile shadow into
   * the same band, so the row read as cut off rather than as spaced.
   */
  grid: { paddingHorizontal: SPACE.screen, paddingTop: s(6) },
  row: { gap: GAP, marginBottom: GAP },
  tileSlot: { flex: 1 },
  tile: {
    // Wider than tall, deliberately. Square tiles tie height to width, so
    // widening the grid to three columns also made every row 40% taller and a
    // page went from 13 rows of scroll to 17. 1.25 keeps the row height where
    // four columns had it while the tile itself gets the extra width.
    aspectRatio: 1.25,
    borderRadius: s(22),
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    borderWidth: 1,
    borderColor: apothecary.line,
    // Android insets the background by the border width, leaving a ring of
    // the screen showing between the stroke and the gradient. See
    // `GRADIENT_BORDER_FILL`.
    backgroundColor: GRADIENT_BORDER_FILL,
    shadowColor: ui.shadow,
    shadowOpacity: 0.3,
    shadowRadius: s(6),
    shadowOffset: { width: 0, height: s(4) },
    elevation: 4,
  },
  tileLocked: { opacity: 0.55 },
  tileNumber: {
    fontFamily: POPPINS.semibold,
    fontSize: s(22),
    color: apothecary.ink,
  },
  tileNumberLocked: { fontSize: s(15), color: apothecary.inkMuted },

  ring: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: s(25),
    borderWidth: 3,
  },
});
