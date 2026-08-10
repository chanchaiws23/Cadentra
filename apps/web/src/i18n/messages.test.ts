import { describe, expect, it } from 'vitest'
import { messages, translate } from './messages'

describe('translations', () => {
  it('keeps Thai and English dictionaries in sync', () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.th).sort())
  })

  it('returns the requested locale', () => {
    expect(translate('th', 'nav.today')).toBe('วันนี้')
    expect(translate('en', 'nav.today')).toBe('Today')
  })
})
