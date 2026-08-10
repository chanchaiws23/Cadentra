// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthGateway, AuthSession } from '@cadentra/data'
import { AuthProvider } from './AuthProvider'

const cloudSession: AuthSession = {
  user: { id: 'user-1', email: 'chai@example.com' },
}

function createGateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    getSession: vi.fn().mockResolvedValue({ ok: true, value: null }),
    signIn: vi.fn().mockResolvedValue({ ok: true, value: { session: cloudSession, confirmationRequired: false } }),
    signUp: vi.fn().mockResolvedValue({ ok: true, value: { session: null, confirmationRequired: true } }),
    signOut: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    onAuthStateChange: vi.fn().mockReturnValue(() => undefined),
    ...overrides,
  }
}

describe('AuthProvider', () => {
  afterEach(cleanup)

  it('fails closed instead of showing mock data when cloud configuration is absent', () => {
    render(<AuthProvider gateway={null}><p>พื้นที่ทำงาน</p></AuthProvider>)

    expect(screen.queryByText('พื้นที่ทำงาน')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ยังเชื่อมต่อ Supabase ไม่ได้' })).toBeInTheDocument()
  })

  it('gates cloud mode and opens the workspace after password sign-in', async () => {
    const gateway = createGateway()
    render(<AuthProvider gateway={gateway}><p>พื้นที่ทำงาน</p></AuthProvider>)

    expect(await screen.findByRole('heading', { name: 'เข้าสู่ Cadentra' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'chai@example.com' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

    await waitFor(() => expect(gateway.signIn).toHaveBeenCalledWith('chai@example.com', 'password123'))
    expect(await screen.findByText('พื้นที่ทำงาน')).toBeInTheDocument()
  })

  it('shows the email confirmation state after sign-up', async () => {
    const gateway = createGateway()
    render(<AuthProvider gateway={gateway}><p>พื้นที่ทำงาน</p></AuthProvider>)

    await screen.findByRole('heading', { name: 'เข้าสู่ Cadentra' })
    fireEvent.click(screen.getByRole('button', { name: /สร้างบัญชี/ }))
    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'สร้างบัญชี' }))

    expect(await screen.findByRole('heading', { name: 'ยืนยันบัญชีของคุณ' })).toBeInTheDocument()
    expect(screen.getByText('new@example.com')).toBeInTheDocument()
  })
})
