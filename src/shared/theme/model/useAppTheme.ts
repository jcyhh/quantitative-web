import { useContext } from 'react'
import { ThemeContext } from './context'
import type { ThemeContextValue } from './context'

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (context === null) throw new Error('useAppTheme must be used within ThemeProvider')
  return context
}
