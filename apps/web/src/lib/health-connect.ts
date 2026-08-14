import { Capacitor, registerPlugin } from '@capacitor/core'

interface HealthConnectPlugin {
  requestHealthPermissions(): Promise<{ granted: boolean }>
  readDailyAggregate(options: { localDate: string; timeZone: string }): Promise<{ localDate: string; steps: number; sleepMinutes: number; exerciseMinutes: number }>
}

const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect')

export async function readHealthConnectDay(localDate: string, timeZone: string) {
  if (!Capacitor.isNativePlatform()) throw new Error('Health Connect ใช้ได้เฉพาะแอป Android')
  const permission = await HealthConnect.requestHealthPermissions()
  if (!permission.granted) throw new Error('ไม่ได้รับสิทธิ์ Health Connect')
  return HealthConnect.readDailyAggregate({ localDate, timeZone })
}
