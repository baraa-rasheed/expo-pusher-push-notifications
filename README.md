# expo-pusher-push-notifications

[Pusher Beams](https://pusher.com/beams) push notifications for **Expo SDK 58**, built with the Expo Modules API (Swift + Kotlin), autolinking, and a config plugin. It is written in strict TypeScript and ships `.d.ts` declarations.

This is a from-scratch rewrite of [ZeptInc/react-native-pusher-push-notifications](https://github.com/ZeptInc/react-native-pusher-push-notifications), which was forked from b8ne. The old package needs Carthage, manual AppDelegate edits, and a `MessagingService` you wire up yourself. This package uses CocoaPods and autolinking instead, and it hooks into the AppDelegate through an Expo `AppDelegateSubscriber`.

## Two transport modes, both delivered by Pusher

| Mode | How a device is targeted | How your server sends |
|---|---|---|
| `interests` (default) | `subscribe('news')` / `setSubscriptions([...])` | Beams `publishToInterests` |
| `users` | `setUserId(userId, tokenProvider)` (Beams Authenticated Users) | Beams `publishToUsers` |

In both modes the Pusher Beams SDK registers the device and sends the notification. Your code never sends through FCM/APNs directly or through the Expo Push Service. FCM and APNs only carry the message the last hop to the device, as they do for any Beams app. Both modes fire the same events (`notification`, `registered`, `subscriptionsChanged`, `error`). To switch modes, change `mode` in `start()` and in the plugin, then call the matching targeting API.

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
        "mode": "interests",
        "apsEnvironment": "development"
      }]
    ]
  }
}
```

Then run `npx expo prebuild` and build a development build. Expo Go cannot load this native module.

The plugin does the following:
- iOS: adds the `aps-environment` entitlement and the `remote-notification` background mode, and writes `PusherBeamsInstanceId` and `PusherBeamsMode` to Info.plist.
- Android: adds `pusher_beams_instance_id` and `pusher_beams_mode` meta-data. The library manifest declares the Beams FCM `MessagingService` and the `POST_NOTIFICATIONS` permission.

## Pusher Beams setup

1. Create a Beams instance in the [Pusher dashboard](https://dashboard.pusher.com/beams) and copy its **Instance ID**.
2. **iOS:** upload an APNs key (.p8), with its Key ID, Team ID, and bundle ID, to the Beams instance. Enable the Push Notifications capability. The plugin sets the entitlement for you.
3. **Android:** create a Firebase project and upload its FCM server key or service account to Beams. Download `google-services.json` and point `android.googleServicesFile` at it.
4. **Users mode only:** add an authenticated endpoint to your backend that returns `{ "token": beamsClient.generateToken(userId) }` (see the [Beams auth docs](https://pusher.com/docs/beams/guides/publish-to-specific-user/)).

## Usage

```ts
import * as Pusher from 'expo-pusher-push-notifications';

await Pusher.start({ instanceId: 'YOUR_BEAMS_INSTANCE_ID', mode: 'interests' });

const sub = Pusher.addListener('notification', (n) => console.log(n.title, n.body, n.data, n.appState));
Pusher.addListener('registered', ({ deviceToken }) => console.log('registered', deviceToken));
Pusher.addListener('subscriptionsChanged', ({ interests }) => console.log(interests));

// interests mode
await Pusher.subscribe('debug-hello');
await Pusher.setSubscriptions(['news', 'sports']);
console.log(await Pusher.getSubscriptions());
await Pusher.unsubscribe('sports');

// users mode
await Pusher.start({ instanceId: 'YOUR_BEAMS_INSTANCE_ID', mode: 'users' });
await Pusher.setUserId('user-123', {
  url: 'https://api.example.com/pusher/beams-auth',
  headers: { Authorization: `Bearer ${sessionToken}` },
});

// on logout
await Pusher.clearAllState();
sub.remove();
```

## API

| Function | Notes |
|---|---|
| `start({ instanceId, mode? })` | Must be called first. Replaces `setInstanceId` / `setAppKey`. |
| `getMode()` | Returns the current `'interests' \| 'users'` mode. |
| `subscribe(interest)` / `unsubscribe(interest)` | Return Promises. |
| `setSubscriptions(interests)` / `getSubscriptions()` / `clearSubscriptions()` | Work on both platforms. |
| `setUserId(userId, { url, headers?, queryParams? })` | Beams Authenticated Users. |
| `clearAllState()` / `stop()` | Use on logout or to disable notifications. |
| `addListener(event, cb)` / `on(event, cb)` | Return an `EventSubscription`. Call `.remove()` to stop listening. |

## Migrating from react-native-pusher-push-notifications

| Old | New |
|---|---|
| `setInstanceId(id)` (iOS) / `setAppKey(id)` (Android) | `await start({ instanceId: id })` |
| `subscribe(i, onError, onSuccess)` | `await subscribe(i)` with try/catch |
| `unsubscribe(i, onError, onSuccess)` | `await unsubscribe(i)` |
| `setSubscriptions` (iOS only) | `await setSubscriptions([...])` on both platforms |
| `getSubscriptions(onSuccess, onError)` (Android only) | `await getSubscriptions()` on both platforms |
| `setOnSubscriptionsChangedListener(cb)` (Android only) | `addListener('subscriptionsChanged', cb)` |
| `on('notification' \| 'registered', cb)` | Same, and it now returns a removable subscription |
| Carthage + AppDelegate edits, manual `MessagingService` | Remove them. Autolinking, the plugin, and the AppDelegate subscriber replace them. |

Also remove the old package, its Carthage framework, and any `RNPusherPushNotifications` code from your AppDelegate and MainApplication.

## Development

```sh
npm install
npm run build:all   # tsc for src -> build/ and plugin/src -> plugin/build (.js + .d.ts)
```

All source is TypeScript (`strict: true`). The only hand-written JS is the one-line `app.plugin.js` shim that Expo requires to find the plugin.

## License

MIT © Baraa Rasheed
