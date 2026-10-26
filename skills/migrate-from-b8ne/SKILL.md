---
name: migrate-from-b8ne
description: Migrate a React Native / Expo app from react-native-pusher-push-notifications (b8ne, ZeptInc, pusher-community forks) to expo-pusher-push-notifications 0.5.x. Use when an app imports react-native-pusher-push-notifications or has RNPusherPushNotifications native code.
---

# Migrate from react-native-pusher-push-notifications

Not a drop-in swap: callbacks become promises, init becomes `start()`, native code becomes an Expo config plugin. Full reference: `docs/migrating.md` in this package.

## Step 1 — Inventory (read-only)

```sh
rg -n "react-native-pusher-push-notifications|RNPusherPushNotifications" --glob '!node_modules'
rg -n "setInstanceId|setAppKey|setUserId|setSubscriptions|getSubscriptions|setOnSubscriptionsChangedListener|clearAllState" --glob '!node_modules' -t js -t ts
rg -n "PushNotifications|RNPusher|incrementBadge" ios android --glob '!Pods'
```

Record: instance ID source, interests used, whether users/`setUserId` is used, notification handler code, native files touched.

## Step 2 — Dependencies

```sh
npm uninstall react-native-pusher-push-notifications   # or yarn/pnpm equivalent
npx expo install expo-pusher-push-notifications
```
Bare RN without Expo modules: `npx install-expo-modules@latest` first. Expo Go is not supported (needs dev build).

## Step 3 — Native config

1. Add to `app.json`/`app.config.*` plugins: `["expo-pusher-push-notifications", { "instanceId": "<BEAMS_INSTANCE_ID>" }]`.
2. Ensure `expo.android.googleServicesFile` points at `google-services.json`.
3. If the project has committed `ios/`/`android/` (bare): delete `RNPusherPushNotifications` imports and calls in AppDelegate (`setDeviceToken`, `handleNotification`, didRegister/didReceive forwarding), Carthage/Pod entries for `PushNotifications` added manually, and Android `MainApplication`/manifest additions from the old README. Keep unrelated code.
4. Run `npx expo prebuild --clean` (managed) or `cd ios && pod install` (bare).

## Step 4 — JS rewrites

| Find | Replace with |
|---|---|
| `import X from 'react-native-pusher-push-notifications'` | `import { Interests, Users, on, getInitialNotification } from 'expo-pusher-push-notifications'` |
| `X.setInstanceId(ID)` | `await Interests.start(ID)` (or `Users.start(ID)` if users are used) |
| `X.subscribe(i, onErr, onOk)` | `try { await Interests.subscribe(i); onOk?.() } catch (e) { onErr?.(e) }` |
| `X.unsubscribe(i, onErr, onOk)` | same pattern with `Interests.unsubscribe` |
| `X.setSubscriptions(arr)` | `await Interests.set(arr)` |
| `X.getSubscriptions(cb)` | `cb(await Interests.get())` |
| `X.setOnSubscriptionsChangedListener(cb)` | `on('subscriptionsChanged', cb)` |
| `X.setUserId(uid, token, onErr, onOk)` | `await Users.login(uid, token)` (prefer `{ url, headers }` token provider) |
| `X.clearAllState()` | `await Users.logout()` |
| `X.on('registered'\|'notification', cb)` | `const sub = on(...)`; remove `sub` on unmount |

Rules:
- Make enclosing functions `async` or use `.then/.catch`. Never leave a floating promise without error handling.
- Remove logic that waits for `'registered'` before subscribing; `start()` resolves when ready.
- Call `start` once (app root), before any subscribe/login.
- Android cold-start taps: add `getInitialNotification()` + `on('opened', ...)`.
- If `expo-notifications` or `@react-native-firebase/messaging` is installed for push, flag it to the user — conflict.

## Step 5 — Verify

```sh
rg -n "react-native-pusher-push-notifications|RNPusherPushNotifications" --glob '!node_modules'   # expect no hits
npx tsc --noEmit
npx expo run:ios && npx expo run:android
```
Send a test push to an interest from the Beams dashboard on a real device; check foreground, background, and cold-start tap.

## Checklist
- [ ] Old package + native code removed
- [ ] Plugin added with instanceId; googleServicesFile set; prebuild run
- [ ] All callbacks converted to promises with error handling
- [ ] Listeners return subscriptions that are removed
- [ ] Users flow: login after sign-in, logout on sign-out
- [ ] Typecheck passes; test push received on both platforms
- [ ] Summarize changes and any manual console steps (APNs key, Firebase) for the user
