import { describe, expect, it } from 'vitest'
import { buildReviewReportHtml } from './review-report'

describe('review report', () => {
  it('escapes reflection content and exposes print-to-PDF action', () => {
    const html = buildReviewReportHtml([], [], [{ id: 'r', userId: 'u', period: 'weekly', localDate: '2026-08-14', wins: '<script>alert(1)</script>', blockers: '', nextStep: '', createdAt: '' }], 10, 20)
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('window.print()')
  })
})
