import { describe, expect, it } from 'vitest'
import { dataError, isSyncConflict, type MutationResult } from './repository'

describe('repository contracts', () => {
  it('marks transient failures as recoverable', () => {
    expect(dataError('offline', 'No connection').recoverable).toBe(true)
    expect(dataError('unavailable', 'Try later').recoverable).toBe(true)
    expect(dataError('unauthorized', 'Sign in again').recoverable).toBe(false)
  })

  it('identifies a sync conflict without treating it as a silent success', () => {
    const result: MutationResult<{ title: string }> = {
      kind: 'conflict',
      local: { title: 'Local title' },
      remote: { title: 'Remote title' },
      conflictingFields: ['title'],
    }

    expect(isSyncConflict(result)).toBe(true)
  })
})
