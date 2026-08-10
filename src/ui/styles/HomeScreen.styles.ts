import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { alpha, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s, v } from '@/theme/scale';
import { BUMP_RISE, NAV_BAR_HEIGHT, NAV_OFFSET } from '../chrome/styles/NavBar.styles';

/**
 * Air between the Play button and the raised Home disc.
 *
 * Its own constant because it is the one number on this screen tuned by eye
 * rather than derived: the other three terms of `navSlot` are the chrome's
 * actual measurements, and this is the only part a person gets to argue with.
 *
 * The disc glows, so the visual gap is smaller than the geometric one — the
 * `boxShadow` on `NavBar`'s bump reaches 18 beyond its edge with a 2 spread,
 * and Play carries the same glow downward. Thirty read as touching for exactly
 * that reason: two glows meeting in a gap the size of one of them.
 */
const PLAY_CLEARANCE = s(56);

export const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: SPACE.screen },

  // The 8/10 that used to be added to the safe-area insets inline. Kept on the
  // bar itself so the screen frame is the same shape as every other screen's.
  topbar: {
    marginTop: v(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: v(12),
  },
  /*
    Clears the bar that Root floats over every screen — and the raised Home
    button on it, which `NAV_BAR_HEIGHT` does not include.

    The bump is the tallest part of the chrome and it is centred, so it lands
    over the middle of a full-width Play button. `useScreenPadding` has always
    added `BUMP_RISE` for the scrolling screens; Home reserves its own space and
    was the one place still measuring the bar alone.

    Four terms, and every one of them earns its place. The bar, the disc above
    it, the `NAV_OFFSET` Root holds the bar off the bottom edge, and
    `PLAY_CLEARANCE`. Reserving exactly the first three — which is what this did
    at first — puts Play's bottom edge precisely on the disc's top edge: no
    overlap by the arithmetic, and touching to the eye, which is worse than
    either.
  */
  navSlot: { height: NAV_BAR_HEIGHT + BUMP_RISE + NAV_OFFSET + PLAY_CLEARANCE },

  /*
    Where the slack goes, which is the whole layout.

    A phone column is a fixed budget of blocks in a variable amount of room, so
    something has to absorb the difference between a 780dp Android and an 874dp
    iPhone. The only question is what.

    It was `stack`'s auto margins, and both settings were wrong in the same way
    — they put the leftover somewhere a player reads as a gap. Both margins
    centred the cards and opened a hole between the rack and the Continue card.
    `marginBottom` alone pooled it all under Play, which is the version that
    made Android look loose and iOS look right: same styles, 94dp more slack.

    It is the hero now. `heroSlot` flexes and centres its content, so every
    functional gap below it — card to chips, chips to Play, Play to nav bar — is
    a fixed number on every device, and the difference between phones shows up
    as more or less air around the vials. Which is decoration, and the only
    block on the screen that can take it without anyone noticing.
  */
  body: { flex: 1, gap: v(24) },
  heroSlot: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  stack: { gap: v(28) },

  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
    padding: s(14),
  },
  badge: {
    width: s(46),
    height: s(46),
    borderRadius: s(14),
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: POPPINS.bold, fontSize: s(18), color: ui.onGold },
  continueInfo: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontFamily: POPPINS.semibold,
    fontSize: s(10),
    letterSpacing: s(0.8),
    textTransform: 'uppercase',
    color: apothecary.inkMuted,
  },
  continueLevel: {
    fontFamily: POPPINS.semibold,
    fontSize: s(16),
    color: apothecary.ink,
    marginTop: s(2),
    marginBottom: s(8),
  },
  bar: {
    height: s(6),
    borderRadius: s(4),
    overflow: 'hidden',
    backgroundColor: ui.wellDeep,
  },
  barFill: { height: '100%', borderRadius: s(4), overflow: 'hidden' },
  /**
   * The band that runs along the fill.
   *
   * Three times the fill's width, so `useMercury` can translate it in percent
   * and carry it clear of both edges at any fill length — see the hook. A pale
   * wash rather than a hard edge: the fill is 6dp tall, and anything sharper
   * reads as a defect in the bar rather than as light on it.
   */
  mercury: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '33.333%',
    left: 0,
    backgroundColor: alpha('white', 0.42),
    transform: [{ skewX: '-20deg' }],
  },
  /**
   * The card's only affordance, and it was reading as a decoration — a 34dp
   * disc holding a 12dp glyph, at the wash opacity used for inert chips.
   *
   * Bigger and stronger, but still translucent rather than a solid accent fill.
   * The whole card is the tap target, so this is a signpost pointing at it, not
   * a button competing with it; an opaque green disc would claim to be the only
   * thing here that responds.
   */
  goChip: {
    width: s(46),
    height: s(46),
    borderRadius: s(23),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha('accent', 0.34),
    // Clips the tap burst to the disc. Without it the rings spill square.
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: alpha('accent', 0.45),
  },

  chips: { flexDirection: 'row', gap: s(12) },
  chipPress: { flex: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: s(10), padding: s(11) },
  /**
   * The mark inside the tile, inset from it.
   *
   * `contain` fits the whole 100x100 composition into the box, and both marks
   * throw something past their own artwork — the gift's sparks, the advert's
   * ring. Filling the tile edge to edge would have those clipped by the tile's
   * rounded corner at exactly the moment they are brightest.
   */
  chipMark: { width: '86%', height: '86%' },
  chipIcon: {
    width: s(36),
    height: s(36),
    borderRadius: s(11),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { flex: 1, minWidth: 0 },
  chipTitle: {
    fontFamily: POPPINS.semibold,
    fontSize: s(12.5),
    color: apothecary.ink,
  },
  chipDetail: {
    fontFamily: POPPINS.regular,
    fontSize: s(10.5),
    color: apothecary.inkMuted,
  },
});
