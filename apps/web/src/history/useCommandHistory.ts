import { useCallback, useRef, useState } from 'react'

export interface HistoryCommand {
  label: string
  undo: () => Promise<boolean>
  redo: () => Promise<boolean>
}

export interface CommandHistory {
  canUndo: boolean
  canRedo: boolean
  busy: boolean
  undoLabel?: string
  redoLabel?: string
  push: (command: HistoryCommand) => void
  undo: (expected?: HistoryCommand) => Promise<HistoryCommand | undefined>
  redo: () => Promise<HistoryCommand | undefined>
  clear: () => void
}

export function useCommandHistory(): CommandHistory {
  const past = useRef<HistoryCommand[]>([])
  const future = useRef<HistoryCommand[]>([])
  const running = useRef(false)
  const [, render] = useState(0)
  const refresh = useCallback(() => render((value) => value + 1), [])

  const push = useCallback((command: HistoryCommand) => {
    past.current.push(command)
    future.current = []
    refresh()
  }, [refresh])

  const undo = useCallback(async (expected?: HistoryCommand) => {
    const command = past.current.at(-1)
    if (!command || (expected && command !== expected) || running.current) return undefined
    running.current = true
    refresh()
    try {
      if (!await command.undo()) return undefined
      past.current.pop()
      future.current.push(command)
      return command
    } finally {
      running.current = false
      refresh()
    }
  }, [refresh])

  const redo = useCallback(async () => {
    const command = future.current.at(-1)
    if (!command || running.current) return undefined
    running.current = true
    refresh()
    try {
      if (!await command.redo()) return undefined
      future.current.pop()
      past.current.push(command)
      return command
    } finally {
      running.current = false
      refresh()
    }
  }, [refresh])

  const clear = useCallback(() => {
    past.current = []
    future.current = []
    refresh()
  }, [refresh])

  return {
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    busy: running.current,
    undoLabel: past.current.at(-1)?.label,
    redoLabel: future.current.at(-1)?.label,
    push,
    undo,
    redo,
    clear,
  }
}
