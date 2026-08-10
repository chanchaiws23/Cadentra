// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppErrorBoundary } from './AppErrorBoundary'

function BrokenView(): never {
  throw new Error('render exploded')
}

describe('AppErrorBoundary', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined))
  afterEach(() => vi.restoreAllMocks())

  it('shows a recoverable fallback when a child cannot render', () => {
    render(<AppErrorBoundary><BrokenView /></AppErrorBoundary>)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'เปิดพื้นที่ทำงานไม่สำเร็จ' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'โหลดใหม่' })).toBeTruthy()
  })
})
