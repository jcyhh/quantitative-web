import assert from 'node:assert/strict'
import test from 'node:test'
import { createAmapClient } from './client'
import type {
    AmapGeocoderCallback,
    AmapGeocoderOptions,
    AmapMapClickHandler,
    AmapMapLike,
    AmapMapOptions,
    AmapMarkerLike,
    AmapMarkerOptions,
    AmapPosition,
    AmapSdkLike,
} from './sdk-types'
import { AmapError, type AmapPointSelection } from './types'

const reverseGeocodeResult = {
    info: 'OK',
    regeocode: {
        formattedAddress: '河南省郑州市中原区科学大道100号',
        addressComponent: {
            country: '中国',
            province: '河南省',
            city: ['郑州市'],
            district: '中原区',
            township: '沟赵办事处',
            adcode: '410102',
            citycode: '0371',
            streetNumber: {
                street: '科学大道',
                number: '100号',
            },
        },
    },
}

test('reverse geocoding returns normalized province, city, district, street and region codes', async () => {
    const client = createAmapClient({ loadSdk: async () => createFakeSdk(reverseGeocodeResult) })

    const address = await client.reverseGeocode({ longitude: 113.54, latitude: 34.82 })

    assert.deepEqual(address, {
        formattedAddress: '河南省郑州市中原区科学大道100号',
        country: '中国',
        province: '河南省',
        city: '郑州市',
        district: '中原区',
        township: '沟赵办事处',
        street: '科学大道',
        streetNumber: '100号',
        adcode: '410102',
        citycode: '0371',
    })
})

test('map clicks move the marker, reverse geocode the point and release the map on destroy', async () => {
    const sdk = createFakeSdk(reverseGeocodeResult)
    const client = createAmapClient({ loadSdk: async () => sdk })
    const selected = new Promise<AmapPointSelection>((resolve) => {
        selectedResolve = resolve
    })
    const picker = await client.createPointPicker(createFakeContainer(), {
        onSelect(selection): void {
            selectedResolve?.(selection)
        },
    })
    const map = latestMap

    if (!map) throw new Error('Expected the AMap picker to create a map')
    map.triggerClick(113.54, 34.82)

    assert.deepEqual(await selected, {
        coordinate: { longitude: 113.54, latitude: 34.82 },
        address: {
            formattedAddress: '河南省郑州市中原区科学大道100号',
            country: '中国',
            province: '河南省',
            city: '郑州市',
            district: '中原区',
            township: '沟赵办事处',
            street: '科学大道',
            streetNumber: '100号',
            adcode: '410102',
            citycode: '0371',
        },
    })
    assert.deepEqual(latestMarker?.position, [113.54, 34.82])
    assert.deepEqual(map.center, [113.54, 34.82])

    picker.destroy()
    assert.equal(map.destroyed, true)
    assert.equal(map.clickHandler, null)
    assert.equal(latestMarker?.map, null)
})

test('navigation builds an official AMap URI and delegates browser opening', () => {
    const opened: { url: string; target: string }[] = []
    const client = createAmapClient({
        loadSdk: async () => createFakeSdk(reverseGeocodeResult),
        openUrl(url, target): void {
            opened.push({ url, target })
        },
    })

    const url = client.openNavigation(
        { longitude: 113.54, latitude: 34.82, name: '目的地' },
        {
            origin: { longitude: 113.6, latitude: 34.76, name: '起点' },
            mode: 'walk',
            coordinateSystem: 'gcj02',
            callNative: true,
            source: 'Quant Lab',
        },
    )
    const parsedUrl = new URL(url)

    assert.equal(parsedUrl.origin, 'https://uri.amap.com')
    assert.equal(parsedUrl.pathname, '/navigation')
    assert.equal(parsedUrl.searchParams.get('to'), '113.54,34.82,目的地')
    assert.equal(parsedUrl.searchParams.get('from'), '113.6,34.76,起点')
    assert.equal(parsedUrl.searchParams.get('mode'), 'walk')
    assert.equal(parsedUrl.searchParams.get('coordinate'), 'gaode')
    assert.equal(parsedUrl.searchParams.get('callnative'), '1')
    assert.deepEqual(opened, [{ url, target: '_blank' }])
})

test('invalid coordinates and unsuccessful geocoder responses fail with stable errors', async () => {
    const invalidClient = createAmapClient({ loadSdk: async () => createFakeSdk(reverseGeocodeResult) })
    const failedClient = createAmapClient({ loadSdk: async () => createFakeSdk({ info: 'INVALID_USER_KEY' }) })

    await assert.rejects(
        invalidClient.reverseGeocode({ longitude: 181, latitude: 34.82 }),
        (error: unknown) => error instanceof AmapError && error.code === 'invalid-coordinate',
    )
    await assert.rejects(
        failedClient.reverseGeocode({ longitude: 113.54, latitude: 34.82 }),
        (error: unknown) => error instanceof AmapError && error.code === 'reverse-geocode-failed',
    )
})

let latestMap: FakeMap | null = null
let latestMarker: FakeMarker | null = null
let selectedResolve: ((selection: AmapPointSelection) => void) | null = null

class FakeMap implements AmapMapLike {
    clickHandler: AmapMapClickHandler | null = null
    center: AmapPosition | null
    destroyed = false

    constructor(_container: HTMLElement, options: AmapMapOptions) {
        this.center = options.center ?? null
        rememberMap(this)
    }

    on(_eventName: 'click', handler: AmapMapClickHandler): void {
        this.clickHandler = handler
    }

    off(_eventName: 'click', handler: AmapMapClickHandler): void {
        if (this.clickHandler === handler) this.clickHandler = null
    }

    setCenter(position: AmapPosition): void {
        this.center = position
    }

    destroy(): void {
        this.destroyed = true
    }

    triggerClick(longitude: number, latitude: number): void {
        this.clickHandler?.({
            lnglat: {
                getLng: () => longitude,
                getLat: () => latitude,
            },
        })
    }
}

class FakeMarker implements AmapMarkerLike {
    position: AmapPosition
    map: AmapMapLike | null = null

    constructor(options: AmapMarkerOptions) {
        this.position = options.position
        rememberMarker(this)
    }

    setPosition(position: AmapPosition): void {
        this.position = position
    }

    setMap(map: AmapMapLike | null): void {
        this.map = map
    }
}

function createFakeSdk(result: unknown): AmapSdkLike {
    class FakeGeocoder {
        constructor(_options: AmapGeocoderOptions) {}

        getAddress(_position: AmapPosition, callback: AmapGeocoderCallback): void {
            callback('complete', result)
        }
    }

    return {
        Map: FakeMap,
        Marker: FakeMarker,
        Geocoder: FakeGeocoder,
    }
}

function createFakeContainer(): HTMLElement {
    return Object.create(null) as HTMLElement
}

function rememberMap(map: FakeMap): void {
    latestMap = map
}

function rememberMarker(marker: FakeMarker): void {
    latestMarker = marker
}
