# Full API

The mode objects (`Interests`, `Users`) are thin wrappers over these flat functions. Use whichever you like. The flat ones are kept for people coming from the old packages.

| Function | Modes | Notes |
|---|---|---|
| `start({ instanceId, mode?, requestPermission? })` | all | `mode` is `interests` (default) or `users`. |
| `getMode()` | all | |
| `subscribe` / `unsubscribe` / `setSubscriptions` / `getSubscriptions` / `clearSubscriptions` | interests (and users) | Work on both platforms. |
| `setUserId(userId, { url, headers?, queryParams? } \| token)` | users | |
| `requestPermission()` / `getPermissionStatus()` | all | |
| `createChannel` / `deleteChannel` / `getChannels` | all, Android only | |
| `getBadgeCount` / `setBadgeCount` / `incrementBadgeCount` | all | |
| `presentLocalNotification` / `scheduleLocalNotification` / `cancelScheduledNotification` / `cancelAllScheduledNotifications` / `dismissAllNotifications` | all | |
| `getInitialNotification()` | all | |
| `clearAllState()` / `stop()` | all | |
| `addListener(event, cb)` / `on(event, cb)` | all | Return an `EventSubscription`. |


---
[← Back to README](../README.md)
