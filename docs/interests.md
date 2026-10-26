# Interests (topics)

Use interests when many devices should get the same push. Think topics: `news`, `order-42`, `team-7`.

## Client

```ts
import { Interests } from 'expo-pusher-push-notifications';

await Interests.start('YOUR_BEAMS_INSTANCE_ID');

await Interests.subscribe('news');
await Interests.set(['news', 'sports']); // replace the whole list
await Interests.get();                   // ['news', 'sports']
await Interests.unsubscribe('sports');
await Interests.clear();

// On sign-out
await Interests.reset();
```

## API

| Call | What it does |
|---|---|
| `Interests.start(instanceId, { requestPermission? })` | Starts Beams. Asks for permission unless you pass `false`. |
| `Interests.subscribe(name)` / `unsubscribe(name)` | Add or remove one interest. |
| `Interests.set(names)` | Replace all interests. |
| `Interests.get()` | Current interests. |
| `Interests.clear()` | Remove all interests. |
| `Interests.reset()` | Wipe Beams state on this device. |
| `Interests.stop()` | Stop Beams. |

Listen for changes with `addListener('subscriptionsChanged', ({ interests }) => …)`.


---
[← Back to README](../README.md)
