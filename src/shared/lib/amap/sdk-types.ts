import type { AmapGeocodeExtensions } from './types'

export type AmapPosition = [number, number]

export interface AmapLngLatLike {
    getLng(): number
    getLat(): number
}

export interface AmapMapMouseEvent {
    lnglat: AmapLngLatLike
}

export type AmapMapClickHandler = (event: AmapMapMouseEvent) => void

export interface AmapMapOptions {
    center?: AmapPosition | undefined
    zoom?: number | undefined
    resizeEnable?: boolean | undefined
}

export interface AmapMapLike {
    on(eventName: 'click', handler: AmapMapClickHandler): void
    off(eventName: 'click', handler: AmapMapClickHandler): void
    setCenter(position: AmapPosition): void
    destroy(): void
}

export interface AmapMarkerOptions {
    position: AmapPosition
}

export interface AmapMarkerLike {
    setPosition(position: AmapPosition): void
    setMap(map: AmapMapLike | null): void
}

export interface AmapGeocoderOptions {
    radius: number
    extensions: AmapGeocodeExtensions
}

export type AmapGeocoderCallback = (status: string, result: unknown) => void

export interface AmapGeocoderLike {
    getAddress(position: AmapPosition, callback: AmapGeocoderCallback): void
}

export interface AmapSdkLike {
    Map: new (container: HTMLElement, options: AmapMapOptions) => AmapMapLike
    Marker: new (options: AmapMarkerOptions) => AmapMarkerLike
    Geocoder: new (options: AmapGeocoderOptions) => AmapGeocoderLike
}

export type AmapSdkLoader = () => Promise<AmapSdkLike>
export type AmapUrlOpener = (url: string, target: '_blank' | '_self') => void

export function isAmapSdkLike(value: unknown): value is AmapSdkLike {
    if (!value || typeof value !== 'object') return false
    const candidate = value as Record<string, unknown>
    return (
        typeof candidate.Map === 'function' &&
        typeof candidate.Marker === 'function' &&
        typeof candidate.Geocoder === 'function'
    )
}
