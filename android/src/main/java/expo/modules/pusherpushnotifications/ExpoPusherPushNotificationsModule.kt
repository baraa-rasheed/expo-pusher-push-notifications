package expo.modules.pusherpushnotifications

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import androidx.core.app.NotificationManagerCompat
import com.pusher.pushnotifications.BeamsCallback
import com.pusher.pushnotifications.PushNotifications
import com.pusher.pushnotifications.PusherCallbackError
import com.pusher.pushnotifications.SubscriptionsChangedListener
import com.pusher.pushnotifications.auth.AuthData
import com.pusher.pushnotifications.auth.AuthDataGetter
import com.pusher.pushnotifications.auth.BeamsTokenProvider
import com.pusher.pushnotifications.auth.TokenProvider
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID

class ExpoPusherPushNotificationsModule : Module() {
  private val context: Context get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
  @Volatile var isForeground = false
  private var initialNotification: Map<String, Any?>? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoPusherPushNotifications")
    Events("notification", "registered", "subscriptionsChanged", "error")

    OnCreate {
      PusherMessagingService.module = this@ExpoPusherPushNotificationsModule
      appContext.reactContext?.let { NotificationHelper.ensureChannels(it) }
      // b8ne extra: deliver the notification that launched the app from a tap.
      appContext.currentActivity?.let { initialNotification = openedPayload(it.intent) }
    }
    OnDestroy { PusherMessagingService.module = null }
    OnActivityEntersForeground { isForeground = true }
    OnActivityEntersBackground { isForeground = false }
    OnNewIntent { intent -> openedPayload(intent)?.let { sendEvent("notification", it) } }

    // ---- Beams ----
    AsyncFunction("start") { instanceId: String ->
      PushNotifications.start(context, instanceId)
      PushNotifications.setOnDeviceInterestsChangedListener(object : SubscriptionsChangedListener {
        override fun onSubscriptionsChanged(interests: Set<String>) {
          sendEvent("subscriptionsChanged", mapOf("interests" to interests.toList()))
        }
      })
    }
    AsyncFunction("addDeviceInterest") { interest: String -> PushNotifications.addDeviceInterest(interest) }
    AsyncFunction("removeDeviceInterest") { interest: String -> PushNotifications.removeDeviceInterest(interest) }
    AsyncFunction("setDeviceInterests") { interests: List<String> -> PushNotifications.setDeviceInterests(interests.toSet()) }
    AsyncFunction("getDeviceInterests") { -> PushNotifications.getDeviceInterests().toList() }
    AsyncFunction("clearDeviceInterests") { PushNotifications.clearDeviceInterests() }
    AsyncFunction("setUserId") { userId: String, provider: Map<String, Any?>, promise: Promise ->
      val url = provider["url"] as? String
        ?: return@AsyncFunction promise.reject("E_TOKEN_PROVIDER", "tokenProvider.url is required", null)
      @Suppress("UNCHECKED_CAST") val headers = (provider["headers"] as? Map<String, String>) ?: emptyMap()
      @Suppress("UNCHECKED_CAST") val query = (provider["queryParams"] as? Map<String, String>) ?: emptyMap()
      val tp = BeamsTokenProvider(url, object : AuthDataGetter {
        override fun getAuthData() = AuthData(headers = headers, queryParams = query)
      })
      PushNotifications.setUserId(userId, tp, userCallback(promise))
    }
    AsyncFunction("setUserIdWithToken") { userId: String, token: String, promise: Promise ->
      val tp = object : TokenProvider { override fun fetchToken(userId: String): String = token }
      PushNotifications.setUserId(userId, tp, userCallback(promise))
    }
    AsyncFunction("clearAllState") { PushNotifications.clearAllState() }
    AsyncFunction("stop") { PushNotifications.stop() }

    // ---- Permissions ----
    AsyncFunction("requestPermission") { promise: Promise ->
      val perms = appContext.permissions
      if (Build.VERSION.SDK_INT < 33 || perms == null) return@AsyncFunction promise.resolve(status())
      perms.askForPermissions({ result ->
        promise.resolve(result[Manifest.permission.POST_NOTIFICATIONS]?.status?.status ?: status())
      }, Manifest.permission.POST_NOTIFICATIONS)
    }
    AsyncFunction("getPermissionStatus") { -> status() }

    // ---- Channels ----
    AsyncFunction("createChannel") { channel: Map<String, Any?> -> NotificationHelper.createChannel(context, channel) }
    AsyncFunction("deleteChannel") { id: String ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.getSystemService(android.app.NotificationManager::class.java).deleteNotificationChannel(id)
      }
    }
    AsyncFunction("getChannels") { -> NotificationHelper.channels(context) }

    // ---- Badge ----
    AsyncFunction("getBadgeCount") { -> NotificationHelper.getBadge(context) }
    AsyncFunction("setBadgeCount") { count: Int -> NotificationHelper.setBadge(context, count) }

    // ---- Local notifications ----
    AsyncFunction("presentLocalNotification") { n: Map<String, Any?> ->
      val id = n["id"] as? String ?: UUID.randomUUID().toString()
      (n["badge"] as? Number)?.let { NotificationHelper.setBadge(context, it.toInt()) }
      @Suppress("UNCHECKED_CAST")
      NotificationHelper.show(context, id.hashCode(), n["title"] as? String, n["body"] as? String,
        (n["data"] as? Map<String, String>) ?: emptyMap(), n["sound"] as? String, n["channelId"] as? String)
      id
    }
    AsyncFunction("scheduleLocalNotification") { n: Map<String, Any?> ->
      val id = n["id"] as? String ?: UUID.randomUUID().toString()
      val seconds = ((n["seconds"] as? Number)?.toDouble() ?: 1.0).coerceAtLeast(1.0)
      @Suppress("UNCHECKED_CAST")
      val intent = Intent(context, LocalNotificationReceiver::class.java).apply {
        putExtra("id", id)
        putExtra("title", n["title"] as? String)
        putExtra("body", n["body"] as? String)
        putExtra("sound", n["sound"] as? String)
        putExtra("channelId", n["channelId"] as? String)
        (n["badge"] as? Number)?.let { putExtra("badge", it.toInt()) }
        putExtra("data", HashMap((n["data"] as? Map<String, String>) ?: emptyMap()))
      }
      val am = context.getSystemService(AlarmManager::class.java)
      val at = SystemClock.elapsedRealtime() + (seconds * 1000).toLong()
      // Inexact alarm: no SCHEDULE_EXACT_ALARM permission needed; may be delayed by Doze.
      am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, at, alarmIntent(id, intent))
      ScheduleStore.add(context, id)
      id
    }
    AsyncFunction("cancelScheduledNotification") { id: String -> cancelAlarm(id) }
    AsyncFunction("cancelAllScheduledNotifications") { ScheduleStore.all(context).forEach { cancelAlarm(it) } }
    AsyncFunction("dismissAllNotifications") { NotificationManagerCompat.from(context).cancelAll() }
    AsyncFunction("getInitialNotification") { ->
      val n = initialNotification; initialNotification = null; n
    }
  }

  private fun userCallback(promise: Promise) = object : BeamsCallback<Void, PusherCallbackError> {
    override fun onSuccess(vararg values: Void) = promise.resolve(null)
    override fun onFailure(error: PusherCallbackError) = promise.reject("E_SET_USER_ID", error.message, null)
  }

  private fun status(): String =
    if (NotificationManagerCompat.from(context).areNotificationsEnabled()) PermissionsStatus.GRANTED.status
    else if (Build.VERSION.SDK_INT >= 33) PermissionsStatus.UNDETERMINED.status else PermissionsStatus.DENIED.status

  private fun alarmIntent(id: String, intent: Intent) = PendingIntent.getBroadcast(
    context, id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

  private fun cancelAlarm(id: String) {
    context.getSystemService(AlarmManager::class.java)
      .cancel(alarmIntent(id, Intent(context, LocalNotificationReceiver::class.java)))
    ScheduleStore.remove(context, id)
  }

  /** Payload for an activity intent opened from a notification tap (FCM system tray or our local ones). */
  private fun openedPayload(intent: Intent?): Map<String, Any?>? {
    val extras = intent?.extras ?: return null
    if (intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY != 0) return null
    val fromUs = extras.getBoolean(NotificationHelper.EXTRA_FROM_NOTIFICATION, false)
    val fromFcm = extras.containsKey("google.message_id") || extras.containsKey("pusher")
    if (!fromUs && !fromFcm) return null
    val data = NotificationHelper.bundleToMap(extras)
    intent.removeExtra(NotificationHelper.EXTRA_FROM_NOTIFICATION)
    intent.removeExtra("google.message_id")
    return mapOf("title" to data["title"], "body" to data["body"], "data" to data, "appState" to "opened")
  }

  internal fun emit(name: String, body: Map<String, Any?>) = sendEvent(name, body)
}
