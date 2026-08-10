import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export * from './repository'
export * from './auth'
export * from './cloud-data'
export * from './offline-data'

export function createCadentraClient(url?: string, anonKey?: string): SupabaseClient | null {
  return url && anonKey ? createClient(url, anonKey) : null
}
