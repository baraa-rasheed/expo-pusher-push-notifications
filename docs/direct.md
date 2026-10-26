# Device token (raw FCM / APNs, no Beams)

> Before you start: finish the [Prerequisites](setup.md#prerequisites) (Firebase + APNs; no Beams instance needed).

**Use this when** your app has its own push path: your backend (or another provider) sends to FCM and APNs directly.
No Beams instance needed. You get the raw native token and do what you want with it.

## Client

```ts
import { DeviceToken } from 'expo-pusher-push-notifications';

const token = await DeviceToken.start();
// { type: 'fcm', platform: 'android', token: 'dYz…' }
// { type: 'apns', platform: 'ios', token: 'a1b2…' }
await api.saveDevice(token);

// Tokens rotate. Keep your backend in sync.
DeviceToken.onChange((t) => api.saveDevice(t));

await DeviceToken.get();    // last known token, or null
await DeviceToken.delete(); // on sign-out
```

Calling a Beams function (`Interests.*`, `Users.*`) in this mode throws.

## Sending

Your backend stores the token and sends to FCM (Android) or APNs (iOS) itself. This module only gets the token and shows the notifications it receives; it doesn't need Beams, `expo-notifications`, or EAS.

Data-only FCM messages with `title`/`body` in `data` (plus optional `sound`, `android_channel_id`, `incrementBadge: "true"`) are shown with the right channel and sound, including in the background.

## API

| Call | What it does |
|---|---|
| `DeviceToken.start({ requestPermission? })` | Registers with FCM/APNs, resolves the token. |
| `DeviceToken.get()` | Last known token or `null`. |
| `DeviceToken.onChange(cb)` | Fires when the token is issued or rotated. |
| `DeviceToken.delete()` | Android: FCM `deleteToken`. iOS: unregister. |


---
[← Back to README](../README.md)
