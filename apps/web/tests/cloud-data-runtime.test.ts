import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readWebFile = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('cloud data runtime', () => {
  it('connects the application to the Supabase user data gateway', () => {
    const main = readWebFile('src/main.tsx')
    const app = readWebFile('src/App.tsx')
    expect(main).toContain('createSupabaseUserDataGateway')
    expect(main).toContain('<App dataGateway={dataGateway}/>')
    expect(app).toContain('useUserData(dataGateway, session?.user.id)')
  })

  it('does not ship the former task, habit, points, insight, or coach mock data', () => {
    const runtime = [
      readWebFile('src/App.tsx'),
      readWebFile('src/features/today/TodayView.tsx'),
      readWebFile('src/features/habits/HabitsView.tsx'),
      readWebFile('src/features/calendar/CalendarView.tsx'),
      readWebFile('src/i18n/messages.ts'),
    ].join('\n')
    for (const forbidden of ['initialTasks', 'initialHabits', 'cadentra.tasks', 'cadentra.habits', 'cadentra.points', 'Deep work · Cadentra', '82%', '1ชม. 30น.', 'CoachPanel', '4 สิงหาคม', 'Week 32']) {
      expect(runtime).not.toContain(forbidden)
    }
  })
})
