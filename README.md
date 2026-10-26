# expo-pusher-push-notifications

Pusher Beams push notifications for Expo (SDK 58+). Custom sounds included.

```sh
npx expo install expo-pusher-push-notifications
```

Expo Go can't load native modules, so you'll need a dev build. See [Setup](docs/setup.md).

## Pick one mode

| You want to… | Use | Needs |
|---|---|---|
| Send to everyone following a topic (`news`, `order-42`) | [**Interests**](docs/interests.md) | Pusher Beams |
| Send to a signed-in user on all their devices | [**Users**](docs/users.md) | Pusher Beams + one auth endpoint |

Each mode has its own object. Use one, ignore the other.

### Interests

```ts
import { Interests } from 'expo-pusher-push-notifications';

await Interests.start('YOUR_BEAMS_INSTANCE_ID');
await Interests.subscribe('news');
```

### Users

```ts
import { Users } from 'expo-pusher-push-notifications';

await Users.start('YOUR_BEAMS_INSTANCE_ID');
await Users.login('user-123', { url: 'https://api.example.com/beams-auth' });
// sign-out: await Users.logout();
```

## Works in both modes

```ts
import { addListener, createChannel, setBadgeCount, scheduleLocalNotification } from 'expo-pusher-push-notifications';

addListener('notification', (n) => console.log(n.title, n.appState)); // foreground | background | opened
await createChannel({ id: 'alarms', name: 'Alarms', importance: 'max', sound: 'alarm.wav' }); // Android
await setBadgeCount(3);
await scheduleLocalNotification({ title: 'Stand up', seconds: 600, sound: 'alarm.wav' });
```

Bundle sounds with the config plugin:

```json
["expo-pusher-push-notifications", { "sounds": ["./assets/alarm.wav"] }]
```

More: [sounds, channels, badges, local notifications](docs/extras.md).

## Docs

- [Setup](docs/setup.md): install, config plugin options, Firebase / APNs / Beams console steps
- [Interests](docs/interests.md) · [Users](docs/users.md)
- [Sounds, channels, badges, local notifications](docs/extras.md)
- [Full API](docs/api.md)
- [Migrating from react-native-pusher-push-notifications](docs/migrating.md)

## Heads up

- On iOS this module owns the notification delegate, and on Android it owns the FCM service. Don't run it alongside `expo-notifications` or `@react-native-firebase/messaging`.
- Want a raw FCM / APNs token to send from your own server, without Beams? That's not what this package is for. Use [`expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications/) and `getDevicePushTokenAsync()`.
- Need realtime Pusher **Channels** (websockets)? That's a different product. Use [`pusher-js`](https://github.com/pusher/pusher-js); it works in Expo as is.

## License

MIT © [Baraa Rasheed](https://github.com/baraa-rasheed)
