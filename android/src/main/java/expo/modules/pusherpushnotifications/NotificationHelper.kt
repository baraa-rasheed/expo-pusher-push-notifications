package expo.modules.pusherpushnotifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray

/** Shared notification utilities: channels, sounds, badge counter, display. */
object NotificationHelper {
  const val EXTRA_FROM_NOTIFICATION = "expo_pusher_from_notification"
  private const val PREFS = "expo_pusher_push_notifications"

  fun meta(ctx: Context, key: String): String? = try {
    val ai = ctx.packageManager.getApplicationInfo(ctx.packageName, PackageManager.GET_META_DATA)
    ai.metaData?.get(key)?.toString()
  } catch (_: Exception) { null }

  fun defaultChannelId(ctx: Context) = meta(ctx, "pusher_default_channel_id") ?: "default"

  /** `ding.wav` / `ding` -> android.resource://pkg/raw/ding, or null if not bundled. */
  fun soundUri(ctx: Context, sound: String?): Uri? {
    if (sound.isNullOrEmpty() || sound == "default" || sound == "none") return null
    val name = sound.substringBeforeLast('.').lowercase().replace(Regex("[^a-z0-9_]"), "_")
    val id = ctx.resources.getIdentifier(name, "raw", ctx.packageName)
    return if (id == 0) null else Uri.parse("android.resource://${ctx.packageName}/raw/$name")
  }

  private fun importance(s: String?) = when (s) {
    "min" -> NotificationManager.IMPORTANCE_MIN
    "low" -> NotificationManager.IMPORTANCE_LOW
    "high" -> NotificationManager.IMPORTANCE_HIGH
    "max" -> NotificationManager.IMPORTANCE_MAX
    else -> NotificationManager.IMPORTANCE_DEFAULT
  }

  private fun importanceName(i: Int) = when (i) {
    NotificationManager.IMPORTANCE_MIN -> "min"
    NotificationManager.IMPORTANCE_LOW -> "low"
    NotificationManager.IMPORTANCE_HIGH -> "high"
    NotificationManager.IMPORTANCE_MAX -> "max"
    else -> "default"
  }

  fun createChannel(ctx: Context, c: Map<String, Any?>) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val id = c["id"] as? String ?: return
    val ch = NotificationChannel(id, c["name"] as? String ?: id, importance(c["importance"] as? String))
    (c["description"] as? String)?.let { ch.description = it }
    (c["vibrate"] as? Boolean)?.let { ch.enableVibration(it) }
    (c["showBadge"] as? Boolean)?.let { ch.setShowBadge(it) }
    (c["lightColor"] as? String)?.let { runCatching { ch.lightColor = Color.parseColor(it); ch.enableLights(true) } }
    if (c.containsKey("sound") && c["sound"] == null) {
      ch.setSound(null, null)
    } else soundUri(ctx, c["sound"] as? String)?.let {
      ch.setSound(it, AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
    }
    ctx.getSystemService(NotificationManager::class.java).createNotificationChannel(ch)
  }

  fun channels(ctx: Context): List<Map<String, Any?>> {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return emptyList()
    return ctx.getSystemService(NotificationManager::class.java).notificationChannels.map {
      mapOf(
        "id" to it.id, "name" to it.name.toString(), "description" to it.description,
        "importance" to importanceName(it.importance), "sound" to it.sound?.lastPathSegment,
        "vibrate" to it.shouldVibrate(), "showBadge" to it.canShowBadge()
      )
    }
  }

  /** Creates channels declared in the config plugin plus the default channel. Idempotent. */
  fun ensureChannels(ctx: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    meta(ctx, "pusher_channels")?.let { json ->
      runCatching {
        val arr = JSONArray(json)
        for (i in 0 until arr.length()) {
          val o = arr.getJSONObject(i)
          val m = mutableMapOf<String, Any?>()
          o.keys().forEach { k -> m[k] = if (o.isNull(k)) null else o.get(k) }
          createChannel(ctx, m)
        }
      }
    }
    val nm = ctx.getSystemService(NotificationManager::class.java)
    val def = defaultChannelId(ctx)
    if (nm.getNotificationChannel(def) == null) createChannel(ctx, mapOf("id" to def, "name" to "Default"))
  }

  // ---- badge (Android has no system API; we keep a counter and apply it via setNumber) ----
  fun getBadge(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt("badge", 0)
  fun setBadge(ctx: Context, n: Int) {
    ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putInt("badge", maxOf(0, n)).apply()
    if (n <= 0) NotificationManagerCompat.from(ctx).cancelAll()
  }

  fun saveToken(ctx: Context, token: String?) =
    ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("fcm_token", token).apply()
  fun savedToken(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("fcm_token", null)

  fun show(ctx: Context, id: Int, title: String?, body: String?, data: Map<String, String>, sound: String?, channelId: String?) {
    ensureChannels(ctx)
    val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      putExtra(EXTRA_FROM_NOTIFICATION, true)
      title?.let { putExtra("title", it) }
      body?.let { putExtra("body", it) }
      data.forEach { (k, v) -> putExtra(k, v) }
    }
    val pi = launch?.let {
      PendingIntent.getActivity(ctx, id, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
    val icon = ctx.applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.ic_dialog_info
    val b = NotificationCompat.Builder(ctx, channelId ?: defaultChannelId(ctx))
      .setSmallIcon(icon).setContentTitle(title).setContentText(body).setAutoCancel(true)
      .setNumber(getBadge(ctx)).setContentIntent(pi)
    soundUri(ctx, sound)?.let { b.setSound(it) } // pre-O; on O+ the channel's sound applies
    if (NotificationManagerCompat.from(ctx).areNotificationsEnabled()) {
      try { NotificationManagerCompat.from(ctx).notify(id, b.build()) } catch (_: SecurityException) {}
    }
  }

  fun bundleToMap(b: Bundle?): Map<String, String> =
    b?.keySet()?.filter { !it.startsWith("google.") && !it.startsWith("gcm.") && it != EXTRA_FROM_NOTIFICATION && it != "from" && it != "collapse_key" }
      ?.associateWith { b.get(it)?.toString() ?: "" } ?: emptyMap()
}
