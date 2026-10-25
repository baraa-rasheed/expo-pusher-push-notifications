package expo.modules.pusherpushnotifications

import com.pusher.pushnotifications.BeamsCallback
import com.pusher.pushnotifications.PushNotifications
import com.pusher.pushnotifications.PusherCallbackError
import com.pusher.pushnotifications.SubscriptionsChangedListener
import com.pusher.pushnotifications.auth.AuthData
import com.pusher.pushnotifications.auth.AuthDataGetter
import com.pusher.pushnotifications.auth.BeamsTokenProvider
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoPusherPushNotificationsModule : Module() {
  private val context get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ExpoPusherPushNotifications")
    Events("notification", "registered", "subscriptionsChanged", "error")

    OnCreate { PusherMessagingService.module = this@ExpoPusherPushNotificationsModule }
    OnDestroy { PusherMessagingService.module = null }

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
      val url = provider["url"] as? String ?: return@AsyncFunction promise.reject("E_TOKEN_PROVIDER", "tokenProvider.url is required", null)
      @Suppress("UNCHECKED_CAST") val headers = (provider["headers"] as? Map<String, String>) ?: emptyMap()
      @Suppress("UNCHECKED_CAST") val query = (provider["queryParams"] as? Map<String, String>) ?: emptyMap()
      val tokenProvider = BeamsTokenProvider(url, object : AuthDataGetter {
        override fun getAuthData() = AuthData(headers = headers, queryParams = query)
      })
      PushNotifications.setUserId(userId, tokenProvider, object : BeamsCallback<Void, PusherCallbackError> {
        override fun onSuccess(vararg values: Void) = promise.resolve(null)
        override fun onFailure(error: PusherCallbackError) = promise.reject("E_SET_USER_ID", error.message, null)
      })
    }
    AsyncFunction("clearAllState") { PushNotifications.clearAllState() }
    AsyncFunction("stop") { PushNotifications.stop() }
  }

  internal fun emit(name: String, body: Map<String, Any?>) = sendEvent(name, body)
}
