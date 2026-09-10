import { projectConstants } from '../constants'

const DEFAULT_API_TIMEOUT = 15_000
const DEFAULT_SOCKET_CONNECT_TIMEOUT = 10_000
const DEFAULT_SOCKET_RECONNECT_DELAYS = [5_000, 10_000, 20_000, 30_000, 60_000] as const
const DEFAULT_TIME_ZONE = 'Asia/Shanghai'
const supportedLanguages = ['zh-CN', 'en-US'] as const
type SupportedLanguage = (typeof supportedLanguages)[number]
const runtimeEnv =
    (
        import.meta as ImportMeta & {
            env?: Record<string, string | undefined>
        }
    ).env ?? {}

function getPositiveInteger(value: string | undefined, fallback: number): number {
    const parsedValue = Number(value)
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}

function getDefaultLanguage(value: string | undefined): SupportedLanguage {
    return supportedLanguages.includes(value as SupportedLanguage) ? (value as SupportedLanguage) : 'zh-CN'
}

function getOptionalPublicValue(value: string | undefined): string {
    return value?.trim() ?? ''
}

export const sharedConfig = {
    application: {
        name: runtimeEnv.VITE_APP_NAME ?? projectConstants.shortName,
        mode: runtimeEnv.MODE,
        environment: runtimeEnv.VITE_DEPLOY_ENV ?? runtimeEnv.MODE,
    },
    api: {
        baseUrl: runtimeEnv.VITE_API_BASE_URL ?? '/api',
        timeout: getPositiveInteger(runtimeEnv.VITE_API_TIMEOUT, DEFAULT_API_TIMEOUT),
    },
    socket: {
        ticketPath: '/game-wss/ticket',
        transport: 'websocket',
        connectTimeoutMs: DEFAULT_SOCKET_CONNECT_TIMEOUT,
        reconnectDelaysMs: DEFAULT_SOCKET_RECONNECT_DELAYS,
    },
    amap: {
        webKey: getOptionalPublicValue(runtimeEnv.VITE_AMAP_WEB_KEY),
        securityJsCode: getOptionalPublicValue(runtimeEnv.VITE_AMAP_SECURITY_JS_CODE),
        jsApiVersion: '2.0',
        navigationSource: projectConstants.shortName,
    },
    locale: {
        defaultLanguage: getDefaultLanguage(runtimeEnv.VITE_DEFAULT_LANGUAGE),
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
