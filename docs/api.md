# Full API

`Interests` and `Users` are thin wrappers over these flat functions. Use whichever you like. The flat ones are kept for people coming from the old packages.

| Function | Used for | Notes |
|---|---|---|
| `start({ instanceId, mode?, requestPermission? })` | everything | `mode` (optional) is the Beams auth path: `interests` (default) or `users`. |
| `getMode()` | everything | |
| `subscribe` / `unsubscribe` / `setSubscriptions` / `getSubscriptions` / `clearSubscriptions` | interests | Work on both platforms. |
| `setUserId(userId, { url, headers?, queryParams? } \| token)` | binding a user | |
| `requestPermission()` / `getPermissionStatus()` | everything | |
| `createChannel` / `deleteChannel` / `getChannels` | Android only | |
| `getBadgeCount` / `setBadgeCount` / `incrementBadgeCount` | everything | |
| `presentLocalNotification` / `scheduleLocalNotification` / `cancelScheduledNotification` / `cancelAllScheduledNotifications` / `dismissAllNotifications` | everything | |
| `getInitialNotification()` | everything | |
| `clearAllState()` / `stop()` | everything | |
| `addListener(event, cb)` / `on(event, cb)` | everything | Return an `EventSubscription`. |


---
[← Back to README](../README.md)
