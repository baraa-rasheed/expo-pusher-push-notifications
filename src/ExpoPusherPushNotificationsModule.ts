import { NativeModule, requireNativeModule } from 'expo';

import type {
  AndroidNotificationChannel,
  BeamsTokenProvider,
  DevicePushToken,
  ExpoPusherPushNotificationsModuleEvents,
  LocalNotification,
  PermissionStatus,
  PusherNotification,
  ScheduledNotification,
} from './ExpoPusherPushNotifications.types';

declare class ExpoPusherPushNotificationsNativeModule extends NativeModule<ExpoPusherPushNotificationsModuleEvents> {
  start(instanceId: string): Promise<void>;
  addDeviceInterest(interest: string): Promise<void>;
  removeDeviceInterest(interest: string): Promise<void>;
  setDeviceInterests(interests: string[]): Promise<void>;
  getDeviceInterests(): Promise<string[]>;
  clearDeviceInterests(): Promise<void>;
  setUserId(userId: string, tokenProvider: BeamsTokenProvider): Promise<void>;
  setUserIdWithToken(userId: string, token: string): Promise<void>;
  clearAllState(): Promise<void>;
  stop(): Promise<void>;
  // device-token mode
  registerForDeviceToken(): Promise<DevicePushToken>;
  getDevicePushToken(): Promise<DevicePushToken | null>;
  deleteDevicePushToken(): Promise<void>;
  // permissions
  requestPermission(): Promise<PermissionStatus>;
  getPermissionStatus(): Promise<PermissionStatus>;
  // channels (Android; no-ops on iOS)
  createChannel(channel: AndroidNotificationChannel): Promise<void>;
  deleteChannel(id: string): Promise<void>;
  getChannels(): Promise<AndroidNotificationChannel[]>;
  // badge
  getBadgeCount(): Promise<number>;
  setBadgeCount(count: number): Promise<void>;
  // local
  presentLocalNotification(n: LocalNotification): Promise<string>;
  scheduleLocalNotification(n: ScheduledNotification): Promise<string>;
  cancelScheduledNotification(id: string): Promise<void>;
  cancelAllScheduledNotifications(): Promise<void>;
  dismissAllNotifications(): Promise<void>;
  getInitialNotification(): Promise<PusherNotification | null>;
}

export default requireNativeModule<ExpoPusherPushNotificationsNativeModule>('ExpoPusherPushNotifications');
