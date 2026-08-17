import { sharedConfig } from '../config'
import { storage } from '../lib/storage'

export const supportedLanguages = sharedConfig.locale.supportedLanguages
export type SupportedLanguage = (typeof supportedLanguages)[number]

export const defaultLanguage: SupportedLanguage = sharedConfig.locale.defaultLanguage
export const languageStorageKey = sharedConfig.storageKeys.language

export function isSupportedLanguage(value: string | null): value is SupportedLanguage {
  return value !== null && supportedLanguages.includes(value as SupportedLanguage)
}

export function getInitialLanguage(): SupportedLanguage {
  const savedLanguage = storage.get(languageStorageKey)
  return isSupportedLanguage(savedLanguage) ? savedLanguage : defaultLanguage
}
