import ExpoModulesCore
import UIKit

/**
 The battery, pushed from the OS.

 iOS gives one source for this and no way around its limits: the level is
 quantised to about 5% and the notification fires at most once a minute. A
 native module matches that exactly; it cannot beat it. The reason this side
 exists at all is symmetry — Android needs a module to get per-percent updates,
 and one binding for both platforms is better than two behaviours to reason
 about.

 `isBatteryMonitoringEnabled` is the detail everything hinges on. Left off —
 which is the default — `batteryLevel` returns `-1` and the notification never
 fires. It is switched on when the module is created and back off when it goes
 away, because monitoring has a (small) cost and leaving it on for the life of
 the process would keep paying it long after the drawer closed.
 */
public class SystemBatteryModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SystemBattery")

    Events("onBatteryChange")

    OnCreate {
      UIDevice.current.isBatteryMonitoringEnabled = true
    }

    OnDestroy {
      UIDevice.current.isBatteryMonitoringEnabled = false
    }

    Function("getState") {
      Self.currentState()
    }

    /**
     Registered only while JS is listening.

     Both notifications matter and they are separate: the level one for a
     discharge, the state one for a cable going in or out — which changes the
     mark's color without changing its height, so it would otherwise not
     appear until the next percent.
     */
    OnStartObserving {
      NotificationCenter.default.addObserver(
        self,
        selector: #selector(self.batteryChanged),
        name: UIDevice.batteryLevelDidChangeNotification,
        object: nil
      )
      NotificationCenter.default.addObserver(
        self,
        selector: #selector(self.batteryChanged),
        name: UIDevice.batteryStateDidChangeNotification,
        object: nil
      )
    }

    OnStopObserving {
      NotificationCenter.default.removeObserver(
        self,
        name: UIDevice.batteryLevelDidChangeNotification,
        object: nil
      )
      NotificationCenter.default.removeObserver(
        self,
        name: UIDevice.batteryStateDidChangeNotification,
        object: nil
      )
    }
  }

  @objc
  private func batteryChanged() {
    sendEvent("onBatteryChange", Self.currentState())
  }

  /**
   The reading, in the shape the JS side expects.

   `-1` passes straight through as the unknown sentinel — it is what a
   simulator reports, and what a device returns before monitoring is enabled.

   `.full` counts as plugged in alongside `.charging`: a battery at 100% on a
   cable has stopped charging but is not discharging either, and the mark cares
   about which way the level is going.
   */
  private static func currentState() -> [String: Any] {
    let device = UIDevice.current
    let source: String
    switch device.batteryState {
    case .charging, .full: source = "plugged"
    case .unplugged: source = "battery"
    default: source = "unknown"
    }

    return ["level": Double(device.batteryLevel), "source": source]
  }
}
