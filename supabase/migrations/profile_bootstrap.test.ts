import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./202608040001_initial_schema.sql', import.meta.url), 'utf8')

describe('profile bootstrap migration', () => {
  it('creates a profile for every new auth user with a hardened trigger function', () => {
    expect(migration).toContain('create or replace function public.handle_new_user()')
    expect(migration).toContain('security definer')
    expect(migration).toContain("set search_path = ''")
    expect(migration).toContain('insert into public.profiles (id, display_name)')
    expect(migration).toContain('on conflict (id) do nothing')
    expect(migration).toContain('after insert on auth.users')
    expect(migration).toContain('revoke all on function public.handle_new_user() from public')
  })
})
