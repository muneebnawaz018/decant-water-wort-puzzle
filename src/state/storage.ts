import { createMMKV, type MMKV } from 'react-native-mmkv';

/**
 * The slice of MMKV this app actually calls. Typed narrowly so the in-memory
 * stand-in below only has to be honest about the surface in use, not the whole
 * native API.
 */
type Store = Pick<MMKV, 'getString' | 'getNumber' | 'set' | 'remove' | 'clearAll'>;

/**
 * A stand-in for a store that could not be opened. Everything works, nothing
 * survives the process — which is the point: every record here is validated on
 * read and rebuildable from defaults, so one session without persistence is an
 * inconvenience. A throw at module scope is a crash on the launch path, before
 * any screen exists to say what went wrong.
 */
function memoryStore(): Store {
  const held = new Map<string, string | number | boolean | ArrayBuffer>();
  return {
    getString: (key) => {
      const value = held.get(key);
      return typeof value === 'string' ? value : undefined;
    },
    getNumber: (key) => {
      const value = held.get(key);
      return typeof value === 'number' ? value : undefined;
    },
    set: (key, value) => {
      held.set(key, value);
    },
    remove: (key) => held.delete(key),
    clearAll: () => held.clear(),
  };
}

function open(): Store {
  try {
    return createMMKV({ id: 'decant' });
  } catch {
    return memoryStore();
  }
}

/**
 * One MMKV instance for the whole app. Reads and writes are synchronous, which
 * is the point: progress has to survive a force-quit (doc §13), and an async
 * store can lose the last write.
 *
 * MMKV v4 swaps itself for an in-memory mock under Jest, so tests need no
 * native module and no hand-written mock.
 */
export const storage: Store = open();

/**
 * The record under `key`, or null when there is none worth having. A corrupt
 * entry is deleted rather than surfaced — it helps nobody, and leaving it
 * would fail every future read the same way.
 *
 * Null rather than a fallback so migrations can tell "absent" apart from
 * "present but empty": a legacy chain must only run when the current key has
 * never been written, not when it holds an empty object.
 */
export function readJsonOrNull<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    storage.remove(key);
    return null;
  }
}

export function readJson<T>(key: string, fallback: T): T {
  return readJsonOrNull<T>(key) ?? fallback;
}

export function writeJson(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}

/**
 * Keys no build reads any more, removed on sight.
 *
 * Not hygiene — a guard. A dead record left behind is what a corrupt current
 * record would fall back to: `progress.v1` and `settings.v1`/`v2` were
 * "ignored rather than migrated" when their keys moved, and ignored meant
 * still on disk. The keys a store *does* migrate from are not listed here;
 * each store deletes its own legacy key the moment the carry-over is written.
 *
 * **A key drops off the end of a migration chain silently, so this list has to
 * be extended in the same commit that shortens one.** `economy.v2` and `v3`
 * were on a chain once and are on none now — v5 reads v4 and stops — so they
 * were left behind on every device that had them, unread and undeleted. Nothing
 * resurrects them today, which is exactly why nothing complained; the next
 * `economy` bump that walks further back is where it would have mattered.
 */
const DEAD_KEYS = [
  'progress.v1',
  'settings.v1',
  'settings.v2',
  'economy.v1',
  'economy.v2',
  'economy.v3',
] as const;
for (const key of DEAD_KEYS) storage.remove(key);
