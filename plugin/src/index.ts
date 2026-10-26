import {
  AndroidConfig,
  type ConfigPlugin,
  createRunOncePlugin,
  IOSConfig,
  withAndroidManifest,
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
} from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

export interface PusherPluginChannel {
  id: string;
  name: string;
  description?: string;
  importance?: 'min' | 'low' | 'default' | 'high' | 'max';
  /** File name of a bundled sound listed in `sounds`, e.g. `ding.wav`. */
  sound?: string | null;
  vibrate?: boolean;
  showBadge?: boolean;
}

export interface PusherPluginProps {
  /** Pusher Beams instance ID. */
  instanceId?: string;
  /** APNs environment for the aps-environment entitlement. Defaults to "development". */
  apsEnvironment?: 'development' | 'production';
  /** Beams auth path written to native config (`interests` or `users`). Defaults to "interests". */
  mode?: 'interests' | 'users';
  /**
   * Sound files (paths relative to the project root) to bundle. Android: copied to res/raw
   * (lower-cased, must be [a-z0-9_]). iOS: added to the main bundle. Use .wav/.caf/.aiff for iOS (<30s).
   */
  sounds?: string[];
  /** Android channels created on app start. */
  androidChannels?: PusherPluginChannel[];
  /** Android default channel id for FCM/Beams notifications without an explicit channel. Defaults to the first channel or "default". */
  androidDefaultChannelId?: string;
  /** iOS: show banners/sound/badge while the app is in the foreground. Default true. */
  iosShowInForeground?: boolean;
}

const pkg = { name: 'expo-pusher-push-notifications', version: '0.2.0' };

function androidSoundName(file: string): string {
  return path.basename(file).toLowerCase().replace(/[^a-z0-9_.]/g, '_');
}

const withSoundsAndroid: ConfigPlugin<string[]> = (config, sounds) =>
  withDangerousMod(config, [
    'android',
    async (c) => {
      const rawDir = path.join(c.modRequest.platformProjectRoot, 'app/src/main/res/raw');
      fs.mkdirSync(rawDir, { recursive: true });
      for (const s of sounds) {
        const src = path.resolve(c.modRequest.projectRoot, s);
        if (!fs.existsSync(src)) throw new Error(`[${pkg.name}] sound not found: ${src}`);
        fs.copyFileSync(src, path.join(rawDir, androidSoundName(s)));
      }
      return c;
    },
  ]);

const withSoundsIos: ConfigPlugin<string[]> = (config, sounds) =>
  withXcodeProject(config, (c) => {
    const projectName = c.modRequest.projectName;
    if (!projectName) throw new Error(`[${pkg.name}] could not determine iOS project name`);
    const dir = path.join(c.modRequest.platformProjectRoot, projectName);
    for (const s of sounds) {
      const src = path.resolve(c.modRequest.projectRoot, s);
      if (!fs.existsSync(src)) throw new Error(`[${pkg.name}] sound not found: ${src}`);
      const name = path.basename(s);
      fs.copyFileSync(src, path.join(dir, name));
      const rel = `${projectName}/${name}`;
      if (!c.modResults.hasFile(rel)) {
        c.modResults = IOSConfig.XcodeUtils.addResourceFileToGroup({
          filepath: rel,
          groupName: projectName,
          isBuildFile: true,
          project: c.modResults,
        });
      }
    }
    return c;
  });

const withPusher: ConfigPlugin<PusherPluginProps | void> = (config, props) => {
  const p: PusherPluginProps = props ?? {};
  const mode = p.mode ?? 'interests';
  const sounds = p.sounds ?? [];
  const channels = (p.androidChannels ?? []).map((ch) => ({
    ...ch,
    sound: ch.sound ? androidSoundName(ch.sound).replace(/\.[^.]+$/, '') : ch.sound,
  }));
  const defaultChannelId = p.androidDefaultChannelId ?? channels[0]?.id ?? 'default';

  config = withEntitlementsPlist(config, (c) => {
    c.modResults['aps-environment'] = p.apsEnvironment ?? 'development';
    return c;
  });
  config = withInfoPlist(config, (c) => {
    const modes = new Set<string>((c.modResults.UIBackgroundModes as string[] | undefined) ?? []);
    modes.add('remote-notification');
    c.modResults.UIBackgroundModes = [...modes];
    if (p.instanceId) c.modResults.PusherBeamsInstanceId = p.instanceId;
    c.modResults.PusherBeamsMode = mode;
    c.modResults.PusherShowInForeground = p.iosShowInForeground ?? true;
    return c;
  });
  config = withAndroidManifest(config, (c) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    const meta = (k: string, v: string): void => {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, k, v);
    };
    if (p.instanceId) meta('pusher_beams_instance_id', p.instanceId);
    meta('pusher_beams_mode', mode);
    meta('pusher_default_channel_id', defaultChannelId);
    meta('com.google.firebase.messaging.default_notification_channel_id', defaultChannelId);
    if (channels.length) meta('pusher_channels', JSON.stringify(channels));
    return c;
  });
  if (sounds.length) {
    config = withSoundsAndroid(config, sounds);
    config = withSoundsIos(config, sounds);
  }
  return config;
};

export default createRunOncePlugin(withPusher, pkg.name, pkg.version);
