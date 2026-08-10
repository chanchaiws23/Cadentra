import type { Habit, Task } from '@cadentra/domain'

export type DataErrorCode =
  | 'unauthorized'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'offline'
  | 'unavailable'

export interface DataError {
  code: DataErrorCode
  message: string
  recoverable: boolean
  cause?: unknown
}

export type DataResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: DataError }

export interface MutationContext {
  idempotencyKey: string
  expectedVersion?: string
}

export interface SyncConflict<T> {
  kind: 'conflict'
  local: T
  remote: T
  conflictingFields: readonly (keyof T)[]
}

export type MutationResult<T> = DataResult<T> | SyncConflict<T>

export interface UserOwnedEntity {
  id: string
  userId: string
}

export interface Repository<T extends UserOwnedEntity> {
  list(userId: string): Promise<DataResult<readonly T[]>>
  get(userId: string, id: string): Promise<DataResult<T>>
  save(entity: T, context: MutationContext): Promise<MutationResult<T>>
  softDelete(userId: string, id: string, context: MutationContext): Promise<DataResult<void>>
}

export type TaskRepository = Repository<Task>
export type HabitRepository = Repository<Habit>

export function dataError(code: DataErrorCode, message: string, cause?: unknown): DataError {
  return {
    code,
    message,
    recoverable: code === 'offline' || code === 'unavailable' || code === 'conflict',
    cause,
  }
}

export function isSyncConflict<T>(result: MutationResult<T>): result is SyncConflict<T> {
  return 'kind' in result && result.kind === 'conflict'
}
