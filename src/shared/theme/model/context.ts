import { createContext } from 'react'
import type { AppTheme } from '../../config/theme'

export interface ThemeContextValue {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
