import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import type { RegisterDeviceInput } from '@cadentra/data'

export function vapidKeyBytes(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const raw = atob((value + padding).replaceAll('-', '+').replaceAll('_', '/'))
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

export async function registerPushDevice(vapidPublicKey?: string): Promise<RegisterDeviceInput> {
  if (Capacitor.isNativePlatform()) {
    const permission = await PushNotifications.requestPermissions()
    if (permission.receive !== 'granted') throw new Error('ไม่ได้รับสิทธิ์แจ้งเตือนบน Android')
    const token = await new Promise<string>((resolve, reject) => {
      void PushNotifications.addListener('registration', (registration) => resolve(registration.value))
      void PushNotifications.addListener('registrationError', (error) => reject(new Error(error.error)))
      void PushNotifications.register()
    })
    await PushNotifications.removeAllListeners()
    return { platform: 'android', endpoint: token, registration: { token } }
  }
  if (!vapidPublicKey) throw new Error('ยังไม่ได้ตั้งค่า VITE_VAPID_PUBLIC_KEY')
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('เบราว์เซอร์นี้ไม่รองรับ Web Push')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('ไม่ได้รับสิทธิ์แจ้งเตือนจากเบราว์เซอร์')
  const worker = await navigator.serviceWorker.ready
  const subscription = await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyBytes(vapidPublicKey) })
  return { platform: 'web', endpoint: subscription.endpoint, registration: subscription.toJSON() as Record<string, unknown> }
}
