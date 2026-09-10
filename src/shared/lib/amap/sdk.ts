import { sharedConfig } from '../../config'
import { AmapError } from './types'
import { isAmapSdkLike, type AmapSdkLike } from './sdk-types'

const requiredPlugins = ['AMap.Geocoder']
let sdkPromise: Promise<AmapSdkLike> | null = null

interface AmapLoaderOptions {
    key: string
    version: string
    plugins: string[]
}

type AmapLoader = (options: AmapLoaderOptions) => Promise<unknown>

export async function loadConfiguredAmapSdk(): Promise<AmapSdkLike> {
    if (sdkPromise) return sdkPromise

    const pendingPromise = loadAmapSdk()
    sdkPromise = pendingPromise

    try {
        return await pendingPromise
    } catch (error) {
        if (sdkPromise === pendingPromise) sdkPromise = null
        throw error
    }
}

async function loadAmapSdk(): Promise<AmapSdkLike> {
    if (typeof window === 'undefined') {
        throw new AmapError('unsupported', 'AMap JS API requires a browser environment')
    }

    const { webKey, securityJsCode, jsApiVersion } = sharedConfig.amap
    if (!webKey) {
        throw new AmapError('configuration-missing', 'VITE_AMAP_WEB_KEY is not configured')
    }

    if (securityJsCode) {
        Reflect.set(window, '_AMapSecurityConfig', { securityJsCode })
    }

    try {
        const loaderModule: unknown = await import('@amap/amap-jsapi-loader')
        const loader = resolveAmapLoader(loaderModule)
        const sdk = await loader({
            key: webKey,
            version: jsApiVersion,
            plugins: requiredPlugins,
        })

        if (!isAmapSdkLike(sdk)) {
            throw new AmapError('sdk-invalid', 'AMap JS API returned an invalid SDK object')
        }

        return sdk
    } catch (error) {
        if (error instanceof AmapError) throw error
        throw new AmapError('sdk-load-failed', 'Unable to load AMap JS API', error)
    }
}

export function resolveAmapLoader(loaderModule: unknown): AmapLoader {
    const moduleRecord = getRecord(loaderModule)
    const candidates = [
        moduleRecord.load,
        getRecord(moduleRecord.default).load,
        getRecord(moduleRecord['module.exports']).load,
    ]
    const loader = candidates.find((candidate): candidate is AmapLoader => typeof candidate === 'function')

    if (!loader) {
        throw new AmapError('sdk-invalid', 'AMap Loader module does not expose a load function')
    }
    return loader
}

function getRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}
