// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { vapidKeyBytes } from './push-registration'

describe('push registration', () => {
  it('decodes URL-safe VAPID public keys', () => {
    expect([...vapidKeyBytes('AQIDBA')]).toEqual([1, 2, 3, 4])
  })
})
