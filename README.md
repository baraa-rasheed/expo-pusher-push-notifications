# expo-pusher-push-notifications

Push notifications for **Expo SDK 58**, built with the Expo Modules API (Swift + Kotlin), autolinking, and a config plugin. It is written in strict TypeScript and ships `.d.ts` declarations.

It supports **three delivery modes**: Pusher Beams interests, Pusher Beams authenticated users, and **raw FCM/APNs device tokens** that your own server sends to directly. Every mode also gets custom bundled sounds, Android notification channels, badge management, and local notifications (shown immediately or scheduled).

This is a from-scratch rewrite of [ZeptInc/react-native-pusher-push-notifications](https://github.com/ZeptInc/react-native-pusher-push-notifications), which was forked from [b8ne/react-native-pusher-push-notifications](https://github.com/b8ne/react-native-pusher-push-notifications). See [Feature parity with the original](#feature-parity-with-the-original).

## The three modes

| | Mode | How the device is targeted | Who sends | Server API |
|---|---|---|---|---|
| 1 | `interests` (default) | `subscribe('news')` / `setSubscriptions([...])` | Pusher Beams | Beams `publishToInterests` |
| 2 | `users` | `setUserId(userId, auth)` | Pusher Beams | Beams `publishToUsers` |
| 3 | `device` | You store the native token from `start()` / `registered` | **Your server, directly to FCM / APNs. Beams is not involved.** | FCM HTTP v1 `messages:send` / APNs HTTP/2 `/3/device/<token>` |

- **Modes 1 and 2** start the Pusher Beams SDK. Beams registers the device and sends the push, and FCM/APNs only carry it the last hop.
- **Mode 3** never starts Beams, so no Beams instance is needed. `start({ mode: 'device' })` asks for permission, registers with FCM (Android) or APNs (iOS), and resolves `{ type: 'fcm' | 'apns', token, platform }`. Send that token to your backend. You can also call `registerForDeviceToken()` / `getDevicePushToken()` in any mode.
- Calling a Beams-only function (`subscribe`, `setUserId`, …) in `device` mode throws a clear error.
- The same events fire in every mode: `notification`, `registered`, `subscriptionsChanged` (Beams only), and `error`.

## Install

```sh
npx expo install expo-pusher-push-notifications
```

`app.json`:

```json
{
  "expo": {
    "ios": { "bundleIdentifier": "com.you.app" },
    "android": { "package": "com.you.app", "googleServicesFile": "./google-services.json" },
    "plugins": [
      ["expo-pusher-push-notifications", {
        "mode": "interests",
        "instanceId": "YOUR_BEAMS_INSTANCE_ID",
        "apsEnvironment": "development",
        "sounds": ["./assets/sounds/ding.wav", "./assets/sounds/alarm.caf"],
        "androidChannels": [
          { "id": "messages", "name": "Messages", "importance": "high", "sound": "ding.wav" },
          { "id": "alarms", "name": "Alarms", "importance": "max", "sound": "alarm.caf" },
          { "id": "silent", "name": "Silent", "importance": "low", "sound": null }
        ],
        "androidDefaultChannelId": "messages",
        "iosShowInForeground": true
      }]
    ]
  }
}
```

Then run `npx expo prebuild` and build a development build. Expo Go cannot load this native module.

### Plugin options

| Option | Default | What it does |
|---|---|---|
| `mode` | `interests` | Written to Info.plist and the manifest so native code can read it. |
| `instanceId` | none | Beams instance ID. Not needed for `device` mode. |
| `apsEnvironment` | `development` | Sets the `aps-environment` entitlement. Use `production` for TestFlight and App Store builds. |
| `sounds` | `[]` | Sound files to bundle. **Android:** copied to `res/raw` with names lower-cased to `[a-z0-9_]`. **iOS:** copied into the app target and added to its resources. iOS needs `.wav`, `.caf`, or `.aiff` under 30 s. |
| `androidChannels` | `[]` | Channels created at startup. Set `sound` to a file name from `sounds`, or `null` for a silent channel. |
| `androidDefaultChannelId` | first channel, or `default` | Used by FCM/Beams notifications that don't name a channel. Also sets `com.google.firebase.messaging.default_notification_channel_id`. |
| `iosShowInForeground` | `true` | Shows the banner, plays the sound, and updates the badge while the app is in the foreground. |

The plugin also adds the `remote-notification` background mode on iOS. On Android, the library manifest declares one FCM service for all modes (it extends the Beams `MessagingService`), the `POST_NOTIFICATIONS` permission, and a receiver for scheduled local notifications.

## Backend and console setup

1. **iOS (all modes):** enable the Push Notifications capability. The plugin sets the entitlement. Create an APNs auth key (.p8).
2. **Android (all modes):** create a Firebase project, download `google-services.json`, and point `android.googleServicesFile` at it.
3. **Modes 1 and 2:** create a Beams instance in the [Pusher dashboard](https://dashboard.pusher.com/beams), then upload your APNs key and your FCM service account to it.
4. **Mode 2:** add an authenticated endpoint to your backend that returns `{ "token": beamsClient.generateToken(userId) }` (see the [Beams auth docs](https://pusher.com/docs/beams/guides/publish-to-specific-user/)).
5. **Mode 3:** your backend keeps the APNs key and the Firebase service account and calls FCM/APNs itself (examples below).

## Mode 1: Beams interests

```ts
import * as Push from 'expo-pusher-push-notifications';

await Push.start({ instanceId: 'YOUR_BEAMS_INSTANCE_ID', mode: 'interests' });
await Push.subscribe('news');
await Push.setSubscriptions(['news', 'sports']);
console.log(await Push.getSubscriptions());
await Push.unsubscribe('sports');
```

Server (Node):

```js
beams.publishToInterests(['news'], {
  apns: { aps: { alert: { title: 'Hi', body: 'News!' }, sound: 'ding.wav', badge: 3 } },
  fcm: { notification: { title: 'Hi', body: 'News!', sound: 'ding', android_channel_id: 'messages' } },
});
```

## Mode 2: Beams authenticated users

```ts
await Push.start({ instanceId: 'YOUR_BEAMS_INSTANCE_ID', mode: 'users' });

// Recommended: Beams fetches (and refreshes) the token from your endpoint
await Push.setUserId('user-123', {
  url: 'https://api.example.com/pusher/beams-auth',
  headers: { Authorization: `Bearer ${sessionToken}` },
});

// Or, b8ne-compatible: pass a Beams token you already fetched
await Push.setUserId('user-123', beamsTokenString);

// On logout
await Push.clearAllState();
```

Server: `beams.publishToUsers(['user-123'], { apns: {...}, fcm: {...} })`.

## Mode 3: raw device token (direct FCM / APNs, no Beams)

```ts
const token = await Push.start({ mode: 'device' });
// token = { type: 'fcm', platform: 'android', token: 'dYz…' }  or  { type: 'apns', platform: 'ios', token: 'a1b2…' }
await fetch('https://api.example.com/devices', { method: 'POST', body: JSON.stringify(token) });

// Tokens can rotate. Keep your backend up to date:
Push.addListener('registered', ({ deviceToken, type }) => saveToken(type, deviceToken));

// Later
await Push.getDevicePushToken();   // last known token or null
await Push.deleteDevicePushToken(); // on logout (Android: FCM deleteToken, iOS: unregister)
```

Server, FCM HTTP v1 (Android):

```http
POST https://fcm.googleapis.com/v1/projects/<project-id>/messages:send
Authorization: Bearer <OAuth2 token from your service account>

{ "message": { "token": "<fcm token>",
  "notification": { "title": "Hi", "body": "Direct from FCM" },
  "android": { "notification": { "channel_id": "messages", "sound": "ding" } },
  "data": { "orderId": "42" } } }
```

Data-only FCM messages that include `title`/`body` keys in `data` (plus optional `sound`, `android_channel_id`, and `incrementBadge: "true"`) are shown by this module with the right channel and sound, including in the background.

Server, APNs (iOS):

```http
POST https://api.push.apple.com/3/device/<apns hex token>   (api.sandbox.push.apple.com for development)
authorization: bearer <JWT signed with your .p8>
apns-topic: com.you.app
apns-push-type: alert

{ "aps": { "alert": { "title": "Hi", "body": "Direct from APNs" }, "sound": "ding.wav", "badge": 1 }, "orderId": "42" }
```

## Custom sounds (all modes)

1. List the files in the plugin's `sounds` option and run prebuild.
2. **iOS:** put the file name in the payload: `aps.sound = "ding.wav"`. This works for Beams `apns` payloads, raw APNs, and local notifications (`sound: 'ding.wav'`).
3. **Android 8+:** the sound belongs to the **channel**, so create a channel with `sound: 'ding.wav'` (in the plugin or with `createChannel`) and target it with `android_channel_id` / `channel_id` or the local notification's `channelId`. On Android 7 and earlier, the payload's `sound: "ding"` is used. Android cannot change a channel's sound after creation. To change it, delete the channel and create a new one with a new id.

## Notification channels (Android, all modes; no-ops on iOS)

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
- **`incrementBadge` (from b8ne):** add `"incrementBadge": true` under `aps.data` or a top-level `data` (iOS), or `"incrementBadge": "true"` in FCM `data` (Android), and the badge goes up by one on the device. Your backend doesn't need to track counts.

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

## Permissions

`start()` requests permission by default (alert, sound, and badge on iOS; `POST_NOTIFICATIONS` on Android 13+). Pass `requestPermission: false` to ask later with `requestPermission()`. Check the current state with `getPermissionStatus()`.

## API

| Function | Modes | Notes |
|---|---|---|
| `start({ mode?, instanceId?, requestPermission? })` | all | Resolves the device token in `device` mode, otherwise `null`. |
| `getMode()` | all | |
| `subscribe` / `unsubscribe` / `setSubscriptions` / `getSubscriptions` / `clearSubscriptions` | interests (and users) | Work on both platforms. |
| `setUserId(userId, { url, headers?, queryParams? } \| token)` | users | |
| `registerForDeviceToken()` / `getDevicePushToken()` / `deleteDevicePushToken()` | all (main API for `device`) | |
| `requestPermission()` / `getPermissionStatus()` | all | |
| `createChannel` / `deleteChannel` / `getChannels` | all, Android only | |
| `getBadgeCount` / `setBadgeCount` / `incrementBadgeCount` | all | |
| `presentLocalNotification` / `scheduleLocalNotification` / `cancelScheduledNotification` / `cancelAllScheduledNotifications` / `dismissAllNotifications` | all | |
| `getInitialNotification()` | all | |
| `clearAllState()` / `stop()` | all | In `device` mode, `stop()` deletes the device token. |
| `addListener(event, cb)` / `on(event, cb)` | all | Return an `EventSubscription`. |

## Notes

- **iOS:** the module becomes the `UNUserNotificationCenter` delegate so it can show notifications in the foreground and report taps. Don't use it together with another library that also claims the delegate, such as `expo-notifications`.
- **Android:** only one `FirebaseMessagingService` can receive FCM messages. This module's service handles all three modes, so remove other FCM services such as `expo-notifications` or `@react-native-firebase/messaging`'s service.

## Feature parity with the original

Here is what the ZeptInc and b8ne packages had, and where it lives now:

| Original | Here |
|---|---|
| `setInstanceId` / `setAppKey` | `start({ instanceId })` |
| `subscribe` / `unsubscribe` with callbacks | Promise-based. |
| `setSubscriptions` (iOS only), `getSubscriptions` (Android only) | Both on both platforms. |
| `setOnSubscriptionsChangedListener` (Android only) | `subscriptionsChanged` event on both platforms. |
| `setUserId(userId, token, onError, onSuccess)` (b8ne, static token) | `setUserId(userId, token)`. A remote token provider is also supported. |
| `clearAllState` (b8ne) | `clearAllState()` |
| `on('registered' \| 'notification')` | Same, plus `error`, and it returns a removable subscription. |
| iOS foreground / background / opened states | `appState` on every notification. |
| `aps.data.incrementBadge` (b8ne, iOS) | Supported on iOS and Android, plus full badge APIs. |
| Android launch-intent notification delivery (b8ne) | `getInitialNotification()` and an `opened` event on tap. |

Neither original had custom sounds, notification channels, local or scheduled notifications, or a raw-token mode. Those are new here.

### Migrating

Remove the old package, its Carthage framework, and any `RNPusherPushNotifications` code in your AppDelegate and MainApplication. Autolinking, the config plugin, and the Expo AppDelegate subscriber replace them.

## Development

```sh
npm install
npm run build:all   # tsc for src -> build/ and plugin/src -> plugin/build (.js + .d.ts)
npm run typecheck
```

All source is TypeScript (`strict: true`). The only hand-written JS is the one-line `app.plugin.js` shim that Expo requires.

## License

MIT © Baraa Rasheed
