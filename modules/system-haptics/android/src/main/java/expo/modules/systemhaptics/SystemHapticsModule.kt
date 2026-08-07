package expo.modules.systemhaptics

import android.content.Context
import android.content.Intent
import android.os.Build
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

  override fun definition() = ModuleDefinition {
    Name("SystemHaptics")

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
     * Defaults to `1` when the key is missing, which is the honest answer: an
     * absent row means the OS never wrote one, not that the user turned it off,
     * and warning someone about a setting they never touched is worse than
     * staying quiet.
     */
    Function("isTouchFeedbackEnabled") {
      Settings.System.getInt(
        context.contentResolver,
        Settings.System.HAPTIC_FEEDBACK_ENABLED,
        1
      ) == 1
    }

    /**
     * Opens the system sound screen, where touch feedback lives.
     *
     * `NEW_TASK` is required: this starts an activity from an application
     * context, and Android refuses without it. There is no deep link to the
     * individual toggle — vendors move it — so this lands on the screen that
     * contains it on stock and on every skin.
     */
    AsyncFunction("openSoundSettings") {
      val intent = Intent(Settings.ACTION_SOUND_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }
  }
}
