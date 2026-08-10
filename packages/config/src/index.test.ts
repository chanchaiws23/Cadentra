import { describe, expect, it } from 'vitest'
import { EnvironmentConfigurationError, parseWebEnvironment } from './index'

describe('parseWebEnvironment', () => {
  it('uses local mode when cloud configuration is absent', () => {
    expect(parseWebEnvironment({})).toEqual({ mode: 'local' })
  })

  it('accepts a complete Supabase configuration', () => {
    expect(parseWebEnvironment({
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
    })).toEqual({
      mode: 'cloud',
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-anon-key',
    })
  })

  it('rejects partial or insecure cloud configuration', () => {
    expect(() => parseWebEnvironment({ VITE_SUPABASE_URL: 'https://project.supabase.co' }))
      .toThrow(EnvironmentConfigurationError)
    expect(() => parseWebEnvironment({
      VITE_SUPABASE_URL: 'http://project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
    })).toThrow('Cloud endpoints must use HTTPS')
  })
})
