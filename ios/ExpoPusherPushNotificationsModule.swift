import ExpoModulesCore
import PushNotifications
import UIKit
import UserNotifications

/// Static Beams token (b8ne-style `setUserId(userId, token)`).
final class StaticBeamsTokenProvider: NSObject, TokenProvider {
  private let token: String
  init(token: String) { self.token = token }
  func fetchToken(userId: String, completionHandler completion: @escaping (String, Error?) -> Void) throws {
    completion(token, nil)
  }
}

struct LocalNotificationRecord: Record {
  @Field var id: String?
  @Field var title: String?
  @Field var body: String?
  @Field var data: [String: String]?
  @Field var sound: String?
  @Field var channelId: String?
  @Field var badge: Int?
  @Field var seconds: Double?
}

public class ExpoPusherPushNotificationsModule: Module {
  private let beams = PushNotifications.shared
  private var beamsStarted = false
  private var initialNotification: [String: Any]?
  private lazy var centerDelegate = NotificationCenterDelegate(module: self)

  public func definition() -> ModuleDefinition {
    Name("ExpoPusherPushNotifications")
    Events("notification", "registered", "subscriptionsChanged", "error")

    OnCreate {
      UNUserNotificationCenter.current().delegate = self.centerDelegate
      ExpoPusherAppDelegateSubscriber.onToken = { [weak self] token in self?.handleToken(token) }
      ExpoPusherAppDelegateSubscriber.onTokenError = { [weak self] error in
        guard let self = self else { return }
        self.sendEvent("error", ["code": "E_APNS_REGISTRATION", "message": error.localizedDescription])
      }
      ExpoPusherAppDelegateSubscriber.onNotification = { [weak self] userInfo, state in
        self?.handleRemote(userInfo, state: state)
      }
    }

    // ---- Beams (interests / users) ----
    AsyncFunction("start") { (instanceId: String) in
      self.beams.start(instanceId: instanceId)
      self.beamsStarted = true
      if let token = ExpoPusherAppDelegateSubscriber.lastToken { self.beams.registerDeviceToken(token) }
      DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
    }
    AsyncFunction("addDeviceInterest") { (interest: String) in
      try self.beams.addDeviceInterest(interest: interest); self.emitInterests()
    }
    AsyncFunction("removeDeviceInterest") { (interest: String) in
      try self.beams.removeDeviceInterest(interest: interest); self.emitInterests()
    }
    AsyncFunction("setDeviceInterests") { (interests: [String]) in
      try self.beams.setDeviceInterests(interests: interests); self.emitInterests()
    }
    AsyncFunction("getDeviceInterests") { () -> [String] in self.beams.getDeviceInterests() ?? [] }
    AsyncFunction("clearDeviceInterests") { try self.beams.clearDeviceInterests(); self.emitInterests() }
    AsyncFunction("setUserId") { (userId: String, provider: [String: Any], promise: Promise) in
      guard let url = provider["url"] as? String else {
        promise.reject("E_TOKEN_PROVIDER", "tokenProvider.url is required"); return
      }
      let headers = provider["headers"] as? [String: String] ?? [:]
      let query = provider["queryParams"] as? [String: String] ?? [:]
      let tp = BeamsTokenProvider(authURL: url) { () -> AuthData in AuthData(headers: headers, queryParams: query) }
      self.beams.setUserId(userId, tokenProvider: tp) { error in
        if let error = error { promise.reject("E_SET_USER_ID", error.localizedDescription) } else { promise.resolve(nil) }
      }
    }
    AsyncFunction("setUserIdWithToken") { (userId: String, token: String, promise: Promise) in
      self.beams.setUserId(userId, tokenProvider: StaticBeamsTokenProvider(token: token)) { error in
        if let error = error { promise.reject("E_SET_USER_ID", error.localizedDescription) } else { promise.resolve(nil) }
      }
    }
    AsyncFunction("clearAllState") { (promise: Promise) in self.beams.clearAllState { promise.resolve(nil) } }
    AsyncFunction("stop") { (promise: Promise) in
      self.beams.stop { self.beamsStarted = false; promise.resolve(nil) }
    }

    // ---- Permissions ----
    AsyncFunction("requestPermission") { (promise: Promise) in
      UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in
        Self.permissionStatus { promise.resolve($0) }
      }
    }
    AsyncFunction("getPermissionStatus") { (promise: Promise) in Self.permissionStatus { promise.resolve($0) } }

    // ---- Channels: Android only ----
    AsyncFunction("createChannel") { (_: [String: Any]) in }
    AsyncFunction("deleteChannel") { (_: String) in }
    AsyncFunction("getChannels") { () -> [[String: Any]] in [] }

    // ---- Badge ----
    AsyncFunction("getBadgeCount") { () -> Int in UIApplication.shared.applicationIconBadgeNumber }.runOnQueue(.main)
    AsyncFunction("setBadgeCount") { (count: Int, promise: Promise) in
      UNUserNotificationCenter.current().setBadgeCount(count) { error in
        if let error = error { promise.reject("E_BADGE", error.localizedDescription) } else { promise.resolve(nil) }
      }
    }

    // ---- Local notifications ----
    AsyncFunction("presentLocalNotification") { (n: LocalNotificationRecord, promise: Promise) in
      self.schedule(n, seconds: nil, promise: promise)
    }
    AsyncFunction("scheduleLocalNotification") { (n: LocalNotificationRecord, promise: Promise) in
      self.schedule(n, seconds: max(1, n.seconds ?? 1), promise: promise)
    }
    AsyncFunction("cancelScheduledNotification") { (id: String) in
      UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
    }
    AsyncFunction("cancelAllScheduledNotifications") {
      UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }
    AsyncFunction("dismissAllNotifications") {
      UNUserNotificationCenter.current().removeAllDeliveredNotifications()
    }
    AsyncFunction("getInitialNotification") { () -> [String: Any]? in
      let n = self.initialNotification; self.initialNotification = nil; return n
    }
  }

  // MARK: - helpers

  private func handleToken(_ token: Data) {
    if beamsStarted { beams.registerDeviceToken(token) }
    let dict = Self.tokenDict(token)
    sendEvent("registered", ["deviceToken": dict["token"]!, "type": "apns"])
  }

  fileprivate func handleRemote(_ userInfo: [AnyHashable: Any], state: String) {
    if beamsStarted { _ = beams.handleNotification(userInfo: userInfo) }
    // b8ne extra: `aps.data.incrementBadge` (or top-level `data.incrementBadge`) bumps the badge client-side.
    let aps = userInfo["aps"] as? [String: Any]
    let inc = ((aps?["data"] as? [String: Any])?["incrementBadge"] as? Bool)
      ?? ((userInfo["data"] as? [String: Any])?["incrementBadge"] as? Bool) ?? false
    if inc && state != "opened" {
      DispatchQueue.main.async {
        UNUserNotificationCenter.current().setBadgeCount(UIApplication.shared.applicationIconBadgeNumber + 1)
      }
    }
    sendEvent("notification", Self.payload(userInfo: userInfo, state: state))
  }

  fileprivate func handleOpened(_ userInfo: [AnyHashable: Any]) {
    if beamsStarted { _ = beams.handleNotification(userInfo: userInfo) }
    let p = Self.payload(userInfo: userInfo, state: "opened")
    if initialNotification == nil && UIApplication.shared.applicationState != .active { initialNotification = p }
    sendEvent("notification", p)
  }

  private func schedule(_ n: LocalNotificationRecord, seconds: Double?, promise: Promise) {
    let content = UNMutableNotificationContent()
    if let t = n.title { content.title = t }
    if let b = n.body { content.body = b }
    if let d = n.data { content.userInfo = d }
    if let badge = n.badge { content.badge = NSNumber(value: badge) }
    content.sound = Self.sound(n.sound)
    let trigger = seconds.map { UNTimeIntervalNotificationTrigger(timeInterval: $0, repeats: false) }
    let id = n.id ?? UUID().uuidString
    UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: content, trigger: trigger)) { error in
      if let error = error { promise.reject("E_LOCAL_NOTIFICATION", error.localizedDescription) } else { promise.resolve(id) }
    }
  }

  static func sound(_ name: String?) -> UNNotificationSound? {
    guard let name = name, !name.isEmpty else { return .default }
    if name == "default" { return .default }
    if name == "none" { return nil }
    return UNNotificationSound(named: UNNotificationSoundName(rawValue: name))
  }

  static func tokenDict(_ token: Data) -> [String: Any] {
    ["type": "apns", "platform": "ios", "token": token.map { String(format: "%02x", $0) }.joined()]
  }

  static func payload(userInfo: [AnyHashable: Any], state: String) -> [String: Any] {
    let alertAny = (userInfo["aps"] as? [String: Any])?["alert"]
    let alert = alertAny as? [String: Any]
    var out: [String: Any] = [
      "data": userInfo.reduce(into: [String: Any]()) { $0["\($1.key)"] = $1.value },
      "appState": state
    ]
    if let t = alert?["title"] as? String { out["title"] = t }
    if let b = (alert?["body"] as? String) ?? (alertAny as? String) { out["body"] = b }
    return out
  }

  static func permissionStatus(_ cb: @escaping (String) -> Void) {
    UNUserNotificationCenter.current().getNotificationSettings { s in
      switch s.authorizationStatus {
      case .authorized, .ephemeral: cb("granted")
      case .provisional: cb("provisional")
      case .denied: cb("denied")
      default: cb("undetermined")
      }
    }
  }

  private func emitInterests() {
    sendEvent("subscriptionsChanged", ["interests": beams.getDeviceInterests() ?? []])
  }
}

final class NotificationCenterDelegate: NSObject, UNUserNotificationCenterDelegate {
  weak var module: ExpoPusherPushNotificationsModule?
  init(module: ExpoPusherPushNotificationsModule) { self.module = module }

  func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                              withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    let show = (Bundle.main.object(forInfoDictionaryKey: "PusherShowInForeground") as? Bool) ?? true
    let info = notification.request.content.userInfo
    let silent = ((info["aps"] as? [String: Any])?["content-available"] as? Int) == 1
    // content-available pushes are already reported via didReceiveRemoteNotification.
    if notification.request.trigger is UNPushNotificationTrigger && !silent {
      module?.handleRemote(notification.request.content.userInfo, state: "foreground")
    }
    completionHandler(show ? [.banner, .list, .sound, .badge] : [])
  }

  func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                              withCompletionHandler completionHandler: @escaping () -> Void) {
    module?.handleOpened(response.notification.request.content.userInfo)
    completionHandler()
  }
}
