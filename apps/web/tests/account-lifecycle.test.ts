import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../../../packages/data/src/cloud-data.ts', import.meta.url), 'utf8')

describe('account lifecycle gateway', () => {
  it('exports user-owned data without exporting encrypted calendar token references', () => {
    const calendarExport = source.match(/calendar_connections:[^\n]+/)?.[0] ?? ''
    expect(calendarExport).toContain(".eq('user_id', userId)")
    expect(calendarExport).not.toContain('encrypted_token_ref')
  })

  it('delegates permanent deletion to the authenticated Edge Function', () => {
    expect(source).toContain("client.functions.invoke('delete-account', { method: 'POST' })")
    expect(source).toContain("client.auth.signOut({ scope: 'local' })")
  })
})
