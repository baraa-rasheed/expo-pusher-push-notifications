# expo-pusher-push-notifications

Push notifications for Expo and React Native. Two ways to use it:

1. **Pusher Beams** — subscribe devices to interests (topics) and/or bind them to your signed-in users. Uses [Pusher Beams](https://pusher.com/beams).
2. **Device token** — get the raw FCM (Android) / APNs (iOS) token for your own push path. No Beams, no `expo-notifications`, no EAS.

Both get custom sounds, Android channels, badges, and local notifications.

## Prerequisites

Do these before installing. Which ones you need depends on your path.

**Android (all paths)**

1. Create a project in the [Firebase console](https://console.firebase.google.com) and add an Android app with your `android.package`.
2. Download `google-services.json` into your project and set `"android": { "googleServicesFile": "./google-services.json" }` in `app.json`.
3. Beams path only: in Firebase → Project settings → Service accounts, generate a private key (JSON). You'll upload it to Beams.

**Apple (all paths)**

1. In your Apple Developer account, enable the **Push Notifications** capability on your App ID (`ios.bundleIdentifier`).
2. Create an **APNs auth key (.p8)** under Keys (note the Key ID and Team ID). A .p12 certificate works too, but the key is simpler and doesn't expire.
3. Set `apsEnvironment` in the plugin: `development` for dev builds, `production` for TestFlight / App Store. The plugin writes the `aps-environment` entitlement for you.

**Beams (Interests / Users paths only)**

Create a Beams instance in the [Pusher dashboard](https://dashboard.pusher.com/beams), upload your APNs key and FCM service account JSON, and copy the instance ID. Skip this entirely for the device-token path.

Full details in [Setup](docs/setup.md).

## Install

```sh
npx expo install expo-pusher-push-notifications
```

Needs Expo SDK 58+ and a development build (Expo Go can't load native modules). Run `npx expo prebuild` after adding the plugin.

## Getting started

Pick the path that matches how you send pushes. You can combine Interests and Users; DeviceToken is for when you don't use Beams at all.

### Interests (Beams topics)

`app.json`:

```json
["expo-pusher-push-notifications", { "instanceId": "YOUR_BEAMS_INSTANCE_ID" }]
```

```ts
import { Interests } from 'expo-pusher-push-notifications';

await Interests.start('YOUR_BEAMS_INSTANCE_ID');
await Interests.subscribe('news');
```

That device now gets pushes sent to `news`.

### Users (Beams, bind to your signed-in user)

`app.json`:

```json
["expo-pusher-push-notifications", { "instanceId": "YOUR_BEAMS_INSTANCE_ID", "mode": "users" }]
```

```ts
import { Users } from 'expo-pusher-push-notifications';

await Users.start('YOUR_BEAMS_INSTANCE_ID');
// after your own sign-in; url = your Beams token provider
await Users.login('user-123', {
  url: 'YOUR_BEAMS_TOKEN_URL',
  headers: { Authorization: `Bearer ${sessionToken}` },
});
```

That user now gets pushes on every device they're signed in on.

### DeviceToken (no Beams)

`app.json` — no `instanceId`:

```json
["expo-pusher-push-notifications", { "mode": "device" }]
```

```ts
import { DeviceToken } from 'expo-pusher-push-notifications';

const { type, token } = await DeviceToken.start(); // type: 'fcm' | 'apns'
// send token to your backend, which pushes via FCM / APNs directly
```

## Path 1: Pusher Beams

### Subscribe to interests (topics)

Interests are topics like `news`, `order-42`, or `team-7`. Every device subscribed to one gets the push.

```ts
await Interests.subscribe('order-42');
await Interests.unsubscribe('order-42');
```

More in [Interests](docs/interests.md).

### Bind a device to a user

To get pushes meant for a specific signed-in user on all their devices, bind the device to that user.

```ts
import { Users } from 'expo-pusher-push-notifications';

await Users.start('YOUR_BEAMS_INSTANCE_ID');

// after your own sign-in (url = your Beams token provider)
await Users.login('user-123', {
  url: 'YOUR_BEAMS_TOKEN_URL',
  headers: { Authorization: `Bearer ${sessionToken}` },
});

// on sign-out
await Users.logout();
```

You can use interests and users together. More in [Users](docs/users.md).

## Path 2: Device token

No Beams instance needed (leave `instanceId` out of the plugin config).

```ts
import { DeviceToken } from 'expo-pusher-push-notifications';

const token = await DeviceToken.start(); // { type: 'fcm' | 'apns', platform, token }
DeviceToken.onChange((t) => { /* token rotated */ });
await DeviceToken.delete(); // on sign-out
```

You get the token in the app; sending it to your backend and pushing from there is up to you. More in [Device token](docs/direct.md).

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
