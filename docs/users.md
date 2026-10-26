# Bind a device to a user

When your backend thinks in user ids ("send this to user-123"), bind the device to the signed-in user and Beams will deliver to every device they're signed in on.

How it works: after your own sign-in, the app calls `Users.login(userId, …)`. Beams then asks **your API** for a short-lived auth token, which proves this user really is `user-123`. So you need one authenticated endpoint on your server.

## In the app

```ts
import { Users } from 'expo-pusher-push-notifications';

await Users.start('YOUR_BEAMS_INSTANCE_ID');

// After your own sign-in. Beams calls this URL and refreshes the token for you.
await Users.login('user-123', {
  url: 'https://api.example.com/pusher/beams-auth',
  headers: { Authorization: `Bearer ${sessionToken}` },
});

// Or pass a Beams token you already fetched
await Users.login('user-123', beamsToken);

// On sign-out
await Users.logout();
```

## On your server (Node)

```js
// GET /pusher/beams-auth  (must be authenticated, and user_id must match the session)
app.get('/pusher/beams-auth', requireSession, (req, res) => {
  res.json(beams.generateToken(req.user.id)); // { token: '…' }
});

// Send
await beams.publishToUsers(['user-123'], {
  apns: { aps: { alert: { title: 'Hey', body: 'You have a new message' }, sound: 'ding.wav' } },
  fcm: { notification: { title: 'Hey', body: 'You have a new message', android_channel_id: 'messages' } },
});
```

See Pusher's [auth guide](https://pusher.com/docs/beams/guides/publish-to-specific-user/).

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
