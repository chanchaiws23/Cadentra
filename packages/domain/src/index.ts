export type Priority = 'low' | 'medium' | 'high'
export type ItemStatus = 'planned' | 'in_progress' | 'done' | 'skipped'

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
}

export interface Habit {
  id: string
  userId: string
  title: string
  cue: string
  target: number
  unit: string
  streak: number
  completedDates: string[]
}

export interface FocusSession {
  id: string
  userId: string
  taskId?: string
  plannedMinutes: number
  elapsedSeconds: number
  status: 'idle' | 'running' | 'paused' | 'completed'
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

export function nextStreak(current: number, completedToday: boolean): number {
  return completedToday ? current + 1 : current
}

export function pointsForCompletion(priority: Priority, returningAfterBreak = false): number {
  const base = { low: 5, medium: 10, high: 15 }[priority]
  return base + (returningAfterBreak ? 5 : 0)
}

