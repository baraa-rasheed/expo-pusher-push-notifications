# Bind a device to a user

> Before you start: finish the [Prerequisites](setup.md#prerequisites) (Firebase + APNs, plus a Beams instance).

Bind the device to the signed-in user so pushes for that user reach every device they're signed in on. Call `Users.login` after your own sign-in, and `Users.logout` on sign-out.

## In the app

```ts
import { Users } from 'expo-pusher-push-notifications';

await Users.start('YOUR_BEAMS_INSTANCE_ID');

// After your own sign-in. Pass your Beams token provider URL (and headers, if it needs them).
await Users.login('user-123', {
  url: 'YOUR_BEAMS_TOKEN_URL',
  headers: { Authorization: `Bearer ${sessionToken}` },
});

// Or pass a Beams token you already fetched
await Users.login('user-123', beamsToken);

// On sign-out
await Users.logout();
```

## API

| Call | What it does |
|---|---|
| `Users.start(instanceId, { requestPermission? })` | Starts Beams. |
| `Users.login(userId, auth)` | `auth` is `{ url, headers?, queryParams? }` or a token string. |
| `Users.logout()` | Unbinds the device from the user. |
| `Users.stop()` | Stop Beams. |

You can still subscribe to interests on a device that's bound to a user.


---
[← Back to README](../README.md)
