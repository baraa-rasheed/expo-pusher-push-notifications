# expo-pusher-push-notifications

Push notifications for Expo and React Native, with two independent paths:

- **Pusher Beams** — subscribe devices to interests (topics) and/or bind them to your signed-in users. Uses [Pusher Beams](https://pusher.com/beams).
- **Device token** — get the raw FCM (Android) / APNs (iOS) token for your own push path. No Beams, no `expo-notifications`, no EAS.

Both get custom sounds, Android channels, badges, and local notifications.

You can use **either or both**: Beams only, device token only, or Beams and device token together in the same app. The two paths are independent, and each section below is self-contained, so follow only the one(s) you need.

## Prerequisites

Links only; set up what your path needs.

- [Android: Firebase / FCM setup](https://firebase.google.com/docs/android/setup) — create a Firebase project and add `google-services.json` (all paths).
- [Apple: APNs setup](https://developer.apple.com/documentation/usernotifications/registering-your-app-with-apns) — enable Push Notifications and create an APNs key (all paths).
- [Pusher Beams instance setup](https://pusher.com/docs/beams/getting-started/create-instance/) — create an instance and upload your FCM / APNs credentials (Beams path only).

More detail in [Setup](docs/setup.md#prerequisites).

## Install

```sh
npx expo install expo-pusher-push-notifications
```

Needs Expo SDK 58+ and a development build (Expo Go can't load native modules). Run `npx expo prebuild` after adding the plugin.

## Beams path

Use Pusher Beams to push to topics (interests) and/or to your signed-in users.

1. **Add the plugin with your Beams instance ID** in `app.json`. Add `"mode": "users"` if you bind users (interests still work in that mode):

   ```json
   ["expo-pusher-push-notifications", { "instanceId": "YOUR_BEAMS_INSTANCE_ID", "apsEnvironment": "development" }]
   ```

2. **Prebuild and build** a development build: `npx expo prebuild`.

3. **Start Beams and subscribe to interests** (topics like `news`, `order-42`):

   ```ts
   import { Interests } from 'expo-pusher-push-notifications';

   await Interests.start('YOUR_BEAMS_INSTANCE_ID'); // asks for permission
   await Interests.subscribe('news');
   await Interests.unsubscribe('news');
   ```

4. **Bind the device to your signed-in user** (optional), so pushes for that user reach all their devices:

   ```ts
   import { Users } from 'expo-pusher-push-notifications';

   await Users.start('YOUR_BEAMS_INSTANCE_ID');
   // after your own sign-in; url = your Beams token provider
   await Users.login('user-123', {
     url: 'YOUR_BEAMS_TOKEN_URL',
     headers: { Authorization: `Bearer ${sessionToken}` },
   });
   ```

5. **On sign-out**, clear state:

   ```ts
   await Users.logout();
   await Interests.reset();
   ```

6. **Send pushes** from your server with the Beams API (to interests or user IDs).

More in [Interests](docs/interests.md) and [Users](docs/users.md).

## Device token path

Get the raw FCM (Android) / APNs (iOS) token and push from your own backend. No Beams, no `expo-notifications`, no EAS.

1. **Add the plugin** in `app.json` with `"mode": "device"` and no `instanceId`:

   ```json
   ["expo-pusher-push-notifications", { "mode": "device", "apsEnvironment": "development" }]
   ```

2. **Prebuild and build** a development build: `npx expo prebuild`.

3. **Get the token** and send it to your backend:

   ```ts
   import { DeviceToken } from 'expo-pusher-push-notifications';

   const token = await DeviceToken.start(); // { type: 'fcm' | 'apns', platform, token }
   await api.saveDevice(token);
   ```

4. **Keep it fresh** — tokens rotate:

   ```ts
   DeviceToken.onChange((t) => api.saveDevice(t));
   ```

5. **On sign-out**, delete it: `await DeviceToken.delete();`

6. **Send pushes** from your backend directly to FCM / APNs with that token.

More in [Device token](docs/direct.md).

## Using both together

Follow the Beams path, then also grab the raw token. `registerForDeviceToken()` works in any mode, so it doesn't stop Beams:

```ts
import { Interests, registerForDeviceToken, DeviceToken } from 'expo-pusher-push-notifications';

await Interests.start('YOUR_BEAMS_INSTANCE_ID');
await Interests.subscribe('news');

const token = await registerForDeviceToken(); // raw FCM / APNs token
await api.saveDevice(token);
DeviceToken.onChange((t) => api.saveDevice(t));
```

Keep the plugin config from the Beams path (with `instanceId`). Don't call `DeviceToken.start()` here, as that switches the module to device-only mode.

## Extras

```ts
import { addListener, createChannel, setBadgeCount, scheduleLocalNotification } from 'expo-pusher-push-notifications';

addListener('notification', (n) => console.log(n.title, n.appState)); // foreground | background | opened
await createChannel({ id: 'alarms', name: 'Alarms', importance: 'max', sound: 'alarm.wav' }); // Android
await setBadgeCount(3);
await scheduleLocalNotification({ title: 'Stand up', seconds: 600, sound: 'alarm.wav' });
```

Custom sounds go in the plugin's `sounds` option. Details in [Extras](docs/extras.md).

## Docs

- [Setup](docs/setup.md)
- [Interests](docs/interests.md)
- [Users](docs/users.md)
- [Device token](docs/direct.md)
- [Sounds, channels, badges, local notifications](docs/extras.md)
- [Full API](docs/api.md)
- [Migrating from react-native-pusher-push-notifications](docs/migrating.md)

## Agent migration

Migrating from `react-native-pusher-push-notifications` (b8ne / forks) with Cursor, Claude, Grok or another coding agent? Tell it:

> Follow `node_modules/expo-pusher-push-notifications/skills/migrate-from-b8ne/SKILL.md` to migrate this app.

The skill has the inventory commands, search/replace table, native cleanup steps and a checklist. Human version: [Migrating](docs/migrating.md). Copy it into `.cursor/skills/` or `.claude/skills/` to make it auto-discoverable.

## Good to know

- This module owns the iOS notification delegate and the Android FCM service, so don't run it alongside `expo-notifications` or `@react-native-firebase/messaging`.
- Need realtime Pusher **Channels** (websockets)? Use [`pusher-js`](https://github.com/pusher/pusher-js).

## License

MIT © [Baraa Rasheed](https://github.com/baraa-rasheed)
