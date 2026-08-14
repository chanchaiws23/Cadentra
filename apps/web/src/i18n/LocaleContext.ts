import { createContext, useContext } from 'react'
import type { Locale, MessageKey } from './messages'

export interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey) => string
}

export const LocaleContext = createContext<LocaleContextValue | null>(null)

export function useI18n(): LocaleContextValue {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useI18n must be used within LocaleProvider')
  return value
}
