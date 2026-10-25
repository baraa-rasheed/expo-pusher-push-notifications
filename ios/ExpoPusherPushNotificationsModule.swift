import ExpoModulesCore
import PushNotifications

public class ExpoPusherPushNotificationsModule: Module {
  private let beams = PushNotifications.shared

  public func definition() -> ModuleDefinition {
    Name("ExpoPusherPushNotifications")
    Events("notification", "registered", "subscriptionsChanged", "error")

    AsyncFunction("start") { (instanceId: String) in
      self.beams.start(instanceId: instanceId)
      self.beams.registerForRemoteNotifications()
    }
    AsyncFunction("addDeviceInterest") { (interest: String) in
      try self.beams.addDeviceInterest(interest: interest)
      self.emitInterests()
    }
    AsyncFunction("removeDeviceInterest") { (interest: String) in
      try self.beams.removeDeviceInterest(interest: interest)
      self.emitInterests()
    }
    AsyncFunction("setDeviceInterests") { (interests: [String]) in
      try self.beams.setDeviceInterests(interests: interests)
      self.emitInterests()
    }
    AsyncFunction("getDeviceInterests") { () -> [String] in
      return self.beams.getDeviceInterests() ?? []
    }
    AsyncFunction("clearDeviceInterests") {
      try self.beams.clearDeviceInterests()
      self.emitInterests()
    }
    AsyncFunction("setUserId") { (userId: String, provider: [String: Any], promise: Promise) in
      guard let url = provider["url"] as? String else {
        promise.reject("E_TOKEN_PROVIDER", "tokenProvider.url is required"); return
      }
      let headers = provider["headers"] as? [String: String] ?? [:]
      let query = provider["queryParams"] as? [String: String] ?? [:]
      let tokenProvider = BeamsTokenProvider(authURL: url) { () -> AuthData in
        AuthData(headers: headers, queryParams: query)
      }
      self.beams.setUserId(userId, tokenProvider: tokenProvider) { error in
        if let error = error { promise.reject("E_SET_USER_ID", error.localizedDescription) }
        else { promise.resolve(nil) }
      }
    }
    AsyncFunction("clearAllState") { (promise: Promise) in
      self.beams.clearAllState { promise.resolve(nil) }
    }
    AsyncFunction("stop") { (promise: Promise) in
      self.beams.stop { promise.resolve(nil) }
    }

    // AppDelegate hooks are forwarded by ExpoPusherAppDelegateSubscriber.
    OnCreate {
      ExpoPusherAppDelegateSubscriber.onToken = { [weak self] token in
        PushNotifications.shared.registerDeviceToken(token)
        self?.sendEvent("registered", ["deviceToken": token.map { String(format: "%02x", $0) }.joined()])
      }
      ExpoPusherAppDelegateSubscriber.onNotification = { [weak self] userInfo, state in
        PushNotifications.shared.handleNotification(userInfo: userInfo)
        let aps = (userInfo["aps"] as? [String: Any])?["alert"] as? [String: Any]
        self?.sendEvent("notification", [
          "title": aps?["title"] as Any, "body": aps?["body"] as Any,
          "data": userInfo.reduce(into: [String: Any]()) { $0["\($1.key)"] = $1.value },
          "appState": state
        ])
      }
    }
  }

  private func emitInterests() {
    sendEvent("subscriptionsChanged", ["interests": beams.getDeviceInterests() ?? []])
  }
}
