package expo.modules.systemhaptics

import android.content.Context
import android.media.AudioAttributes
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Reads the two things Android knows about vibration and no JS API exposes:
 * whether there is a motor at all, and whether the user has turned touch
 * feedback off.
 *
 * `expo-haptics` is fire-and-forget by design — every call returns without
 * saying whether anything happened. That is fine until the app wants to explain
 * silence, at which point the difference between "your phone has this switched
 * off" and "this worked, you just did not notice" is the whole message.
 *
 * Android only. iOS has no public API for the System Haptics switch, so there
 * is nothing to bind to; the JS side treats an absent module as "cannot know"
 * and says nothing rather than guessing.
 */
class SystemHapticsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val vibrator: Vibrator
    get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }

  /**
   * Alarm usage, and this is the whole reason the two functions below exist.
   *
   * Android 12+ classifies every vibration by usage and filters on it. A tap in
   * an app is touch usage, and the OS discards it when the user has turned touch
   * feedback off — which is why `Vibration.vibrate()` and every `expo-haptics`
   * call were silent on a phone with a perfectly good motor, at any duration and
   * any amplitude. No JS-side change can reach that: the call is made and then
   * dropped below us.
   *
   * Alarm usage is not filtered. It is the category a ringing alarm uses, so it
   * plays regardless of the touch-feedback switch and regardless of Do Not
   * Disturb.
   *
   * **This overrides a setting the user chose**, and was asked for explicitly.
   * It should be read as what it is rather than as a bug fix, because two
   * consequences follow: someone who turned touch vibration off to stop apps
   * buzzing at them gets buzzed anyway, and a pour at 3am under Do Not Disturb
   * still fires. The in-app `haptics` toggle becomes their only way to stop it,
   * which puts real weight on that switch staying easy to find.
   *
   * `AudioAttributes` rather than `VibrationAttributes`: the latter needs API 33
   * for the overload that accepts it, while this form has carried the same usage
   * since API 21.
   */
  private val alarmUsage: AudioAttributes =
    AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

  override fun definition() = ModuleDefinition {
    Name("SystemHaptics")

    /**
     * One buzz.
     *
     * `amplitude` is 1..255, or `-1` for the platform default. It is a
     * parameter rather than a constant here on purpose: strength is a matter of
     * taste that gets tuned by feel, and every value baked into Kotlin costs a
     * native rebuild to change. From JS it is a hot reload.
     *
     * Not every motor can vary strength. Older and cheaper hardware is on/off
     * only, and `hasAmplitudeControl` is how you find out — passing an amplitude
     * to a motor without it silently gets you full power, so the default is used
     * instead and the duration carries what weight it can.
     */
    Function("vibrate") { durationMs: Int, amplitude: Int ->
      if (!vibrator.hasVibrator()) return@Function

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val strength =
          if (amplitude in 1..255 && vibrator.hasAmplitudeControl()) amplitude
          else VibrationEffect.DEFAULT_AMPLITUDE

        vibrator.vibrate(
          VibrationEffect.createOneShot(durationMs.toLong(), strength),
          alarmUsage
        )
      } else {
        // Pre-Oreo has no amplitude at all: a duration is the whole API.
        @Suppress("DEPRECATION")
        vibrator.vibrate(durationMs.toLong(), alarmUsage)
      }
    }

    /**
     * A `[wait, buzz, wait, buzz, …]` pattern, played once.
     *
     * `amplitude` applies to the buzzing steps; the waiting steps are zero by
     * definition, which is what makes them silent.
     */
    Function("vibratePattern") { timings: List<Int>, amplitude: Int ->
      if (!vibrator.hasVibrator()) return@Function

      val pattern = timings.map { it.toLong() }.toLongArray()

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        // `-1` repeats nothing: the pattern plays through once and stops.
        val effect =
          if (amplitude in 1..255 && vibrator.hasAmplitudeControl()) {
            // Alternating, starting at zero: even indices are the waits.
            val amplitudes =
              IntArray(pattern.size) { index -> if (index % 2 == 0) 0 else amplitude }
            VibrationEffect.createWaveform(pattern, amplitudes, -1)
          } else {
            VibrationEffect.createWaveform(pattern, -1)
          }

        vibrator.vibrate(effect, alarmUsage)
      } else {
        @Suppress("DEPRECATION")
        vibrator.vibrate(pattern, -1, alarmUsage)
      }
    }

    /**
     * Whether the phone can vibrate at all. Rare on handsets, common on
     * tablets and emulators — and a device with no motor should be told that,
     * not sent to a settings screen that will not help.
     */
    Function("hasVibrator") {
      vibrator.hasVibrator()
    }

    /**
     * The user's own "touch feedback" switch.
     *
     * `HAPTIC_FEEDBACK_ENABLED` is the master toggle and it is read first,
     * because it is the one that decides. This was briefly rewritten to prefer
     * `haptic_feedback_intensity` on the theory that the boolean was a stale
     * AOSP leftover — measured on a phone reading `enabled=0` and `intensity=2`
     * while it appeared to vibrate. It was not stale and the phone was not
     * vibrating: intensity is the slider's *remembered level*, which keeps its
     * value while the switch above it is off, exactly as a dimmer remembers its
     * position with the light off. Preferring it reports "on" for every user who
     * has deliberately turned touch feedback off.
     *
     * Intensity is still consulted, but only as a second opinion and only in the
     * direction that cannot invent a false "on": a zero intensity means off even
     * where the boolean says otherwise.
     *
     * Missing rows read as **on**. An absent row means this build never wrote
     * one, not that the user switched anything off, and warning somebody about a
     * setting they never touched is worse than saying nothing.
     */
    Function("isTouchFeedbackEnabled") {
      val resolver = context.contentResolver

      val enabled =
        Settings.System.getInt(resolver, Settings.System.HAPTIC_FEEDBACK_ENABLED, 1) == 1
      if (!enabled) {
        return@Function false
      }

      // `-1` is impossible for a real intensity, so it doubles as "no such row
      // on this build" without a second query to find out.
      val intensity = Settings.System.getInt(resolver, "haptic_feedback_intensity", -1)
      intensity != 0
    }
  }
}
