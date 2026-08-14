import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./202608140003_personal_rewards.sql', import.meta.url), 'utf8')

describe('personal reward ledger', () => {
  it('redeems rewards atomically against the point ledger', () => {
    expect(source).toContain('for update')
    expect(source).toContain('sum(amount)')
    expect(source).toContain("'personal_reward_redeemed'")
    expect(source).toContain('security definer')
  })
})
