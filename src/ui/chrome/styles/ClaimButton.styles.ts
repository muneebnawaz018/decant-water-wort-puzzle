import { StyleSheet } from 'react-native';

import { apothecary, HAIRLINE, SPACE } from '@/theme/apothecary';
import { alpha, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';

/**
 * The card radius, not the button one.
 *
 * This control now sits inside the reward track as a two-wide tile, so it has
 * to corner like the tiles beside it. At `buttonRadius` it read as a button
 * that had wandered into a grid.
 */
const RADIUS = SPACE.cardRadius;

/** The coin beside the caption. Cap-height of the caption's own type. */
export const CAPTION_COIN = s(13);

export const styles = StyleSheet.create({
  /**
   * Passed down every layer of the control when it is filling a slot.
   *
   * All of them, because each is a plain `View` wrapping the next: growing only
   * the outermost leaves the gradient face at its content height inside a
   * full-height shadow, which looks like the border has come away from the fill.
   */
  grow: { flex: 1 },
  /**
   * Waiting throws no light — but it keeps its drop shadow, so it still sits on
   * the page rather than in it. The old version zeroed both and the button
   * looked printed on the background.
   */
  restShadow: {
    borderRadius: RADIUS,
    shadowColor: ui.shadow,
    shadowOpacity: 0.3,
    shadowRadius: s(14),
    shadowOffset: { width: 0, height: s(5) },
    elevation: 5,
  },
  /** Ready spills gold, the same glow every lit button in the app carries. */
  readyShadow: {
    borderRadius: RADIUS,
    shadowColor: ui.buttonGlow,
    shadowOpacity: 0.45,
    shadowRadius: s(18),
    shadowOffset: { width: 0, height: s(6) },
    elevation: 8,
  },

  // Stroke as a padded background rather than a border — see `HAIRLINE`.
  face: { borderRadius: RADIUS, padding: HAIRLINE, overflow: 'hidden' },
  restEdge: { backgroundColor: alpha('gold', 0.45) },
  readyEdge: { backgroundColor: ui.buttonEdge },

  fill: {
    flex: 1,
    borderRadius: RADIUS - HAIRLINE,
    alignItems: 'center',
    justifyContent: 'center',
    // Tight vertically, because the waiting state's mark is what sets this
    // control's height now and it should reach close to the card's edges. The
    // ready state is a single line and is centred in whatever height the row
    // gives it, so it is unaffected.
    paddingVertical: s(8),
    paddingHorizontal: s(10),
    overflow: 'hidden',
  },

  /**
   * The waiting layout: a mark, then the caption over the clock.
   *
   * A row rather than a centred stack, because the clock has to stay the widest
   * thing in the control and a stack would centre a 36dp mark above it with
   * nothing beside it — which spends the height this control does not have.
   */
  // The gap is wider than the app's usual 8 because the mark is artwork rather
  // than a glyph: the vial's own frame has no padding, so its gold sits hard
  // against the caption's first letter at a spacing that reads fine between two
  // pieces of text.
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: s(14) },
  /**
   * The mark's box.
   *
   * Sized in dp rather than left to flex: `LottieView` measures itself to the
   * composition's own size when its style gives it no resolved width — the same
   * trap `useTapBurst.styles` records, where a player inflated a 42dp button to
   * three times its size on Android.
   *
   * **Tall, matching the composition's own 110×200.** The box was square at 34,
   * and `contain` fits a tall frame into a square one by shrinking it to the
   * square's *width* — so the vial drew about 18dp high and read as a gold pill
   * with a dot over it. Matching the aspect is what lets it fill the tile.
   */
  brew: {
    width: s(38),
    height: s(69),
    /**
     * Lifted, because the artwork is not centred in its own canvas.
     *
     * `brew.json` is 110x200 and the glass sits at y=120 spanning 46 to 194 —
     * the empty forty units above it are headroom for the drop to fall
     * through. Flex centres the *box*, so the visible vial hung about 7dp below
     * the text beside it, which reads as two things that were meant to line up
     * and did not.
     *
     * A transform rather than a margin: the glass has to move without the row's
     * height changing, and a margin large enough to shift it would also push
     * the row's own centring around. The number is the composition's imbalance
     * scaled to the box — (120 - 100) / 200 * 69 — not a value picked by eye.
     */
    transform: [{ translateY: -s(7) }],
  },
  /** Left-aligned under the mark, so the caption and the clock share an edge. */
  waitText: { flexShrink: 1 },

  /**
   * The eyebrow and the prize, on one line.
   *
   * `space-between` rather than a gap, so the coin sits at the clock's right
   * edge underneath it. Aligned to the caption's baseline by centring: the coin
   * is a glyph of its own size and hanging it off the text's baseline leaves it
   * riding high on the taller cap.
   */
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
    marginBottom: s(2),
  },
  captionValue: { flexDirection: 'row', alignItems: 'center', gap: s(3) },
  captionAmount: {
    fontFamily: POPPINS.bold,
    fontSize: s(12),
    color: apothecary.goldLight,
    includeFontPadding: false,
  },

  /**
   * The clock's own box, and the reason the row stops twitching.
   *
   * Poppins is proportionally spaced, so the countdown is a different width at
   * `23:59:59` than at `11:11:11` — and as a bare sibling in the column it
   * dragged the caption row's `space-between` back and forth once a second. A
   * floor under the width means the layout is decided by the widest time the
   * clock can show rather than by the one it happens to be showing.
   *
   * `alignSelf: 'flex-start'` keeps the digits left-aligned against the caption
   * above them; centring inside the floor would drift them right whenever the
   * time is narrow, which is the same twitch one level down.
   */
  clockBox: { minWidth: s(148), alignSelf: 'flex-start' },
  /**
   * The caption, small and above the numbers.
   *
   * Uppercase and tracked, which the inline version could not be: on one line
   * with the clock it read as a tracked caption that had collided with a
   * number. Given its own line it is doing the job captions do everywhere else
   * in this app — the eyebrow over a value.
   */
  waitCaption: {
    fontFamily: POPPINS.bold,
    // 11, not 9. Against a 30dp clock the smaller size read as a label the
    // number had outgrown; the eyebrow should be quiet, not faint.
    fontSize: s(11),
    letterSpacing: s(0.8),
    color: alpha('goldLight', 0.65),
    includeFontPadding: false,
  },

  /**
   * The clock, and the claim.
   *
   * The tracking came down as the size went up: 0.8 at 17 was set to give a
   * short label some presence, and at 26 it only pulls a running countdown's
   * digits apart. Tracking is a ratio of the glyph, not a constant.
   */
  /**
   * Down from 26, because the control is no longer the full width of the page.
   *
   * It shares the track's last row with day seven now, so it has two thirds of
   * a row rather than all of it — about 230dp on the narrowest phone. At 26 the
   * two longest strings this ever holds, `Claim 150 coins` and a running
   * `19:39:28`, both ran past that. The ratio to the caption is kept, so the
   * hierarchy the three earlier attempts landed on survives the resize.
   */
  label: {
    fontFamily: POPPINS.bold,
    fontSize: s(21),
    letterSpacing: s(0.2),
    // Android pads a `Text` box with the font's own ascender and descender
    // space unless told not to. Flex then centres the *box*, leaving the
    // visible digits sitting high with the slack below them — which is what
    // made a perfectly centred control look off. The caption already sets it;
    // the clock is the bigger type and was the one showing it.
    includeFontPadding: false,
  },
  /** Gold on the panel surface: a live clock, not a greyed-out control. */
  restLabel: { color: apothecary.goldLight },
  /** Dark ink on the lit face. White on gold measures 1.7:1. */
  readyLabel: { color: ui.onGold },
});
