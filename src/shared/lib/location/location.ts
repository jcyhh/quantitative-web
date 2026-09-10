import { wgs84ToGcj02, type LocationCoordinate } from './gcj02'

export type LocationCoordinateSystem = 'browser' | 'gcj02'

export type LocationErrorCode =
    'unsupported' | 'permission-denied' | 'position-unavailable' | 'timeout' | 'invalid-coordinate'

export interface GetCurrentLocationOptions {
    coordinateSystem?: LocationCoordinateSystem | undefined
    enableHighAccuracy?: boolean | undefined
    timeout?: number | undefined
    maximumAge?: number | undefined
}

export class LocationError extends Error {
    readonly code: LocationErrorCode

    constructor(code: LocationErrorCode, message: string) {
        super(message)
        this.name = 'LocationError'
        this.code = code
    }
}

const defaultPositionOptions = {
    enableHighAccuracy: true,
    timeout: 8000,
    maximumAge: 0,
} as const

/**
 * Reads the browser's current position and returns either the browser's native
 * WGS-84 coordinate or a GCJ-02 coordinate selected by the caller.
 */
export function getCurrentLocation(options: GetCurrentLocationOptions = {}): Promise<LocationCoordinate> {
    return new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            reject(new LocationError('unsupported', 'Geolocation is not supported in this environment'))
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                try {
                    const coordinate = toLocationCoordinate(position)
                    resolve(options.coordinateSystem === 'gcj02' ? wgs84ToGcj02(coordinate) : coordinate)
                } catch (error) {
                    reject(toLocationError(error))
                }
            },
            (error) => reject(toLocationError(error)),
            toPositionOptions(options),
        )
    })
}

function toPositionOptions(options: GetCurrentLocationOptions): PositionOptions {
    return {
        enableHighAccuracy: options.enableHighAccuracy ?? defaultPositionOptions.enableHighAccuracy,
        timeout: options.timeout ?? defaultPositionOptions.timeout,
        maximumAge: options.maximumAge ?? defaultPositionOptions.maximumAge,
    }
}

function toLocationCoordinate(position: GeolocationPosition): LocationCoordinate {
    const { longitude, latitude } = position.coords
    if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
    ) {
        throw new LocationError('invalid-coordinate', 'The browser returned an invalid location coordinate')
    }

    return { longitude, latitude }
}

function toLocationError(error: unknown): LocationError {
    if (error instanceof LocationError) return error
    if (!isGeolocationPositionError(error)) {
        return new LocationError('position-unavailable', 'Unable to determine the current location')
    }

    if (error.code === 1)
        return new LocationError('permission-denied', error.message || 'Location permission was denied')
    if (error.code === 3) return new LocationError('timeout', error.message || 'The location request timed out')
    return new LocationError('position-unavailable', error.message || 'The current location is unavailable')
}

function isGeolocationPositionError(error: unknown): error is GeolocationPositionError {
    if (!error || typeof error !== 'object') return false
    const candidate = error as { code?: unknown; message?: unknown }
    return (
        (candidate.code === 1 || candidate.code === 2 || candidate.code === 3) &&
        (candidate.message === undefined || typeof candidate.message === 'string')
    )
}
