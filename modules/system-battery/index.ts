import { requireOptionalNativeModule } from 'expo';

import type { PowerSource } from '@/system/battery';

/** What the native side sends, on both platforms. */
export interface BatteryReading {
  /** 0..1, or `-1` where the platform has no reading. */
  level: number;
  source: PowerSource;
}

interface SystemBatteryModule {
  getState: () => BatteryReading;
  /**
   * Returns the subscription. Typed structurally rather than as
   * `expo-modules-core`'s `EventSubscription`: that package is a transitive of
   * `expo` and naming it here would be an undeclared dependency, for one field.
   */
  addListener: (
    event: 'onBatteryChange',
    listener: (reading: BatteryReading) => void
  ) => { remove: () => void };
}

/**
 * The device battery, pushed from the OS rather than polled.
 *
 * `Optional`, not `require`: there is no native runtime in Jest, and a missing
 * binding has to read as "no battery information" rather than throw. Every
 * export below treats `null` that way.
 *
 * Why a local module and not `expo-battery`: its Android listener subscribes to
 * `BATTERY_LOW` and `BATTERY_OKAY` only, so it fires roughly twice between full
 * and empty. A live gauge on top of that means polling on a timer. This module
 * registers the `ACTION_BATTERY_CHANGED` receiver instead, which is the source
 * the status bar itself reads.
 */
const native = requireOptionalNativeModule<SystemBatteryModule>('SystemBattery');

/** No reading available — no module, or a platform that will not say. */
const UNKNOWN: BatteryReading = { level: -1, source: 'unknown' };

/**
 * The battery right now.
 *
 * Read rather than remembered. Nothing subscribes while the drawer is closed,
 * so whatever the last event said may be an hour stale by the time it opens.
 */
export function batteryNow(): BatteryReading {
  if (!native) return UNKNOWN;
  // A locked-down ROM can refuse the sticky broadcast. A refusal is not a
  // reading of zero.
  try {
    return native.getState();
  } catch {
    return UNKNOWN;
  }
}

/**
 * Subscribe to changes. Returns the unsubscribe.
 *
 * The native side registers its receiver on the first listener and drops it on
 * the last, so an unsubscribed app is not merely ignoring events — it is not
 * being sent any.
 */
export function watchBattery(onChange: (reading: BatteryReading) => void): () => void {
  if (!native) return () => {};

  const subscription = native.addListener('onBatteryChange', onChange);
  return () => subscription.remove();
}
