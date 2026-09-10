import assert from 'node:assert/strict'
import test from 'node:test'
import { detectClientType, getDeviceDiagnosticInfo, isIos, isWechat, type DeviceDetectionEvidence } from './device'

const desktopEvidence: DeviceDetectionEvidence = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36',
    maxTouchPoints: 0,
    msMaxTouchPoints: 0,
    touchSupported: false,
    screenWidth: 1920,
    screenHeight: 1080,
    pointerCoarse: false,
    hoverSupported: true,
}

test('desktop and small-screen mobile evidence map to their backend client types', () => {
    assert.equal(detectClientType(desktopEvidence), 'pc')
    assert.equal(
        detectClientType({
            ...desktopEvidence,
            userAgent: 'Mozilla/5.0 (Linux; Android 13; Mobile) Chrome/131 Mobile Safari/537.36',
            maxTouchPoints: 5,
            touchSupported: true,
            screenWidth: 390,
            screenHeight: 844,
            pointerCoarse: true,
            hoverSupported: false,
        }),
        'h5',
    )
})

test('Windows-shell, HarmonyOS and iPad tablet evidence map to tab', () => {
    const tabletEvidence: DeviceDetectionEvidence[] = [
        {
            ...desktopEvidence,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131 bdhonorbrowser/9.6.0.4',
            maxTouchPoints: 5,
            touchSupported: true,
            screenWidth: 1205,
            screenHeight: 608,
            pointerCoarse: true,
            hoverSupported: false,
        },
        {
            ...desktopEvidence,
            userAgent: 'Mozilla/5.0 (Linux; Android 10; BAH3-W59 Build/HUAWEI) MQQBrowser/20.4 Mobile Safari/537.36',
            maxTouchPoints: 5,
            touchSupported: true,
            screenWidth: 517,
            screenHeight: 861,
            pointerCoarse: true,
            hoverSupported: false,
        },
        {
            ...desktopEvidence,
            userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
            maxTouchPoints: 5,
            touchSupported: true,
            screenWidth: 820,
            screenHeight: 1180,
            pointerCoarse: true,
            hoverSupported: false,
        },
    ]

    tabletEvidence.forEach((evidence) => assert.equal(detectClientType(evidence), 'tab'))
})

test('a touch-capable Windows laptop remains a desktop device', () => {
    assert.equal(
        detectClientType({
            ...desktopEvidence,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/150 Safari/537.36',
            maxTouchPoints: 10,
            touchSupported: true,
            screenWidth: 1366,
            screenHeight: 768,
            pointerCoarse: false,
            hoverSupported: true,
        }),
        'pc',
    )
})

test('device diagnostics have a stable non-browser fallback', () => {
    assert.doesNotThrow(() => getDeviceDiagnosticInfo())
    assert.equal(getDeviceDiagnosticInfo().clientType, 'pc')
})

test('iOS and WeChat checks read the current browser user agent', () => {
    withMockBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) MicroMessenger/8.0', 5, () => {
        assert.equal(isIos(), true)
        assert.equal(isWechat(), true)
    })

    withMockBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/150 Safari/537.36', 0, () => {
        assert.equal(isIos(), false)
        assert.equal(isWechat(), false)
    })
})

function withMockBrowser(userAgent: string, maxTouchPoints: number, callback: () => void): void {
    const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')

    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: { userAgent, maxTouchPoints },
    })
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {},
    })

    try {
        callback()
    } finally {
        restoreGlobalProperty('navigator', previousNavigator)
        restoreGlobalProperty('window', previousWindow)
    }
}

function restoreGlobalProperty(name: 'navigator' | 'window', descriptor: PropertyDescriptor | undefined): void {
    if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor)
        return
    }
    Reflect.deleteProperty(globalThis, name)
}
