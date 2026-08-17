import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import type { ReactElement } from 'react'
import { sharedConfig } from '../../config'
import type { AppTheme } from '../../config/theme'
import { storage } from '../../lib/storage'
import { ThemeContext } from '../model/context'
import { applyTheme, getInitialTheme } from '../model/theme'

export function ThemeProvider({ children }: { children: ReactNode }): ReactElement {
  const [theme, updateTheme] = useState<AppTheme>(getInitialTheme)

  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((nextTheme: AppTheme) => {
    storage.set(sharedConfig.storageKeys.theme, nextTheme)
    updateTheme(nextTheme)
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
