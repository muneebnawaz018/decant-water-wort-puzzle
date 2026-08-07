import { requireOptionalNativeModule } from 'expo';

interface SystemHapticsModule {
  hasVibrator: () => boolean;
  isTouchFeedbackEnabled: () => boolean;
  vibrate: (durationMs: number, amplitude: number) => void;
  vibratePattern: (timings: readonly number[], amplitude: number) => void;
}

/**
 * `Optional`, not `require`: in Jest there is no native runtime at all, so the
 * binding is absent and this is `null`. Treated as "cannot know" throughout.
 */
const native = requireOptionalNativeModule<SystemHapticsModule>('SystemHaptics');

/**
 * Why the phone might not be buzzing, as far as the OS will admit.
 *
 * - `ready` — there is a motor and, where it can be checked, the user has not
 *   turned it off. Nothing to say.
 * - `off` — the user's own switch appears to be off. Treated as a hint and
 *   never as a veto: more than one row describes this setting, builds disagree
 *   about which they maintain, and a stale one reports "off" on a phone that
 *   vibrates fine. **Android only** — iOS keeps its System Haptics switch
 *   private, so this never comes back on an iPhone.
 * - `noMotor` — no haptic hardware. Both platforms answer this one: Android
 *   via `hasVibrator()`, iOS via Core Haptics, which is what catches iPad.
 *   A settings trip would waste their time.
 * - `unknown` — no way to tell. Say nothing; a warning that might be wrong is
 *   worse than no warning.
 */
export type HapticsAvailability = 'ready' | 'off' | 'noMotor' | 'unknown';

/**
 * Read at call time, never cached. The player can change this setting while the
 * app is backgrounded — in fact being sent there is the point — so a value read
 * once at launch would be stale exactly when it is checked.
 */
/**
 * Runs the motor, ignoring the phone's touch-feedback switch.
 *
 * Android only, and `null` everywhere else — the caller falls back to React
 * Native's `Vibration`, which is correct on iOS and was the only option here
 * before this module existed.
 *
 * See `SystemHapticsModule.kt` for what "ignoring" means and what it costs. In
 * short: the OS drops touch-usage vibration when the user has switched touch
 * feedback off, so an app that wants to buzz anyway has to ask under a category
 * the OS does not filter. That is a deliberate override of the player's setting,
 * not a workaround for a broken API.
 */
export const strongVibration = native
  ? {
      /** `amplitude` is 1..255, or `-1` for the platform default. */
      once: (durationMs: number, amplitude: number) =>
        native.vibrate(durationMs, amplitude),
      pattern: (timings: readonly number[], amplitude: number) =>
        native.vibratePattern(timings, amplitude),
    }
  : null;

export function hapticsAvailability(): HapticsAvailability {
  if (!native) return 'unknown';

  try {
    if (!native.hasVibrator()) return 'noMotor';
    return native.isTouchFeedbackEnabled() ? 'ready' : 'off';
  } catch {
    // `Settings.System` is a content provider and a locked-down ROM can refuse
    // the read. A refusal is not a "no" — fall back to saying nothing.
    return 'unknown';
  }
}
