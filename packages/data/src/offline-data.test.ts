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
  habits: [{ id: 'habit-1', userId: 'user-1', title: 'Read', cue: '', target: 20, unit: 'minutes', streak: 0, completedDates: [] }],
  points: 0,
  focusMinutes: 0,
}

function remoteGateway(): UserDataGateway {
  return {
    load: vi.fn(async () => ({ ok: true as const, value: snapshot })),
    saveProfile: vi.fn(async () => ({ ok: true as const, value: undefined })),
    exportAccount: vi.fn(async (userId) => ({ ok: true as const, value: { exportedAt: '', userId, data: {} } })),
    deleteAccount: vi.fn(async () => ({ ok: true as const, value: undefined })),
    createTask: vi.fn(async () => ({ ok: true as const, value: undefined })),
    setTaskStatus: vi.fn(async () => ({ ok: true as const, value: undefined })),
    softDeleteTask: vi.fn(async () => ({ ok: true as const, value: undefined })),
    restoreTask: vi.fn(async () => ({ ok: true as const, value: undefined })),
    createHabit: vi.fn(async () => ({ ok: true as const, value: undefined })),
    setHabitCheckIn: vi.fn(async () => ({ ok: true as const, value: undefined })),
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
    await gateway.createTask('user-1', {
      title: 'Offline task', start: '2026-08-10T03:00:00.000Z', end: '2026-08-10T04:00:00.000Z',
    })
    await gateway.setHabitCheckIn('user-1', 'habit-1', '2026-08-10', true)
    await gateway.recordPoints('user-1', 'habit', 'habit-1', 8, 'habit_checked_in')

    const optimistic = await gateway.load('user-1', '', '2026-08-10')
    expect(optimistic.ok && optimistic.value.tasks.some((task) => task.title === 'Offline task')).toBe(true)
    expect(optimistic.ok && optimistic.value.habits[0].completedDates).toContain('2026-08-10')
    expect(optimistic.ok && optimistic.value.points).toBe(8)
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
})
