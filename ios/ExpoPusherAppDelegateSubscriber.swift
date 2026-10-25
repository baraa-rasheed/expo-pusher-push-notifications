import ExpoModulesCore
import UIKit

public class ExpoPusherAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  static var onToken: ((Data) -> Void)?
  static var onTokenError: ((Error) -> Void)?
  static var onNotification: (([AnyHashable: Any], String) -> Void)?
  /// Token cached even before the module is created (e.g. cold start).
  static var lastToken: Data?

  public func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Self.lastToken = deviceToken
    Self.onToken?(deviceToken)
  }

  public func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    Self.onTokenError?(error)
  }

  public func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                          fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    let state = application.applicationState == .active ? "foreground" : "background"
    Self.onNotification?(userInfo, state)
    completionHandler(.newData)
  }
}
