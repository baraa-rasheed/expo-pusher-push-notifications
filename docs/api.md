# Full API

`Interests`, `Users` and `DeviceToken` are thin wrappers over these flat functions. Use whichever you like. The flat ones are kept for people coming from the old packages.

| Function | Used for | Notes |
|---|---|---|
| `start({ instanceId?, mode?, requestPermission? })` | everything | `mode`: `interests` (default) or `users` for Beams, `device` for a raw token (no `instanceId`). Resolves the token in `device` mode, otherwise `null`. |
| `getMode()` | everything | |
| `subscribe` / `unsubscribe` / `setSubscriptions` / `getSubscriptions` / `clearSubscriptions` | interests | Work on both platforms. |
| `setUserId(userId, { url, headers?, queryParams? } \| token)` | binding a user | |
| `registerForDeviceToken()` / `getDevicePushToken()` / `deleteDevicePushToken()` | device token | |
| `requestPermission()` / `getPermissionStatus()` | everything | |
| `createChannel` / `deleteChannel` / `getChannels` | Android only | |
| `getBadgeCount` / `setBadgeCount` / `incrementBadgeCount` | everything | |
| `presentLocalNotification` / `scheduleLocalNotification` / `cancelScheduledNotification` / `cancelAllScheduledNotifications` / `dismissAllNotifications` | everything | |
| `getInitialNotification()` | everything | |
| `clearAllState()` / `stop()` | everything | In `device` mode, `stop()` deletes the device token. |
| `addListener(event, cb)` / `on(event, cb)` | everything | Return an `EventSubscription`. |


---
[← Back to README](../README.md)
