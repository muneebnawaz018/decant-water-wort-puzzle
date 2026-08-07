import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { batteryNow, watchBattery } from '../../../modules/system-battery';
import { isSameReading, type PowerSource } from '@/system/battery';

export interface Battery {
  /** 0..1, or `null` where the platform gives no reading. */
  level: number | null;
  source: PowerSource;
}

/** `-1` is the platform's sentinel for "no reading"; so is anything out of range. */
function toBattery(level: number, source: PowerSource): Battery {
  return { level: level >= 0 && level <= 1 ? level : null, source };
}

/**
 * The device battery, live.
 *
 * Mounted by the settings drawer and nowhere else. That placement is the whole
 * performance story: the native receiver is registered on the first listener
 * and dropped on the last, so a closed drawer costs nothing — no receiver, no
 * events, no renders. Putting this in `Root` would tick the whole app during a
 * pour.
 *
 * Three sources of truth, in order of how often they fire:
 *
 * - The OS event. Android sends one per percent, iOS one per 5% and at most
 *   once a minute.
 * - A read on mount, because the first event could be minutes away and the
 *   drawer needs something to draw now.
 * - A read on foreground. A suspended app receives no notifications at all, so
 *   a drawer left open while the phone was pocketed would show a stale level.
 *   This is the same gap `reconcilePermission` closes for notifications.
 */
export function useBattery(): Battery {
  const [battery, setBattery] = useState<Battery>(() => {
    const reading = batteryNow();
    return toBattery(reading.level, reading.source);
  });

  useEffect(() => {
    /**
     * Dropped unless the mark would actually look different.
     *
     * Android's broadcast carries temperature and voltage as well as charge, so
     * it arrives while the percentage sits still; iOS repeats the same
     * quantised figure. Comparing on the rounded percent means those cost a
     * comparison rather than a render.
     */
    const apply = (level: number, source: PowerSource): void => {
      setBattery((current) => {
        const next = toBattery(level, source);
        return isSameReading(current, next) ? current : next;
      });
    };

    const stop = watchBattery((reading) => apply(reading.level, reading.source));

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const reading = batteryNow();
      apply(reading.level, reading.source);
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, []);

  return battery;
}
