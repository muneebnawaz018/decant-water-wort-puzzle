import { requireOptionalNativeModule } from 'expo';

interface SystemSoundModule {
  /** Decode a file into memory under a key. Idempotent; false on failure. */
  load: (key: string, path: string) => boolean;
  /** Fire a loaded key from the top. Rate is tape-style: pitch moves with it. */
  play: (key: string, rate: number, volume: number) => void;
}

/**
 * `Optional`, not `require`, same as the sibling modules: in Jest there is no
 * native runtime, the binding is absent, and this is `null`. The JS audio
 * layer treats that as "this device is silent" and carries on.
 */
export const systemSound = requireOptionalNativeModule<SystemSoundModule>('SystemSound');
