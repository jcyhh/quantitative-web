import { numberAdd, numberDivide, numberMultiply, numberSubtract } from '../number'

const PI = Math.PI
const EARTH_SEMI_MAJOR_AXIS = 6378245.0
const ECCENTRICITY = 0.006693421622965943

export interface LocationCoordinate {
    longitude: number
    latitude: number
}

/**
 * Converts browser WGS-84 coordinates to GCJ-02 coordinates used by mainland
 * Chinese map services. Coordinates outside China are returned unchanged.
 */
export function wgs84ToGcj02(coordinate: LocationCoordinate): LocationCoordinate {
    const validatedCoordinate = validateCoordinate(coordinate)
    const { longitude, latitude } = validatedCoordinate

    if (isOutsideChina(longitude, latitude)) return validatedCoordinate

    const deltaLatitude = transformLatitude(numberSubtract(longitude, 105), numberSubtract(latitude, 35))
    const deltaLongitude = transformLongitude(numberSubtract(longitude, 105), numberSubtract(latitude, 35))
    const radiansLatitude = numberMultiply(numberDivide(latitude, 180), PI)
    const sineLatitude = Math.sin(radiansLatitude)
    const magic = numberSubtract(1, numberMultiply(ECCENTRICITY, numberMultiply(sineLatitude, sineLatitude)))
    const squareRootMagic = Math.sqrt(magic)
    const latitudeDenominator = numberMultiply(
        numberDivide(
            numberMultiply(EARTH_SEMI_MAJOR_AXIS, numberSubtract(1, ECCENTRICITY)),
            numberMultiply(magic, squareRootMagic),
        ),
        PI,
    )
    const longitudeDenominator = numberMultiply(
        numberDivide(EARTH_SEMI_MAJOR_AXIS, squareRootMagic),
        Math.cos(radiansLatitude),
        PI,
    )

    return {
        longitude: numberAdd(longitude, numberDivide(numberMultiply(deltaLongitude, 180), longitudeDenominator)),
        latitude: numberAdd(latitude, numberDivide(numberMultiply(deltaLatitude, 180), latitudeDenominator)),
    }
}

function transformLongitude(longitude: number, latitude: number): number {
    let result = numberAdd(
        300,
        longitude,
        numberMultiply(2, latitude),
        numberMultiply(0.1, numberMultiply(longitude, longitude)),
        numberMultiply(0.1, numberMultiply(longitude, latitude)),
        numberMultiply(0.1, Math.sqrt(Math.abs(longitude))),
    )
    result = numberAdd(
        result,
        numberMultiply(
            numberDivide(2, 3),
            numberAdd(
                numberMultiply(20, Math.sin(numberMultiply(6, numberMultiply(longitude, PI)))),
                numberMultiply(20, Math.sin(numberMultiply(2, numberMultiply(longitude, PI)))),
            ),
        ),
    )
    result = numberAdd(
        result,
        numberMultiply(
            numberDivide(2, 3),
            numberAdd(
                numberMultiply(20, Math.sin(numberMultiply(longitude, PI))),
                numberMultiply(40, Math.sin(numberMultiply(numberDivide(longitude, 3), PI))),
            ),
        ),
    )
    result = numberAdd(
        result,
        numberMultiply(
            numberDivide(2, 3),
            numberAdd(
                numberMultiply(150, Math.sin(numberMultiply(numberDivide(longitude, 12), PI))),
                numberMultiply(300, Math.sin(numberMultiply(numberDivide(longitude, 30), PI))),
            ),
        ),
    )
    return result
}

function transformLatitude(longitude: number, latitude: number): number {
    let result = numberAdd(
        -100,
        numberMultiply(2, longitude),
        numberMultiply(3, latitude),
        numberMultiply(0.2, numberMultiply(latitude, latitude)),
        numberMultiply(0.1, numberMultiply(longitude, latitude)),
        numberMultiply(0.2, Math.sqrt(Math.abs(longitude))),
    )
    result = numberAdd(
        result,
        numberMultiply(
            numberDivide(2, 3),
            numberAdd(
                numberMultiply(20, Math.sin(numberMultiply(6, numberMultiply(longitude, PI)))),
                numberMultiply(20, Math.sin(numberMultiply(2, numberMultiply(longitude, PI)))),
            ),
        ),
    )
    result = numberAdd(
        result,
        numberMultiply(
            numberDivide(2, 3),
            numberAdd(
                numberMultiply(20, Math.sin(numberMultiply(latitude, PI))),
                numberMultiply(40, Math.sin(numberMultiply(numberDivide(latitude, 3), PI))),
            ),
        ),
    )
    result = numberAdd(
        result,
        numberMultiply(
            numberDivide(2, 3),
            numberAdd(
                numberMultiply(160, Math.sin(numberMultiply(numberDivide(latitude, 12), PI))),
                numberMultiply(320, Math.sin(numberMultiply(numberDivide(latitude, 30), PI))),
            ),
        ),
    )
    return result
}

function isOutsideChina(longitude: number, latitude: number): boolean {
    return longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271
}

function validateCoordinate(coordinate: LocationCoordinate): LocationCoordinate {
    if (
        !Number.isFinite(coordinate.longitude) ||
        !Number.isFinite(coordinate.latitude) ||
        coordinate.longitude < -180 ||
        coordinate.longitude > 180 ||
        coordinate.latitude < -90 ||
        coordinate.latitude > 90
    ) {
        throw new RangeError('Location coordinate is outside the valid range')
    }

    return coordinate
}
