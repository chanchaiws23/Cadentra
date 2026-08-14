import { describe, expect, it, vi } from 'vitest'
import type { UserDataGateway, UserDataSnapshot } from './cloud-data'
import { createOfflineUserDataGateway, type StorageAdapter } from './offline-data'

class MemoryStorage implements StorageAdapter {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

const snapshot: UserDataSnapshot = {
  profile: null,
  tasks: [{
    id: 'task-1', userId: 'user-1', title: 'Existing task',
    start: '2026-08-10T01:00:00.000Z', end: '2026-08-10T02:00:00.000Z',
    category: 'work', priority: 'medium', status: 'planned',
    updatedAt: '2026-08-10T00:00:00.000Z',
  }],
  taskOccurrences: [],
  goals: [],
  milestones: [],
  habits: [{ id: 'habit-1', userId: 'user-1', title: 'Read', cue: '', target: 20, unit: 'minutes', type: 'duration', recurrenceRule: 'FREQ=DAILY', freezeBalance: 1, streak: 0, completedDates: [], checkIns: [] }],
  points: 0,
  focusMinutes: 0,
  focusSessions: [],
  notificationRule: null,
  reflections: [],
  calendarConnection: null,
  externalCalendarEvents: [],
}

function remoteGateway(): UserDataGateway {
  return {
    load: vi.fn(async () => ({ ok: true as const, value: snapshot })),
    saveProfile: vi.fn(async () => ({ ok: true as const, value: undefined })),
    saveNotificationRule: vi.fn(async () => ({ ok: true as const, value: undefined })),
    saveReflection: vi.fn(async () => ({ ok: true as const, value: undefined })),
    startGoogleCalendar: vi.fn(async () => ({ ok: true as const, value: 'https://accounts.google.com/' })),
    syncGoogleCalendar: vi.fn(async () => ({ ok: true as const, value: undefined })),
    disconnectGoogleCalendar: vi.fn(async () => ({ ok: true as const, value: undefined })),
    exportAccount: vi.fn(async (userId) => ({ ok: true as const, value: { exportedAt: '', userId, data: {} } })),
    deleteAccount: vi.fn(async () => ({ ok: true as const, value: undefined })),
    createTask: vi.fn(async (_userId, input) => ({ ok: true as const, value: input.entityId! })),
    createGoal: vi.fn(async (_userId, input) => ({ ok: true as const, value: input.entityId! })),
    setGoalStatus: vi.fn(async () => ({ ok: true as const, value: undefined })),
    softDeleteGoal: vi.fn(async () => ({ ok: true as const, value: undefined })),
    restoreGoal: vi.fn(async () => ({ ok: true as const, value: undefined })),
    createMilestone: vi.fn(async (_userId, input) => ({ ok: true as const, value: input.entityId! })),
    setMilestoneStatus: vi.fn(async () => ({ ok: true as const, value: undefined })),
    softDeleteMilestone: vi.fn(async () => ({ ok: true as const, value: undefined })),
    restoreMilestone: vi.fn(async () => ({ ok: true as const, value: undefined })),
    setTaskStatus: vi.fn(async () => ({ ok: true as const, value: undefined })),
    rescheduleTask: vi.fn(async () => ({ ok: true as const, value: undefined })),
    setTaskOccurrenceStatus: vi.fn(async () => ({ ok: true as const, value: undefined })),
    softDeleteTask: vi.fn(async () => ({ ok: true as const, value: undefined })),
    restoreTask: vi.fn(async () => ({ ok: true as const, value: undefined })),
    createHabit: vi.fn(async () => ({ ok: true as const, value: undefined })),
    setHabitCheckIn: vi.fn(async () => ({ ok: true as const, value: undefined })),
    useHabitFreeze: vi.fn(async () => ({ ok: true as const, value: undefined })),
    recordPoints: vi.fn(async () => ({ ok: true as const, value: undefined })),
    recordFocusSession: vi.fn(async () => ({ ok: true as const, value: undefined })),
  }
}

describe('offline user data gateway', () => {
  it('serves the latest cloud snapshot while offline', async () => {
    let online = true
    const remote = remoteGateway()
    const gateway = createOfflineUserDataGateway(remote, new MemoryStorage(), { isOnline: () => online })

    expect((await gateway.load('user-1', '2026-08-10T00:00:00Z', '2026-08-10')).ok).toBe(true)
    online = false
    const cached = await gateway.load('user-1', '2026-08-10T00:00:00Z', '2026-08-10')

    expect(cached.ok && cached.value.tasks[0].title).toBe('Existing task')
    expect(remote.load).toHaveBeenCalledTimes(1)
  })

  it('optimistically creates offline data and replays it once with stable ids', async () => {
    let online = true
    let sequence = 0
    const remote = remoteGateway()
    const gateway = createOfflineUserDataGateway(remote, new MemoryStorage(), {
      isOnline: () => online,
      createId: () => `generated-${++sequence}`,
    })
    await gateway.load('user-1', '2026-08-10T00:00:00Z', '2026-08-10')

    online = false
    const createdTask = await gateway.createTask('user-1', {
      title: 'Offline task', start: '2026-08-10T03:00:00.000Z', end: '2026-08-10T04:00:00.000Z',
    })
    await gateway.setHabitCheckIn('user-1', 'habit-1', '2026-08-10', 20)
    await gateway.recordPoints('user-1', 'habit', 'habit-1', 8, 'habit_checked_in')

    const optimistic = await gateway.load('user-1', '', '2026-08-10')
    expect(optimistic.ok && optimistic.value.tasks.some((task) => task.title === 'Offline task')).toBe(true)
    expect(optimistic.ok && optimistic.value.habits[0].completedDates).toContain('2026-08-10')
    expect(optimistic.ok && optimistic.value.habits[0].checkIns[0].value).toBe(20)
    expect(optimistic.ok && optimistic.value.points).toBe(8)
    expect(createdTask).toEqual({ ok: true, value: 'generated-2' })
    expect(gateway.pendingCount?.('user-1')).toBe(3)

    online = true
    const synced = await gateway.syncPending?.('user-1')
    expect(synced?.ok && synced.value).toEqual({ synced: 3, pending: 0 })
    expect(remote.createTask).toHaveBeenCalledWith('user-1', expect.objectContaining({
      entityId: 'generated-2', idempotencyKey: 'generated-1',
    }))
    expect(remote.recordPoints).toHaveBeenCalledWith('user-1', 'habit', 'habit-1', 8, 'habit_checked_in', 'generated-4')
    expect(gateway.pendingCount?.('user-1')).toBe(0)
  })

  it('queues a streak freeze without spending the balance twice', async () => {
    let online = true
    const remote = remoteGateway()
    const gateway = createOfflineUserDataGateway(remote, new MemoryStorage(), { isOnline: () => online, createId: () => 'freeze-mutation' })
    await gateway.load('user-1', '', '2026-08-10')

    online = false
    await gateway.useHabitFreeze('user-1', 'habit-1', '2026-08-10')
    const cached = await gateway.load('user-1', '', '2026-08-10')
    expect(cached.ok && cached.value.habits[0]).toMatchObject({ freezeBalance: 0, streak: 1 })
    expect(cached.ok && cached.value.habits[0].checkIns[0]).toMatchObject({ localDate: '2026-08-10', frozen: true })

    online = true
    expect(await gateway.syncPending?.('user-1')).toMatchObject({ ok: true, value: { synced: 1, pending: 0 } })
    expect(remote.useHabitFreeze).toHaveBeenCalledTimes(1)
  })

  it('keeps a completed focus session available while offline', async () => {
    let online = true
    let sequence = 0
    const remote = remoteGateway()
    const gateway = createOfflineUserDataGateway(remote, new MemoryStorage(), { isOnline: () => online, createId: () => `focus-${++sequence}` })
    await gateway.load('user-1', '', '2026-08-10')

    online = false
    await gateway.recordFocusSession('user-1', {
      taskId: 'task-1', plannedMinutes: 25, elapsedSeconds: 900, pauseSeconds: 60,
      interruptions: [{ reason: 'ข้อความเข้า', recordedAt: '2026-08-10T03:10:00Z', elapsedSeconds: 300 }],
    })
    const cached = await gateway.load('user-1', '', '2026-08-10')
    expect(cached.ok && cached.value.focusSessions[0]).toMatchObject({ id: 'focus-2', interruptionCount: 1, pauseSeconds: 60 })
    expect(cached.ok && cached.value.focusMinutes).toBe(15)

    online = true
    await gateway.syncPending?.('user-1')
    expect(remote.recordFocusSession).toHaveBeenCalledWith('user-1', expect.objectContaining({ entityId: 'focus-2' }), 'focus-1')
  })

  it('stops on a version conflict and can force the local task status', async () => {
    let online = true
    const remote = remoteGateway()
    const conflict = { ok: false as const, error: { code: 'conflict' as const, message: 'remote task changed', recoverable: true } }
    vi.mocked(remote.setTaskStatus)
      .mockResolvedValueOnce(conflict)
      .mockResolvedValue({ ok: true, value: undefined })
    const gateway = createOfflineUserDataGateway(remote, new MemoryStorage(), { isOnline: () => online, createId: () => 'status-mutation' })
    await gateway.load('user-1', '', '2026-08-10')

    online = false
    await gateway.setTaskStatus('user-1', 'task-1', 'done', '2026-08-10T00:00:00.000Z')
    online = true
    const sync = await gateway.syncPending?.('user-1')

    expect(sync?.ok).toBe(false)
    expect(gateway.syncIssues?.('user-1')).toEqual([expect.objectContaining({ id: 'status-mutation', kind: 'conflict' })])
    const resolution = await gateway.resolveSyncIssue?.('user-1', 'status-mutation', 'local')
    expect(resolution?.ok).toBe(true)
    expect(remote.setTaskStatus).toHaveBeenLastCalledWith('user-1', 'task-1', 'done')
    expect(gateway.pendingCount?.('user-1')).toBe(0)
  })

  it('discards a conflicting task status and its pending points when cloud wins', async () => {
    let online = true
    const remote = remoteGateway()
    vi.mocked(remote.setTaskStatus).mockResolvedValue({ ok: false, error: { code: 'conflict', message: 'remote task changed', recoverable: true } })
    let id = 0
    const gateway = createOfflineUserDataGateway(remote, new MemoryStorage(), { isOnline: () => online, createId: () => `mutation-${++id}` })
    await gateway.load('user-1', '', '2026-08-10')

    online = false
    await gateway.setTaskStatus('user-1', 'task-1', 'done', '2026-08-10T00:00:00.000Z')
    await gateway.recordPoints('user-1', 'task', 'task-1', 10, 'task_completed')
    online = true
    await gateway.syncPending?.('user-1')

    const issue = gateway.syncIssues?.('user-1')[0]
    expect(issue).toBeDefined()
    await gateway.resolveSyncIssue?.('user-1', issue!.id, 'cloud')
    expect(gateway.pendingCount?.('user-1')).toBe(0)
    expect(remote.recordPoints).not.toHaveBeenCalled()
  })

  it('creates goals and milestones optimistically while offline', async () => {
    let online = true
    let id = 0
    const remote = remoteGateway()
    const gateway = createOfflineUserDataGateway(remote, new MemoryStorage(), { isOnline: () => online, createId: () => `goal-id-${++id}` })
    await gateway.load('user-1', '', '2026-08-10')
    online = false
    const createdGoal = await gateway.createGoal('user-1', { title: 'Run a marathon', description: 'Finish 42 km' })
    const createdMilestone = await gateway.createMilestone('user-1', { goalId: 'goal-id-2', title: 'Run 10 km', sortOrder: 0 })

    const cached = await gateway.load('user-1', '', '2026-08-10')
    expect(cached.ok && cached.value.goals[0]).toMatchObject({ id: 'goal-id-2', title: 'Run a marathon' })
    expect(cached.ok && cached.value.milestones[0]).toMatchObject({ goalId: 'goal-id-2', title: 'Run 10 km' })
    expect(gateway.pendingCount?.('user-1')).toBe(2)
    expect(createdGoal).toEqual({ ok: true, value: 'goal-id-2' })
    expect(createdMilestone).toEqual({ ok: true, value: 'goal-id-4' })

    online = true
    await gateway.syncPending?.('user-1')
    expect(remote.createGoal).toHaveBeenCalledWith('user-1', expect.objectContaining({ entityId: 'goal-id-2', idempotencyKey: 'goal-id-1' }))
    expect(remote.createMilestone).toHaveBeenCalledWith('user-1', expect.objectContaining({ goalId: 'goal-id-2', entityId: 'goal-id-4' }))
  })

  it('restores a deleted goal and its milestones while offline', async () => {
    let online = true
    let id = 0
    const remote = remoteGateway()
    vi.mocked(remote.load).mockResolvedValue({
      ok: true,
      value: {
        ...snapshot,
        goals: [{ id: 'goal-1', userId: 'user-1', title: 'Read more', description: '', status: 'planned', updatedAt: '' }],
        milestones: [{ id: 'milestone-1', userId: 'user-1', goalId: 'goal-1', title: 'Read chapter one', status: 'planned', sortOrder: 0, updatedAt: '' }],
      },
    })
    const gateway = createOfflineUserDataGateway(remote, new MemoryStorage(), { isOnline: () => online, createId: () => `restore-${++id}` })
    await gateway.load('user-1', '', '2026-08-10')

    online = false
    await gateway.softDeleteGoal('user-1', 'goal-1')
    let cached = await gateway.load('user-1', '', '2026-08-10')
    expect(cached.ok && cached.value.goals).toHaveLength(0)
    expect(cached.ok && cached.value.milestones).toHaveLength(0)

    await gateway.restoreGoal('user-1', 'goal-1')
    cached = await gateway.load('user-1', '', '2026-08-10')
    expect(cached.ok && cached.value.goals[0].id).toBe('goal-1')
    expect(cached.ok && cached.value.milestones[0].id).toBe('milestone-1')

    online = true
    await gateway.syncPending?.('user-1')
    expect(remote.softDeleteGoal).toHaveBeenCalledWith('user-1', 'goal-1')
    expect(remote.restoreGoal).toHaveBeenCalledWith('user-1', 'goal-1')
  })

  it('queues the status of one recurring occurrence while offline', async () => {
    let online = false
    const storage = new MemoryStorage()
    storage.setItem('cadentra:data:user-1', JSON.stringify({ snapshot, deletedTasks: [] }))
    const remote = remoteGateway()
    const gateway = createOfflineUserDataGateway(remote, storage, { isOnline: () => online, createId: () => 'occurrence-mutation' })

    await gateway.setTaskOccurrenceStatus('user-1', 'task-1', '2026-08-10', 'done')
    const cached = await gateway.load('user-1', '', '2026-08-10')
    expect(cached.ok && cached.value.taskOccurrences).toEqual([{ taskId: 'task-1', localDate: '2026-08-10', status: 'done' }])

    online = true
    await gateway.syncPending?.('user-1')
    expect(remote.setTaskOccurrenceStatus).toHaveBeenCalledWith('user-1', 'task-1', '2026-08-10', 'done')
  })

  it('reschedules a task optimistically and replays its expected version', async () => {
    let online = true
    const remote = remoteGateway()
    const gateway = createOfflineUserDataGateway(remote, new MemoryStorage(), { isOnline: () => online, createId: () => 'schedule-mutation' })
    await gateway.load('user-1', '', '2026-08-10')

    online = false
    await gateway.rescheduleTask('user-1', 'task-1', '2026-08-11T03:00:00.000Z', '2026-08-11T04:00:00.000Z', '2026-08-10T00:00:00.000Z')
    const cached = await gateway.load('user-1', '', '2026-08-10')
    expect(cached.ok && cached.value.tasks[0]).toMatchObject({ start: '2026-08-11T03:00:00.000Z', end: '2026-08-11T04:00:00.000Z' })

    online = true
    await gateway.syncPending?.('user-1')
    expect(remote.rescheduleTask).toHaveBeenCalledWith('user-1', 'task-1', '2026-08-11T03:00:00.000Z', '2026-08-11T04:00:00.000Z', '2026-08-10T00:00:00.000Z')
  })

  it('can force a local reschedule after a version conflict', async () => {
    let online = true
    const remote = remoteGateway()
    vi.mocked(remote.rescheduleTask)
      .mockResolvedValueOnce({ ok: false, error: { code: 'conflict', message: 'remote schedule changed', recoverable: true } })
      .mockResolvedValue({ ok: true, value: undefined })
    const gateway = createOfflineUserDataGateway(remote, new MemoryStorage(), { isOnline: () => online, createId: () => 'schedule-conflict' })
    await gateway.load('user-1', '', '2026-08-10')
    online = false
    await gateway.rescheduleTask('user-1', 'task-1', '2026-08-11T03:00:00.000Z', '2026-08-11T04:00:00.000Z', 'old-version')

    online = true
    await gateway.syncPending?.('user-1')
    expect(gateway.syncIssues?.('user-1')[0]).toMatchObject({ title: 'เวลางานมีข้อมูลชนกัน' })
    await gateway.resolveSyncIssue?.('user-1', 'schedule-conflict', 'local')

    expect(remote.rescheduleTask).toHaveBeenLastCalledWith('user-1', 'task-1', '2026-08-11T03:00:00.000Z', '2026-08-11T04:00:00.000Z')
    expect(gateway.pendingCount?.('user-1')).toBe(0)
  })
})
