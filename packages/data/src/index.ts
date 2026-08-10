import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export * from './repository'

export function createCadentraClient(url?: string, anonKey?: string): SupabaseClient | null {
  return url && anonKey ? createClient(url, anonKey) : null
}

export const localStore = {
  get<T>(key: string, fallback: T): T {
    try { return JSON.parse(localStorage.getItem(key) ?? '') as T } catch { return fallback }
  },
  set<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)) },
}
