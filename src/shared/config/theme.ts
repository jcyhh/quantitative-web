export const supportedThemes = ['dark', 'light'] as const

export type AppTheme = (typeof supportedThemes)[number]

export const defaultTheme: AppTheme = 'dark'

export function isSupportedTheme(value: string | null): value is AppTheme {
  return value !== null && supportedThemes.includes(value as AppTheme)
}
