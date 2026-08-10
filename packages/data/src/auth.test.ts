import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createSupabaseAuthGateway, toAuthSession } from './auth'

const session = {
  user: { id: 'user-1', email: 'chai@example.com' },
  expires_at: 1_800_000_000,
} as Session

describe('Supabase auth gateway', () => {
  it('maps Supabase sessions to app-owned session data', () => {
    expect(toAuthSession(session)).toEqual({
      user: { id: 'user-1', email: 'chai@example.com' },
      expiresAt: 1_800_000_000,
    })
    expect(toAuthSession(null)).toBeNull()
  })

  it('uses password sign-in and returns typed failures', async () => {
    const signInWithPassword = vi.fn()
      .mockResolvedValueOnce({ data: { session }, error: null })
      .mockResolvedValueOnce({ data: { session: null }, error: { message: 'Invalid login credentials' } })
    const client = { auth: { signInWithPassword } } as unknown as SupabaseClient
    const gateway = createSupabaseAuthGateway(client)

    await expect(gateway.signIn('chai@example.com', 'password123')).resolves.toEqual({
      ok: true,
      value: { session: toAuthSession(session), confirmationRequired: false },
    })
    await expect(gateway.signIn('chai@example.com', 'wrong-password')).resolves.toEqual({
      ok: false,
      message: 'Invalid login credentials',
    })
  })

  it('marks sign-up without a session as awaiting email confirmation', async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' }, session: null }, error: null })
    const client = { auth: { signUp } } as unknown as SupabaseClient
    const gateway = createSupabaseAuthGateway(client)

    await expect(gateway.signUp('chai@example.com', 'password123', 'https://cadentra.app')).resolves.toEqual({
      ok: true,
      value: { session: null, confirmationRequired: true },
    })
    expect(signUp).toHaveBeenCalledWith({
      email: 'chai@example.com',
      password: 'password123',
      options: { emailRedirectTo: 'https://cadentra.app' },
    })
  })
})
