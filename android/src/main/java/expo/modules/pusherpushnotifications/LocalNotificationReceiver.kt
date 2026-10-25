package expo.modules.pusherpushnotifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Fires scheduled local notifications (AlarmManager). */
class LocalNotificationReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    val id = intent.getStringExtra("id") ?: return
    @Suppress("UNCHECKED_CAST")
    val data = (intent.getSerializableExtra("data") as? HashMap<String, String>) ?: hashMapOf()
    intent.getIntExtra("badge", -1).takeIf { it >= 0 }?.let { NotificationHelper.setBadge(ctx, it) }
    NotificationHelper.show(ctx, id.hashCode(), intent.getStringExtra("title"), intent.getStringExtra("body"),
      data, intent.getStringExtra("sound"), intent.getStringExtra("channelId"))
    ScheduleStore.remove(ctx, id)
  }
}

internal object ScheduleStore {
  private const val P = "expo_pusher_scheduled"
  fun add(ctx: Context, id: String) = ctx.getSharedPreferences(P, Context.MODE_PRIVATE).edit().putBoolean(id, true).apply()
  fun remove(ctx: Context, id: String) = ctx.getSharedPreferences(P, Context.MODE_PRIVATE).edit().remove(id).apply()
  fun all(ctx: Context): Set<String> = ctx.getSharedPreferences(P, Context.MODE_PRIVATE).all.keys
}
