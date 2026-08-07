import CoreHaptics
import ExpoModulesCore

/**
 * The iOS half, and it answers one of the two questions.
 *
 * `supportsHaptics` reports whether the device has a Taptic Engine Core Haptics
 * can drive. Every iPad returns `false` — no model has one — which is the case
 * worth catching: this app ships on iPad, and without this a tablet player
 * switches vibration on, feels nothing forever, and sees the setting reading
 * "on" the whole time.
 *
 * It is accurate here only because the deployment target is iOS 16.4. The check
 * also returns `false` on iPhone 7 and earlier, which do have a Taptic Engine
 * and do respond to `UIFeedbackGenerator` — but none of them run iOS 16, so no
 * device this app installs on can hit that false negative. Lower the target and
 * that stops being true.
 *
 * The user's System Haptics switch is deliberately not attempted. There is no
 * public API for it: `UIFeedbackGenerator` silently does nothing when it is off
 * and reports no error. `isTouchFeedbackEnabled` returning a flat `true` is the
 * honest answer — "nothing here says otherwise" — and keeps the JS side off the
 * `off` branch, which is the one that offers a settings trip iOS cannot make.
 */
public class SystemHapticsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SystemHaptics")

    Function("hasVibrator") {
      CHHapticEngine.capabilitiesForHardware().supportsHaptics
    }

    Function("isTouchFeedbackEnabled") {
      true
    }
  }
}
