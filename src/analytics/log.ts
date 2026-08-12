import { readJson, writeJson } from '@/state/storage';
import type { AnalyticsEvent, EventProps, LoggedEvent } from './events';

/**
 * A ring buffer of what the app did, on the device and nowhere else.
 *
 * **There is no vendor and no network.** Nothing here leaves the phone, which
 * is what lets `docs/07-privacy-policy.md` say the game collects nothing —
 * a claim that stops being true the day this file learns to `fetch`. If an
 * analytics service is ever added, that document and both stores' privacy forms
 * change in the same commit, and this comment is the reminder.
 *
 * So what is it for? Two things that are worth having without a backend:
 *
 * - **Reading a bug report.** "It crashed after the daily" is a guess; a log
 *   of the last two hundred events is a sequence. This is the only record of
 *   what a player actually did before something went wrong.
 * - **Being ready.** The events are named and typed now, at the point each one
 *   is understood. Retro-fitting a funnel onto a shipped app means guessing
 *   where the events should have gone.
 *
 * It is deliberately not wired to any screen. Nothing in the UI reads it, and
 * that is the correct amount of product surface for a diagnostic.
 */

const KEY = 'analytics.v1';

/**
 * How many events are kept.
 *
 * Two hundred is a few sessions of ordinary play — enough to cover "what
 * happened before this went wrong" and small enough that the whole buffer is
 * one modest MMKV write. The buffer is bounded rather than trimmed by age,
 * because a player who has not opened the app for a month should still have
 * their last session in it.
 */
const CAPACITY = 200;

/**
 * The buffer, held in memory and mirrored to disk.
 *
 * Read once at first use rather than at import: this is a diagnostic, and it
 * should not put a JSON parse on the launch path before anything is on screen.
 */
let buffer: LoggedEvent[] | null = null;

function load(): LoggedEvent[] {
  buffer ??= readJson<LoggedEvent[]>(KEY, []).filter(isLogged);
  return buffer;
}

/**
 * Records validate on the way in as well as on the way out.
 *
 * The buffer outlives the version that wrote it, and a shape from two releases
 * ago is exactly the sort of thing that turns a diagnostic into a crash on the
 * one launch someone needed the diagnostic for.
 */
function isLogged(value: unknown): value is LoggedEvent {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<LoggedEvent>;
  return typeof record.at === 'number' && typeof record.event === 'string';
}

/**
 * Records one event.
 *
 * **Never throws.** A diagnostic that can break the thing it is diagnosing is
 * worse than no diagnostic, and this is called from the middle of the pour
 * handler and the payment path. Storage is already guarded — `storage.ts` falls
 * back to memory — but the catch covers the rest of it too.
 */
export function track(event: AnalyticsEvent, props?: EventProps): void {
  try {
    const events = load();
    events.push({ at: Date.now(), event, ...(props ? { props } : {}) });
    // Trimmed from the front, so the newest survive. A player who plays for an
    // hour after hitting a bug still keeps the events around the bug only if
    // they report it promptly, which is the honest limit of a bounded buffer.
    if (events.length > CAPACITY) events.splice(0, events.length - CAPACITY);
    writeJson(KEY, events);
  } catch {
    // Deliberately silent. See above.
  }
}

/**
 * Everything recorded, oldest first.
 *
 * For reading a device during development or while chasing a report. Returns a
 * copy, so a caller cannot edit the buffer by holding it.
 */
export function recordedEvents(): readonly LoggedEvent[] {
  return [...load()];
}

/** Empties the log, on disk and in memory. */
export function clearEvents(): void {
  buffer = [];
  writeJson(KEY, []);
}
