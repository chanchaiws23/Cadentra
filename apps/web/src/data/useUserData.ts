import { useCallback, useEffect, useState } from 'react'
import type { UserDataGateway, UserDataSnapshot } from '@cadentra/data'
import { todayKey } from '../lib/date'

const emptySnapshot: UserDataSnapshot = { tasks: [], habits: [], points: 0, focusMinutes: 0 }

interface UserDataState {
  loading: boolean
  snapshot: UserDataSnapshot
  error?: string
}

function startOfLocalDay(): string {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

export function useUserData(gateway: UserDataGateway | null, userId?: string) {
  const [state, setState] = useState<UserDataState>({ loading: Boolean(gateway && userId), snapshot: emptySnapshot })

  const reload = useCallback(async () => {
    if (!gateway || !userId) {
      setState({ loading: false, snapshot: emptySnapshot })
      return false
    }
    setState((current) => ({ ...current, loading: true, error: undefined }))
    const result = await gateway.load(userId, startOfLocalDay(), todayKey)
    if (!result.ok) {
      setState((current) => ({ ...current, loading: false, error: result.error.message }))
      return false
    }
    setState({ loading: false, snapshot: result.value })
    return true
  }, [gateway, userId])

  useEffect(() => { void reload() }, [reload])

  return { ...state, reload }
}
