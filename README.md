# expo-pusher-push-notifications

Push notifications for Expo and React Native, powered by [Pusher Beams](https://pusher.com/beams). Subscribe devices to topics, bind them to your signed-in users, and get custom sounds, Android channels, badges, and local notifications along the way.

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

That device now gets anything your server publishes to `news`. Full console steps (APNs, Firebase, Beams) are in [Setup](docs/setup.md).

## Subscribe to interests (topics)

Interests are topics like `news`, `order-42`, or `team-7`. Every device subscribed to one gets the push.

```ts
await Interests.subscribe('order-42');
await Interests.unsubscribe('order-42');
```

More in [Interests](docs/interests.md).

## Bind a device to a user

When your backend thinks in user ids ("send this to user-123"), bind the device to the signed-in user. Beams asks your API for an auth token, so you need one small endpoint on your server.

```ts
import { Users } from 'expo-pusher-push-notifications';

await Users.start('YOUR_BEAMS_INSTANCE_ID');

// after your own sign-in
await Users.login('user-123', {
  url: 'https://api.example.com/pusher/beams-auth',
  headers: { Authorization: `Bearer ${sessionToken}` },
});

// on sign-out
await Users.logout();
```

You can use interests and users together. See [Authenticate users](docs/users.md) for the server side.

## Send from your server

```js
import PushNotifications from '@pusher/push-notifications-server';
const beams = new PushNotifications({ instanceId, secretKey });

await beams.publishToInterests(['news'], payload);  // everyone on a topic
await beams.publishToUsers(['user-123'], payload);  // one user, all their devices
```

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
- [Authenticate users](docs/users.md)
- [Sounds, channels, badges, local notifications](docs/extras.md)
- [Full API](docs/api.md)
- [Migrating from react-native-pusher-push-notifications](docs/migrating.md)

## Good to know

- This module owns the iOS notification delegate and the Android FCM service, so don't run it alongside `expo-notifications` or `@react-native-firebase/messaging`.
- Want a raw FCM / APNs token without Beams? Use [`expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications/) instead.
- Need realtime Pusher **Channels** (websockets)? Use [`pusher-js`](https://github.com/pusher/pusher-js).

## License

MIT © [Baraa Rasheed](https://github.com/baraa-rasheed)
