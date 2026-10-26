# Sounds, channels, badges, local notifications

All of this works whether you use interests, users, or both.

## Custom sounds

1. List the files in the plugin's `sounds` option and run prebuild.
2. **iOS:** put the file name in the payload: `aps.sound = "ding.wav"`. This works for Beams `apns` payloads, raw APNs, and local notifications (`sound: 'ding.wav'`).
3. **Android 8+:** the sound belongs to the **channel**, so create a channel with `sound: 'ding.wav'` (in the plugin or with `createChannel`) and target it with `android_channel_id` / `channel_id` or the local notification's `channelId`. On Android 7 and earlier, the payload's `sound: "ding"` is used. Android cannot change a channel's sound after creation. To change it, delete the channel and create a new one with a new id.

## Android notification channels

No-ops on iOS.

```ts
await Push.createChannel({ id: 'promo', name: 'Promotions', importance: 'low', sound: 'ding.wav', vibrate: false });
await Push.getChannels();
await Push.deleteChannel('promo');
```

## Badges

```ts
await Push.setBadgeCount(5);
await Push.getBadgeCount();
await Push.incrementBadgeCount(); // returns the new value
await Push.setBadgeCount(0);      // clear
```

- **iOS:** uses the real app icon badge (`UNUserNotificationCenter.setBadgeCount`). Payloads can also set `aps.badge`.
- **Android:** there is no system badge API. The module keeps a counter, applies it as the notification number on notifications it posts, and clears the shade when you set the count to `0`. Launchers show dots or counts based on the channel's `showBadge` setting.
- **`incrementBadge` (from b8ne):** add `"incrementBadge": true` under `aps.data` or a top-level `data` (iOS), or `"incrementBadge": "true"` in FCM `data` (Android), and the badge goes up by one on the device.

## Local notifications

```ts
await Push.presentLocalNotification({ title: 'Saved', body: 'Draft saved', sound: 'ding.wav', channelId: 'messages' });
const id = await Push.scheduleLocalNotification({ title: 'Reminder', body: 'Stand up', seconds: 600, sound: 'alarm.caf' });
await Push.cancelScheduledNotification(id);
await Push.cancelAllScheduledNotifications();
await Push.dismissAllNotifications();
```

Android schedules use inexact `AlarmManager` alarms, so no exact-alarm permission is needed, but Doze can delay them. Android scheduled notifications do not survive a reboot.

## Events and taps

```ts
Push.addListener('notification', (n) => console.log(n.title, n.body, n.data, n.appState)); // foreground | background | opened
Push.addListener('registered', ({ deviceToken, type }) => {});
Push.addListener('subscriptionsChanged', ({ interests }) => {});
Push.addListener('error', ({ code, message }) => {});

// Cold start from a tapped notification (b8ne's launch-intent handling)
const initial = await Push.getInitialNotification();
```


---
[← Back to README](../README.md)
