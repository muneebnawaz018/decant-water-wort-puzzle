import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

import { strongVibration } from '../../modules/system-haptics';
import { fillAfterPour } from '@/audio/pitch';
import {
  soundComplete,
  soundIllegal,
  soundLevel,
  soundPour,
  soundTap,
} from '@/audio/sounds';
import type { TapOutcome } from '@/state/gameStore';
import { currentSettings } from '@/state/settingsStore';

const ANDROID = Platform.OS === 'android';

/**
 * One buzz on Android, through whichever route can actually reach the motor.
 *
 * The native module is preferred because React Native's `Vibration` is filtered
 * away by the OS when the player has touch feedback switched off — the call is
 * made, and Android discards it. `strongVibration` asks under a usage that is
 * not filtered. It is `null` on iOS and in tests, where `Vibration` is both
 * correct and available.
 */
function buzz(durationMs: number, amplitude: number): void {
  if (strongVibration) strongVibration.once(durationMs, amplitude);
  else Vibration.vibrate(durationMs);
}

function buzzPattern(timings: readonly number[], amplitude: number): void {
  if (strongVibration) strongVibration.pattern(timings, amplitude);
  else Vibration.vibrate([...timings]);
}

/**
 * Android drives the motor directly; iOS goes through `expo-haptics`.
 *
 * The split exists because of a feature reported dead on a real phone, and the
 * cause is worth recording precisely — two wrong theories were chased first.
 *
 * It is **not** amplitude. `expo-haptics` does compose Android effects quietly
 * (its loudest, `heavy`, is 60ms at 70/255), and moving up that ladder was the
 * first fix. It changed nothing. Nor is it duration: a 300ms buzz at the
 * platform default was equally unfelt.
 *
 * It is **usage**. Android 12+ tags every vibration with a category and filters
 * on it, and a tap in an app is touch usage — which the OS discards outright
 * when the player has touch feedback switched off. The call was being made and
 * thrown away below us, which is why nothing above the OS made any difference.
 * `strongVibration` asks under a category that is not filtered.
 *
 * iOS keeps `expo-haptics`, where the ladder is real: the Taptic Engine renders
 * a selection as a crisp click and an impact as a distinct thump, while
 * `Vibration` there is a blunt 400ms buzz with no control at all.
 */

/**
 * Android durations, in ms. Short — these punctuate a tap, they do not announce.
 *
 * Small numbers now that they reach the motor. They were briefly ten times this
 * while working out whether the motor ran at all, which is a diagnostic and not
 * a design: at 150ms a tap feels like an alarm going off.
 */
const MS = {
  tick: 16,
  pour: 26,
  /** Two pulses: `[wait, buzz, wait, buzz]`, which is how Android reads a pattern. */
  solved: [0, 40, 80, 60],
  warn: [0, 28, 60, 45],
} as const;

/**
 * How hard the motor is driven, 1..255. **This is the taste dial** — tune here,
 * reload, feel it; nothing below JS has to change.
 *
 * Well under full. The override this app uses asks under the category a ringing
 * alarm uses, and an alarm is built to be felt from across a room through a
 * pocket. At full strength every tap lands with that much force, which on a
 * board you touch a hundred times a session stops reading as feedback and starts
 * reading as a fault.
 *
 * They climb with how much the event matters, which is the only reason to have
 * more than one: a tap is a tick, a pour has weight behind it, and finishing a
 * board is the one moment worth a proper thump.
 */
const AMP = {
  tick: 90,
  pour: 140,
  solved: 200,
  warn: 170,
} as const;

/**
 * The in-app switch, and now the **only** one that silences the game.
 *
 * Ordinarily the phone's own touch-feedback setting is a second gate above this
 * one, and a player who turns it off stops every app buzzing at them. This app
 * asks under a category that setting does not filter, so that route is closed:
 * whoever wants quiet has to find this toggle. That is the trade the override
 * bought, and it is why the toggle must stay easy to reach.
 */
function enabled(): boolean {
  return currentSettings().haptics;
}

function tick(): void {
  if (ANDROID) {
    buzz(MS.tick, AMP.tick);
    return;
  }
  void Haptics.selectionAsync();
}

/**
 * The audible half of a tap outcome, doc §7.
 *
 * Gated separately from the haptic and on its own settings — `sound` is the
 * master and `soundTap` reads `tapSound` as well, since a tick on every touch
 * is the one cue frequent enough to want off on its own.
 *
 * **A finished vial and a finished board both sound**, and they stack on
 * purpose: the last pour of a level completes a vial *and* wins, and §7 asks
 * for both a chime and a celebration. Hearing the vial ring under the win is
 * the reward landing twice, which is what that moment is.
 *
 * `ignored` — a tap on empty glass holding nothing — stays silent, the same
 * rule the haptics follow. Nothing happened, so nothing answers.
 */
function sound(outcome: TapOutcome, capacity?: number): void {
  switch (outcome.kind) {
    case 'poured':
      soundPour(
        capacity === undefined
          ? 0
          : fillAfterPour(outcome.destFilled, outcome.move.count, capacity)
      );
      if (outcome.completed) soundComplete();
      if (outcome.solved) soundLevel();
      break;
    case 'selected':
    case 'deselected':
      soundTap();
      break;
    // Always the thud, armed or not — unlike the haptic below, which ticks on
    // a re-arm. The split is deliberate: the buzz tracks what the player is
    // *holding* (the tapped vial got picked up), the sound answers what the
    // pour *did* (nothing). One channel per question. It also happens to be
    // the only way this cue is reachable at all: a refused pour's target
    // always holds liquid — pouring into empty glass is always legal — so the
    // tapped vial always re-arms, and gating the thud on `armed` silenced it
    // on every refusal the game can actually produce.
    case 'illegal':
      soundIllegal();
      break;
    default:
      break;
  }
}

/**
 * Sound and haptics for a tap outcome, doc §7.
 *
 * **Both answers to one event, decided in one place.** They were always meant
 * to arrive together — a pour that buzzes without a splash reads as a phone
 * fault rather than as liquid — and keeping the two switches apart is what
 * lets them disagree. Each half still checks its own setting, so a player can
 * have either alone.
 *
 * Settings are read at call time rather than subscribed to, on both sides: a
 * toggle must not re-render the board.
 *
 * `capacity` is optional because sound is the only half that wants it — the
 * pour is pitched by how full the destination ends up (§7), and without a
 * capacity there is no ratio to pitch by. Callers that have a board pass it;
 * `confirmHaptics`, which fires a synthetic pour to preview the buzz, does
 * not, and gets the unpitched sample.
 */
export function feedbackFor(outcome: TapOutcome, capacity?: number): void {
  sound(outcome, capacity);
  if (!enabled()) return;

  switch (outcome.kind) {
    // The board being solved answers with a *pattern* rather than a bigger
    // pulse. Neither platform has much headroom above a firm single buzz, so
    // two pulses is the escalation available — and it cannot be mistaken for
    // the pour it follows.
    case 'poured':
      if (outcome.solved) {
        if (ANDROID) buzzPattern(MS.solved, AMP.solved);
        else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (ANDROID) {
        buzz(MS.pour, AMP.pour);
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      break;
    // Picking a vial up and putting it back down are both things the player
    // did on purpose. Only `ignored` — a tap on empty glass with nothing
    // held — passes without a buzz.
    case 'selected':
    case 'deselected':
      tick();
      break;
    // A refused pour that re-armed the tapped tube ticks like any other
    // selection, because that is what the player got: the pour did not happen
    // and the tube they touched is now the source.
    //
    // Warning on it was wrong in the way that matters — it fired on the tap
    // *after* the refusal too. The board cannot know where a newly armed tube
    // is headed, so picking one up is never a mistake, and a buzz that says
    // "no" while the game says "yes, that one is selected" teaches the player
    // to distrust both.
    //
    // The warn is kept for the case where nothing was armed: the tap emptied
    // the selection and left the board where it started.
    case 'illegal':
      if (outcome.armed) tick();
      else warn();
      break;
    default:
      break;
  }
}

/**
 * A tick for the board's own controls — undo, redo, hint, spare vial.
 *
 * Deliberately **not** every button in the app. It was, and that is what made
 * the setting feel broken: a buzz on every menu tap, every tab, every settings
 * row is constant background noise, and constant feedback carries no
 * information — after the fourth identical buzz on the way to the board, the
 * one that means "your pour landed" is just another one.
 *
 * So vibration is now a thing that happens while you are playing. The board
 * taps, the board's controls, and nothing else. Navigation, settings and the
 * shop are silent, and a player who wants to feel the game does not have to
 * feel the menus to get it.
 */
export function feedbackControl(): void {
  if (!enabled()) return;
  tick();
}

function warn(): void {
  if (ANDROID) {
    buzzPattern(MS.warn, AMP.warn);
    return;
  }
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/**
 * A control that was pressed but could not do its job — a hint with no pour
 * left, a second spare vial on a level that already has one.
 *
 * Distinct from `feedbackControl` on purpose. Both are real presses, so both
 * get something; answering a refusal with the same tick as a success teaches
 * the player nothing, and the toast that explains it is easy to miss mid-board.
 */
export function feedbackWarn(): void {
  // The refusal thud, on its own gate — a control that could not do its job
  // answers audibly whether or not the player also wants vibration.
  soundIllegal();
  if (!enabled()) return;
  warn();
}
