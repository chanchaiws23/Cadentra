import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
const rootEnvironmentExample = readFileSync(new URL('../../../.env.example', import.meta.url), 'utf8')

describe('web environment loading', () => {
  it('loads environment files from the monorepo root', () => {
    expect(viteConfig).toContain("envDir: '../..'")
    expect(rootEnvironmentExample).toContain('VITE_SUPABASE_URL=')
    expect(rootEnvironmentExample).toContain('VITE_SUPABASE_ANON_KEY=')
  })
})
