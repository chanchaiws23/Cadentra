import type { Session, SupabaseClient } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
}

export interface AuthSession {
  user: AuthUser
  expiresAt?: number
}

export interface AuthFailure {
  ok: false
  message: string
}

export interface AuthSuccess<T> {
  ok: true
  value: T
}

export type AuthResult<T> = AuthSuccess<T> | AuthFailure

export interface AuthAction {
  session: AuthSession | null
  confirmationRequired: boolean
}

export interface AuthGateway {
  getSession(): Promise<AuthResult<AuthSession | null>>
  signIn(email: string, password: string): Promise<AuthResult<AuthAction>>
  signUp(email: string, password: string, redirectTo?: string): Promise<AuthResult<AuthAction>>
  signOut(): Promise<AuthResult<void>>
  onAuthStateChange(listener: (session: AuthSession | null) => void): () => void
}

export function toAuthSession(session: Session | null): AuthSession | null {
  if (!session) return null
  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? '',
    },
    expiresAt: session.expires_at,
  }
}

export function createSupabaseAuthGateway(client: SupabaseClient): AuthGateway {
  return {
    async getSession() {
      const { data, error } = await client.auth.getSession()
      return error
        ? { ok: false, message: error.message }
        : { ok: true, value: toAuthSession(data.session) }
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      return error
        ? { ok: false, message: error.message }
        : { ok: true, value: { session: toAuthSession(data.session), confirmationRequired: false } }
    },

    async signUp(email, password, redirectTo) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      })
      return error
        ? { ok: false, message: error.message }
        : {
            ok: true,
            value: {
              session: toAuthSession(data.session),
              confirmationRequired: Boolean(data.user && !data.session),
            },
          }
    },

    async signOut() {
      const { error } = await client.auth.signOut()
      return error ? { ok: false, message: error.message } : { ok: true, value: undefined }
    },

    onAuthStateChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) => listener(toAuthSession(session)))
      return () => data.subscription.unsubscribe()
    },
  }
}
