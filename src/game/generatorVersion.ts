/**
 * The save format's name for "which puzzles the numbers refer to".
 *
 * No board is ever stored — level N in a mode is rebuilt from
 * `seedForLevel(N, DIFFICULTY_SALT[mode])`. That makes the difficulty curve
 * (`levelParams`), the salts (`difficulty.ts`), the generator
 * (`waterGenerator`) and the RNG (`rng.ts`) part of the save format in
 * practice: change any of them and level N is a different puzzle, while every
 * stored number that described the old one survives untouched.
 *
 * This constant is how stored records tell the difference. `saveProgress`
 * stamps it into `progress.v4`, and `saveSession` into `session.v1`. On a
 * mismatch, `loadProgress` keeps what is still true of the new boards — the
 * levels finished, the stars, the bonuses paid — and drops `best`, the one
 * field that measures a specific board's layout. `loadSession` gives the
 * record up entirely, which its replay-legality check would very likely do
 * anyway; the stamp catches the case where the old moves happen to be legal
 * on the new board and would silently replay into a position nobody was in.
 *
 * **Bump this whenever the boards move.** The tell is the fingerprint test in
 * `src/game/__tests__/difficulty.test.ts` failing: if the recorded fingerprint
 * for level 30 no longer matches, the fix is to bump this constant and then
 * re-record the fingerprint — in that order, and never the re-recording alone.
 * A repointed generator shipped without a bump is exactly the silent
 * corruption this exists to catch.
 */
export const GENERATOR_VERSION = 2;
