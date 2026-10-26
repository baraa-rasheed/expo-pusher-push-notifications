# expo-pusher-push-notifications

Push notifications for Expo and React Native. Two ways to use it:

1. **Pusher Beams** — subscribe devices to interests (topics) and/or bind them to your signed-in users. Uses [Pusher Beams](https://pusher.com/beams).
2. **Device token** — get the raw FCM (Android) / APNs (iOS) token for your own push path. No Beams, no `expo-notifications`, no EAS.

Both get custom sounds, Android channels, badges, and local notifications.

```sh
npx expo install expo-pusher-push-notifications
```

Needs Expo SDK 58+ and a development build (Expo Go can't load native modules).

## Quick start

Add the config plugin to `app.json`:

```json
["expo-pusher-push-notifications", { "instanceId": "YOUR_BEAMS_INSTANCE_ID" }]
```

Then in your app:

```ts
import { Interests } from 'expo-pusher-push-notifications';

await Interests.start('YOUR_BEAMS_INSTANCE_ID');
await Interests.subscribe('news');
```

That device now gets pushes sent to `news`. Full console steps (APNs, Firebase, Beams) are in [Setup](docs/setup.md).

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
