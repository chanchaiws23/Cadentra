import type { ItemStatus, Task } from '@cadentra/domain'
import { calculateCurrentStreak, type CreateHabitInput, type CreateTaskInput, type UpdateProfileInput, type UserDataGateway, type UserDataSnapshot } from './cloud-data'
import { dataError, type DataResult } from './repository'

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

type PendingMutation = { conflict?: string } & (
  | { id: string; type: 'profile.save'; input: UpdateProfileInput }
  | { id: string; type: 'task.create'; input: CreateTaskInput }
  | { id: string; type: 'task.status'; taskId: string; status: ItemStatus; expectedUpdatedAt?: string }
  | { id: string; type: 'task.delete'; taskId: string }
  | { id: string; type: 'task.restore'; taskId: string }
  | { id: string; type: 'habit.create'; input: CreateHabitInput }
  | { id: string; type: 'habit.checkin'; habitId: string; localDate: string; completed: boolean }
  | { id: string; type: 'points.record'; sourceType: string; sourceId: string; amount: number; reason: string }
  | { id: string; type: 'focus.record'; taskId?: string; plannedMinutes: number; elapsedSeconds: number }
)

interface CachedUserData {
  snapshot: UserDataSnapshot
  deletedTasks: Task[]
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
  return { snapshot: { profile: null, tasks: [], habits: [], points: 0, focusMinutes: 0 }, deletedTasks: [] }
}

export function createOfflineUserDataGateway(
  remote: UserDataGateway,
  storage: StorageAdapter,
  options: OfflineGatewayOptions = {},
): UserDataGateway {
  const isOnline = options.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine)
  const createId = options.createId ?? (() => crypto.randomUUID())
  let activeUserId: string | undefined
  const readCache = (userId: string) => readJson(storage, cacheKey(userId), defaultCache())
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
          category: mutation.input.category ?? 'ทั่วไป', priority: mutation.input.priority ?? 'medium', status: 'planned',
        })
        snapshot.tasks.sort((a, b) => a.start.localeCompare(b.start))
        break
      case 'task.status': {
        const task = snapshot.tasks.find((entry) => entry.id === mutation.taskId)
        if (task) task.status = mutation.status
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
          target: mutation.input.target, unit: mutation.input.unit, streak: 0, completedDates: [],
        })
        break
      case 'habit.checkin': {
        const habit = snapshot.habits.find((entry) => entry.id === mutation.habitId)
        if (!habit) break
        const dates = new Set(habit.completedDates)
        if (mutation.completed) dates.add(mutation.localDate)
        else dates.delete(mutation.localDate)
        habit.completedDates = [...dates].sort()
        habit.streak = calculateCurrentStreak(habit.completedDates, mutation.localDate)
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
      case 'task.create': return remote.createTask(userId, mutation.input)
      case 'task.status': return remote.setTaskStatus(userId, mutation.taskId, mutation.status, mutation.expectedUpdatedAt)
      case 'task.delete': return remote.softDeleteTask(userId, mutation.taskId)
      case 'task.restore': return remote.restoreTask(userId, mutation.taskId)
      case 'habit.create': return remote.createHabit(userId, mutation.input)
      case 'habit.checkin': return remote.setHabitCheckIn(userId, mutation.habitId, mutation.localDate, mutation.completed)
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
          writeCache(userId, { snapshot: result.value, deletedTasks: [] })
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
    createTask(userId, input) {
      const id = createId()
      return mutate(userId, { id, type: 'task.create', input: { ...input, entityId: input.entityId ?? createId(), idempotencyKey: input.idempotencyKey ?? id } })
    },
    setTaskStatus: (userId, taskId, status, expectedUpdatedAt) => mutate(userId, { id: createId(), type: 'task.status', taskId, status, expectedUpdatedAt }),
    softDeleteTask: (userId, taskId) => mutate(userId, { id: createId(), type: 'task.delete', taskId }),
    restoreTask: (userId, taskId) => mutate(userId, { id: createId(), type: 'task.restore', taskId }),
    createHabit(userId, input) {
      const id = createId()
      return mutate(userId, { id, type: 'habit.create', input: { ...input, entityId: input.entityId ?? createId(), idempotencyKey: input.idempotencyKey ?? id } })
    },
    setHabitCheckIn: (userId, habitId, localDate, completed) => mutate(userId, { id: createId(), type: 'habit.checkin', habitId, localDate, completed }),
    recordPoints: (userId, sourceType, sourceId, amount, reason) => mutate(userId, { id: createId(), type: 'points.record', sourceType, sourceId, amount, reason }),
    recordFocusSession: (userId, taskId, plannedMinutes, elapsedSeconds) => mutate(userId, { id: createId(), type: 'focus.record', taskId, plannedMinutes, elapsedSeconds }),
    syncPending,
    pendingCount: (userId) => readQueue(userId).length,
    syncIssues: (userId) => readQueue(userId).filter((mutation) => mutation.conflict).map((mutation) => ({
      id: mutation.id,
      kind: 'conflict' as const,
      title: mutation.type === 'task.status' ? 'สถานะงานมีข้อมูลชนกัน' : 'ข้อมูลรอการตรวจสอบ',
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
        : await replay(userId, { ...mutation, conflict: undefined })
      if (!result.ok) return result
      writeQueue(userId, queue.filter((entry) => entry.id !== mutationId))
      return { ok: true, value: undefined }
    },
  }
}
