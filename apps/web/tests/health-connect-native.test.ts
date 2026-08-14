import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const plugin = readFileSync(
  new URL('../../android/app/src/main/java/com/cadentra/app/HealthConnectPlugin.kt', import.meta.url),
  'utf8',
)
const manifest = readFileSync(
  new URL('../../android/app/src/main/AndroidManifest.xml', import.meta.url),
  'utf8',
)

describe('Health Connect native boundary', () => {
  it('requests only the approved read-only record categories', () => {
    expect(plugin).toContain('StepsRecord')
    expect(plugin).toContain('SleepSessionRecord')
    expect(plugin).toContain('ExerciseSessionRecord')
    expect(manifest).toContain('android.permission.health.READ_STEPS')
    expect(manifest).toContain('android.permission.health.READ_SLEEP')
    expect(manifest).toContain('android.permission.health.READ_EXERCISE')
    expect(manifest).not.toMatch(/WRITE_|HEART_RATE|MEDICAL/i)
  })

  it('returns daily totals instead of raw records', () => {
    expect(plugin).toContain('readDailyAggregate')
    expect(plugin).toContain('sleepMinutes')
    expect(plugin).toContain('exerciseMinutes')
    expect(plugin).not.toContain('put("records"')
  })
})
