import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'

export const isNativeApp = Capacitor.isNativePlatform()

export async function configureNativeShell() {
  if (!isNativeApp) return

  try {
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: '#07111f' })
    await SplashScreen.hide({ fadeOutDuration: 350 })
  } catch {
    // Native plugins are unavailable in a regular browser preview.
  }
}
