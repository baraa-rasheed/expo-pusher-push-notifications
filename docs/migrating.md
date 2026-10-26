# Migrating from react-native-pusher-push-notifications

Covers [`b8ne/react-native-pusher-push-notifications`](https://github.com/b8ne/react-native-pusher-push-notifications) (and its forks such as ZeptInc / pusher-community) → `expo-pusher-push-notifications` **0.5.x**.

> **This is not a drop-in replacement.** The API is promise-based, start-up is a single `start()`/`Interests.start()` call, and native setup moves from hand-edited AppDelegate/MainApplication code to an Expo config plugin. Budget a small refactor, not a package swap.

Using an AI agent? Point it at [`skills/migrate-from-b8ne/SKILL.md`](../skills/migrate-from-b8ne/SKILL.md) (shipped in the npm package).

## 1. Install / remove

```sh
npm uninstall react-native-pusher-push-notifications
npx expo install expo-pusher-push-notifications
```

Requires an Expo dev build / prebuild (not Expo Go). Bare RN apps need `expo` modules installed (`npx install-expo-modules`).

## 2. Native setup: config plugin instead of AppDelegate edits

| Old (manual) | New |
|---|---|
| Carthage/CocoaPods `PushNotifications` framework, `RNPusherPushNotifications` imports | Autolinking (pods pulled automatically) |
| AppDelegate: `didRegisterForRemoteNotificationsWithDeviceToken` → `[[RNPusherPushNotifications alloc] setDeviceToken:]`, `didReceiveRemoteNotification` forwarding | Expo AppDelegate subscriber in this module – **delete** those lines |
| Android: `google-services.json` + gradle plugin lines, `MainApplication` / manifest service edits | Plugin config + `android.googleServicesFile` in app.json |
| Push capability / background modes toggled in Xcode | Added by the plugin on prebuild |

```json
{
  "expo": {
    "android": { "googleServicesFile": "./google-services.json" },
    "plugins": [["expo-pusher-push-notifications", { "instanceId": "YOUR_BEAMS_INSTANCE_ID" }]]
  }
}
```

Then `npx expo prebuild --clean`. See [Setup](setup.md).

## 3. API mapping

| b8ne / forks | expo-pusher-push-notifications 0.5 |
|---|---|
| `import RNPusherPushNotifications from 'react-native-pusher-push-notifications'` | `import { Interests, Users, on } from 'expo-pusher-push-notifications'` |
| `setInstanceId(id)` (+ `setAppKey` on some forks) | `await Interests.start(id)` or `await start({ instanceId: id })` |
| `subscribe(interest, onError, onSuccess)` | `await Interests.subscribe(interest)` (try/catch) |
| `unsubscribe(interest, onError, onSuccess)` | `await Interests.unsubscribe(interest)` |
| `setSubscriptions(arr)` (iOS only) | `await Interests.set(arr)` (both platforms) |
| `getSubscriptions(cb)` (Android only) | `const list = await Interests.get()` |
| `setOnSubscriptionsChangedListener(cb)` | `on('subscriptionsChanged', cb)` |
| `setUserId(userId, token, onError, onSuccess)` | `await Users.start(id)` then `await Users.login(userId, token)` — or pass `{ url, headers }` token provider instead of a static token |
| `clearAllState()` | `await Users.logout()` / `Interests.reset()` / `clearAllState()` |
| `on('registered', cb)` | `const sub = on('registered', cb)`; later `sub.remove()` |
| `on('notification', cb)` with iOS `appState` | Same; `appState` on both platforms; also `opened` and `error` events |
| Android launch-intent delivery | `await getInitialNotification()` + `on('opened', …)` |
| `aps.data.incrementBadge` | Supported both platforms + `setBadgeCount` / `incrementBadgeCount` |
| _(none)_ | Sounds, Android channels, local/scheduled notifications, raw device tokens (`DeviceToken`) |

### Before / after

```ts
// before
RNPusherPushNotifications.setInstanceId(INSTANCE_ID);
RNPusherPushNotifications.on('registered', () => {
  RNPusherPushNotifications.subscribe('news', err => console.warn(err), () => console.log('ok'));
});
RNPusherPushNotifications.on('notification', n => handle(n));

// after
import { Interests, on } from 'expo-pusher-push-notifications';
const sub = on('notification', n => handle(n));
await Interests.start(INSTANCE_ID);   // no need to wait for 'registered'
await Interests.subscribe('news');
// cleanup: sub.remove();
```

```ts
// users — before
RNPusherPushNotifications.setUserId(userId, beamsToken, onError, onSuccess);
// after
await Users.start(INSTANCE_ID);
await Users.login(userId, { url: 'https://api.example.com/beams-token', headers: { Authorization: `Bearer ${jwt}` } });
// sign-out
await Users.logout();
```

## 4. Gotchas

- Notification payload shape may differ slightly; log one and update field access (`n.title`, `n.body`, `n.data`).
- Don't run alongside `expo-notifications` or `@react-native-firebase/messaging` (this module owns the delegate/FCM service).
- `start()` requests notification permission by default; pass `{ requestPermission: false }` to control it yourself.
- Calling Beams APIs before `start()` throws.

## Coming from 0.4

0.5 brings back device-token support (`DeviceToken`, `registerForDeviceToken`, `getDevicePushToken`, `deleteDevicePushToken`, `mode: 'device'`). Beams code from 0.4 is unchanged.

---
[← Back to README](../README.md)
