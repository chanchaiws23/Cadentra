import type { SupabaseClient } from '@supabase/supabase-js'
import type { Goal, Habit, ItemStatus, Milestone, Priority, Task, UserProfile } from '@cadentra/domain'
import { dataError, type DataResult } from './repository'

export interface UserDataSnapshot {
  profile: UserProfile | null
  tasks: Task[]
  habits: Habit[]
  goals: Goal[]
  milestones: Milestone[]
  points: number
  focusMinutes: number
}

export interface CreateTaskInput {
  entityId?: string
  idempotencyKey?: string
  title: string
  start: string
  end: string
  category?: string
  priority?: Priority
  goalId?: string
}

export interface CreateGoalInput {
  entityId?: string
  idempotencyKey?: string
  title: string
  description: string
  targetDate?: string
}

export interface CreateMilestoneInput {
  entityId?: string
  idempotencyKey?: string
  goalId: string
  title: string
  targetDate?: string
  sortOrder: number
}

export interface CreateHabitInput {
  entityId?: string
  idempotencyKey?: string
  title: string
  cue: string
  target: number
  unit: string
}

export type UpdateProfileInput = Omit<UserProfile, 'id'>

export interface AccountExport {
  exportedAt: string
  userId: string
  data: Record<string, unknown[]>
}

export interface UserDataGateway {
  load(userId: string, focusSince: string, localDate: string): Promise<DataResult<UserDataSnapshot>>
  saveProfile(userId: string, input: UpdateProfileInput): Promise<DataResult<void>>
  exportAccount(userId: string): Promise<DataResult<AccountExport>>
  deleteAccount(): Promise<DataResult<void>>
  createTask(userId: string, input: CreateTaskInput): Promise<DataResult<void>>
  createGoal(userId: string, input: CreateGoalInput): Promise<DataResult<void>>
  setGoalStatus(userId: string, goalId: string, status: ItemStatus): Promise<DataResult<void>>
  softDeleteGoal(userId: string, goalId: string): Promise<DataResult<void>>
  createMilestone(userId: string, input: CreateMilestoneInput): Promise<DataResult<void>>
  setMilestoneStatus(userId: string, milestoneId: string, status: ItemStatus): Promise<DataResult<void>>
  softDeleteMilestone(userId: string, milestoneId: string): Promise<DataResult<void>>
  setTaskStatus(userId: string, taskId: string, status: ItemStatus, expectedUpdatedAt?: string): Promise<DataResult<void>>
  softDeleteTask(userId: string, taskId: string): Promise<DataResult<void>>
  restoreTask(userId: string, taskId: string): Promise<DataResult<void>>
  createHabit(userId: string, input: CreateHabitInput): Promise<DataResult<void>>
  setHabitCheckIn(userId: string, habitId: string, localDate: string, completed: boolean): Promise<DataResult<void>>
  recordPoints(userId: string, sourceType: string, sourceId: string, amount: number, reason: string, idempotencyKey?: string): Promise<DataResult<void>>
  recordFocusSession(userId: string, taskId: string | undefined, plannedMinutes: number, elapsedSeconds: number, idempotencyKey?: string): Promise<DataResult<void>>
  syncPending?(userId: string): Promise<DataResult<{ synced: number; pending: number }>>
  pendingCount?(userId: string): number
  syncIssues?(userId: string): SyncIssue[]
  resolveSyncIssue?(userId: string, mutationId: string, resolution: 'local' | 'cloud'): Promise<DataResult<void>>
}

export interface SyncIssue {
  id: string
  kind: 'conflict'
  title: string
  detail: string
}

interface TaskRow {
  id: string
  user_id: string
  title: string
  starts_at: string | null
  ends_at: string | null
  category: string
  priority: Priority
  status: ItemStatus
  goal_id: string | null
  recurrence_rule: string | null
  updated_at: string
}

interface GoalRow {
  id: string
  user_id: string
  title: string
  description: string | null
  target_date: string | null
  status: ItemStatus
  updated_at: string
}

interface MilestoneRow {
  id: string
  user_id: string
  goal_id: string
  title: string
  target_date: string | null
  status: ItemStatus
  sort_order: number
  updated_at: string
}

interface HabitRow {
  id: string
  user_id: string
  title: string
  cue: string | null
  target: number | string
  unit: string
}

interface HabitCheckInRow {
  habit_id: string
  local_date: string
}

interface ProfileRow {
  id: string
  display_name: string
  timezone: string
  locale: 'th' | 'en'
  gamification_enabled: boolean
  health_ai_consent: boolean
}

export function mapProfileRow(row: ProfileRow | null): UserProfile | null {
  return row ? {
    id: row.id,
    displayName: row.display_name,
    timezone: row.timezone,
    locale: row.locale,
    gamificationEnabled: row.gamification_enabled,
    healthAiConsent: row.health_ai_consent,
  } : null
}

export function mapTaskRow(row: TaskRow): Task | null {
  if (!row.starts_at || !row.ends_at) return null
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    start: row.starts_at,
    end: row.ends_at,
    category: row.category,
    priority: row.priority,
    status: row.status,
    goalId: row.goal_id ?? undefined,
    recurring: Boolean(row.recurrence_rule),
    updatedAt: row.updated_at,
  }
}

export function mapGoalRow(row: GoalRow): Goal {
  return { id: row.id, userId: row.user_id, title: row.title, description: row.description ?? '', targetDate: row.target_date ?? undefined, status: row.status, updatedAt: row.updated_at }
}

export function mapMilestoneRow(row: MilestoneRow): Milestone {
  return { id: row.id, userId: row.user_id, goalId: row.goal_id, title: row.title, targetDate: row.target_date ?? undefined, status: row.status, sortOrder: row.sort_order, updatedAt: row.updated_at }
}

function dateBefore(localDate: string, days: number): string {
  const date = new Date(`${localDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

export function calculateCurrentStreak(completedDates: readonly string[], localDate: string): number {
  const dates = new Set(completedDates)
  let cursor = dates.has(localDate) ? localDate : dateBefore(localDate, 1)
  let streak = 0
  while (dates.has(cursor)) {
    streak += 1
    cursor = dateBefore(cursor, 1)
  }
  return streak
}

export function buildHabits(rows: readonly HabitRow[], checkIns: readonly HabitCheckInRow[], localDate: string): Habit[] {
  const datesByHabit = new Map<string, string[]>()
  for (const checkIn of checkIns) {
    const dates = datesByHabit.get(checkIn.habit_id) ?? []
    dates.push(checkIn.local_date)
    datesByHabit.set(checkIn.habit_id, dates)
  }
  return rows.map((row) => {
    const completedDates = [...new Set(datesByHabit.get(row.id) ?? [])].sort()
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      cue: row.cue ?? '',
      target: Number(row.target),
      unit: row.unit,
      streak: calculateCurrentStreak(completedDates, localDate),
      completedDates,
    }
  })
}

function failure(error: { message: string; code?: string } | null): DataResult<never> {
  const unauthorized = error?.code === '42501' || error?.code === 'PGRST301'
  return { ok: false, error: dataError(unauthorized ? 'unauthorized' : 'unavailable', error?.message ?? 'Cloud data request failed.', error) }
}

function ok(): DataResult<void> {
  return { ok: true, value: undefined }
}

function idempotentWrite(error: { message: string; code?: string } | null): DataResult<void> {
  return !error || error.code === '23505' ? ok() : failure(error)
}

export function createSupabaseUserDataGateway(client: SupabaseClient): UserDataGateway {
  return {
    async load(userId, focusSince, localDate) {
      const [profile, tasks, goals, milestones, habits, checkIns, points, focusSessions] = await Promise.all([
        client.from('profiles').select('id,display_name,timezone,locale,gamification_enabled,health_ai_consent').eq('id', userId).maybeSingle(),
        client.from('tasks').select('id,user_id,title,starts_at,ends_at,category,priority,status,goal_id,recurrence_rule,updated_at').eq('user_id', userId).is('deleted_at', null).order('starts_at'),
        client.from('goals').select('id,user_id,title,description,target_date,status,updated_at').eq('user_id', userId).is('deleted_at', null).order('created_at'),
        client.from('milestones').select('id,user_id,goal_id,title,target_date,status,sort_order,updated_at').eq('user_id', userId).is('deleted_at', null).order('sort_order'),
        client.from('habits').select('id,user_id,title,cue,target,unit').eq('user_id', userId).is('deleted_at', null).order('created_at'),
        client.from('habit_checkins').select('habit_id,local_date').eq('user_id', userId).order('local_date'),
        client.from('point_transactions').select('amount').eq('user_id', userId),
        client.from('focus_sessions').select('elapsed_seconds').eq('user_id', userId).gte('created_at', focusSince),
      ])
      const error = profile.error ?? tasks.error ?? goals.error ?? milestones.error ?? habits.error ?? checkIns.error ?? points.error ?? focusSessions.error
      if (error) return failure(error)
      return {
        ok: true,
        value: {
          profile: mapProfileRow(profile.data as ProfileRow | null),
          tasks: (tasks.data as TaskRow[]).map(mapTaskRow).filter((task): task is Task => Boolean(task)),
          goals: (goals.data as GoalRow[]).map(mapGoalRow),
          milestones: (milestones.data as MilestoneRow[]).map(mapMilestoneRow),
          habits: buildHabits(habits.data as HabitRow[], checkIns.data as HabitCheckInRow[], localDate),
          points: (points.data as { amount: number }[]).reduce((total, entry) => total + entry.amount, 0),
          focusMinutes: Math.floor((focusSessions.data as { elapsed_seconds: number }[]).reduce((total, entry) => total + entry.elapsed_seconds, 0) / 60),
        },
      }
    },

    async saveProfile(userId, input) {
      const { error } = await client.from('profiles').upsert({
        id: userId,
        display_name: input.displayName,
        timezone: input.timezone,
        locale: input.locale,
        gamification_enabled: input.gamificationEnabled,
        health_ai_consent: input.healthAiConsent,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      return error ? failure(error) : ok()
    },

    async exportAccount(userId) {
      const queries = {
        profiles: client.from('profiles').select('*').eq('id', userId),
        goals: client.from('goals').select('*').eq('user_id', userId),
        milestones: client.from('milestones').select('*').eq('user_id', userId),
        tasks: client.from('tasks').select('*').eq('user_id', userId),
        habits: client.from('habits').select('*').eq('user_id', userId),
        habit_checkins: client.from('habit_checkins').select('*').eq('user_id', userId),
        focus_sessions: client.from('focus_sessions').select('*').eq('user_id', userId),
        reflections: client.from('reflections').select('*').eq('user_id', userId),
        point_transactions: client.from('point_transactions').select('*').eq('user_id', userId),
        ai_proposals: client.from('ai_proposals').select('*').eq('user_id', userId),
        calendar_connections: client.from('calendar_connections').select('id,user_id,provider,provider_account_id,sync_cursor,sync_status,last_synced_at,created_at').eq('user_id', userId),
        external_event_links: client.from('external_event_links').select('*').eq('user_id', userId),
        daily_health_aggregates: client.from('daily_health_aggregates').select('*').eq('user_id', userId),
        audit_events: client.from('audit_events').select('*').eq('user_id', userId),
      }
      const entries = await Promise.all(Object.entries(queries).map(async ([name, query]) => {
        const result = await query
        return [name, result] as const
      }))
      const failed = entries.find(([, result]) => result.error)
      if (failed?.[1].error) return failure(failed[1].error)
      return {
        ok: true,
        value: {
          exportedAt: new Date().toISOString(),
          userId,
          data: Object.fromEntries(entries.map(([name, result]) => [name, result.data ?? []])),
        },
      }
    },

    async deleteAccount() {
      const { error } = await client.functions.invoke('delete-account', { method: 'POST' })
      if (error) return failure(error)
      await client.auth.signOut({ scope: 'local' })
      return ok()
    },

    async createTask(userId, input) {
      const { error } = await client.from('tasks').insert({
        id: input.entityId,
        user_id: userId,
        title: input.title,
        starts_at: input.start,
        ends_at: input.end,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        category: input.category ?? 'ทั่วไป',
        priority: input.priority ?? 'medium',
        goal_id: input.goalId ?? null,
        idempotency_key: input.idempotencyKey ?? crypto.randomUUID(),
      })
      return idempotentWrite(error)
    },

    async createGoal(userId, input) {
      const { error } = await client.from('goals').insert({ id: input.entityId, user_id: userId, title: input.title, description: input.description || null, target_date: input.targetDate ?? null, idempotency_key: input.idempotencyKey })
      return idempotentWrite(error)
    },

    async setGoalStatus(userId, goalId, status) {
      const { error } = await client.from('goals').update({ status, updated_at: new Date().toISOString() }).eq('id', goalId).eq('user_id', userId)
      return error ? failure(error) : ok()
    },

    async softDeleteGoal(userId, goalId) {
      const now = new Date().toISOString()
      const [goal, milestones] = await Promise.all([
        client.from('goals').update({ deleted_at: now, updated_at: now }).eq('id', goalId).eq('user_id', userId),
        client.from('milestones').update({ deleted_at: now, updated_at: now }).eq('goal_id', goalId).eq('user_id', userId),
      ])
      return goal.error || milestones.error ? failure(goal.error ?? milestones.error) : ok()
    },

    async createMilestone(userId, input) {
      const { error } = await client.from('milestones').insert({ id: input.entityId, user_id: userId, goal_id: input.goalId, title: input.title, target_date: input.targetDate ?? null, sort_order: input.sortOrder, idempotency_key: input.idempotencyKey })
      return idempotentWrite(error)
    },

    async setMilestoneStatus(userId, milestoneId, status) {
      const { error } = await client.from('milestones').update({ status, updated_at: new Date().toISOString() }).eq('id', milestoneId).eq('user_id', userId)
      return error ? failure(error) : ok()
    },

    async softDeleteMilestone(userId, milestoneId) {
      const { error } = await client.from('milestones').update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', milestoneId).eq('user_id', userId)
      return error ? failure(error) : ok()
    },

    async setTaskStatus(userId, taskId, status, expectedUpdatedAt) {
      let query = client.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', taskId).eq('user_id', userId)
      if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt)
      const { data, error } = await query.select('id')
      if (error) return failure(error)
      if (expectedUpdatedAt && (!data || data.length === 0)) {
        return { ok: false, error: dataError('conflict', 'งานนี้ถูกแก้ไขจากอุปกรณ์อื่นแล้ว กรุณาเลือกเวอร์ชันที่ต้องการ') }
      }
      return ok()
    },

    async softDeleteTask(userId, taskId) {
      const { error } = await client.from('tasks').update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', taskId).eq('user_id', userId)
      return error ? failure(error) : ok()
    },

    async restoreTask(userId, taskId) {
      const { error } = await client.from('tasks').update({ deleted_at: null, updated_at: new Date().toISOString() }).eq('id', taskId).eq('user_id', userId)
      return error ? failure(error) : ok()
    },

    async createHabit(userId, input) {
      const { error } = await client.from('habits').insert({ id: input.entityId, user_id: userId, title: input.title, cue: input.cue || null, target: input.target, unit: input.unit, idempotency_key: input.idempotencyKey })
      return idempotentWrite(error)
    },

    async setHabitCheckIn(userId, habitId, localDate, completed) {
      const query = completed
        ? client.from('habit_checkins').upsert({ user_id: userId, habit_id: habitId, local_date: localDate, value: 1 }, { onConflict: 'habit_id,local_date' })
        : client.from('habit_checkins').delete().eq('user_id', userId).eq('habit_id', habitId).eq('local_date', localDate)
      const { error } = await query
      return error ? failure(error) : ok()
    },

    async recordPoints(userId, sourceType, sourceId, amount, reason, idempotencyKey) {
      const { error } = await client.from('point_transactions').insert({ user_id: userId, source_type: sourceType, source_id: sourceId, amount, reason, idempotency_key: idempotencyKey })
      return idempotentWrite(error)
    },

    async recordFocusSession(userId, taskId, plannedMinutes, elapsedSeconds, idempotencyKey) {
      const now = new Date().toISOString()
      const { error } = await client.from('focus_sessions').insert({
        user_id: userId,
        task_id: taskId ?? null,
        planned_minutes: plannedMinutes,
        elapsed_seconds: elapsedSeconds,
        started_at: new Date(Date.now() - elapsedSeconds * 1_000).toISOString(),
        ended_at: now,
        idempotency_key: idempotencyKey,
      })
      return idempotentWrite(error)
    },
  }
}
