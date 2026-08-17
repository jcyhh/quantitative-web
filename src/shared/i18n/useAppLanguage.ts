import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { isSupportedLanguage, languageStorageKey } from './config'
import { storage } from '../lib/storage'

export interface AppLanguageController {
  language: string
  changeLanguage: (language: string) => void
}

export function useAppLanguage(): AppLanguageController {
  const { i18n } = useTranslation()

  const changeLanguage = useCallback((language: string) => {
    if (!isSupportedLanguage(language)) return
    storage.set(languageStorageKey, language)
    void i18n.changeLanguage(language)
  }, [i18n])

  return { language: i18n.resolvedLanguage ?? i18n.language, changeLanguage }
}
