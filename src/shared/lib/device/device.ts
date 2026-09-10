export type ClientType = 'pc' | 'tab' | 'h5'
export type DeviceKind = 'desktop' | 'tablet' | 'phone'

export interface DevicePointerInfo {
    coarse: boolean
    fine: boolean
    none: boolean
    hover: boolean
    anyCoarse: boolean
    anyFine: boolean
    anyHover: boolean
}

export interface DeviceScreenInfo {
    width: number
    height: number
    availWidth: number
    availHeight: number
    colorDepth: number
    pixelDepth: number
    orientation: string
}

export interface DeviceViewportInfo {
    innerWidth: number
    innerHeight: number
    clientWidth: number
    clientHeight: number
    devicePixelRatio: number
    visualViewportWidth: number
    visualViewportHeight: number
    visualViewportScale: number
    rootFontSize: string
    isSecureContext: boolean
}

export interface DeviceUserAgentDataInfo {
    mobile: boolean | null
    platform: string
    brands: string
}

export interface DeviceDiagnosticInfo {
    clientType: ClientType
    userAgent: string
    platform: string
    vendor: string
    language: string
    maxTouchPoints: number
    msMaxTouchPoints: number
    touchSupported: boolean
    pointer: DevicePointerInfo
    screen: DeviceScreenInfo
    viewport: DeviceViewportInfo
    userAgentData: DeviceUserAgentDataInfo
}

export interface DeviceDetectionEvidence {
    userAgent: string
    maxTouchPoints: number
    msMaxTouchPoints: number
    touchSupported: boolean
    screenWidth: number
    screenHeight: number
    pointerCoarse: boolean
    hoverSupported: boolean
}

interface NavigatorWithUserAgentData extends Navigator {
    msMaxTouchPoints?: number
    userAgentData?: {
        mobile?: boolean
        platform?: string
        brands?: Array<{
            brand: string
            version: string
        }>
    }
}

const PHONE_MAX_SHORT_SIDE = 500
const TABLET_MAX_SHORT_SIDE = 1100
const TABLET_MAX_LONG_SIDE = 1800
const TABLET_UA_PATTERN = new RegExp(
    [
        'tablet',
        'playbook',
        'kindle',
        'silk/',
        'ipad',
        'matepad',
        'mediapad',
        'mi pad',
        'xiaomi pad',
        'redmi pad',
        'mipad',
        'oppo pad',
        'vivo pad',
        'oneplus pad',
        'realme pad',
        'galaxy tab',
        'sm-t\\d',
        'sm-x\\d',
        'sm-p\\d',
        'gt-p\\d',
        'gt-n\\d',
        'lenovo tab',
        'tab\\s*[saep]\\d',
        'nexus\\s*(7|9|10)',
        'xoom',
        'sch-i800',
        'pixel c',
        'transformer',
        'shield tablet',
        'surface pro',
        'surface go',
        'surface book',
        'kf[a-z0-9]{4,}',
        'dmg-',
        'tgr-',
        'btk',
        'bah[34]-',
        'ags2-',
        'agr-',
        'scm-',
        'sht-',
        'wgr-',
        'krj-',
        'bah2-',
        'scmr-',
        'mrr-',
        'hbl-',
        'hdx',
    ].join('|'),
    'i',
)
const PHONE_UA_PATTERN = /iphone|ipod|windows phone|iemobile|blackberry|bb10|opera mini|opera mobi/i
const MOBILE_BROWSER_PATTERN =
    /bdh?onorbrowser|honorbrowser|huaweibrowser|miuibrowser|heytapbrowser|oppobrowser|vivobrowser|quark|ucbrowser|mqqbrowser|samsungbrowser/i

function getUserAgent(): string {
    if (typeof navigator === 'undefined') return ''
    return navigator.userAgent.toLowerCase()
}

function hasTouch(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

    const currentNavigator = navigator as NavigatorWithUserAgentData
    return (
        'ontouchstart' in window || currentNavigator.maxTouchPoints > 0 || (currentNavigator.msMaxTouchPoints ?? 0) > 0
    )
}

function matchesMedia(query: string): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia(query).matches
}

function getEvidenceScreenShortSide(evidence: DeviceDetectionEvidence): number {
    const width = evidence.screenWidth || 0
    const height = evidence.screenHeight || 0
    if (!width || !height) return 0
    return Math.min(width, height)
}

function getEvidenceScreenLongSide(evidence: DeviceDetectionEvidence): number {
    const width = evidence.screenWidth || 0
    const height = evidence.screenHeight || 0
    if (!width || !height) return 0
    return Math.max(width, height)
}

function getEvidenceTouchPoints(evidence: DeviceDetectionEvidence): number {
    return Math.max(evidence.maxTouchPoints || 0, evidence.msMaxTouchPoints || 0)
}

function hasEvidenceTouch(evidence: DeviceDetectionEvidence): boolean {
    return evidence.touchSupported || getEvidenceTouchPoints(evidence) > 0
}

function hasReliableTouchEvidence(evidence: DeviceDetectionEvidence): boolean {
    return evidence.touchSupported && getEvidenceTouchPoints(evidence) > 0
}

function isTabletScreen(evidence: DeviceDetectionEvidence): boolean {
    const shortSide = getEvidenceScreenShortSide(evidence)
    const longSide = getEvidenceScreenLongSide(evidence)
    return Boolean(shortSide && longSide && shortSide <= TABLET_MAX_SHORT_SIDE && longSide <= TABLET_MAX_LONG_SIDE)
}

function detectTabletDevice(evidence: DeviceDetectionEvidence): boolean {
    const userAgent = evidence.userAgent.toLowerCase()
    const looksLikePhone =
        PHONE_UA_PATTERN.test(userAgent) || (/android|harmonyos/.test(userAgent) && /mobile/.test(userAgent))

    if (looksLikePhone && hasEvidenceTouch(evidence) && getEvidenceScreenShortSide(evidence) > PHONE_MAX_SHORT_SIDE) {
        return true
    }
    if (PHONE_UA_PATTERN.test(userAgent)) return false
    if (/ipad/.test(userAgent)) return true
    if (/macintosh/.test(userAgent) && evidence.maxTouchPoints > 1) return true

    if (TABLET_UA_PATTERN.test(userAgent)) {
        return !(/harmonyos/.test(userAgent) && /mobile/.test(userAgent))
    }
    if (/android/.test(userAgent) && !/mobile/.test(userAgent)) return true
    if (/harmonyos/.test(userAgent) && !/mobile/.test(userAgent)) return true
    if (/harmonyos/.test(userAgent) && /;\s*[a-z0-9]+-w\d/i.test(evidence.userAgent)) return true
    if (
        /windows/.test(userAgent) &&
        hasEvidenceTouch(evidence) &&
        (/touch/.test(userAgent) || /surface|tablet/.test(userAgent))
    ) {
        return true
    }

    return false
}

function detectPhoneDevice(evidence: DeviceDetectionEvidence): boolean {
    if (detectTabletDevice(evidence)) return false
    const userAgent = evidence.userAgent.toLowerCase()
    return /iphone|ipod|android|harmonyos|mobile|mobi|webos|blackberry|iemobile|opera mini|opera mobi/.test(userAgent)
}

function getDesktopClientTypeOverride(evidence: DeviceDetectionEvidence): ClientType | null {
    if (!hasReliableTouchEvidence(evidence) || !isTabletScreen(evidence)) return null

    const isTouchFirstTablet = evidence.pointerCoarse || MOBILE_BROWSER_PATTERN.test(evidence.userAgent)
    return isTouchFirstTablet ? 'tab' : null
}

function getPhoneScreenClientTypeOverride(evidence: DeviceDetectionEvidence): ClientType | null {
    if (!hasReliableTouchEvidence(evidence)) return null
    return getEvidenceScreenShortSide(evidence) <= PHONE_MAX_SHORT_SIDE ? 'h5' : null
}

function getCurrentDeviceDetectionEvidence(): DeviceDetectionEvidence {
    const currentNavigator = navigator as NavigatorWithUserAgentData
    return {
        userAgent: currentNavigator.userAgent || '',
        maxTouchPoints: currentNavigator.maxTouchPoints || 0,
        msMaxTouchPoints: currentNavigator.msMaxTouchPoints || 0,
        touchSupported: hasTouch(),
        screenWidth: typeof screen === 'undefined' ? 0 : screen.width || 0,
        screenHeight: typeof screen === 'undefined' ? 0 : screen.height || 0,
        pointerCoarse: matchesMedia('(pointer: coarse)'),
        hoverSupported: matchesMedia('(hover: hover)'),
    }
}

function detectBaseClientType(evidence: DeviceDetectionEvidence): ClientType {
    if (detectTabletDevice(evidence)) return 'tab'
    if (detectPhoneDevice(evidence)) return 'h5'
    return 'pc'
}

export function detectClientType(evidence: DeviceDetectionEvidence): ClientType {
    const phoneScreenClientType = getPhoneScreenClientTypeOverride(evidence)
    if (phoneScreenClientType) return phoneScreenClientType

    const baseClientType = detectBaseClientType(evidence)
    if (baseClientType !== 'pc') return baseClientType
    return getDesktopClientTypeOverride(evidence) || baseClientType
}

export function getClientType(): ClientType {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'pc'
    return detectClientType(getCurrentDeviceDetectionEvidence())
}

export function getDeviceKind(): DeviceKind {
    const clientType = getClientType()
    if (clientType === 'tab') return 'tablet'
    if (clientType === 'h5') return 'phone'
    return 'desktop'
}

export function isDesktopDevice(): boolean {
    return getDeviceKind() === 'desktop'
}

export function isTabletDevice(): boolean {
    return getClientType() === 'tab'
}

export function isPhoneDevice(): boolean {
    return getClientType() === 'h5'
}

export function isTargetDevice(device: DeviceKind): boolean {
    return getDeviceKind() === device
}

export function isIos(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

    const userAgent = navigator.userAgent
    return /iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1)
}

export function isWechat(): boolean {
    return getUserAgent().includes('micromessenger')
}

export function isSmallScreen(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 1024
}

export function getDeviceDiagnosticInfo(): DeviceDiagnosticInfo {
    const currentWindow = typeof window === 'undefined' ? undefined : window
    const currentDocument = typeof document === 'undefined' ? undefined : document
    const currentNavigator = typeof navigator === 'undefined' ? undefined : (navigator as NavigatorWithUserAgentData)
    const currentScreen = currentWindow?.screen || (typeof screen === 'undefined' ? undefined : screen)
    const visualViewport = currentWindow?.visualViewport
    const root = currentDocument?.documentElement
    const userAgentData = currentNavigator?.userAgentData

    return {
        clientType: getClientType(),
        userAgent: currentNavigator?.userAgent || '',
        platform: currentNavigator?.platform || '',
        vendor: currentNavigator?.vendor || '',
        language: currentNavigator?.language || '',
        maxTouchPoints: currentNavigator?.maxTouchPoints || 0,
        msMaxTouchPoints: currentNavigator?.msMaxTouchPoints || 0,
        touchSupported: hasTouch(),
        pointer: {
            coarse: matchesMedia('(pointer: coarse)'),
            fine: matchesMedia('(pointer: fine)'),
            none: matchesMedia('(pointer: none)'),
            hover: matchesMedia('(hover: hover)'),
            anyCoarse: matchesMedia('(any-pointer: coarse)'),
            anyFine: matchesMedia('(any-pointer: fine)'),
            anyHover: matchesMedia('(any-hover: hover)'),
        },
        screen: {
            width: currentScreen?.width || 0,
            height: currentScreen?.height || 0,
            availWidth: currentScreen?.availWidth || 0,
            availHeight: currentScreen?.availHeight || 0,
            colorDepth: currentScreen?.colorDepth || 0,
            pixelDepth: currentScreen?.pixelDepth || 0,
            orientation: currentScreen?.orientation?.type || '',
        },
        viewport: {
            innerWidth: currentWindow?.innerWidth || 0,
            innerHeight: currentWindow?.innerHeight || 0,
            clientWidth: root?.clientWidth || 0,
            clientHeight: root?.clientHeight || 0,
            devicePixelRatio: currentWindow?.devicePixelRatio || 0,
            visualViewportWidth: visualViewport?.width || 0,
            visualViewportHeight: visualViewport?.height || 0,
            visualViewportScale: visualViewport?.scale || 0,
            rootFontSize: root && typeof getComputedStyle === 'function' ? getComputedStyle(root).fontSize : '',
            isSecureContext: Boolean(currentWindow?.isSecureContext),
        },
        userAgentData: {
            mobile: typeof userAgentData?.mobile === 'boolean' ? userAgentData.mobile : null,
            platform: userAgentData?.platform || '',
            brands: userAgentData?.brands?.map((item) => `${item.brand} ${item.version}`).join(' / ') || '',
        },
    }
}
