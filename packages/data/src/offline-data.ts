import type { Goal, ItemStatus, Milestone, Task } from '@cadentra/domain'
import { calculateHabitStreak, type CreateGoalInput, type CreateHabitInput, type CreateMilestoneInput, type CreateTaskInput, type UpdateProfileInput, type UserDataGateway, type UserDataSnapshot } from './cloud-data'
import { dataError, type DataResult } from './repository'

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

type PendingMutation = { conflict?: string } & (
  | { id: string; type: 'profile.save'; input: UpdateProfileInput }
  | { id: string; type: 'task.create'; input: CreateTaskInput }
  | { id: string; type: 'goal.create'; input: CreateGoalInput }
  | { id: string; type: 'goal.status'; goalId: string; status: ItemStatus }
  | { id: string; type: 'goal.delete'; goalId: string }
  | { id: string; type: 'goal.restore'; goalId: string }
  | { id: string; type: 'milestone.create'; input: CreateMilestoneInput }
  | { id: string; type: 'milestone.status'; milestoneId: string; status: ItemStatus }
  | { id: string; type: 'milestone.delete'; milestoneId: string }
  | { id: string; type: 'milestone.restore'; milestoneId: string }
  | { id: string; type: 'task.status'; taskId: string; status: ItemStatus; expectedUpdatedAt?: string }
  | { id: string; type: 'task.schedule'; taskId: string; start: string; end: string; expectedUpdatedAt?: string }
  | { id: string; type: 'task.occurrence-status'; taskId: string; localDate: string; status: ItemStatus }
  | { id: string; type: 'task.delete'; taskId: string }
  | { id: string; type: 'task.restore'; taskId: string }
  | { id: string; type: 'habit.create'; input: CreateHabitInput }
  | { id: string; type: 'habit.checkin'; habitId: string; localDate: string; value: number | null }
  | { id: string; type: 'habit.freeze'; habitId: string; localDate: string }
  | { id: string; type: 'points.record'; sourceType: string; sourceId: string; amount: number; reason: string }
  | { id: string; type: 'focus.record'; taskId?: string; plannedMinutes: number; elapsedSeconds: number }
)

interface CachedUserData {
  snapshot: UserDataSnapshot
  deletedTasks: Task[]
  deletedGoals: { goal: Goal; milestones: Milestone[] }[]
  deletedMilestones: Milestone[]
}

export interface OfflineGatewayOptions {
  isOnline?: () => boolean
  createId?: () => string
}

const cacheKey = (userId: string) => `cadentra:data:${userId}`
const queueKey = (userId: string) => `cadentra:queue:${userId}`

function readJson<T>(storage: StorageAdapter, key: string, fallback: T): T {
  try {
    const value = storage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function defaultCache(): CachedUserData {
  return { snapshot: { profile: null, tasks: [], taskOccurrences: [], goals: [], milestones: [], habits: [], points: 0, focusMinutes: 0 }, deletedTasks: [], deletedGoals: [], deletedMilestones: [] }
}

export function createOfflineUserDataGateway(
  remote: UserDataGateway,
  storage: StorageAdapter,
  options: OfflineGatewayOptions = {},
): UserDataGateway {
  const isOnline = options.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine)
  const createId = options.createId ?? (() => crypto.randomUUID())
  let activeUserId: string | undefined
  const readCache = (userId: string) => {
    const cache = readJson(storage, cacheKey(userId), defaultCache())
    cache.snapshot.goals ??= []
    cache.snapshot.milestones ??= []
    cache.snapshot.taskOccurrences ??= []
    cache.snapshot.habits ??= []
    cache.snapshot.habits = cache.snapshot.habits.map((habit) => ({
      ...habit,
      type: habit.type ?? 'boolean',
      recurrenceRule: habit.recurrenceRule ?? 'FREQ=DAILY',
      freezeBalance: habit.freezeBalance ?? 0,
      checkIns: (habit.checkIns ?? habit.completedDates.map((localDate) => ({ localDate, value: habit.target, frozen: false }))).map((entry) => ({ ...entry, frozen: entry.frozen ?? false })),
    }))
    cache.deletedTasks ??= []
    cache.deletedGoals ??= []
    cache.deletedMilestones ??= []
    return cache
  }
  const writeCache = (userId: string, cache: CachedUserData) => storage.setItem(cacheKey(userId), JSON.stringify(cache))
  const readQueue = (userId: string) => readJson<PendingMutation[]>(storage, queueKey(userId), [])
  const writeQueue = (userId: string, queue: PendingMutation[]) => {
    if (queue.length) storage.setItem(queueKey(userId), JSON.stringify(queue))
    else storage.removeItem(queueKey(userId))
  }

  const applyOptimistic = (userId: string, mutation: PendingMutation) => {
    const cache = readCache(userId)
    const snapshot = cache.snapshot
    switch (mutation.type) {
      case 'profile.save':
        snapshot.profile = { id: userId, ...mutation.input }
        break
      case 'task.create':
        snapshot.tasks.push({
          id: mutation.input.entityId!, userId, title: mutation.input.title,
          start: mutation.input.start, end: mutation.input.end,
          category: mutation.input.category ?? 'ทั่วไป', priority: mutation.input.priority ?? 'medium', status: 'planned', goalId: mutation.input.goalId,
          recurring: Boolean(mutation.input.recurrenceRule), recurrenceRule: mutation.input.recurrenceRule,
        })
        snapshot.tasks.sort((a, b) => a.start.localeCompare(b.start))
        break
      case 'goal.create':
        snapshot.goals.push({ id: mutation.input.entityId!, userId, title: mutation.input.title, description: mutation.input.description, targetDate: mutation.input.targetDate, status: 'planned', updatedAt: new Date().toISOString() })
        break
      case 'goal.status': {
        const goal = snapshot.goals.find((entry) => entry.id === mutation.goalId)
        if (goal) goal.status = mutation.status
        break
      }
      case 'goal.delete': {
        const goal = snapshot.goals.find((entry) => entry.id === mutation.goalId)
        const milestones = snapshot.milestones.filter((entry) => entry.goalId === mutation.goalId)
        if (goal) cache.deletedGoals = [...cache.deletedGoals.filter((entry) => entry.goal.id !== goal.id), { goal, milestones }]
        snapshot.goals = snapshot.goals.filter((entry) => entry.id !== mutation.goalId)
        snapshot.milestones = snapshot.milestones.filter((entry) => entry.goalId !== mutation.goalId)
        break
      }
      case 'goal.restore': {
        const deleted = cache.deletedGoals.find((entry) => entry.goal.id === mutation.goalId)
        if (deleted && !snapshot.goals.some((entry) => entry.id === deleted.goal.id)) {
          snapshot.goals.push(deleted.goal)
          snapshot.milestones.push(...deleted.milestones.filter((milestone) => !snapshot.milestones.some((entry) => entry.id === milestone.id)))
        }
        cache.deletedGoals = cache.deletedGoals.filter((entry) => entry.goal.id !== mutation.goalId)
        break
      }
      case 'milestone.create':
        snapshot.milestones.push({ id: mutation.input.entityId!, userId, goalId: mutation.input.goalId, title: mutation.input.title, targetDate: mutation.input.targetDate, status: 'planned', sortOrder: mutation.input.sortOrder, updatedAt: new Date().toISOString() })
        break
      case 'milestone.status': {
        const milestone = snapshot.milestones.find((entry) => entry.id === mutation.milestoneId)
        if (milestone) milestone.status = mutation.status
        break
      }
      case 'milestone.delete': {
        const milestone = snapshot.milestones.find((entry) => entry.id === mutation.milestoneId)
        if (milestone) cache.deletedMilestones = [...cache.deletedMilestones.filter((entry) => entry.id !== milestone.id), milestone]
        snapshot.milestones = snapshot.milestones.filter((entry) => entry.id !== mutation.milestoneId)
        break
      }
      case 'milestone.restore': {
        const milestone = cache.deletedMilestones.find((entry) => entry.id === mutation.milestoneId)
        if (milestone && !snapshot.milestones.some((entry) => entry.id === milestone.id)) snapshot.milestones.push(milestone)
        cache.deletedMilestones = cache.deletedMilestones.filter((entry) => entry.id !== mutation.milestoneId)
        break
      }
      case 'task.status': {
        const task = snapshot.tasks.find((entry) => entry.id === mutation.taskId)
        if (task) task.status = mutation.status
        break
      }
      case 'task.schedule': {
        const task = snapshot.tasks.find((entry) => entry.id === mutation.taskId)
        if (task) { task.start = mutation.start; task.end = mutation.end }
        snapshot.tasks.sort((a, b) => a.start.localeCompare(b.start))
        break
      }
      case 'task.occurrence-status': {
        const existing = snapshot.taskOccurrences.find((entry) => entry.taskId === mutation.taskId && entry.localDate === mutation.localDate)
        if (existing) existing.status = mutation.status
        else snapshot.taskOccurrences.push({ taskId: mutation.taskId, localDate: mutation.localDate, status: mutation.status })
        break
      }
      case 'task.delete': {
        const task = snapshot.tasks.find((entry) => entry.id === mutation.taskId)
        if (task) cache.deletedTasks = [...cache.deletedTasks.filter((entry) => entry.id !== task.id), task]
        snapshot.tasks = snapshot.tasks.filter((entry) => entry.id !== mutation.taskId)
        break
      }
      case 'task.restore': {
        const task = cache.deletedTasks.find((entry) => entry.id === mutation.taskId)
        if (task && !snapshot.tasks.some((entry) => entry.id === task.id)) snapshot.tasks.push(task)
        cache.deletedTasks = cache.deletedTasks.filter((entry) => entry.id !== mutation.taskId)
        snapshot.tasks.sort((a, b) => a.start.localeCompare(b.start))
        break
      }
      case 'habit.create':
        snapshot.habits.push({
          id: mutation.input.entityId!, userId, title: mutation.input.title, cue: mutation.input.cue,
          target: mutation.input.target, unit: mutation.input.unit, type: mutation.input.type, recurrenceRule: mutation.input.recurrenceRule, freezeBalance: 1, streak: 0, completedDates: [], checkIns: [],
        })
        break
      case 'habit.checkin': {
        const habit = snapshot.habits.find((entry) => entry.id === mutation.habitId)
        if (!habit) break
        const remaining = habit.checkIns.filter((entry) => entry.localDate !== mutation.localDate)
        habit.checkIns = mutation.value === null
          ? remaining
          : [...remaining, { localDate: mutation.localDate, value: mutation.value, frozen: false }].sort((a, b) => a.localDate.localeCompare(b.localDate))
        habit.completedDates = habit.checkIns.filter((entry) => entry.value >= habit.target).map((entry) => entry.localDate)
        habit.streak = calculateHabitStreak(habit.checkIns, habit.target, habit.recurrenceRule, mutation.localDate)
        break
      }
      case 'habit.freeze': {
        const habit = snapshot.habits.find((entry) => entry.id === mutation.habitId)
        if (!habit || habit.freezeBalance < 1 || habit.checkIns.some((entry) => entry.localDate === mutation.localDate)) break
        habit.freezeBalance -= 1
        habit.checkIns = [...habit.checkIns, { localDate: mutation.localDate, value: 0, frozen: true }].sort((a, b) => a.localDate.localeCompare(b.localDate))
        habit.streak = calculateHabitStreak(habit.checkIns, habit.target, habit.recurrenceRule, mutation.localDate)
        break
      }
      case 'points.record':
        snapshot.points += mutation.amount
        break
      case 'focus.record':
        snapshot.focusMinutes += Math.floor(mutation.elapsedSeconds / 60)
        break
    }
    writeCache(userId, cache)
  }

  const enqueue = (userId: string, mutation: PendingMutation): DataResult<void> => {
    writeQueue(userId, [...readQueue(userId), mutation])
    applyOptimistic(userId, mutation)
    return { ok: true, value: undefined }
  }

  const replay = (userId: string, mutation: PendingMutation): Promise<DataResult<void>> => {
    switch (mutation.type) {
      case 'profile.save': return remote.saveProfile(userId, mutation.input)
      case 'task.create': return remote.createTask(userId, mutation.input).then((result) => result.ok ? { ok: true, value: undefined } : result)
      case 'goal.create': return remote.createGoal(userId, mutation.input).then((result) => result.ok ? { ok: true, value: undefined } : result)
      case 'goal.status': return remote.setGoalStatus(userId, mutation.goalId, mutation.status)
      case 'goal.delete': return remote.softDeleteGoal(userId, mutation.goalId)
      case 'goal.restore': return remote.restoreGoal(userId, mutation.goalId)
      case 'milestone.create': return remote.createMilestone(userId, mutation.input).then((result) => result.ok ? { ok: true, value: undefined } : result)
      case 'milestone.status': return remote.setMilestoneStatus(userId, mutation.milestoneId, mutation.status)
      case 'milestone.delete': return remote.softDeleteMilestone(userId, mutation.milestoneId)
      case 'milestone.restore': return remote.restoreMilestone(userId, mutation.milestoneId)
      case 'task.status': return remote.setTaskStatus(userId, mutation.taskId, mutation.status, mutation.expectedUpdatedAt)
      case 'task.schedule': return remote.rescheduleTask(userId, mutation.taskId, mutation.start, mutation.end, mutation.expectedUpdatedAt)
      case 'task.occurrence-status': return remote.setTaskOccurrenceStatus(userId, mutation.taskId, mutation.localDate, mutation.status)
      case 'task.delete': return remote.softDeleteTask(userId, mutation.taskId)
      case 'task.restore': return remote.restoreTask(userId, mutation.taskId)
      case 'habit.create': return remote.createHabit(userId, mutation.input)
      case 'habit.checkin': return remote.setHabitCheckIn(userId, mutation.habitId, mutation.localDate, mutation.value)
      case 'habit.freeze': return remote.useHabitFreeze(userId, mutation.habitId, mutation.localDate)
      case 'points.record': return remote.recordPoints(userId, mutation.sourceType, mutation.sourceId, mutation.amount, mutation.reason, mutation.id)
      case 'focus.record': return remote.recordFocusSession(userId, mutation.taskId, mutation.plannedMinutes, mutation.elapsedSeconds, mutation.id)
    }
  }

  const syncPending = async (userId: string): Promise<DataResult<{ synced: number; pending: number }>> => {
    if (!isOnline()) return { ok: false, error: dataError('offline', 'อุปกรณ์ยังออฟไลน์อยู่') }
    const queue = readQueue(userId)
    let synced = 0
    for (const mutation of queue) {
      if (mutation.conflict) {
        return { ok: false, error: dataError('conflict', mutation.conflict) }
      }
      const result = await replay(userId, mutation)
      if (!result.ok) {
        const remaining = queue.slice(synced)
        if (result.error.code === 'conflict') remaining[0] = { ...mutation, conflict: result.error.message }
        writeQueue(userId, remaining)
        return result
      }
      synced += 1
      writeQueue(userId, queue.slice(synced))
    }
    return { ok: true, value: { synced, pending: 0 } }
  }

  async function mutate(userId: string, mutation: PendingMutation): Promise<DataResult<void>> {
    if (!isOnline()) return enqueue(userId, mutation)
    const result = await replay(userId, mutation)
    if (!result.ok && result.error.code === 'conflict') {
      enqueue(userId, { ...mutation, conflict: result.error.message })
      return result
    }
    return result.ok || !result.error.recoverable ? result : enqueue(userId, mutation)
  }

  return {
    async load(userId, focusSince, localDate) {
      activeUserId = userId
      if (isOnline()) {
        await syncPending(userId)
        const result = await remote.load(userId, focusSince, localDate)
        if (result.ok) {
          writeCache(userId, { snapshot: result.value, deletedTasks: [], deletedGoals: [], deletedMilestones: [] })
          return result
        }
        const cached = storage.getItem(cacheKey(userId))
        if (cached) return { ok: true, value: readCache(userId).snapshot }
        return result
      }
      const cached = storage.getItem(cacheKey(userId))
      return cached
        ? { ok: true, value: readCache(userId).snapshot }
        : { ok: false, error: dataError('offline', 'ยังไม่มีข้อมูลล่าสุดในอุปกรณ์นี้ กรุณาเชื่อมต่ออินเทอร์เน็ตหนึ่งครั้ง') }
    },
    saveProfile: (userId, input) => mutate(userId, { id: createId(), type: 'profile.save', input }),
    exportAccount: (userId) => remote.exportAccount(userId),
    async deleteAccount() {
      const result = await remote.deleteAccount()
      if (result.ok && activeUserId) {
        storage.removeItem(cacheKey(activeUserId))
        storage.removeItem(queueKey(activeUserId))
        activeUserId = undefined
      }
      return result
    },
    async createTask(userId, input) {
      const id = createId()
      const entityId = input.entityId ?? createId()
      const result = await mutate(userId, { id, type: 'task.create', input: { ...input, entityId, idempotencyKey: input.idempotencyKey ?? id } })
      return result.ok ? { ok: true as const, value: entityId } : result
    },
    async createGoal(userId, input) {
      const id = createId()
      const entityId = input.entityId ?? createId()
      const result = await mutate(userId, { id, type: 'goal.create', input: { ...input, entityId, idempotencyKey: input.idempotencyKey ?? id } })
      return result.ok ? { ok: true as const, value: entityId } : result
    },
    setGoalStatus: (userId, goalId, status) => mutate(userId, { id: createId(), type: 'goal.status', goalId, status }),
    softDeleteGoal: (userId, goalId) => mutate(userId, { id: createId(), type: 'goal.delete', goalId }),
    restoreGoal: (userId, goalId) => mutate(userId, { id: createId(), type: 'goal.restore', goalId }),
    async createMilestone(userId, input) {
      const id = createId()
      const entityId = input.entityId ?? createId()
      const result = await mutate(userId, { id, type: 'milestone.create', input: { ...input, entityId, idempotencyKey: input.idempotencyKey ?? id } })
      return result.ok ? { ok: true as const, value: entityId } : result
    },
    setMilestoneStatus: (userId, milestoneId, status) => mutate(userId, { id: createId(), type: 'milestone.status', milestoneId, status }),
    softDeleteMilestone: (userId, milestoneId) => mutate(userId, { id: createId(), type: 'milestone.delete', milestoneId }),
    restoreMilestone: (userId, milestoneId) => mutate(userId, { id: createId(), type: 'milestone.restore', milestoneId }),
    setTaskStatus: (userId, taskId, status, expectedUpdatedAt) => mutate(userId, { id: createId(), type: 'task.status', taskId, status, expectedUpdatedAt }),
    rescheduleTask: (userId, taskId, start, end, expectedUpdatedAt) => mutate(userId, { id: createId(), type: 'task.schedule', taskId, start, end, expectedUpdatedAt }),
    setTaskOccurrenceStatus: (userId, taskId, localDate, status) => mutate(userId, { id: createId(), type: 'task.occurrence-status', taskId, localDate, status }),
    softDeleteTask: (userId, taskId) => mutate(userId, { id: createId(), type: 'task.delete', taskId }),
    restoreTask: (userId, taskId) => mutate(userId, { id: createId(), type: 'task.restore', taskId }),
    createHabit(userId, input) {
      const id = createId()
      return mutate(userId, { id, type: 'habit.create', input: { ...input, entityId: input.entityId ?? createId(), idempotencyKey: input.idempotencyKey ?? id } })
    },
    setHabitCheckIn: (userId, habitId, localDate, value) => mutate(userId, { id: createId(), type: 'habit.checkin', habitId, localDate, value }),
    useHabitFreeze: (userId, habitId, localDate) => mutate(userId, { id: createId(), type: 'habit.freeze', habitId, localDate }),
    recordPoints: (userId, sourceType, sourceId, amount, reason) => mutate(userId, { id: createId(), type: 'points.record', sourceType, sourceId, amount, reason }),
    recordFocusSession: (userId, taskId, plannedMinutes, elapsedSeconds) => mutate(userId, { id: createId(), type: 'focus.record', taskId, plannedMinutes, elapsedSeconds }),
    syncPending,
    pendingCount: (userId) => readQueue(userId).length,
    syncIssues: (userId) => readQueue(userId).filter((mutation) => mutation.conflict).map((mutation) => ({
      id: mutation.id,
      kind: 'conflict' as const,
      title: mutation.type === 'task.status' ? 'สถานะงานมีข้อมูลชนกัน' : mutation.type === 'task.schedule' ? 'เวลางานมีข้อมูลชนกัน' : 'ข้อมูลรอการตรวจสอบ',
      detail: mutation.conflict!,
    })),
    async resolveSyncIssue(userId, mutationId, resolution) {
      if (!isOnline()) return { ok: false, error: dataError('offline', 'กรุณาเชื่อมต่ออินเทอร์เน็ตก่อนแก้ข้อมูลชนกัน') }
      const queue = readQueue(userId)
      const mutation = queue.find((entry) => entry.id === mutationId)
      if (!mutation) return { ok: false, error: dataError('not_found', 'ไม่พบรายการที่ต้องแก้ไข') }
      if (resolution === 'cloud') {
        writeQueue(userId, queue.filter((entry) => entry.id !== mutationId && !(
          mutation.type === 'task.status' && entry.type === 'points.record' && entry.sourceType === 'task' && entry.sourceId === mutation.taskId
        )))
        return { ok: true, value: undefined }
      }
      const result = mutation.type === 'task.status'
        ? await remote.setTaskStatus(userId, mutation.taskId, mutation.status)
        : mutation.type === 'task.schedule'
          ? await remote.rescheduleTask(userId, mutation.taskId, mutation.start, mutation.end)
          : await replay(userId, { ...mutation, conflict: undefined })
      if (!result.ok) return result
      writeQueue(userId, queue.filter((entry) => entry.id !== mutationId))
      return { ok: true, value: undefined }
    },
  }
}
