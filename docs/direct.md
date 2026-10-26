# Mode 3: direct FCM / APNs (no Pusher)

**Use this when** your server already sends to FCM and APNs itself, or you use some other push provider.
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

## Server

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

## API

| Call | What it does |
|---|---|
| `DeviceToken.start({ requestPermission? })` | Registers with FCM/APNs, resolves the token. |
| `DeviceToken.get()` | Last known token or `null`. |
| `DeviceToken.onChange(cb)` | Fires when the token is issued or rotated. |
| `DeviceToken.delete()` | Android: FCM `deleteToken`. iOS: unregister. |


---
[← Back to README](../README.md)
