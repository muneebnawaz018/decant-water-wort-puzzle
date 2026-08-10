import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { alpha, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';

/** The payout coin. Bigger than the pill's, because this is the announcement. */
export const REWARD_COIN = s(22);

export const styles = StyleSheet.create({
  /**
   * A dimmed board with a card on it, not a screen of its own.
   *
   * The win used to be a full page: a title floating in space, two buttons at
   * the bottom and a lot of ground between them. Every game in the genre does
   * the same thing instead — darken the ground and put the result on a card
   * over it — and the reason is that it reads as *this level finished* rather
   * than as somewhere new you have been taken.
   */
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  // Fills the screen behind the card. `resizeMode="cover"` then decides how the
  // animation's own square canvas sits in it.
  lottie: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  fill: { flex: 1 },

  burst: {
    position: 'absolute',
    top: '36%',
    left: '50%',
    width: 0,
    height: 0,
  },
  spark: { position: 'absolute', width: s(7), height: s(7), borderRadius: s(2) },

  // Clamped the same way the modal is: a card held at phone width on a tablet
  // sits in the middle of a large screen with type that has grown around it.
  cardSlot: { width: '100%', maxWidth: s(340), paddingHorizontal: SPACE.screen },
  card: {
    alignItems: 'center',
    paddingTop: s(22),
    paddingBottom: s(20),
    paddingHorizontal: s(20),
  },

  /**
   * Straddling the card's top edge rather than sitting inside it.
   *
   * This is the one flourish the layout gets, and it earns its place: the stars
   * are the reward, so they break the frame instead of queuing inside it.
   */
  /**
   * Inside the card, above the title.
   *
   * They were hung over the top edge first, podium style, the way the genre
   * usually does it. The card clips to its own radius — that is what keeps the
   * gloss inside the corners — so the row came back sawn in half, and moving it
   * outside the `Panel` to dodge that made the stars float free of the card
   * they belong to. In the flow they read as part of the result.
   */
  stars: { flexDirection: 'row', gap: s(10), marginBottom: s(10) },
  starSlot: { width: s(54), height: s(54) },
  // The middle star still sits a little higher and larger — a podium, kept now
  // that the row is inline.
  starMiddle: { transform: [{ translateY: -s(4) }, { scale: 1.1 }] },

  title: {
    fontFamily: POPPINS.bold,
    fontSize: s(24),
    color: apothecary.gold,
    textAlign: 'center',
  },
  moves: {
    fontFamily: POPPINS.medium,
    fontSize: s(13),
    color: apothecary.inkMuted,
    marginTop: s(4),
  },

  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    paddingHorizontal: s(18),
    paddingVertical: s(10),
    marginTop: s(16),
    borderRadius: s(14),
    backgroundColor: alpha('gold', 0.14),
  },

  rewardText: {
    fontFamily: POPPINS.semibold,
    fontSize: s(16),
    color: apothecary.goldLight,
  },

  /**
   * One action, then two ways out.
   *
   * The old screen gave Replay and the next level equal weight, side by side in
   * the same colour. They are not equal: the next level is what almost everyone
   * wants, and replaying a board you have just solved is a minority choice. So
   * the next level takes the full width as the only primary button, and Replay
   * drops to a ghost beside Home.
   */
  /**
   * The dismiss cross, pinned to the card's top-right.
   *
   * Absolute, so it is out of the centred column the card lays its content in —
   * anything in that flow pushes the stars off centre, and the stars are the
   * one thing on this card that has to look placed.
   *
   * No background disc. The corner is empty, the glyph is muted, and a chip
   * around it would compete with the three real buttons below; `hitSlop` on the
   * Pressable gives it the touch area a bare 15dp glyph cannot.
   */
  close: {
    position: 'absolute',
    // Measured so the ink lands where a 12dp inset would put it: the frame is
    // deliberately larger than the cross (see `closeMark`), so an inset applied
    // to the frame reads as a wider margin than it is.
    top: s(6),
    right: s(6),
    // Above the stars, which straddle the card's top edge and overlap this
    // corner's row. Without it the outer star swallows the press.
    zIndex: 1,
  },
  /**
   * The mark's box.
   *
   * Larger than the ink inside it: the cross reaches 8 units of a 44-unit
   * frame, and the frame has to hold both the tilt and the 107% breath without
   * clipping their corners. `hitSlop` on the Pressable covers the touch area,
   * so this number is only ever about the drawing.
   */
  closeMark: { width: s(28), height: s(28) },

  next: { alignSelf: 'stretch', marginTop: s(22) },
  secondary: { flexDirection: 'row', gap: s(10), alignSelf: 'stretch', marginTop: s(10) },
  secondaryButton: { flex: 1 },

  divider: {
    height: 1,
    alignSelf: 'stretch',
    marginTop: s(18),
    backgroundColor: ui.divider,
  },
});
