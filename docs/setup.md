# Setup

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
| `mode` | `interests` | `interests` or `users` for Beams, or `device` for a raw device token. Written to Info.plist and the manifest. You can leave it out. |
| `instanceId` | none | Beams instance ID. Not needed for `device`. |
| `apsEnvironment` | `development` | Sets the `aps-environment` entitlement. Use `production` for TestFlight and App Store builds. |
| `sounds` | `[]` | Sound files to bundle. **Android:** copied to `res/raw` with names lower-cased to `[a-z0-9_]`. **iOS:** copied into the app target and added to its resources. iOS needs `.wav`, `.caf`, or `.aiff` under 30 s. |
| `androidChannels` | `[]` | Channels created at startup. Set `sound` to a file name from `sounds`, or `null` for a silent channel. |
| `androidDefaultChannelId` | first channel, or `default` | Used by FCM/Beams notifications that don't name a channel. Also sets `com.google.firebase.messaging.default_notification_channel_id`. |
| `iosShowInForeground` | `true` | Shows the banner, plays the sound, and updates the badge while the app is in the foreground. |

The plugin also adds the `remote-notification` background mode on iOS. On Android, the library manifest declares one FCM service (it extends the Beams `MessagingService`), the `POST_NOTIFICATIONS` permission, and a receiver for scheduled local notifications.

## Console setup

1. **iOS:** enable the Push Notifications capability. The plugin sets the entitlement. Create an APNs auth key (.p8).
2. **Android:** create a Firebase project, download `google-services.json`, and point `android.googleServicesFile` at it.
3. **Beams path only:** create a Beams instance in the [Pusher dashboard](https://dashboard.pusher.com/beams), then upload your APNs key and your FCM service account to it.

## Permissions

`start()` requests permission by default (alert, sound, and badge on iOS; `POST_NOTIFICATIONS` on Android 13+). Pass `requestPermission: false` to ask later with `requestPermission()`. Check the current state with `getPermissionStatus()`.

## Things that conflict

- **iOS:** the module becomes the `UNUserNotificationCenter` delegate so it can show notifications in the foreground and report taps. Don't use it together with another library that also claims the delegate, such as `expo-notifications`.
- **Android:** only one `FirebaseMessagingService` can receive FCM messages. This module's service handles it, so remove other FCM services such as `expo-notifications` or `@react-native-firebase/messaging`'s service.


---
[← Back to README](../README.md)
