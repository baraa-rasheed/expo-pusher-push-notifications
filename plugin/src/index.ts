import {
  AndroidConfig,
  type ConfigPlugin,
  createRunOncePlugin,
  withAndroidManifest,
  withEntitlementsPlist,
  withInfoPlist,
} from '@expo/config-plugins';

export interface PusherPluginProps {
  /** Pusher Beams instance ID. Native code can read it with `start()` from Info.plist or the manifest. */
  instanceId?: string;
  /** APNs environment for the aps-environment entitlement. Defaults to "development". */
  apsEnvironment?: 'development' | 'production';
  /** Default transport mode written to native config. Defaults to "interests". */
  mode?: 'interests' | 'users';
}

const pkg = { name: 'expo-pusher-push-notifications', version: '0.1.0' };

const withPusher: ConfigPlugin<PusherPluginProps | void> = (config, props) => {
  const p: PusherPluginProps = props ?? {};
  config = withEntitlementsPlist(config, (c) => {
    c.modResults['aps-environment'] = p.apsEnvironment ?? 'development';
    return c;
  });
  config = withInfoPlist(config, (c) => {
    const modes = new Set<string>((c.modResults.UIBackgroundModes as string[] | undefined) ?? []);
    modes.add('remote-notification');
    c.modResults.UIBackgroundModes = [...modes];
    if (p.instanceId) c.modResults.PusherBeamsInstanceId = p.instanceId;
    c.modResults.PusherBeamsMode = p.mode ?? 'interests';
    return c;
  });
  config = withAndroidManifest(config, (c) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    if (p.instanceId) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, 'pusher_beams_instance_id', p.instanceId);
    }
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, 'pusher_beams_mode', p.mode ?? 'interests');
    return c;
  });
  return config;
};

export default createRunOncePlugin(withPusher, pkg.name, pkg.version);
