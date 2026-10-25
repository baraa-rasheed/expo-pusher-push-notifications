import ExpoModulesCore
import UIKit

public class ExpoPusherAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  static var onToken: ((Data) -> Void)?
  static var onNotification: (([AnyHashable: Any], String) -> Void)?

  public func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Self.onToken?(deviceToken)
  }

  public func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                          fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    let state = application.applicationState == .active ? "foreground" : "background"
    Self.onNotification?(userInfo, state)
    completionHandler(.newData)
  }
}
