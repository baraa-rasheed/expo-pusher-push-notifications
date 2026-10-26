# Setup

## Prerequisites

Set these up first. Android and Apple steps apply to every path; the Beams step only to Interests / Users.

### Android: Firebase / FCM

1. Create a project in the [Firebase console](https://console.firebase.google.com).
2. Add an Android app whose package name matches `android.package` in `app.json`.
3. Download `google-services.json`, put it in your project root, and set `"android": { "googleServicesFile": "./google-services.json" }`.
4. **Beams only:** Project settings → Service accounts → *Generate new private key*. Keep the JSON for the Beams dashboard.

### Apple: APNs

1. In [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list), open your App ID (`ios.bundleIdentifier`) and enable **Push Notifications**.
2. Under Keys, create a key with **Apple Push Notifications service (APNs)** enabled. Download the `.p8` and note the Key ID and your Team ID. (A `.p12` APNs certificate also works, but certificates expire yearly.)
3. Choose `apsEnvironment` in the plugin config: `development` for dev builds, `production` for TestFlight and the App Store. The plugin writes the `aps-environment` entitlement and the `remote-notification` background mode — you don't edit Xcode by hand.
4. Test on a real device; the iOS simulator doesn't get APNs tokens reliably.

### Beams (Interests / Users only)

Create an instance in the [Pusher dashboard](https://dashboard.pusher.com/beams), upload the APNs key (with Key ID / Team ID) and the FCM service account JSON, and copy the instance ID. For the device-token path, skip this — your backend talks to FCM / APNs with those same credentials.

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

Leave out `instanceId` (and set `"mode": "device"`) if you use the device-token path.

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

## Start, per path

The Beams paths (Interests, Users) and the DeviceToken path are independent: use either or both. To use both, start Beams and call `registerForDeviceToken()` (works in any mode) instead of `DeviceToken.start()`.

| Path | Plugin config | First call |
|---|---|---|
| Interests | `instanceId` | `Interests.start(instanceId)` then `Interests.subscribe('news')` — see [Interests](interests.md) |
| Users | `instanceId`, `mode: "users"` | `Users.start(instanceId)` then `Users.login(userId, tokenProvider)` after sign-in — see [Users](users.md) |
| DeviceToken | `mode: "device"`, no `instanceId` | `DeviceToken.start()` → send `token` to your backend — see [Device token](direct.md) |

## Permissions

`start()` requests permission by default (alert, sound, and badge on iOS; `POST_NOTIFICATIONS` on Android 13+). Pass `requestPermission: false` to ask later with `requestPermission()`. Check the current state with `getPermissionStatus()`.

## Things that conflict

- **iOS:** the module becomes the `UNUserNotificationCenter` delegate so it can show notifications in the foreground and report taps. Don't use it together with another library that also claims the delegate, such as `expo-notifications`.
- **Android:** only one `FirebaseMessagingService` can receive FCM messages. This module's service handles it, so remove other FCM services such as `expo-notifications` or `@react-native-firebase/messaging`'s service.


---
[← Back to README](../README.md)
