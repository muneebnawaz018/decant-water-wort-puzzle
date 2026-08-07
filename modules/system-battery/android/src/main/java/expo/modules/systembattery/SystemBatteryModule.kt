package expo.modules.systembattery

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The battery, pushed from the OS on every change.
 *
 * `expo-battery` was tried here first and its Android listener is nearly
 * silent: it subscribes to `ACTION_BATTERY_LOW` and `ACTION_BATTERY_OKAY`, so
 * it fires twice in a discharge from full to empty. Reading a live gauge from
 * it means polling on a timer, which is the thing a broadcast exists to avoid.
 *
 * `ACTION_BATTERY_CHANGED` is the real source — the same one the status bar
 * reads. It cannot be declared in a manifest (Android refuses to deliver it to
 * a manifest-registered receiver, precisely because it is so chatty), so it has
 * to be registered at runtime, which is what `OnStartObserving` is for.
 *
 * It is registered only while JS is listening. Nothing subscribes until the
 * settings drawer is opened, so a closed drawer costs nothing at all.
 */
class SystemBatteryModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var receiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("SystemBattery")

    Events("onBatteryChange")

    /**
     * The current reading, for the first frame.
     *
     * `registerReceiver` with a null receiver returns the sticky intent — the
     * last broadcast the system sent — without subscribing to anything. That is
     * the documented way to read the battery once, and it means the mark has a
     * level to draw before the first change arrives, which on a device sitting
     * at 80% could be minutes away.
     */
    Function("getState") {
      readState(context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED)))
    }

    OnStartObserving {
      if (receiver != null) return@OnStartObserving

      val created = object : BroadcastReceiver() {
        override fun onReceive(receiverContext: Context?, intent: Intent?) {
          sendEvent("onBatteryChange", readState(intent))
        }
      }
      receiver = created
      context.registerReceiver(created, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
    }

    OnStopObserving {
      unregister()
    }

    /**
     * A receiver outlives the JS that registered it, so a reload or a killed
     * activity would leak one per launch without this.
     */
    OnDestroy {
      unregister()
    }
  }

  private fun unregister() {
    val current = receiver ?: return
    receiver = null
    // Throws if it was never registered — which cannot happen here, but a
     // crash while tearing down is a worse outcome than a no-op.
    runCatching { context.unregisterReceiver(current) }
  }

  /**
   * The broadcast, reduced to the two things the mark draws.
   *
   * The level arrives as a pair of integers rather than a percentage, because
   * `EXTRA_SCALE` is not guaranteed to be 100 — it is whatever the device
   * counts in. Dividing by the reported scale is the only correct reading;
   * assuming 100 is a bug that shows up on exactly the hardware nobody tests.
   *
   * `-1` means "no reading", matching the platform's own sentinel and what the
   * JS side already treats as unknown.
   */
  private fun readState(intent: Intent?): Map<String, Any> {
    if (intent == null) return mapOf("level" to -1.0, "source" to "unknown")

    val raw = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
    val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
    val level = if (raw < 0 || scale <= 0) -1.0 else raw.toDouble() / scale.toDouble()

    val source = when (intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)) {
      BatteryManager.BATTERY_STATUS_CHARGING,
      BatteryManager.BATTERY_STATUS_FULL,
        // "Not charging" means a cable is attached and the device has chosen
        // not to draw — charge limiting, or a paused optimised charge. From the
        // mark's point of view that is plugged in: the level is not falling.
      BatteryManager.BATTERY_STATUS_NOT_CHARGING -> "plugged"
      BatteryManager.BATTERY_STATUS_DISCHARGING -> "battery"
      else -> "unknown"
    }

    return mapOf("level" to level, "source" to source)
  }
}
