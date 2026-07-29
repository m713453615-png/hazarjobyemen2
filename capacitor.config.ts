import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.hazarjob.app',
  appName: 'Hazar-Job.com',
  webDir: 'dist',
  bundledWebRuntime: false,
  backgroundColor: '#07111f',
  android: {
    backgroundColor: '#07111f',
    allowMixedContent: false,
  },
}

export default config
