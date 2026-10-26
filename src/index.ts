import type { EventSubscription } from 'expo-modules-core';

import Native from './ExpoPusherPushNotificationsModule';
import type {
  AndroidNotificationChannel,
  BeamsAuth,
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
}

/** Starts Pusher Beams in `interests` (default) or `users` mode. */
export async function start(config: PusherConfig): Promise<void> {
  if (!config.instanceId) throw new Error(`${PREFIX}: instanceId is required.`);
  if (config.requestPermission !== false) await Native.requestPermission();
  currentMode = config.mode ?? 'interests';
  await Native.start(config.instanceId);
  started = true;
}

export function getMode(): PusherTransportMode {
  return currentMode;
}

// ---- Mode 1: Beams interests ----
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

// ---- Mode 2: Beams authenticated users ----
/** Pass a token provider `{ url, headers?, queryParams? }` or a pre-fetched Beams token string. */
export async function setUserId(userId: string, auth: BeamsAuth): Promise<void> {
  assertBeams('setUserId');
  if (typeof auth === 'string') await Native.setUserIdWithToken(userId, auth);
  else await Native.setUserId(userId, auth);
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
  await Native.clearAllState();
}
export async function stop(): Promise<void> {
  await Native.stop();
  started = false;
}

/** Adds an event listener. Events fire in all modes. */
export function addListener<E extends PusherEventName>(
  eventName: E,
  listener: ExpoPusherPushNotificationsModuleEvents[E]
): EventSubscription {
  return Native.addListener(eventName, listener);
}
/** Alias for `addListener` (old package's `on()`). */
export const on = addListener;

// ---------------------------------------------------------------------------
// Mode-scoped API. Pick ONE of these two and ignore the other.
// Everything below (sounds, channels, badges, local notifications, events)
// is shared and works in every mode.
// ---------------------------------------------------------------------------

/**
 * Mode 1 — Pusher Beams **interests** (topic broadcast).
 * Use when many devices should get the same push: "news", "order-42", "team-7".
 * Server: `beams.publishToInterests([...], payload)`.
 */
export const Interests = {
  /** Start Beams in interests mode. */
  start: (instanceId: string, opts: { requestPermission?: boolean } = {}) =>
    start({ ...opts, instanceId, mode: 'interests' }),
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
 * Mode 2 — Pusher Beams **authenticated users** (push to a person, across all their devices).
 * Use when your backend thinks in user ids: "send to user-123".
 * Server: `beams.publishToUsers(['user-123'], payload)` + a token endpoint (`beams.generateToken`).
 */
export const Users = {
  /** Start Beams in users mode. Call `login()` after your own sign-in. */
  start: (instanceId: string, opts: { requestPermission?: boolean } = {}) =>
    start({ ...opts, instanceId, mode: 'users' }),
  /** Bind this device to `userId`. `auth` is your token endpoint, or a Beams token you already fetched. */
  login: setUserId,
  /** Unbind the device (call on sign-out). */
  logout: clearAllState,
  stop,
} as const;

export default {
  Interests, Users,
  start, getMode,
  subscribe, unsubscribe, setSubscriptions, getSubscriptions, clearSubscriptions,
  setUserId,
  requestPermission, getPermissionStatus,
  createChannel, deleteChannel, getChannels,
  getBadgeCount, setBadgeCount, incrementBadgeCount,
  presentLocalNotification, scheduleLocalNotification, cancelScheduledNotification,
  cancelAllScheduledNotifications, dismissAllNotifications, getInitialNotification,
  clearAllState, stop, addListener, on,
} as const;
