import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { translate, type Locale } from './messages'
import { LocaleContext, type LocaleContextValue } from './LocaleContext'

const STORAGE_KEY = 'cadentra.locale'

function initialLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'en' || saved === 'th' ? saved : 'th'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    t: (key) => translate(locale, key),
  }), [locale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
