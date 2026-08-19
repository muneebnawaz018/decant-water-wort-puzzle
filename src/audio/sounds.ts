import { Asset } from 'expo-asset';

import { systemSound } from '../../modules/system-sound';
import { PHASE, POUR_MS } from '@/render/pour';
import { currentSettings } from '@/state/settingsStore';
import { rateForFill } from './pitch';

/**
 * Every sound the game makes.
 *
 * **Played by `modules/system-sound`, not by `expo-audio` — and the reason is a
 * failure worth remembering.** `expo-audio` wraps `AVPlayer`, a streaming-media
 * pipeline, and on the iOS 26 simulator that pipeline never finishes loading a
 * local file: `isLoaded` stays false forever and `FigFilePlayer` signals
 * `err=-12864` at the render stage, on files the identical build plays fine on
 * an iOS 18 simulator. Silence, no JS error, nothing to catch. The native
 * module plays decoded buffers through `AVAudioEngine` (iOS 8+) and
 * `SoundPool` (Android API 1) — the primitives games actually use — so every
 * device that can install the app can play it.
 *
 * The pitch model comes with that for free: both engines are tape-style, rate
 * and pitch moving together, which is exactly what `pitch.ts` wants for the
 * pour. No `shouldCorrectPitch` to remember to switch off.
 *
 * **Settings are read at call time, never subscribed to.** Same rule as
 * `feedback.ts`: flipping a toggle must not re-render the board.
 *
 * ---
 *
 * An audio layer was built here before and deleted, and the reason still
 * governs this file. The code was fine; the *sounds* were synthesised — sine
 * waves and filtered noise — and they did not convince anyone liquid was
 * moving. **Recorded sources only.** `assets/audio/CREDITS.md` records what
 * each file is and the license it carries.
 */

/**
 * The six cues, doc §7.
 *
 * `.m4a` — AAC survived the `AVPlayer` era of this file and stays: both
 * engines decode it natively and the files are a twentieth of the WAV size.
 * **Only these ship**, verified against a production export. The `.wav`
 * masters beside them and the raw takes in `assets/audio/source/` are
 * committed for `script/prepare-sounds.py` to rebuild from, and Metro bundles
 * neither — it takes only what is `require`d here.
 *
 * `require` rather than `import`: these resolve through Metro's asset
 * pipeline. Listed statically because Metro cannot follow a computed
 * `require` — a map keyed at runtime would bundle nothing. The lint rule is
 * disabled over the block, the same trade `CompleteScreen` makes for its
 * Lottie files.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const SOURCES = {
  tap: require('../../assets/audio/tap.m4a'),
  click: require('../../assets/audio/click.m4a'),
  pour: require('../../assets/audio/pour.m4a'),
  complete: require('../../assets/audio/complete.m4a'),
  level: require('../../assets/audio/level.m4a'),
  illegal: require('../../assets/audio/illegal.m4a'),
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */

type Cue = keyof typeof SOURCES;

/** Cues the native side has confirmed loaded. */
const loaded = new Set<Cue>();

/**
 * Resolve every cue to a real file and hand it to the native module. Called
 * once from `Root`'s first layout — off the launch path, seconds before anyone
 * can reach the board.
 *
 * The `expo-asset` round trip is load-bearing in development: a `require()`
 * there resolves to a Metro URL, and Metro serves assets with no
 * `Content-Type` and `nosniff`, which no audio backend should be asked to
 * guess at. `downloadAsync` puts real bytes on disk; in release the asset is
 * already a local file and this is a no-op. The native side wants a path, so
 * the `file://` scheme is stripped.
 *
 * Failures leave a cue out of `loaded` and nothing else: audio is a garnish
 * on a puzzle game, and a device that cannot load a sound should play
 * silently rather than crash.
 */
export async function primeSounds(): Promise<void> {
  if (!systemSound) return;

  await Promise.all(
    (Object.keys(SOURCES) as Cue[]).map(async (cue) => {
      if (loaded.has(cue)) return;
      try {
        const asset = Asset.fromModule(SOURCES[cue]);
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        const path = uri.replace(/^file:\/\//, '');
        if (systemSound!.load(cue, path)) loaded.add(cue);
      } catch {
        // This cue stays silent; the rest of the game does not care.
      }
    })
  );
}

/**
 * Fire a cue, from the top, at a given rate — after `delayMs`, measured from
 * the call.
 *
 * The delays exist because a pour is an animation, not an instant. The tap
 * lands at t=0 but the tube spends the first 15% of `POUR_MS` flying to its
 * target, and a pour heard while the glass is still traveling reads as the
 * phone answering, not the liquid. Each cue below carries the phase of the
 * animation it belongs to, so if the animation is retimed the audio follows.
 *
 * Retrigger semantics live in the native module and are the right way round:
 * the same cue twice cuts itself off — a hurried double-tap is one tap, not
 * two smeared together — while different cues overlap, so a pour that
 * finishes a vial rings under its own splash.
 *
 * An unloaded cue is a no-op rather than a late attempt to load one: a sound
 * arriving after the moment it belonged to is worse than none. The guard runs
 * *before* the timer on purpose — with no native module (Jest, a device that
 * failed to load) no timer is ever created.
 */
function fire(cue: Cue, rate = 1, delayMs = 0): void {
  if (!systemSound || !loaded.has(cue)) return;
  const gain = VOLUME * (TRIM[cue] ?? 1);
  if (delayMs <= 0) {
    systemSound.play(cue, rate, gain);
    return;
  }
  setTimeout(() => systemSound!.play(cue, rate, gain), delayMs);
}

/**
 * The one rule that keeps the game's voice from turning into noise: **no two
 * of the long cues may start within `MIN_GAP_MS` of each other.**
 *
 * The last move of a level fires three of them — the pour, the vial chime and
 * the win fanfare — and every one runs over a second. Spacing them by hand
 * failed twice, and it failed for a structural reason rather than a badly
 * chosen number: three constants that have to stay apart will not, because
 * each is tuned against the animation it belongs to and nothing checks them
 * against each other. So the separation is enforced here instead, once, and
 * the constants above are free to say when a sound *would like* to play.
 *
 * The two kinds of cue yield differently, and that is the whole design:
 *
 * - **The rewards wait.** A finished vial and a solved board are the payoff,
 *   so they always play; if the slot is busy they take the next one. Both are
 *   answering a state the board is now in and stays in, so arriving a beat
 *   later still reads as being about the thing that just happened.
 * - **The pour is dropped.** It belongs to a specific second of animation and
 *   means nothing outside it, so a pour that cannot start on time is not
 *   played at all. `LATE_MS` allows a nudge to fit; past that it goes. This
 *   only bites on the move straight after a completed vial, where the chime
 *   has already spoken for the moment and one silent pour goes unnoticed.
 *
 * `tap` and `illegal` do not participate. They answer a touch, and feedback
 * that arrives on a schedule is not feedback — both are also short and quiet
 * enough that they are never what makes a moment muddy.
 */
const MIN_GAP_MS = 1250;
const LATE_MS = 250;

/** When the next long cue may start, as a timestamp. */
let clearAt = 0;

function sequence(cue: Cue, rate: number, atMs: number, mayWait: boolean): void {
  if (!systemSound || !loaded.has(cue)) return;

  const now = Date.now();
  const ideal = now + atMs;
  const start = Math.max(ideal, clearAt);
  if (!mayWait && start - ideal > LATE_MS) return;

  clearAt = start + MIN_GAP_MS;
  fire(cue, rate, start - now);
}

/**
 * Master gain on every cue, 0..1. **This is the loudness dial — turn it here.**
 *
 * The files themselves are cut to the digital ceiling by
 * `script/prepare-sounds.py`, which is right for the *masters*: quiet WAVs
 * throw away resolution, and once a file is encoded low it cannot be raised
 * without re-encoding. So the ceiling lives in the assets and the taste lives
 * here, where changing it is a reload rather than a re-cut and a rebuild.
 *
 * It scales every cue together, which keeps the ladder `TARGETS` in that
 * script sets — the tap sits well under the completion chime, so a player can
 * tell from sound alone whether something mattered — intact at any loudness.
 *
 * At 0.28 this is about 11dB under the ceiling. Getting here took three moves
 * in both directions: the first set was inaudible, raising it twice hit the
 * ceiling and overshot into startling, and this is the settle. A game whose
 * promise is relaxation should be quieter than feels right while tuning it,
 * because tuning happens with your attention on the sound and playing does
 * not.
 */
const VOLUME = 0.28;

/**
 * Per-cue corrections to the ladder, applied on top of `VOLUME`.
 *
 * Deliberately short. The ladder belongs in the files, where it was measured
 * once; a trim per cue here is how a set drifts into whatever the last person
 * to touch it preferred. Two cues have earned one, and a third should have to
 * argue for it.
 *
 * The two entries are the two ends of the same argument — how loud a sound
 * *reads* is not what its peak says, so a measured ladder needs correcting at
 * the extremes by ear:
 *
 * - **The pour is turned down**, because it is the only cue that is
 *   *continuous*. Every other sound is a strike that decays, so its peak is
 *   heard for a few milliseconds; the pour holds near its peak for a second
 *   and a quarter, which reads far louder than the number suggests. It also
 *   fires on every move, under a player who is trying to think.
 * - **The win is turned up**, because it is the one moment the game is
 *   allowed to be loud. It plays once a level, into the silence the scheduler
 *   leaves in front of it, and its energy is spread across five bars ringing
 *   together rather than concentrated in one strike — so at the same gain as
 *   a single note it lands quieter than everything it is meant to cap.
 */
const TRIM: Partial<Record<Cue, number>> = { pour: 0.6, level: 1.5 };

/**
 * When each animated cue starts, in ms from the tap.
 *
 * Input is locked for the whole animation, so nothing a player can do makes a
 * scheduled cue stale — the pour it announces always happens.
 *
 * - The pour starts with the *stream* (`PHASE.pourStart`), the first frame
 *   liquid visibly leaves the tube.
 * - The completion chime rings just after the destination finishes filling
 *   (`PHASE.fillEnd`), by enough for the pour sample to have cleared out from
 *   under it. Landing exactly on the fill put a bright chime on top of water
 *   still audibly running.
 * - The win fanfare waits out the pour and then leaves a beat of silence.
 *
 * **That beat is the point.** The last move of a level fires all three cues,
 * and at the end of the animation the pour is still ringing and the vial
 * chime has only just started — so a fanfare on the final frame arrived into
 * a sound already in progress and the three ran together as one noise. Music
 * gets its weight from the rest in front of it: the pour finishes, the room
 * goes quiet for a moment, *then* the board is won. Waiting also costs
 * nothing, because the win screen is animating in over exactly this stretch.
 */
const AT = {
  pour: Math.round(POUR_MS * PHASE.pourStart),
  // Both rewards ask for the earliest moment they make sense — the chime when
  // the vial has visibly filled, the fanfare when the animation ends. The
  // scheduler pushes each to the next free slot, so what actually plays is the
  // pour, then the chime a `MIN_GAP_MS` later, then the fanfare after another.
  // Asking for these times rather than the final ones keeps the intent
  // readable: on a move that only completes a vial, the chime is not made to
  // wait for a fanfare that never comes.
  complete: Math.round(POUR_MS * PHASE.fillEnd),
  level: POUR_MS,
} as const;

/** The master switch, spec §7. Everything audible is gated on it. */
function audible(): boolean {
  return currentSettings().sound;
}

/**
 * A pour landing, pitched by how full the destination ends up (doc §7).
 *
 * Not gated on `tapSound` — that setting covers the tick on touching a vial,
 * which is chrome. This is the game's own voice, and a player who turned the
 * tap tick off still wants to hear the liquid.
 */
export function soundPour(fill: number): void {
  if (!audible()) return;
  sequence('pour', rateForFill(fill), AT.pour, false);
}

/** A vial finished — §7's "brief ring of light … distinct chime". */
export function soundComplete(): void {
  if (!audible()) return;
  sequence('complete', 1, AT.complete, true);
}

/** The board solved. */
export function soundLevel(): void {
  if (!audible()) return;
  sequence('level', 1, AT.level, true);
}

/**
 * A refused pour. §7 asks for a "muted thud", and it stays quiet on purpose:
 * there is no fail state in this game, so a refusal is a mis-tap rather than a
 * mistake, and a sound that scolds would be answering a question nobody asked.
 */
export function soundIllegal(): void {
  if (!audible()) return;
  fire('illegal');
}

/**
 * Touching a vial. Under the "Taps & buttons" setting as well as the master,
 * because it fires on every board touch: a player can want the game to have a
 * voice without hearing a tick on every single one.
 */
export function soundTap(): void {
  const settings = currentSettings();
  if (!settings.sound || !settings.tapSound) return;
  fire('tap');
}

/**
 * Pressing a button — any button, everywhere. `useTapHandler` calls this, and
 * every pressable in the chrome routes through there, so this one function is
 * the whole "buttons make a sound" feature.
 *
 * Its own cue, deliberately distinct from `tap`: the vial tick is glass
 * because vials are glass, and when the menus used it too, every screen
 * sounded like the board. A 12ms UI click cannot be mistaken for a vial —
 * chrome answers with chrome.
 *
 * Same `tapSound` gate as the vial tick. One switch governing two different
 * sounds is the design, and the label says so: "Taps & buttons" is about
 * whether *touches* are audible, not about which surface was touched.
 */
export function soundClick(): void {
  const settings = currentSettings();
  if (!settings.sound || !settings.tapSound) return;
  fire('click');
}
