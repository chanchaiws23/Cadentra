export interface WebEnvironment {
  mode: 'local' | 'cloud'
  supabaseUrl?: string
  supabaseAnonKey?: string
  vapidPublicKey?: string
}

export class EnvironmentConfigurationError extends Error {
  override name = 'EnvironmentConfigurationError'
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function parseWebEnvironment(input: Record<string, unknown>): WebEnvironment {
  const supabaseUrl = optionalString(input.VITE_SUPABASE_URL)
  const supabaseAnonKey = optionalString(input.VITE_SUPABASE_ANON_KEY)
  const vapidPublicKey = optionalString(input.VITE_VAPID_PUBLIC_KEY)

  if (Boolean(supabaseUrl) !== Boolean(supabaseAnonKey)) {
    throw new EnvironmentConfigurationError(
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured together.',
    )
  }

  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl)
      if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        throw new Error('Cloud endpoints must use HTTPS.')
      }
      if (url.pathname !== '/' || url.search || url.hash) {
        throw new Error('Use the Supabase project URL without /rest/v1 or another path.')
      }
    } catch (error) {
      throw new EnvironmentConfigurationError(
        `VITE_SUPABASE_URL is invalid: ${error instanceof Error ? error.message : 'unknown URL error'}`,
      )
    }
  }

  const push = vapidPublicKey ? { vapidPublicKey } : {}
  return supabaseUrl && supabaseAnonKey
    ? { mode: 'cloud', supabaseUrl, supabaseAnonKey, ...push }
    : { mode: 'local', ...push }
}
