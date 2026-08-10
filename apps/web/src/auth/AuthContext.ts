import { createContext, useContext } from 'react'
import type { AuthAction, AuthResult, AuthSession } from '@cadentra/data'

export type AuthMode = 'local' | 'cloud'

export interface AuthContextValue {
  mode: AuthMode
  session: AuthSession | null
  signIn: (email: string, password: string) => Promise<AuthResult<AuthAction>>
  signUp: (email: string, password: string) => Promise<AuthResult<AuthAction>>
  signOut: () => Promise<AuthResult<void>>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
