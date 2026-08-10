import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.cadentra.app',
  appName: 'Cadentra',
  webDir: 'web/dist',
  backgroundColor: '#f5f4ee',
  android: { allowMixedContent: false },
}

export default config
