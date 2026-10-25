import type { EventSubscription } from 'expo-modules-core';

import Native from './ExpoPusherPushNotificationsModule';
import type {
  BeamsTokenProvider,
  ExpoPusherPushNotificationsModuleEvents,
  PusherConfig,
  PusherEventName,
  PusherTransportMode,
} from './ExpoPusherPushNotifications.types';

export * from './ExpoPusherPushNotifications.types';

let currentMode: PusherTransportMode = 'interests';
let started = false;

function assertStarted(): void {
  if (!started) throw new Error('expo-pusher-push-notifications: call start() before using the API.');
}

/** Starts the Pusher Beams SDK and chooses the transport mode. */
export async function start(config: PusherConfig): Promise<void> {
  currentMode = config.mode ?? 'interests';
  await Native.start(config.instanceId);
  started = true;
}

export function getMode(): PusherTransportMode {
  return currentMode;
}

// ---- Interests mode (Beams interests) ----
export async function subscribe(interest: string): Promise<void> {
  assertStarted();
  await Native.addDeviceInterest(interest);
}
export async function unsubscribe(interest: string): Promise<void> {
  assertStarted();
  await Native.removeDeviceInterest(interest);
}
export async function setSubscriptions(interests: string[]): Promise<void> {
  assertStarted();
  await Native.setDeviceInterests(interests);
}
export async function getSubscriptions(): Promise<string[]> {
  assertStarted();
  return Native.getDeviceInterests();
}
export async function clearSubscriptions(): Promise<void> {
  assertStarted();
  await Native.clearDeviceInterests();
}

// ---- Users mode (Beams Authenticated Users, which targets devices by user) ----
export async function setUserId(userId: string, tokenProvider: BeamsTokenProvider): Promise<void> {
  assertStarted();
  await Native.setUserId(userId, tokenProvider);
}

// ---- Common ----
export async function clearAllState(): Promise<void> {
  await Native.clearAllState();
}
export async function stop(): Promise<void> {
  await Native.stop();
  started = false;
}

/** Adds an event listener. The same events fire in both modes. */
export function addListener<E extends PusherEventName>(
  eventName: E,
  listener: ExpoPusherPushNotificationsModuleEvents[E]
): EventSubscription {
  return Native.addListener(eventName, listener);
}
/** Alias for `addListener`, kept for code written against the old package's `on()`. */
export const on = addListener;

export default {
  start, getMode, subscribe, unsubscribe, setSubscriptions, getSubscriptions, clearSubscriptions,
  setUserId, clearAllState, stop, addListener, on,
} as const;
