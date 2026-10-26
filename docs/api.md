# Full API

The mode objects (`Interests`, `Users`, `DeviceToken`) are thin wrappers over these flat functions. Use whichever you like. The flat ones are kept for people coming from the old packages.

| Function | Modes | Notes |
|---|---|---|
| `start({ mode?, instanceId?, requestPermission? })` | all | Resolves the device token in `device` mode, otherwise `null`. |
| `getMode()` | all | |
| `subscribe` / `unsubscribe` / `setSubscriptions` / `getSubscriptions` / `clearSubscriptions` | interests (and users) | Work on both platforms. |
| `setUserId(userId, { url, headers?, queryParams? } \| token)` | users | |
| `registerForDeviceToken()` / `getDevicePushToken()` / `deleteDevicePushToken()` | all (main API for `device`) | |
| `requestPermission()` / `getPermissionStatus()` | all | |
| `createChannel` / `deleteChannel` / `getChannels` | all, Android only | |
| `getBadgeCount` / `setBadgeCount` / `incrementBadgeCount` | all | |
| `presentLocalNotification` / `scheduleLocalNotification` / `cancelScheduledNotification` / `cancelAllScheduledNotifications` / `dismissAllNotifications` | all | |
| `getInitialNotification()` | all | |
| `clearAllState()` / `stop()` | all | In `device` mode, `stop()` deletes the device token. |
| `addListener(event, cb)` / `on(event, cb)` | all | Return an `EventSubscription`. |


---
[← Back to README](../README.md)
