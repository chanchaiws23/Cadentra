import type { Habit, Reflection, Task } from './index'

export interface Badge {
  code: 'first_step' | 'steady_week' | 'deep_focus' | 'reflective'
  title: string
  description: string
  earned: boolean
}

export interface PersonalReward {
  id: string
  userId: string
  title: string
  pointCost: number
  redeemedAt?: string
  createdAt: string
}

export interface WeeklyQuest {
  title: string
  current: number
  target: number
  completed: boolean
}

export function motivationProgress(tasks: readonly Task[], habits: readonly Habit[], reflections: readonly Reflection[], focusMinutes: number) {
  const completedTasks = tasks.filter((task) => task.status === 'done').length
  const maxStreak = habits.reduce((best, habit) => Math.max(best, habit.streak), 0)
  const weeklyReviews = reflections.filter((entry) => entry.period === 'weekly').length
  const badges: Badge[] = [
    { code: 'first_step', title: 'ก้าวแรก', description: 'ทำงานแรกสำเร็จ', earned: completedTasks >= 1 },
    { code: 'steady_week', title: 'จังหวะมั่นคง', description: 'รักษานิสัยต่อเนื่อง 7 วัน', earned: maxStreak >= 7 },
    { code: 'deep_focus', title: 'โฟกัสลึก', description: 'สะสมเวลาโฟกัส 5 ชั่วโมง', earned: focusMinutes >= 300 },
    { code: 'reflective', title: 'เรียนรู้จากตัวเอง', description: 'ทำ Weekly Review 3 ครั้ง', earned: weeklyReviews >= 3 },
  ]
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (now.getDay() || 7) + 1)
  monday.setHours(0, 0, 0, 0)
  const completedThisWeek = tasks.filter((task) => task.status === 'done' && new Date(task.start) >= monday).length
  const quest: WeeklyQuest = { title: 'ทำงานสำคัญให้สำเร็จ 5 งาน', current: Math.min(completedThisWeek, 5), target: 5, completed: completedThisWeek >= 5 }
  return { badges, quest }
}
