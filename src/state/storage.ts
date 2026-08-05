import { createMMKV } from 'react-native-mmkv';

/**
 * One MMKV instance for the whole app. Reads and writes are synchronous, which
 * is the point: progress has to survive a force-quit (doc §13), and an async
 * store can lose the last write.
 *
 * MMKV v4 swaps itself for an in-memory mock under Jest, so tests need no
 * native module and no hand-written mock.
 */
export const storage = createMMKV({ id: 'decant' });

export function readJson<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt entry helps nobody. Drop it and carry on with defaults.
    storage.remove(key);
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}
