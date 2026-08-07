import { useOverlayStore } from '@/state/overlayStore';
import { s } from '@/theme/scale';
import { NAV_BAR_HEIGHT, navBarWidth } from '../chrome/styles/NavBar.styles';
import { drawerWidth } from '../chrome/styles/SettingsDrawer.styles';
import { dayState } from '../rewardTrack';

/**
 * The chrome's three pure pieces.
 *
 * Nothing here mounts a component. Every one of these screens draws its glyphs
 * on Skia canvases, which need a native runtime, so the parts worth pinning are
 * pulled out as functions — the bar's width, the drawer's width, and the
 * off-by-one between the day you are on and the day you already claimed.
 */

describe('navBarWidth', () => {
  /**
   * Expectations go through `s()` rather than naming dp.
   *
   * The margins and the clamp are scaled, and `s()` is the identity only on a
   * phone — a test that hardcodes 28 passes on a phone-sized window and fails
   * under a tablet one, which says nothing about the bar and everything about
   * the harness that measured it.
   */
  it('insets the bar from both screen edges', () => {
    expect(navBarWidth(390)).toBe(390 - s(14) * 2);
  });

  it('clamps on a wide screen so the tabs stay one control', () => {
    // An iPad would otherwise put four destinations a hand's width apart.
    expect(navBarWidth(4000)).toBe(s(420));
  });

  it('takes the safe-area sides off before the margins', () => {
    expect(navBarWidth(390, 20)).toBe(390 - 20 - s(14) * 2);
  });

  it('never exceeds the window it sits in', () => {
    for (const width of [320, 375, 390, 430, 768, 1024, 1366, 4000]) {
      expect(navBarWidth(width)).toBeLessThanOrEqual(width);
    }
  });
});

describe('drawerWidth', () => {
  it('leaves the screen behind it visible', () => {
    // The strip of screen still showing is what makes a drawer read as one.
    expect(drawerWidth(390)).toBeLessThan(390);
  });

  it('caps on a tablet, where a share of the width is a whole screen', () => {
    expect(drawerWidth(4000)).toBe(s(340));
  });
});

describe('NAV_BAR_HEIGHT', () => {
  /**
   * Screens clear the bar by reserving this much, so it has to be the height
   * the bar actually draws. A bar taller than the number hides the last card.
   */
  it('is a positive, whole-ish dp value', () => {
    expect(NAV_BAR_HEIGHT).toBeGreaterThan(0);
    expect(NAV_BAR_HEIGHT).toBe(s(66));
  });
});

describe('dayState', () => {
  it('marks every day before the current one claimed', () => {
    expect(dayState(0, 3, false)).toBe('claimed');
    expect(dayState(2, 3, false)).toBe('claimed');
  });

  it('marks every day after the current one future', () => {
    expect(dayState(4, 3, false)).toBe('future');
    expect(dayState(6, 3, false)).toBe('future');
  });

  it('marks the current day today when a claim is waiting to be made', () => {
    expect(dayState(3, 3, false)).toBe('today');
  });

  /**
   * The off-by-one this function exists for.
   *
   * While the timer runs, the day the track sits on is the one *just claimed* —
   * not the one coming next. Rendered as "today" it would offer a reward the
   * player has already taken, beside a button counting down to the next one.
   */
  it('marks the current day claimed while the timer runs', () => {
    expect(dayState(3, 3, true)).toBe('claimed');
  });
});

describe('the settings drawer', () => {
  beforeEach(() => {
    useOverlayStore.setState({ drawer: false });
  });

  it('opens and closes', () => {
    useOverlayStore.getState().openDrawer();
    expect(useOverlayStore.getState().drawer).toBe(true);

    useOverlayStore.getState().closeDrawer();
    expect(useOverlayStore.getState().drawer).toBe(false);
  });

  /**
   * Android's back press dismisses the frontmost surface, and a modal raised
   * *from* the drawer sits above it — "Never miss a reward" is opened by a row
   * inside the drawer. Closing the drawer first would leave the dialog floating
   * over the screen it was never attached to.
   */
  it('can hold a modal above it', () => {
    useOverlayStore.getState().openDrawer();
    useOverlayStore.getState().showModal({ title: 'x', body: 'y' });

    expect(useOverlayStore.getState().drawer).toBe(true);
    expect(useOverlayStore.getState().modal).not.toBeNull();
  });
});
