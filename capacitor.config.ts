import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tennismeet.app',
  appName: 'Tennis Meet',
  webDir: 'dist',
  ios: {
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
