import assert from 'node:assert/strict'
import test from 'node:test'
import { numberSubtract } from '../number'
import { getCurrentLocation, LocationError, wgs84ToGcj02, type LocationCoordinate } from './index'

test('wgs84ToGcj02 converts domestic coordinates and preserves overseas coordinates', () => {
    const domestic = wgs84ToGcj02({ longitude: 113.980858, latitude: 34.962259 })
    assert.ok(Math.abs(numberSubtract(domestic.longitude, 113.98682414101556)) < 0.000001)
    assert.ok(Math.abs(numberSubtract(domestic.latitude, 34.96142594513907)) < 0.000001)

    const overseas: LocationCoordinate = { longitude: -73.9857, latitude: 40.7484 }
    assert.deepEqual(wgs84ToGcj02(overseas), overseas)
})

test('getCurrentLocation returns the coordinate system requested by the caller', async () => {
    const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
    const browserPosition = createPosition(113.980858, 34.962259)
    let requestedOptions: PositionOptions | undefined

    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
            geolocation: {
                getCurrentPosition: (
                    success: PositionCallback,
                    _error: PositionErrorCallback,
                    options?: PositionOptions,
                ): void => {
                    requestedOptions = options
                    success(browserPosition)
                },
            },
        },
    })

    try {
        const browserCoordinate = await getCurrentLocation()
        const gcj02Coordinate = await getCurrentLocation({ coordinateSystem: 'gcj02' })

        assert.deepEqual(browserCoordinate, { longitude: 113.980858, latitude: 34.962259 })
        assert.ok(Math.abs(numberSubtract(gcj02Coordinate.longitude, browserCoordinate.longitude)) > 0.000001)
        assert.ok(Math.abs(numberSubtract(gcj02Coordinate.latitude, browserCoordinate.latitude)) > 0.000001)
        assert.deepEqual(requestedOptions, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 })
    } finally {
        if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator)
        else Reflect.deleteProperty(globalThis, 'navigator')
    }
})

test('getCurrentLocation reports unsupported environments and invalid coordinates', async () => {
    const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {},
    })

    try {
        await assert.rejects(
            getCurrentLocation(),
            (error: unknown) => error instanceof LocationError && error.code === 'unsupported',
        )

        Object.defineProperty(globalThis, 'navigator', {
            configurable: true,
            value: {
                geolocation: {
                    getCurrentPosition: (success: PositionCallback): void => {
                        success(createPosition(181, 34))
                    },
                },
            },
        })

        await assert.rejects(
            getCurrentLocation(),
            (error: unknown) => error instanceof LocationError && error.code === 'invalid-coordinate',
        )
    } finally {
        if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator)
        else Reflect.deleteProperty(globalThis, 'navigator')
    }
})

function createPosition(longitude: number, latitude: number): GeolocationPosition {
    const coords: GeolocationCoordinates = {
        accuracy: 1,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude,
        longitude,
        speed: null,
        toJSON(): Record<string, unknown> {
            return { accuracy: 1, latitude, longitude }
        },
    }

    return {
        coords,
        timestamp: 0,
        toJSON(): Record<string, unknown> {
            return { coords: coords.toJSON(), timestamp: 0 }
        },
    }
}
