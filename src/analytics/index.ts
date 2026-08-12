/**
 * What the rest of the app may reach for: `track`, and nothing else.
 *
 * `recordedEvents` and `clearEvents` are deliberately **not** re-exported here.
 * They exist for reading a device during development and for the tests, and
 * routing them through the front door would invite a screen to render the log —
 * which is how a diagnostic quietly becomes a feature with a UI to maintain.
 * Import them from `./log` if you genuinely need them.
 */
export { track } from './log';
