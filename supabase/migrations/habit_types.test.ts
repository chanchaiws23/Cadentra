import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./202608120001_habit_types.sql', import.meta.url), 'utf8')

describe('habit types migration', () => {
  it('adds a constrained additive habit type column', () => {
    expect(migration).toContain('add column if not exists habit_type')
    for (const type of ['boolean', 'count', 'duration', 'number']) expect(migration).toContain(`'${type}'`)
  })
})
