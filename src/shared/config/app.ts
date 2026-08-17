import { projectConstants } from '../constants'

const DEFAULT_API_TIMEOUT = 15_000
const DEFAULT_TIME_ZONE = 'Asia/Shanghai'
const supportedLanguages = ['zh-CN', 'en-US'] as const
type SupportedLanguage = (typeof supportedLanguages)[number]

function getPositiveInteger(value: string | undefined, fallback: number): number {
  const parsedValue = Number(value)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}

function getDefaultLanguage(value: string | undefined): SupportedLanguage {
  return supportedLanguages.includes(value as SupportedLanguage) ? (value as SupportedLanguage) : 'zh-CN'
}

export const sharedConfig = {
  application: {
    name: import.meta.env.VITE_APP_NAME ?? projectConstants.shortName,
    mode: import.meta.env.MODE,
    environment: import.meta.env.VITE_DEPLOY_ENV ?? import.meta.env.MODE,
  },
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
    timeout: getPositiveInteger(import.meta.env.VITE_API_TIMEOUT, DEFAULT_API_TIMEOUT),
  },
  locale: {
    defaultLanguage: getDefaultLanguage(import.meta.env.VITE_DEFAULT_LANGUAGE),
    supportedLanguages,
  },
  time: {
    // Global display fallback. Market- or account-specific views must pass their own IANA timezone.
    defaultTimeZone: DEFAULT_TIME_ZONE,
  },
  pagination: {
    defaultPage: 1,
    defaultPageSize: 20,
    maxPageSize: 100,
  },
  storageKeys: {
    language: 'quant-lab-language',
    theme: 'quant-lab-theme',
    pwaInstalled: 'quant-lab-pwa-installed',
    accessToken: 'quant-lab-access-token',
  },
} as const
