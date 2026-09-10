export interface AmapCoordinate {
    longitude: number
    latitude: number
}

export interface AmapAddress {
    formattedAddress: string
    country: string
    province: string
    city: string
    district: string
    township: string
    street: string
    streetNumber: string
    adcode: string
    citycode: string
}

export interface AmapPointSelection {
    coordinate: AmapCoordinate
    address: AmapAddress
}

export type AmapGeocodeExtensions = 'base' | 'all'

export interface AmapReverseGeocodeOptions {
    radius?: number | undefined
    extensions?: AmapGeocodeExtensions | undefined
}

export type AmapNavigationMode = 'car' | 'bus' | 'walk' | 'ride'
export type AmapNavigationCoordinateSystem = 'gcj02' | 'wgs84'
export type AmapNavigationTarget = '_blank' | '_self'
export type AmapNavigationPolicy = 0 | 1 | 2 | 3

export interface AmapNavigationPoint extends AmapCoordinate {
    name?: string | undefined
}

export interface AmapNavigationOptions {
    origin?: AmapNavigationPoint | undefined
    mode?: AmapNavigationMode | undefined
    policy?: AmapNavigationPolicy | undefined
    coordinateSystem?: AmapNavigationCoordinateSystem | undefined
    callNative?: boolean | undefined
    source?: string | undefined
    target?: AmapNavigationTarget | undefined
}

export interface CreateAmapPointPickerOptions {
    initialCoordinate?: AmapCoordinate | null | undefined
    zoom?: number | undefined
    reverseGeocode?: AmapReverseGeocodeOptions | undefined
    onSelect: (selection: AmapPointSelection) => void
    onError?: ((error: AmapError) => void) | undefined
}

export interface AmapPointPicker {
    setCoordinate(coordinate: AmapCoordinate | null): void
    destroy(): void
}

export interface AmapClient {
    reverseGeocode(coordinate: AmapCoordinate, options?: AmapReverseGeocodeOptions): Promise<AmapAddress>
    createPointPicker(container: HTMLElement, options: CreateAmapPointPickerOptions): Promise<AmapPointPicker>
    buildNavigationUrl(destination: AmapNavigationPoint, options?: AmapNavigationOptions): string
    openNavigation(destination: AmapNavigationPoint, options?: AmapNavigationOptions): string
}

export type AmapErrorCode =
    | 'configuration-missing'
    | 'sdk-load-failed'
    | 'sdk-invalid'
    | 'invalid-coordinate'
    | 'invalid-options'
    | 'reverse-geocode-failed'
    | 'unsupported'

export class AmapError extends Error {
    readonly code: AmapErrorCode

    constructor(code: AmapErrorCode, message: string, cause?: unknown) {
        super(message, cause === undefined ? undefined : { cause })
        this.name = 'AmapError'
        this.code = code
    }
}
