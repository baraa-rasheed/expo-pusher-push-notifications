import type { EventSubscription } from 'expo-modules-core';

import Native from './ExpoPusherPushNotificationsModule';
import type {
  AndroidNotificationChannel,
  BeamsAuth,
  DevicePushToken,
  ExpoPusherPushNotificationsModuleEvents,
  LocalNotification,
  PermissionStatus,
  PusherConfig,
  PusherEventName,
  PusherNotification,
  PusherTransportMode,
  ScheduledNotification,
} from './ExpoPusherPushNotifications.types';

export * from './ExpoPusherPushNotifications.types';

let currentMode: PusherTransportMode = 'interests';
let started = false;

const PREFIX = 'expo-pusher-push-notifications';

function assertBeams(fn: string): void {
  if (!started) throw new Error(`${PREFIX}: call start() before ${fn}().`);
  if (currentMode === 'device') {
    throw new Error(`${PREFIX}: ${fn}() is a Pusher Beams API and is unavailable in 'device' mode.`);
  }
}

/**
 * Starts the module.
 * - Pusher Beams (`interests` / `users`): starts the Beams SDK (requires `instanceId`).
 * - Device token (`device`): does NOT start Beams; registers with FCM/APNs and resolves the raw device token.
 * Resolves with the device token in `device` mode, otherwise `null`.
 */
export async function start(config: PusherConfig): Promise<DevicePushToken | null> {
  const mode = config.mode ?? 'interests';
  if (config.requestPermission !== false) await Native.requestPermission();
  currentMode = mode;
  if (mode === 'device') {
    const token = await Native.registerForDeviceToken();
    started = true;
    return token;
  }
  if (!config.instanceId) throw new Error(`${PREFIX}: instanceId is required for '${mode}' mode.`);
  await Native.start(config.instanceId);
  started = true;
  return null;
}

export function getMode(): PusherTransportMode {
  return currentMode;
}

// ---- Interests (topics) ----
export async function subscribe(interest: string): Promise<void> {
  assertBeams('subscribe');
  await Native.addDeviceInterest(interest);
}
export async function unsubscribe(interest: string): Promise<void> {
  assertBeams('unsubscribe');
  await Native.removeDeviceInterest(interest);
}
export async function setSubscriptions(interests: string[]): Promise<void> {
  assertBeams('setSubscriptions');
  await Native.setDeviceInterests(interests);
}
export async function getSubscriptions(): Promise<string[]> {
  assertBeams('getSubscriptions');
  return Native.getDeviceInterests();
}
export async function clearSubscriptions(): Promise<void> {
  assertBeams('clearSubscriptions');
  await Native.clearDeviceInterests();
}

// ---- Bind a device to a user ----
/** Pass a token provider `{ url, headers?, queryParams? }` or a pre-fetched Beams token string. */
export async function setUserId(userId: string, auth: BeamsAuth): Promise<void> {
  assertBeams('setUserId');
  if (typeof auth === 'string') await Native.setUserIdWithToken(userId, auth);
  else await Native.setUserId(userId, auth);
}

// ---- Mode 3: raw device token (direct FCM / APNs) ----
/** Registers with FCM/APNs (if needed) and returns the native token. Works in any mode. */
export async function registerForDeviceToken(): Promise<DevicePushToken> {
  return Native.registerForDeviceToken();
}
/** Last known native token, or null if not registered yet. */
export async function getDevicePushToken(): Promise<DevicePushToken | null> {
  return Native.getDevicePushToken();
}
/** Android: deletes the FCM token (a new one is issued on next register). iOS: unregisters from APNs. */
export async function deleteDevicePushToken(): Promise<void> {
  await Native.deleteDevicePushToken();
}

// ---- Permissions ----
export function requestPermission(): Promise<PermissionStatus> {
  return Native.requestPermission();
}
export function getPermissionStatus(): Promise<PermissionStatus> {
  return Native.getPermissionStatus();
}

// ---- Android notification channels (no-ops on iOS) ----
export function createChannel(channel: AndroidNotificationChannel): Promise<void> {
  return Native.createChannel(channel);
}
export function deleteChannel(id: string): Promise<void> {
  return Native.deleteChannel(id);
}
export function getChannels(): Promise<AndroidNotificationChannel[]> {
  return Native.getChannels();
}

// ---- Badge ----
export function getBadgeCount(): Promise<number> {
  return Native.getBadgeCount();
}
export function setBadgeCount(count: number): Promise<void> {
  return Native.setBadgeCount(Math.max(0, Math.floor(count)));
}
export async function incrementBadgeCount(by = 1): Promise<number> {
  const next = (await Native.getBadgeCount()) + by;
  await setBadgeCount(next);
  return Math.max(0, next);
}

// ---- Local notifications ----
export function presentLocalNotification(n: LocalNotification): Promise<string> {
  return Native.presentLocalNotification(n);
}
export function scheduleLocalNotification(n: ScheduledNotification): Promise<string> {
  if (!(n.seconds >= 1)) throw new Error(`${PREFIX}: seconds must be >= 1.`);
  return Native.scheduleLocalNotification(n);
}
export function cancelScheduledNotification(id: string): Promise<void> {
  return Native.cancelScheduledNotification(id);
}
export function cancelAllScheduledNotifications(): Promise<void> {
  return Native.cancelAllScheduledNotifications();
}
export function dismissAllNotifications(): Promise<void> {
  return Native.dismissAllNotifications();
}
/** The notification whose tap launched the app (cold start), if any. */
export function getInitialNotification(): Promise<PusherNotification | null> {
  return Native.getInitialNotification();
}

// ---- Common ----
export async function clearAllState(): Promise<void> {
  if (currentMode !== 'device') await Native.clearAllState();
}
export async function stop(): Promise<void> {
  if (currentMode === 'device') await Native.deleteDevicePushToken();
  else await Native.stop();
  started = false;
}

/** Adds an event listener. Events fire for interests and users alike. */
export function addListener<E extends PusherEventName>(
  eventName: E,
  listener: ExpoPusherPushNotificationsModuleEvents[E]
): EventSubscription {
  return Native.addListener(eventName, listener);
}
/** Alias for `addListener` (old package's `on()`). */
export const on = addListener;

// ---------------------------------------------------------------------------
// Two paths: Pusher Beams (Interests / Users) or DeviceToken (raw FCM/APNs).
// Sounds, channels, badges, local notifications and events work on both.
// ---------------------------------------------------------------------------

/**
 * Pusher Beams **interests** (topic broadcast).
 * Use when many devices should get the same push: "news", "order-42", "team-7".
 * Server: `beams.publishToInterests([...], payload)`.
 */
export const Interests = {
  /** Start Beams. */
  start: (instanceId: string, opts: { requestPermission?: boolean } = {}) =>
    start({ ...opts, instanceId, mode: 'interests' }).then(() => undefined),
  subscribe,
  unsubscribe,
  set: setSubscriptions,
  get: getSubscriptions,
  clear: clearSubscriptions,
  /** Forget everything (call on logout). */
  reset: clearAllState,
  stop,
} as const;

/**
 * Pusher Beams **authenticated users** (push to a person, across all their devices).
 * Use when your backend thinks in user ids: "send to user-123".
 * Server: `beams.publishToUsers(['user-123'], payload)` + a token endpoint (`beams.generateToken`).
 */
export const Users = {
  /** Start Beams. Call `login()` after your own sign-in. */
  start: (instanceId: string, opts: { requestPermission?: boolean } = {}) =>
    start({ ...opts, instanceId, mode: 'users' }).then(() => undefined),
  /** Bind this device to `userId`. `auth` is your token endpoint, or a Beams token you already fetched. */
  login: setUserId,
  /** Unbind the device (call on sign-out). */
  logout: clearAllState,
  stop,
} as const;

/**
 * Mode 3 — **direct FCM / APNs** (no Pusher at all).
 * Use when your server already talks to FCM HTTP v1 / APNs, or you use another provider.
 * You get the raw native token; send it to your backend and keep it fresh via the `registered` event.
 */
export const DeviceToken = {
  /** Register with FCM/APNs and resolve the native token. */
  start: async (opts: { requestPermission?: boolean } = {}): Promise<DevicePushToken> =>
    (await start({ ...opts, mode: 'device' })) as DevicePushToken,
  get: getDevicePushToken,
  /** Fires whenever the token is issued or rotated. */
  onChange: (cb: (token: DevicePushToken) => void): EventSubscription =>
    addListener('registered', ({ deviceToken, type }) =>
      cb({ token: deviceToken, type, platform: type === 'fcm' ? 'android' : 'ios' })
    ),
  /** Delete the token (call on sign-out). */
  delete: deleteDevicePushToken,
} as const;

export default {
  Interests, Users, DeviceToken,
  start, getMode,
  subscribe, unsubscribe, setSubscriptions, getSubscriptions, clearSubscriptions,
  setUserId,
  registerForDeviceToken, getDevicePushToken, deleteDevicePushToken,
  requestPermission, getPermissionStatus,
  createChannel, deleteChannel, getChannels,
  getBadgeCount, setBadgeCount, incrementBadgeCount,
  presentLocalNotification, scheduleLocalNotification, cancelScheduledNotification,
  cancelAllScheduledNotifications, dismissAllNotifications, getInitialNotification,
  clearAllState, stop, addListener, on,
} as const;
