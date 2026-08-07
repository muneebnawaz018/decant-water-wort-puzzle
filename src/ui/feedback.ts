import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

import { strongVibration } from '../../modules/system-haptics';
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
 * Haptics for a tap outcome, doc §7. Settings are read at call time rather
 * than subscribed to — a toggle should not re-render the board.
 *
 * Sound belongs here too and is not wired: the synthesised set built for it
 * was not good enough to ship, and real recordings have not landed yet. The
 * Settings rows are marked "Soon" rather than offering a switch that does
 * nothing. `script/prepare-sounds.py` is the tool for when they arrive; this
 * function is where playback hooks back in, beside the matching haptic.
 */
export function feedbackFor(outcome: TapOutcome): void {
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
  if (!enabled()) return;
  warn();
}
