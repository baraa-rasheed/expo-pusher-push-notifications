# Migrating from react-native-pusher-push-notifications

This is a rewrite of [ZeptInc/react-native-pusher-push-notifications](https://github.com/ZeptInc/react-native-pusher-push-notifications) (itself a fork of [b8ne's](https://github.com/b8ne/react-native-pusher-push-notifications)).

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

Neither original had custom sounds, notification channels, or local and scheduled notifications. Those are new here.

## Coming from 0.3

0.4 removes raw device-token support (`DeviceToken`, `registerForDeviceToken`, `getDevicePushToken`, `deleteDevicePushToken`, and `mode: 'device'`). This package is Pusher Beams only now. If you need a raw FCM / APNs token for your own server, use [`expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications/) and `getDevicePushTokenAsync()` instead.

## Steps

Remove the old package, its Carthage framework, and any `RNPusherPushNotifications` code in your AppDelegate and MainApplication. Autolinking, the config plugin, and the Expo AppDelegate subscriber replace them.


---
[← Back to README](../README.md)
