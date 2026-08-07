import { requireOptionalNativeModule } from 'expo';

interface SystemHapticsModule {
  hasVibrator: () => boolean;
  isTouchFeedbackEnabled: () => boolean;
  openSoundSettings: () => Promise<void>;
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
 * - `off` — the user's own switch is off. Worth a message, and the only case
 *   where sending them to settings helps. **Android only** — iOS keeps its
 *   System Haptics switch private, so this never comes back on an iPhone.
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

/**
 * Opens the system sound screen, where Android keeps touch feedback.
 *
 * Only ever called after `hapticsAvailability()` returned `off`, which is an
 * Android-only answer — so despite the shared surface this is in practice an
 * Android path. The iOS binding is a no-op: Settings has no deep link to the
 * haptics switch, and dropping someone on a page that does not contain what
 * they were sent for is worse than not offering the trip.
 */
export async function openSoundSettings(): Promise<void> {
  await native?.openSoundSettings();
}
