import { sharedConfig } from '../../config'
import { loadConfiguredAmapSdk } from './sdk'
import type {
    AmapMapClickHandler,
    AmapMapLike,
    AmapMarkerLike,
    AmapPosition,
    AmapSdkLike,
    AmapSdkLoader,
    AmapUrlOpener,
} from './sdk-types'
import {
    AmapError,
    type AmapAddress,
    type AmapClient,
    type AmapCoordinate,
    type AmapNavigationOptions,
    type AmapNavigationPoint,
    type AmapPointPicker,
    type AmapReverseGeocodeOptions,
    type CreateAmapPointPickerOptions,
} from './types'

const DEFAULT_GEOCODE_RADIUS = 1_000
const DEFAULT_MAP_ZOOM = 13
const MIN_GEOCODE_RADIUS = 0
const MAX_GEOCODE_RADIUS = 3_000
const MIN_MAP_ZOOM = 2
const MAX_MAP_ZOOM = 20
const navigationUrl = 'https://uri.amap.com/navigation'

export interface AmapClientDependencies {
    loadSdk?: AmapSdkLoader | undefined
    openUrl?: AmapUrlOpener | undefined
}

export function createAmapClient(dependencies: AmapClientDependencies = {}): AmapClient {
    const loadSdk = dependencies.loadSdk ?? loadConfiguredAmapSdk
    const openUrl = dependencies.openUrl ?? openBrowserUrl

    return {
        reverseGeocode(coordinate, options = {}): Promise<AmapAddress> {
            return reverseGeocode(loadSdk, coordinate, options)
        },
        createPointPicker(container, options): Promise<AmapPointPicker> {
            return createPointPicker(loadSdk, container, options)
        },
        buildNavigationUrl(destination, options = {}): string {
            return buildNavigationUrl(destination, options)
        },
        openNavigation(destination, options = {}): string {
            const url = buildNavigationUrl(destination, options)
            openUrl(url, options.target ?? '_blank')
            return url
        },
    }
}

export const amapClient = createAmapClient()

export function reverseGeocodeAddress(
    coordinate: AmapCoordinate,
    options: AmapReverseGeocodeOptions = {},
): Promise<AmapAddress> {
    return amapClient.reverseGeocode(coordinate, options)
}

export function createAmapPointPicker(
    container: HTMLElement,
    options: CreateAmapPointPickerOptions,
): Promise<AmapPointPicker> {
    return amapClient.createPointPicker(container, options)
}

export function buildAmapNavigationUrl(destination: AmapNavigationPoint, options: AmapNavigationOptions = {}): string {
    return amapClient.buildNavigationUrl(destination, options)
}

export function openAmapNavigation(destination: AmapNavigationPoint, options: AmapNavigationOptions = {}): string {
    return amapClient.openNavigation(destination, options)
}

async function reverseGeocode(
    loadSdk: AmapSdkLoader,
    coordinate: AmapCoordinate,
    options: AmapReverseGeocodeOptions,
): Promise<AmapAddress> {
    validateCoordinate(coordinate)
    validateReverseGeocodeOptions(options)
    const sdk = await loadSdk()
    return reverseGeocodeWithSdk(sdk, coordinate, options)
}

function reverseGeocodeWithSdk(
    sdk: AmapSdkLike,
    coordinate: AmapCoordinate,
    options: AmapReverseGeocodeOptions,
): Promise<AmapAddress> {
    return new Promise((resolve, reject) => {
        const geocoder = new sdk.Geocoder({
            radius: options.radius ?? DEFAULT_GEOCODE_RADIUS,
            extensions: options.extensions ?? 'all',
        })

        geocoder.getAddress(toAmapPosition(coordinate), (status, result) => {
            if (status !== 'complete' || !hasSuccessfulInfo(result)) {
                reject(new AmapError('reverse-geocode-failed', 'AMap reverse geocoding request failed'))
                return
            }

            try {
                resolve(parseReverseGeocodeResult(result))
            } catch (error) {
                reject(
                    error instanceof AmapError
                        ? error
                        : new AmapError('reverse-geocode-failed', 'AMap returned an invalid address result', error),
                )
            }
        })
    })
}

async function createPointPicker(
    loadSdk: AmapSdkLoader,
    container: HTMLElement,
    options: CreateAmapPointPickerOptions,
): Promise<AmapPointPicker> {
    const zoom = options.zoom ?? DEFAULT_MAP_ZOOM
    validateMapZoom(zoom)
    if (options.initialCoordinate) validateCoordinate(options.initialCoordinate)
    validateReverseGeocodeOptions(options.reverseGeocode ?? {})

    const sdk = await loadSdk()
    const initialCoordinate = options.initialCoordinate ?? null
    const map = new sdk.Map(container, {
        center: initialCoordinate ? toAmapPosition(initialCoordinate) : undefined,
        zoom,
        resizeEnable: true,
    })
    let marker = initialCoordinate ? createMarker(sdk, map, initialCoordinate) : null
    let destroyed = false
    let activeSelection = Symbol('initial-amap-selection')

    const setCoordinate = (coordinate: AmapCoordinate | null): void => {
        if (destroyed) return
        if (coordinate === null) {
            marker?.setMap(null)
            marker = null
            return
        }

        validateCoordinate(coordinate)
        const position = toAmapPosition(coordinate)
        if (marker) marker.setPosition(position)
        else marker = createMarker(sdk, map, coordinate)
        map.setCenter(position)
    }

    const handleMapClick: AmapMapClickHandler = (event) => {
        if (destroyed) return

        let coordinate: AmapCoordinate
        try {
            coordinate = {
                longitude: event.lnglat.getLng(),
                latitude: event.lnglat.getLat(),
            }
            validateCoordinate(coordinate)
            setCoordinate(coordinate)
        } catch (error) {
            options.onError?.(toAmapError(error, 'invalid-coordinate', 'AMap returned an invalid map coordinate'))
            return
        }

        const selection = Symbol('amap-selection')
        activeSelection = selection
        void reverseGeocodeWithSdk(sdk, coordinate, options.reverseGeocode ?? {}).then(
            (address) => {
                if (destroyed || activeSelection !== selection) return
                options.onSelect({ coordinate, address })
            },
            (error: unknown) => {
                if (destroyed || activeSelection !== selection) return
                options.onError?.(toAmapError(error, 'reverse-geocode-failed', 'AMap reverse geocoding request failed'))
            },
        )
    }

    map.on('click', handleMapClick)

    return {
        setCoordinate,
        destroy(): void {
            if (destroyed) return
            destroyed = true
            activeSelection = Symbol('destroyed-amap-selection')
            map.off('click', handleMapClick)
            marker?.setMap(null)
            marker = null
            map.destroy()
        },
    }
}

function createMarker(sdk: AmapSdkLike, map: AmapMapLike, coordinate: AmapCoordinate): AmapMarkerLike {
    const marker = new sdk.Marker({ position: toAmapPosition(coordinate) })
    marker.setMap(map)
    return marker
}

function buildNavigationUrl(destination: AmapNavigationPoint, options: AmapNavigationOptions): string {
    validateCoordinate(destination)
    if (options.origin) validateCoordinate(options.origin)
    validateNavigationOptions(options)

    const url = new URL(navigationUrl)
    url.searchParams.set('to', formatNavigationPoint(destination))
    if (options.origin) url.searchParams.set('from', formatNavigationPoint(options.origin))
    url.searchParams.set('mode', options.mode ?? 'car')
    url.searchParams.set('policy', String(options.policy ?? 0))
    url.searchParams.set('coordinate', options.coordinateSystem === 'wgs84' ? 'wgs84' : 'gaode')
    url.searchParams.set('callnative', options.callNative === false ? '0' : '1')

    const source = options.source?.trim() || sharedConfig.amap.navigationSource
    if (source) url.searchParams.set('src', source)
    return url.toString()
}

function formatNavigationPoint(point: AmapNavigationPoint): string {
    const parts = [String(point.longitude), String(point.latitude)]
    const name = point.name?.trim()
    if (name) parts.push(name)
    return parts.join(',')
}

function parseReverseGeocodeResult(result: unknown): AmapAddress {
    const resultRecord = getRecord(result)
    const regeocode = getRecord(resultRecord.regeocode)
    const addressComponent = getRecord(regeocode.addressComponent)
    const streetNumber = getRecord(addressComponent.streetNumber)
    const formattedAddress = readText(regeocode.formattedAddress)

    if (!formattedAddress) {
        throw new AmapError('reverse-geocode-failed', 'AMap reverse geocoding returned no formatted address')
    }

    return {
        formattedAddress,
        country: readText(addressComponent.country),
        province: readText(addressComponent.province),
        city: readText(addressComponent.city),
        district: readText(addressComponent.district),
        township: readText(addressComponent.township),
        street: readText(streetNumber.street),
        streetNumber: readText(streetNumber.number),
        adcode: readText(addressComponent.adcode),
        citycode: readText(addressComponent.citycode),
    }
}

function hasSuccessfulInfo(result: unknown): boolean {
    return getRecord(result).info === 'OK'
}

function getRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function readText(value: unknown): string {
    if (typeof value === 'string') return value.trim()
    if (!Array.isArray(value)) return ''

    for (const item of value) {
        if (typeof item === 'string' && item.trim()) return item.trim()
    }
    return ''
}

function validateCoordinate(coordinate: AmapCoordinate): void {
    const { longitude, latitude } = coordinate
    if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
    ) {
        throw new AmapError('invalid-coordinate', 'AMap coordinate is outside the valid longitude/latitude range')
    }
}

function validateReverseGeocodeOptions(options: AmapReverseGeocodeOptions): void {
    if (
        options.radius !== undefined &&
        (!Number.isFinite(options.radius) || options.radius < MIN_GEOCODE_RADIUS || options.radius > MAX_GEOCODE_RADIUS)
    ) {
        throw new AmapError('invalid-options', 'AMap reverse geocode radius must be between 0 and 3000 meters')
    }
}

function validateMapZoom(zoom: number): void {
    if (!Number.isFinite(zoom) || zoom < MIN_MAP_ZOOM || zoom > MAX_MAP_ZOOM) {
        throw new AmapError('invalid-options', 'AMap zoom must be between 2 and 20')
    }
}

function validateNavigationOptions(options: AmapNavigationOptions): void {
    if (options.policy !== undefined && ![0, 1, 2, 3].includes(options.policy)) {
        throw new AmapError('invalid-options', 'AMap navigation policy must be 0, 1, 2 or 3')
    }
}

function openBrowserUrl(url: string, target: '_blank' | '_self'): void {
    if (typeof window === 'undefined') {
        throw new AmapError('unsupported', 'AMap navigation requires a browser environment')
    }

    if (target === '_self') {
        window.location.assign(url)
        return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
}

function toAmapPosition(coordinate: AmapCoordinate): AmapPosition {
    return [coordinate.longitude, coordinate.latitude]
}

function toAmapError(error: unknown, code: AmapError['code'], message: string): AmapError {
    return error instanceof AmapError ? error : new AmapError(code, message, error)
}
