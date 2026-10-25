import { NativeModule, requireNativeModule } from 'expo';

import type { BeamsTokenProvider, ExpoPusherPushNotificationsModuleEvents } from './ExpoPusherPushNotifications.types';

declare class ExpoPusherPushNotificationsNativeModule extends NativeModule<ExpoPusherPushNotificationsModuleEvents> {
  start(instanceId: string): Promise<void>;
  addDeviceInterest(interest: string): Promise<void>;
  removeDeviceInterest(interest: string): Promise<void>;
  setDeviceInterests(interests: string[]): Promise<void>;
  getDeviceInterests(): Promise<string[]>;
  clearDeviceInterests(): Promise<void>;
  setUserId(userId: string, tokenProvider: BeamsTokenProvider): Promise<void>;
  clearAllState(): Promise<void>;
  stop(): Promise<void>;
}

export default requireNativeModule<ExpoPusherPushNotificationsNativeModule>('ExpoPusherPushNotifications');
