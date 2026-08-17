import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { defaultLanguage, getInitialLanguage } from './config'
import { enUS } from './locales/en-US'
import { zhCN } from './locales/zh-CN'

void i18n.use(initReactI18next).init({
  resources: { 'zh-CN': { translation: zhCN }, 'en-US': { translation: enUS } },
  lng: getInitialLanguage(),
  fallbackLng: defaultLanguage,
  interpolation: { escapeValue: false },
})

export { i18n }
export { defaultLanguage, languageStorageKey, supportedLanguages } from './config'
export type { SupportedLanguage } from './config'
export { useAppLanguage } from './useAppLanguage'
