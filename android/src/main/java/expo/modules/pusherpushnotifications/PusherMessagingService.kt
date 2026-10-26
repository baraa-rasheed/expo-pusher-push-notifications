package expo.modules.pusherpushnotifications

import com.google.firebase.messaging.RemoteMessage
import com.pusher.pushnotifications.fcm.MessagingService

/**
 * The app's FCM service. Extends the Beams MessagingService so Beams keeps working,
 * and adds foreground display, custom sounds/channels and badge handling on top.
 */
class PusherMessagingService : MessagingService() {
  companion object { @Volatile var module: ExpoPusherPushNotificationsModule? = null }

  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    val data = remoteMessage.data
    val n = remoteMessage.notification
    val title = n?.title ?: data["title"]
    val body = n?.body ?: data["body"] ?: data["message"]
    if (data["incrementBadge"] == "true") NotificationHelper.setBadge(this, NotificationHelper.getBadge(this) + 1)
    val m = module
    if (m != null && m.isForeground) {
      m.emit("notification", mapOf("title" to title, "body" to body, "data" to data, "appState" to "foreground"))
      // Notification messages are not auto-shown in the foreground; show them with sound/channel.
      if (title != null || body != null) show(remoteMessage, title, body)
    } else {
      m?.emit("notification", mapOf("title" to title, "body" to body, "data" to data, "appState" to "background"))
      // Data-only messages are never auto-displayed; display if they carry a title/body.
      if (n == null && (title != null || body != null)) show(remoteMessage, title, body)
    }
  }

  private fun show(msg: RemoteMessage, title: String?, body: String?) {
    val data = msg.data
    NotificationHelper.show(
      this, (msg.messageId ?: System.nanoTime().toString()).hashCode(), title, body, data,
      msg.notification?.sound ?: data["sound"],
      msg.notification?.channelId ?: data["android_channel_id"] ?: data["channelId"]
    )
  }

  override fun onNewToken(token: String) {
    super.onNewToken(token)
    module?.emit("registered", mapOf("deviceToken" to token, "type" to "fcm"))
  }
}
