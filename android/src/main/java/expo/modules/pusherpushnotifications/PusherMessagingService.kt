package expo.modules.pusherpushnotifications

import com.google.firebase.messaging.RemoteMessage
import com.pusher.pushnotifications.fcm.MessagingService

/** Receives Beams messages over FCM; Pusher Beams remains the sender and transport API. */
class PusherMessagingService : MessagingService() {
  companion object { @Volatile var module: ExpoPusherPushNotificationsModule? = null }

  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    module?.emit("notification", mapOf(
      "title" to remoteMessage.notification?.title,
      "body" to remoteMessage.notification?.body,
      "data" to remoteMessage.data,
      "appState" to "foreground"
    ))
  }

  override fun onNewToken(token: String) {
    super.onNewToken(token)
    module?.emit("registered", mapOf("deviceToken" to token))
  }
}
