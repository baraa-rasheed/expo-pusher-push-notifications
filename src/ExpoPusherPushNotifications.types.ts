/**
 * Pusher Beams delivery mode.
 *
 * - `interests`: devices subscribe to named interests; your server calls Beams `publishToInterests`.
 * - `users`: the device is bound to a user via `setUserId`; your server calls Beams `publishToUsers`.
 */
export type PusherTransportMode = 'interests' | 'users';

export interface PusherConfig {
  /** Pusher Beams instance ID. */
  instanceId: string;
  /** Defaults to `interests`. */
  mode?: PusherTransportMode;
  /** Ask for notification permission (iOS alert/sound/badge, Android 13+ POST_NOTIFICATIONS) during start. Default true. */
  requestPermission?: boolean;
}

/** Remote token endpoint used by the Beams SDK in `users` mode. */
export interface BeamsTokenProvider {
  /** HTTPS endpoint on your backend that returns `{ token: string }`. */
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
}

/**
 * `users` mode auth: either a remote token provider (recommended), or a pre-fetched Beams token string
 * (the b8ne `setUserId(userId, token)` style).
 */
export type BeamsAuth = BeamsTokenProvider | string;

export interface PusherNotification {
  title?: string;
  body?: string;
  data: Record<string, unknown>;
  /** `foreground`: received while running; `background`: received in background; `opened`: user tapped it. */
  appState: 'foreground' | 'background' | 'opened';
}

export interface RegisteredEvent {
  /** Native token the device registered with (FCM on Android, hex APNs on iOS). Beams handles it for you. */
  deviceToken: string;
  type: 'fcm' | 'apns';
}

export interface SubscriptionsChangedEvent {
  interests: string[];
}

export interface PusherErrorEvent {
  code: string;
  message: string;
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'provisional';

export type AndroidImportance = 'min' | 'low' | 'default' | 'high' | 'max';

export interface AndroidNotificationChannel {
  id: string;
  name: string;
  description?: string;
  importance?: AndroidImportance;
  /** Bundled sound file name WITHOUT path, e.g. `ding.wav` or `ding`. Must be listed in the plugin's `sounds`. `null` = silent. */
  sound?: string | null;
  vibrate?: boolean;
  lightColor?: string;
  showBadge?: boolean;
}

export interface LocalNotification {
  title?: string;
  body?: string;
  data?: Record<string, string>;
  /** Bundled sound file name, e.g. `ding.wav`; `default` for system sound. On Android 8+ the channel's sound wins. */
  sound?: string;
  /** Android channel id. Defaults to the plugin's default channel. */
  channelId?: string;
  /** iOS badge to set with this notification. */
  badge?: number;
}

export interface ScheduledNotification extends LocalNotification {
  /** Stable id; reuse to replace. Generated if omitted. */
  id?: string;
  /** Fire after this many seconds (>= 1). */
  seconds: number;
}

export type ExpoPusherPushNotificationsModuleEvents = {
  notification: (event: PusherNotification) => void;
  registered: (event: RegisteredEvent) => void;
  subscriptionsChanged: (event: SubscriptionsChangedEvent) => void;
  error: (event: PusherErrorEvent) => void;
};

export type PusherEventName = keyof ExpoPusherPushNotificationsModuleEvents;
