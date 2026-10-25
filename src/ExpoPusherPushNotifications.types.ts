/**
 * Which Pusher Beams delivery path the app uses. Both modes deliver through Pusher Beams;
 * neither one sends straight through FCM/APNs or the Expo Push Service.
 *
 * - `interests`: devices subscribe to named interests and you publish to those interests.
 * - `users`: Authenticated Users. The device is bound to a user ID with `setUserId` and you
 *   publish to that user's devices with `publishToUsers`.
 */
export type PusherTransportMode = 'interests' | 'users';

export interface PusherConfig {
  /** Pusher Beams instance ID, for example "xxxxxxxx-xxxx-...". */
  instanceId: string;
  /** Defaults to `interests`. */
  mode?: PusherTransportMode;
}

/** The URL and headers that the native SDK uses to fetch a Beams token for `users` mode. */
export interface BeamsTokenProvider {
  /** HTTPS endpoint on your backend that returns `{ token: string }` (see Beams docs). */
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
}

export interface PusherNotification {
  title?: string;
  body?: string;
  data: Record<string, unknown>;
  /** `foreground` when the app was running; `background` or `opened` when the user tapped it. */
  appState: 'foreground' | 'background' | 'opened';
}

export interface RegisteredEvent {
  /** The APNs or FCM device token that the Pusher SDK registered with Beams. It is informational only. */
  deviceToken: string;
}

export interface SubscriptionsChangedEvent {
  interests: string[];
}

export interface PusherErrorEvent {
  code: string;
  message: string;
}

export type ExpoPusherPushNotificationsModuleEvents = {
  notification: (event: PusherNotification) => void;
  registered: (event: RegisteredEvent) => void;
  subscriptionsChanged: (event: SubscriptionsChangedEvent) => void;
  error: (event: PusherErrorEvent) => void;
};

export type PusherEventName = keyof ExpoPusherPushNotificationsModuleEvents;
