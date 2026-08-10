import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthGateway, AuthResult, AuthSession } from '@cadentra/data'
import { AuthContext, type AuthContextValue, type AuthMode } from './AuthContext'
import { AuthView } from './AuthView'

interface AuthState {
  loading: boolean
  session: AuthSession | null
  initializationError?: string
}

const unavailable = async <T,>(): Promise<AuthResult<T>> => ({
  ok: false,
  message: 'Cloud authentication is unavailable in local mode.',
})

export function AuthProvider({ gateway, children }: { gateway: AuthGateway | null; children: ReactNode }) {
  const mode: AuthMode = gateway ? 'cloud' : 'local'
  const [state, setState] = useState<AuthState>(() => ({
    loading: Boolean(gateway),
    session: null,
  }))

  useEffect(() => {
    if (!gateway) return
    let active = true

    const unsubscribe = gateway.onAuthStateChange((session) => {
      if (active) setState({ loading: false, session })
    })

    void gateway.getSession().then((result) => {
      if (!active) return
      setState(result.ok
        ? { loading: false, session: result.value }
        : { loading: false, session: null, initializationError: result.message })
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [gateway])

  const value = useMemo<AuthContextValue>(() => ({
    mode,
    session: state.session,
    signIn: gateway
      ? async (email, password) => {
          const result = await gateway.signIn(email, password)
          if (result.ok && result.value.session) setState({ loading: false, session: result.value.session })
          return result
        }
      : unavailable,
    signUp: gateway
      ? async (email, password) => {
          const result = await gateway.signUp(email, password, window.location.origin)
          if (result.ok && result.value.session) setState({ loading: false, session: result.value.session })
          return result
        }
      : unavailable,
    signOut: gateway
      ? async () => {
          const result = await gateway.signOut()
          if (result.ok) setState({ loading: false, session: null })
          return result
        }
      : unavailable,
  }), [gateway, mode, state.session])

  if (!gateway) return <AuthConfigurationRequired/>
  if (state.loading) return <AuthLoading/>
  if (state.initializationError) return <AuthInitializationError message={state.initializationError}/>

  return (
    <AuthContext.Provider value={value}>
      {mode === 'cloud' && !state.session ? <AuthView/> : children}
    </AuthContext.Provider>
  )
}

function AuthConfigurationRequired() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-6 text-ink" role="alert">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-bold tracking-[0.13em] text-[#9b493f] uppercase">ต้องตั้งค่าระบบ Cloud</p>
        <h1 className="font-display mt-2 text-3xl">ยังเชื่อมต่อ Supabase ไม่ได้</h1>
        <p className="mt-3 text-sm leading-6 text-muted">กำหนด VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env.local แล้วเปิด dev server ใหม่</p>
      </div>
    </main>
  )
}

function AuthLoading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-6 text-ink" aria-busy="true">
      <div className="flex items-center gap-3 text-sm text-muted"><span className="size-4 animate-spin rounded-full border-2 border-line border-t-accent"/>กำลังเปิดพื้นที่ของคุณ</div>
    </main>
  )
}

function AuthInitializationError({ message }: { message: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-6 text-ink" role="alert">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-bold tracking-[0.13em] text-[#9b493f] uppercase">เชื่อมต่อไม่สำเร็จ</p>
        <h1 className="font-display mt-2 text-3xl">เปิดระบบบัญชีไม่ได้</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{message}</p>
        <button className="mt-6 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white" onClick={() => window.location.reload()}>ลองใหม่</button>
      </div>
    </main>
  )
}
