/**
 * The launch vial's size, shared by three things that must agree:
 *
 * - `app.config.ts` renders the native splash image at `imageWidth: VIAL_WIDTH`
 * - `src/ui/styles/SplashScreen.styles.ts` gives the animated vial the same box
 * - `script/make-splash.py` draws the PNG at this aspect, cropped tight
 *
 * If they drift, the vial jumps at the moment React takes over from the OS.
 *
 * It lives here, in its own module with no React Native import, because
 * `app.config.ts` is loaded by plain Node — anything that reaches for
 * `StyleSheet` cannot be imported from there.
 */
export const VIAL_WIDTH = 54;
export const VIAL_HEIGHT = 150;

/**
 * How far the splash vial climbs off centre once it has filled, in dp.
 *
 * Shared so the title block can be placed off the risen vial rather than the
 * starting one. It is a rise, not a starting offset — the vial has to begin at
 * dead centre, where the OS draws the native splash image.
 */
export const VIAL_RISE = 72;
