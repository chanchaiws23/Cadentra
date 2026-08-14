import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIProposal, CalendarConnection, DailyHealthAggregate, ExternalCalendarEvent, FocusInterruption, FocusSession, Goal, Habit, HabitType, ItemStatus, Milestone, NotificationRule, PersonalReward, Priority, Reflection, ReflectionPeriod, Task, TaskOccurrence, UserProfile } from '@cadentra/domain'
import { dataError, type DataResult } from './repository'

export interface UserDataSnapshot {
  profile: UserProfile | null
  tasks: Task[]
  taskOccurrences: TaskOccurrence[]
  habits: Habit[]
  goals: Goal[]
  milestones: Milestone[]
  points: number
  focusMinutes: number
  focusSessions: FocusSession[]
  notificationRule: NotificationRule | null
  reflections: Reflection[]
  calendarConnection: CalendarConnection | null
  externalCalendarEvents: ExternalCalendarEvent[]
  rewards: PersonalReward[]
  aiProposals: AIProposal[]
  healthAggregates: DailyHealthAggregate[]
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
  recurrenceRule?: string
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
  type: HabitType
  recurrenceRule: string
}

export interface RecordFocusSessionInput {
  entityId?: string
  taskId?: string
  plannedMinutes: number
  elapsedSeconds: number
  pauseSeconds: number
  interruptions: FocusInterruption[]
}

export type UpdateProfileInput = Omit<UserProfile, 'id'>

export interface SaveReflectionInput {
  period: ReflectionPeriod
  localDate: string
  wins: string
  blockers: string
  nextStep: string
}

export interface RegisterDeviceInput {
  platform: 'web' | 'android'
  endpoint: string
  registration: Record<string, unknown>
}

export interface AccountExport {
  exportedAt: string
  userId: string
  data: Record<string, unknown[]>
}

export interface UserDataGateway {
  load(userId: string, focusSince: string, localDate: string): Promise<DataResult<UserDataSnapshot>>
  saveProfile(userId: string, input: UpdateProfileInput): Promise<DataResult<void>>
  saveNotificationRule(userId: string, input: Omit<NotificationRule, 'userId'>): Promise<DataResult<void>>
  saveReflection(userId: string, input: SaveReflectionInput): Promise<DataResult<void>>
  startGoogleCalendar(userId: string): Promise<DataResult<string>>
  syncGoogleCalendar(userId: string): Promise<DataResult<void>>
  disconnectGoogleCalendar(userId: string): Promise<DataResult<void>>
  createReward(userId: string, title: string, pointCost: number): Promise<DataResult<void>>
  redeemReward(userId: string, rewardId: string): Promise<DataResult<void>>
  registerDevice(userId: string, input: RegisterDeviceInput): Promise<DataResult<void>>
  sendTestNotification(userId: string): Promise<DataResult<void>>
  requestAIProposal(userId: string, instruction: string, includeHealth: boolean): Promise<DataResult<void>>
  applyAIProposal(userId: string, proposalId: string, changeIds: string[]): Promise<DataResult<void>>
  rejectAIProposal(userId: string, proposalId: string): Promise<DataResult<void>>
  undoAIProposal(userId: string, proposalId: string): Promise<DataResult<void>>
  saveHealthAggregate(userId: string, input: Omit<DailyHealthAggregate, 'id' | 'source'>): Promise<DataResult<void>>
  exportAccount(userId: string): Promise<DataResult<AccountExport>>
  deleteAccount(): Promise<DataResult<void>>
  createTask(userId: string, input: CreateTaskInput): Promise<DataResult<string>>
  createGoal(userId: string, input: CreateGoalInput): Promise<DataResult<string>>
  setGoalStatus(userId: string, goalId: string, status: ItemStatus): Promise<DataResult<void>>
  softDeleteGoal(userId: string, goalId: string): Promise<DataResult<void>>
  restoreGoal(userId: string, goalId: string): Promise<DataResult<void>>
  createMilestone(userId: string, input: CreateMilestoneInput): Promise<DataResult<string>>
  setMilestoneStatus(userId: string, milestoneId: string, status: ItemStatus): Promise<DataResult<void>>
  softDeleteMilestone(userId: string, milestoneId: string): Promise<DataResult<void>>
  restoreMilestone(userId: string, milestoneId: string): Promise<DataResult<void>>
  setTaskStatus(userId: string, taskId: string, status: ItemStatus, expectedUpdatedAt?: string): Promise<DataResult<void>>
  rescheduleTask(userId: string, taskId: string, start: string, end: string, expectedUpdatedAt?: string): Promise<DataResult<void>>
  setTaskOccurrenceStatus(userId: string, taskId: string, localDate: string, status: ItemStatus): Promise<DataResult<void>>
  softDeleteTask(userId: string, taskId: string): Promise<DataResult<void>>
  restoreTask(userId: string, taskId: string): Promise<DataResult<void>>
  createHabit(userId: string, input: CreateHabitInput): Promise<DataResult<void>>
  setHabitCheckIn(userId: string, habitId: string, localDate: string, value: number | null): Promise<DataResult<void>>
  useHabitFreeze(userId: string, habitId: string, localDate: string): Promise<DataResult<void>>
  recordPoints(userId: string, sourceType: string, sourceId: string, amount: number, reason: string, idempotencyKey?: string): Promise<DataResult<void>>
  recordFocusSession(userId: string, input: RecordFocusSessionInput, idempotencyKey?: string): Promise<DataResult<void>>
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
  habit_type: HabitType
  recurrence_rule: string
  freeze_balance: number
}

interface HabitCheckInRow {
  habit_id: string
  local_date: string
  value: number | string
  is_freeze: boolean
}

interface ProfileRow {
  id: string
  display_name: string
  timezone: string
  locale: 'th' | 'en'
  gamification_enabled: boolean
  health_ai_consent: boolean
}

interface FocusSessionRow {
  id: string
  user_id: string
  task_id: string | null
  planned_minutes: number
  elapsed_seconds: number
  pause_seconds: number
  interruption_count: number
  interruptions: FocusInterruption[]
  started_at: string
  ended_at: string
}

interface NotificationRuleRow {
  user_id: string
  enabled: boolean
  quiet_start: string
  quiet_end: string
  daily_limit: number
  focus_break_minutes: number
}

interface ReflectionRow {
  id: string
  user_id: string
  period: ReflectionPeriod
  local_date: string
  content: { wins?: string; blockers?: string; nextStep?: string } | null
  created_at: string
}

interface CalendarConnectionRow {
  id: string
  provider: 'google'
  provider_account_id: string
  sync_status: 'idle' | 'syncing' | 'error'
  last_synced_at: string | null
}

interface ExternalCalendarEventRow {
  id: string
  connection_id: string
  title: string
  starts_at: string
  ends_at: string
  all_day: boolean
}

interface PersonalRewardRow {
  id: string
  user_id: string
  title: string
  point_cost: number
  redeemed_at: string | null
  created_at: string
}

interface AIProposalRow { id: string; status: AIProposal['status']; reason: string; changes: AIProposal['changes']; created_at: string }
interface DailyHealthAggregateRow { id: string; local_date: string; steps: number | null; sleep_minutes: number | null; exercise_minutes: number | null; source: 'health_connect' }

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
    recurrenceRule: row.recurrence_rule ?? undefined,
    updatedAt: row.updated_at,
  }
}

export function mapGoalRow(row: GoalRow): Goal {
  return { id: row.id, userId: row.user_id, title: row.title, description: row.description ?? '', targetDate: row.target_date ?? undefined, status: row.status, updatedAt: row.updated_at }
}

export function mapMilestoneRow(row: MilestoneRow): Milestone {
  return { id: row.id, userId: row.user_id, goalId: row.goal_id, title: row.title, targetDate: row.target_date ?? undefined, status: row.status, sortOrder: row.sort_order, updatedAt: row.updated_at }
}

export function mapFocusSessionRow(row: FocusSessionRow): FocusSession {
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id ?? undefined,
    plannedMinutes: row.planned_minutes,
    elapsedSeconds: row.elapsed_seconds,
    pauseSeconds: row.pause_seconds,
    interruptionCount: row.interruption_count,
    interruptions: row.interruptions ?? [],
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: 'completed',
  }
}

export function mapNotificationRuleRow(row: NotificationRuleRow | null): NotificationRule | null {
  return row ? { userId: row.user_id, enabled: row.enabled, quietStart: row.quiet_start.slice(0, 5), quietEnd: row.quiet_end.slice(0, 5), dailyLimit: row.daily_limit, focusBreakMinutes: row.focus_break_minutes } : null
}

export function mapReflectionRow(row: ReflectionRow): Reflection {
  return {
    id: row.id,
    userId: row.user_id,
    period: row.period,
    localDate: row.local_date,
    wins: row.content?.wins ?? '',
    blockers: row.content?.blockers ?? '',
    nextStep: row.content?.nextStep ?? '',
    createdAt: row.created_at,
  }
}

export function mapCalendarConnectionRow(row: CalendarConnectionRow | null): CalendarConnection | null {
  return row ? { id: row.id, provider: row.provider, accountId: row.provider_account_id, syncStatus: row.sync_status, lastSyncedAt: row.last_synced_at ?? undefined } : null
}

export function mapExternalCalendarEventRow(row: ExternalCalendarEventRow): ExternalCalendarEvent {
  return { id: row.id, connectionId: row.connection_id, title: row.title, start: row.starts_at, end: row.ends_at, allDay: row.all_day, readOnly: true }
}

export function mapPersonalRewardRow(row: PersonalRewardRow): PersonalReward {
  return { id: row.id, userId: row.user_id, title: row.title, pointCost: row.point_cost, redeemedAt: row.redeemed_at ?? undefined, createdAt: row.created_at }
}

export function mapAIProposalRow(row: AIProposalRow): AIProposal { return { id: row.id, status: row.status, reason: row.reason, changes: row.changes, createdAt: row.created_at } }
export function mapDailyHealthAggregateRow(row: DailyHealthAggregateRow): DailyHealthAggregate { return { id: row.id, localDate: row.local_date, steps: row.steps ?? undefined, sleepMinutes: row.sleep_minutes ?? undefined, exerciseMinutes: row.exercise_minutes ?? undefined, source: row.source } }

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

const dayCodes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

export function isHabitScheduled(recurrenceRule: string, localDate: string): boolean {
  if (!recurrenceRule.includes('BYDAY=')) return true
  const days = recurrenceRule.split('BYDAY=')[1]?.split(';')[0].split(',') ?? []
  return days.includes(dayCodes[new Date(`${localDate}T12:00:00Z`).getUTCDay()])
}

export function calculateHabitStreak(checkIns: readonly { localDate: string; value: number; frozen: boolean }[], target: number, recurrenceRule: string, localDate: string): number {
  const fulfilled = new Set(checkIns.filter((entry) => entry.frozen || entry.value >= target).map((entry) => entry.localDate))
  let cursor = localDate
  if (isHabitScheduled(recurrenceRule, cursor) && !fulfilled.has(cursor)) cursor = dateBefore(cursor, 1)
  let streak = 0
  for (let scanned = 0; scanned < 3660; scanned += 1) {
    if (!isHabitScheduled(recurrenceRule, cursor)) { cursor = dateBefore(cursor, 1); continue }
    if (!fulfilled.has(cursor)) break
    streak += 1
    cursor = dateBefore(cursor, 1)
  }
  return streak
}

export function buildHabits(rows: readonly HabitRow[], checkIns: readonly HabitCheckInRow[], localDate: string): Habit[] {
  const checkInsByHabit = new Map<string, { localDate: string; value: number; frozen: boolean }[]>()
  for (const checkIn of checkIns) {
    const entries = checkInsByHabit.get(checkIn.habit_id) ?? []
    entries.push({ localDate: checkIn.local_date, value: Number(checkIn.value), frozen: checkIn.is_freeze })
    checkInsByHabit.set(checkIn.habit_id, entries)
  }
  return rows.map((row) => {
    const checkIns = (checkInsByHabit.get(row.id) ?? []).sort((a, b) => a.localDate.localeCompare(b.localDate))
    const target = Number(row.target)
    const completedDates = checkIns.filter((entry) => entry.value >= target).map((entry) => entry.localDate)
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      cue: row.cue ?? '',
      target,
      unit: row.unit,
      type: row.habit_type,
      recurrenceRule: row.recurrence_rule,
      freezeBalance: row.freeze_balance,
      streak: calculateHabitStreak(checkIns, target, row.recurrence_rule, localDate),
      completedDates,
      checkIns,
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

function idempotentCreate(error: { message: string; code?: string } | null, entityId: string): DataResult<string> {
  return !error || error.code === '23505' ? { ok: true, value: entityId } : failure(error)
}

export function createSupabaseUserDataGateway(client: SupabaseClient): UserDataGateway {
  return {
    async load(userId, focusSince, localDate) {
      const [profile, tasks, taskOccurrences, goals, milestones, habits, checkIns, points, focusSessions, notificationRule, reflections, calendarConnection, externalCalendarEvents, rewards, aiProposals, healthAggregates] = await Promise.all([
        client.from('profiles').select('id,display_name,timezone,locale,gamification_enabled,health_ai_consent').eq('id', userId).maybeSingle(),
        client.from('tasks').select('id,user_id,title,starts_at,ends_at,category,priority,status,goal_id,recurrence_rule,updated_at').eq('user_id', userId).is('deleted_at', null).order('starts_at'),
        client.from('task_occurrences').select('task_id,local_date,status').eq('user_id', userId),
        client.from('goals').select('id,user_id,title,description,target_date,status,updated_at').eq('user_id', userId).is('deleted_at', null).order('created_at'),
        client.from('milestones').select('id,user_id,goal_id,title,target_date,status,sort_order,updated_at').eq('user_id', userId).is('deleted_at', null).order('sort_order'),
        client.from('habits').select('id,user_id,title,cue,target,unit,habit_type,recurrence_rule,freeze_balance').eq('user_id', userId).is('deleted_at', null).order('created_at'),
        client.from('habit_checkins').select('habit_id,local_date,value,is_freeze').eq('user_id', userId).order('local_date'),
        client.from('point_transactions').select('amount').eq('user_id', userId),
        client.from('focus_sessions').select('id,user_id,task_id,planned_minutes,elapsed_seconds,pause_seconds,interruption_count,interruptions,started_at,ended_at').eq('user_id', userId).gte('created_at', focusSince).order('started_at', { ascending: false }),
        client.from('notification_rules').select('user_id,enabled,quiet_start,quiet_end,daily_limit,focus_break_minutes').eq('user_id', userId).maybeSingle(),
        client.from('reflections').select('id,user_id,period,local_date,content,created_at').eq('user_id', userId).order('local_date', { ascending: false }).limit(30),
        client.from('calendar_connections').select('id,provider,provider_account_id,sync_status,last_synced_at').eq('user_id', userId).eq('provider', 'google').maybeSingle(),
        client.from('external_calendar_events').select('id,connection_id,title,starts_at,ends_at,all_day').eq('user_id', userId).is('deleted_at', null).gte('ends_at', focusSince).order('starts_at').limit(250),
        client.from('personal_rewards').select('id,user_id,title,point_cost,redeemed_at,created_at').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }),
        client.from('ai_proposals').select('id,status,reason,changes,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
        client.from('daily_health_aggregates').select('id,local_date,steps,sleep_minutes,exercise_minutes,source').eq('user_id', userId).order('local_date', { ascending: false }).limit(30),
      ])
      const error = profile.error ?? tasks.error ?? taskOccurrences.error ?? goals.error ?? milestones.error ?? habits.error ?? checkIns.error ?? points.error ?? focusSessions.error ?? notificationRule.error ?? reflections.error ?? calendarConnection.error ?? externalCalendarEvents.error ?? rewards.error ?? aiProposals.error ?? healthAggregates.error
      if (error) return failure(error)
      return {
        ok: true,
        value: {
          profile: mapProfileRow(profile.data as ProfileRow | null),
          tasks: (tasks.data as TaskRow[]).map(mapTaskRow).filter((task): task is Task => Boolean(task)),
          taskOccurrences: (taskOccurrences.data as { task_id: string; local_date: string; status: ItemStatus }[]).map((entry) => ({ taskId: entry.task_id, localDate: entry.local_date, status: entry.status })),
          goals: (goals.data as GoalRow[]).map(mapGoalRow),
          milestones: (milestones.data as MilestoneRow[]).map(mapMilestoneRow),
          habits: buildHabits(habits.data as HabitRow[], checkIns.data as HabitCheckInRow[], localDate),
          points: (points.data as { amount: number }[]).reduce((total, entry) => total + entry.amount, 0),
          focusMinutes: Math.floor((focusSessions.data as FocusSessionRow[]).reduce((total, entry) => total + entry.elapsed_seconds, 0) / 60),
          focusSessions: (focusSessions.data as FocusSessionRow[]).map(mapFocusSessionRow),
          notificationRule: mapNotificationRuleRow(notificationRule.data as NotificationRuleRow | null),
          reflections: (reflections.data as ReflectionRow[]).map(mapReflectionRow),
          calendarConnection: mapCalendarConnectionRow(calendarConnection.data as CalendarConnectionRow | null),
          externalCalendarEvents: (externalCalendarEvents.data as ExternalCalendarEventRow[]).map(mapExternalCalendarEventRow),
          rewards: (rewards.data as PersonalRewardRow[]).map(mapPersonalRewardRow),
          aiProposals: (aiProposals.data as AIProposalRow[]).map(mapAIProposalRow),
          healthAggregates: (healthAggregates.data as DailyHealthAggregateRow[]).map(mapDailyHealthAggregateRow),
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

    async saveNotificationRule(userId, input) {
      const { error } = await client.from('notification_rules').upsert({ user_id: userId, enabled: input.enabled, quiet_start: input.quietStart, quiet_end: input.quietEnd, daily_limit: input.dailyLimit, focus_break_minutes: input.focusBreakMinutes, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      return error ? failure(error) : ok()
    },

    async saveReflection(userId, input) {
      const { error } = await client.from('reflections').upsert({
        user_id: userId,
        period: input.period,
        local_date: input.localDate,
        content: { wins: input.wins, blockers: input.blockers, nextStep: input.nextStep },
      }, { onConflict: 'user_id,period,local_date' })
      return error ? failure(error) : ok()
    },

    async startGoogleCalendar(_userId) {
      const { data, error } = await client.functions.invoke('google-calendar', { body: { action: 'start' } })
      return error || !data?.url ? failure(error ?? { message: 'Google Calendar authorization URL was not returned.' }) : { ok: true, value: data.url as string }
    },

    async syncGoogleCalendar(_userId) {
      const { error } = await client.functions.invoke('google-calendar', { body: { action: 'sync' } })
      return error ? failure(error) : ok()
    },

    async disconnectGoogleCalendar(_userId) {
      const { error } = await client.functions.invoke('google-calendar', { body: { action: 'disconnect' } })
      return error ? failure(error) : ok()
    },

    async createReward(userId, title, pointCost) {
      const { error } = await client.from('personal_rewards').insert({ user_id: userId, title, point_cost: pointCost })
      return error ? failure(error) : ok()
    },

    async redeemReward(_userId, rewardId) {
      const { error } = await client.rpc('redeem_personal_reward', { p_reward_id: rewardId })
      return error ? failure(error) : ok()
    },

    async registerDevice(userId, input) {
      const { error } = await client.from('device_registrations').upsert({ user_id: userId, platform: input.platform, endpoint: input.endpoint, registration: input.registration, active: true, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id,endpoint' })
      return error ? failure(error) : ok()
    },

    async sendTestNotification(_userId) {
      const { error } = await client.functions.invoke('send-notification', { body: { kind: 'test', title: 'Cadentra พร้อมแล้ว', body: 'การแจ้งเตือนบนอุปกรณ์นี้ทำงานตามปกติ' } })
      return error ? failure(error) : ok()
    },

    async requestAIProposal(_userId, instruction, includeHealth) {
      const { error } = await client.functions.invoke('ai-proposal', { body: { instruction, includeHealth } })
      return error ? failure(error) : ok()
    },

    async applyAIProposal(_userId, proposalId, changeIds) {
      const { error } = await client.rpc('apply_ai_proposal', { p_proposal_id: proposalId, p_change_ids: changeIds })
      return error ? failure(error) : ok()
    },

    async rejectAIProposal(userId, proposalId) {
      const { error } = await client.from('ai_proposals').update({ status: 'rejected' }).eq('id', proposalId).eq('user_id', userId).eq('status', 'draft')
      return error ? failure(error) : ok()
    },

    async undoAIProposal(_userId, proposalId) {
      const { error } = await client.rpc('undo_ai_proposal', { p_proposal_id: proposalId })
      return error ? failure(error) : ok()
    },

    async saveHealthAggregate(userId, input) {
      const { error } = await client.from('daily_health_aggregates').upsert({ user_id: userId, local_date: input.localDate, steps: input.steps ?? null, sleep_minutes: input.sleepMinutes ?? null, exercise_minutes: input.exerciseMinutes ?? null, source: 'health_connect' }, { onConflict: 'user_id,local_date,source' })
      return error ? failure(error) : ok()
    },

    async exportAccount(userId) {
      const queries = {
        profiles: client.from('profiles').select('*').eq('id', userId),
        goals: client.from('goals').select('*').eq('user_id', userId),
        milestones: client.from('milestones').select('*').eq('user_id', userId),
        tasks: client.from('tasks').select('*').eq('user_id', userId),
        task_occurrences: client.from('task_occurrences').select('*').eq('user_id', userId),
        habits: client.from('habits').select('*').eq('user_id', userId),
        habit_checkins: client.from('habit_checkins').select('*').eq('user_id', userId),
        focus_sessions: client.from('focus_sessions').select('*').eq('user_id', userId),
        reflections: client.from('reflections').select('*').eq('user_id', userId),
        point_transactions: client.from('point_transactions').select('*').eq('user_id', userId),
        ai_proposals: client.from('ai_proposals').select('*').eq('user_id', userId),
        calendar_connections: client.from('calendar_connections').select('id,user_id,provider,provider_account_id,sync_cursor,sync_status,last_synced_at,created_at').eq('user_id', userId),
        external_event_links: client.from('external_event_links').select('*').eq('user_id', userId),
        external_calendar_events: client.from('external_calendar_events').select('*').eq('user_id', userId),
        personal_rewards: client.from('personal_rewards').select('*').eq('user_id', userId),
        device_registrations: client.from('device_registrations').select('id,user_id,platform,active,last_seen_at,created_at').eq('user_id', userId),
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
      const entityId = input.entityId ?? crypto.randomUUID()
      const { error } = await client.from('tasks').insert({
        id: entityId,
        user_id: userId,
        title: input.title,
        starts_at: input.start,
        ends_at: input.end,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        category: input.category ?? 'ทั่วไป',
        priority: input.priority ?? 'medium',
        goal_id: input.goalId ?? null,
        recurrence_rule: input.recurrenceRule ?? null,
        idempotency_key: input.idempotencyKey ?? crypto.randomUUID(),
      })
      return idempotentCreate(error, entityId)
    },

    async createGoal(userId, input) {
      const entityId = input.entityId ?? crypto.randomUUID()
      const { error } = await client.from('goals').insert({ id: entityId, user_id: userId, title: input.title, description: input.description || null, target_date: input.targetDate ?? null, idempotency_key: input.idempotencyKey ?? crypto.randomUUID() })
      return idempotentCreate(error, entityId)
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

    async restoreGoal(userId, goalId) {
      const deletedGoal = await client.from('goals').select('deleted_at').eq('id', goalId).eq('user_id', userId).maybeSingle()
      if (deletedGoal.error) return failure(deletedGoal.error)
      const deletedAt = deletedGoal.data?.deleted_at
      const now = new Date().toISOString()
      const goal = await client.from('goals').update({ deleted_at: null, updated_at: now }).eq('id', goalId).eq('user_id', userId)
      if (goal.error) return failure(goal.error)
      if (!deletedAt) return ok()
      const milestones = await client.from('milestones').update({ deleted_at: null, updated_at: now }).eq('goal_id', goalId).eq('user_id', userId).eq('deleted_at', deletedAt)
      return milestones.error ? failure(milestones.error) : ok()
    },

    async createMilestone(userId, input) {
      const entityId = input.entityId ?? crypto.randomUUID()
      const { error } = await client.from('milestones').insert({ id: entityId, user_id: userId, goal_id: input.goalId, title: input.title, target_date: input.targetDate ?? null, sort_order: input.sortOrder, idempotency_key: input.idempotencyKey ?? crypto.randomUUID() })
      return idempotentCreate(error, entityId)
    },

    async setMilestoneStatus(userId, milestoneId, status) {
      const { error } = await client.from('milestones').update({ status, updated_at: new Date().toISOString() }).eq('id', milestoneId).eq('user_id', userId)
      return error ? failure(error) : ok()
    },

    async softDeleteMilestone(userId, milestoneId) {
      const { error } = await client.from('milestones').update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', milestoneId).eq('user_id', userId)
      return error ? failure(error) : ok()
    },

    async restoreMilestone(userId, milestoneId) {
      const { error } = await client.from('milestones').update({ deleted_at: null, updated_at: new Date().toISOString() }).eq('id', milestoneId).eq('user_id', userId)
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

    async rescheduleTask(userId, taskId, start, end, expectedUpdatedAt) {
      let query = client.from('tasks').update({ starts_at: start, ends_at: end, updated_at: new Date().toISOString() }).eq('id', taskId).eq('user_id', userId)
      if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt)
      const { data, error } = await query.select('id')
      if (error) return failure(error)
      if (expectedUpdatedAt && (!data || data.length === 0)) return { ok: false, error: dataError('conflict', 'เวลาของงานนี้ถูกแก้ไขจากอุปกรณ์อื่นแล้ว') }
      return ok()
    },

    async setTaskOccurrenceStatus(userId, taskId, localDate, status) {
      const { error } = await client.from('task_occurrences').upsert({ user_id: userId, task_id: taskId, local_date: localDate, status, updated_at: new Date().toISOString() }, { onConflict: 'task_id,local_date' })
      return error ? failure(error) : ok()
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
      const { error } = await client.from('habits').insert({ id: input.entityId, user_id: userId, title: input.title, cue: input.cue || null, target: input.target, unit: input.unit, habit_type: input.type, recurrence_rule: input.recurrenceRule, freeze_balance: 1, idempotency_key: input.idempotencyKey })
      return idempotentWrite(error)
    },

    async setHabitCheckIn(userId, habitId, localDate, value) {
      const query = value !== null
        ? client.from('habit_checkins').upsert({ user_id: userId, habit_id: habitId, local_date: localDate, value, is_freeze: false, recorded_retroactively: localDate !== new Date().toISOString().slice(0, 10) }, { onConflict: 'habit_id,local_date' })
        : client.from('habit_checkins').delete().eq('user_id', userId).eq('habit_id', habitId).eq('local_date', localDate)
      const { error } = await query
      return error ? failure(error) : ok()
    },

    async useHabitFreeze(_userId, habitId, localDate) {
      const { error } = await client.rpc('use_habit_freeze', { p_habit_id: habitId, p_local_date: localDate })
      return error ? failure(error) : ok()
    },

    async recordPoints(userId, sourceType, sourceId, amount, reason, idempotencyKey) {
      const { error } = await client.from('point_transactions').insert({ user_id: userId, source_type: sourceType, source_id: sourceId, amount, reason, idempotency_key: idempotencyKey })
      return idempotentWrite(error)
    },

    async recordFocusSession(userId, input, idempotencyKey) {
      const now = new Date().toISOString()
      const { error } = await client.from('focus_sessions').insert({
        id: input.entityId,
        user_id: userId,
        task_id: input.taskId ?? null,
        planned_minutes: input.plannedMinutes,
        elapsed_seconds: input.elapsedSeconds,
        pause_seconds: input.pauseSeconds,
        interruption_count: input.interruptions.length,
        interruptions: input.interruptions,
        started_at: new Date(Date.now() - (input.elapsedSeconds + input.pauseSeconds) * 1_000).toISOString(),
        ended_at: now,
        idempotency_key: idempotencyKey,
      })
      return idempotentWrite(error)
    },
  }
}
