export * from './time'

export type Priority = 'low' | 'medium' | 'high'
export type ItemStatus = 'planned' | 'in_progress' | 'done' | 'skipped'

export interface UserProfile {
  id: string
  displayName: string
  timezone: string
  locale: 'th' | 'en'
  gamificationEnabled: boolean
  healthAiConsent: boolean
}

export interface NotificationRule {
  userId: string
  enabled: boolean
  quietStart: string
  quietEnd: string
  dailyLimit: number
  focusBreakMinutes: number
}

export interface Task {
  id: string
  userId: string
  title: string
  start: string
  end: string
  category: string
  priority: Priority
  status: ItemStatus
  goalId?: string
  recurring?: boolean
  recurrenceRule?: string
  sourceTaskId?: string
  occurrenceDate?: string
  updatedAt?: string
}

export interface TaskOccurrence {
  taskId: string
  localDate: string
  status: ItemStatus
}

export * from './recurrence'

export interface Goal {
  id: string
  userId: string
  title: string
  description: string
  targetDate?: string
  status: ItemStatus
  updatedAt: string
}

export interface Milestone {
  id: string
  userId: string
  goalId: string
  title: string
  targetDate?: string
  status: ItemStatus
  sortOrder: number
  updatedAt: string
}

export type HabitType = 'boolean' | 'count' | 'duration' | 'number'

export interface HabitCheckIn {
  localDate: string
  value: number
  frozen: boolean
}

export interface Habit {
  id: string
  userId: string
  title: string
  cue: string
  target: number
  unit: string
  type: HabitType
  recurrenceRule: string
  freezeBalance: number
  streak: number
  completedDates: string[]
  checkIns: HabitCheckIn[]
}

export interface FocusInterruption {
  reason: string
  recordedAt: string
  elapsedSeconds: number
}

export interface FocusSession {
  id: string
  userId: string
  taskId?: string
  plannedMinutes: number
  elapsedSeconds: number
  pauseSeconds: number
  interruptionCount: number
  interruptions: FocusInterruption[]
  startedAt: string
  endedAt: string
  status: 'completed'
}

export type ReflectionPeriod = 'daily' | 'weekly'

export interface Reflection {
  id: string
  userId: string
  period: ReflectionPeriod
  localDate: string
  wins: string
  blockers: string
  nextStep: string
  createdAt: string
}

export interface CalendarConnection {
  id: string
  provider: 'google'
  accountId: string
  syncStatus: 'idle' | 'syncing' | 'error'
  lastSyncedAt?: string
}

export interface ExternalCalendarEvent {
  id: string
  connectionId: string
  title: string
  start: string
  end: string
  allDay: boolean
  readOnly: true
}

export interface AIProposalChange {
  id: string
  taskId: string
  action: 'move' | 'resize' | 'create' | 'skip'
  before?: { start: string; end: string }
  after?: { start: string; end: string }
  accepted: boolean
}

export interface AIProposal {
  id: string
  status: 'draft' | 'accepted' | 'rejected' | 'applied' | 'undone'
  reason: string
  changes: AIProposalChange[]
  createdAt: string
}

export function completionRate(tasks: Task[]): number {
  if (!tasks.length) return 0
  return Math.round((tasks.filter((task) => task.status === 'done').length / tasks.length) * 100)
}

export function isOverlapping(a: Pick<Task, 'start' | 'end'>, b: Pick<Task, 'start' | 'end'>): boolean {
  return new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end)
}

export function findScheduleConflicts(tasks: readonly Task[], candidate: Pick<Task, 'start' | 'end'>, ignoreId?: string): Task[] {
  return tasks.filter((task) => task.id !== ignoreId && isOverlapping(task, candidate))
}

export function conflictingTaskIds(tasks: readonly Task[]): Set<string> {
  const ids = new Set<string>()
  for (let index = 0; index < tasks.length; index += 1) {
    for (let other = index + 1; other < tasks.length; other += 1) {
      if (isOverlapping(tasks[index], tasks[other])) {
        ids.add(tasks[index].id)
        ids.add(tasks[other].id)
      }
    }
  }
  return ids
}

export function nextStreak(current: number, completedToday: boolean): number {
  return completedToday ? current + 1 : current
}

export function pointsForCompletion(priority: Priority, returningAfterBreak = false): number {
  const base = { low: 5, medium: 10, high: 15 }[priority]
  return base + (returningAfterBreak ? 5 : 0)
}
