import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')

describe('delete-account Edge Function', () => {
  it('authenticates the caller and keeps admin deletion server-side', () => {
    expect(source).toContain("request.headers.get('Authorization')")
    expect(source).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')")
    expect(source).toContain('caller.auth.getUser()')
    expect(source).toContain('admin.auth.admin.deleteUser(user.id, false)')
    expect(source).not.toContain('serviceRoleKey:')
    expect(source).not.toContain("'Access-Control-Allow-Origin': '*'")
  })

  it('removes user-owned storage files before deleting the auth user', () => {
    expect(source).toContain('admin.storage.listBuckets()')
    expect(source).toContain('collectUserFiles(admin, bucket.id, user.id)')
    expect(source).toContain('.remove(files.slice(index, index + 100))')
  })
})
