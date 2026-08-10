import { useCallback, useEffect, useState } from 'react'
import type { SyncIssue, UserDataGateway, UserDataSnapshot } from '@cadentra/data'
import { todayKey } from '../lib/date'

const emptySnapshot: UserDataSnapshot = { profile: null, tasks: [], goals: [], milestones: [], habits: [], points: 0, focusMinutes: 0 }

interface UserDataState {
  loading: boolean
  snapshot: UserDataSnapshot
  online: boolean
  pendingCount: number
  syncIssues: SyncIssue[]
  error?: string
}

function startOfLocalDay(): string {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

export function useUserData(gateway: UserDataGateway | null, userId?: string) {
  const [state, setState] = useState<UserDataState>({
    loading: Boolean(gateway && userId), snapshot: emptySnapshot,
    online: typeof navigator === 'undefined' || navigator.onLine, pendingCount: 0, syncIssues: [],
  })

  const reload = useCallback(async () => {
    if (!gateway || !userId) {
      setState({ loading: false, snapshot: emptySnapshot, online: typeof navigator === 'undefined' || navigator.onLine, pendingCount: 0, syncIssues: [] })
      return false
    }
    setState((current) => ({ ...current, loading: true, error: undefined }))
    const result = await gateway.load(userId, startOfLocalDay(), todayKey)
    if (!result.ok) {
      setState((current) => ({ ...current, loading: false, online: typeof navigator === 'undefined' || navigator.onLine, pendingCount: gateway.pendingCount?.(userId) ?? 0, syncIssues: gateway.syncIssues?.(userId) ?? [], error: result.error.message }))
      return false
    }
    setState({ loading: false, snapshot: result.value, online: typeof navigator === 'undefined' || navigator.onLine, pendingCount: gateway.pendingCount?.(userId) ?? 0, syncIssues: gateway.syncIssues?.(userId) ?? [] })
    return true
  }, [gateway, userId])

  useEffect(() => { void reload() }, [reload])

  useEffect(() => {
    const refreshConnection = () => void reload()
    window.addEventListener('online', refreshConnection)
    window.addEventListener('offline', refreshConnection)
    return () => {
      window.removeEventListener('online', refreshConnection)
      window.removeEventListener('offline', refreshConnection)
    }
  }, [reload])

  return { ...state, reload }
}
