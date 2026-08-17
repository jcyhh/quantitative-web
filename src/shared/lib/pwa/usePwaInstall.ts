import { useCallback, useSyncExternalStore } from 'react'
import { sharedConfig } from '../../config'
import { storage } from '../storage'

type PwaInstallOutcome = 'accepted' | 'dismissed'
export type PwaInstallResult = PwaInstallOutcome | 'unavailable'

interface PwaBeforeInstallPromptEvent extends Event {
  readonly platforms?: string[]
  readonly userChoice: Promise<{ outcome: PwaInstallOutcome; platform: string }>
  prompt: () => Promise<void>
}

export interface PwaInstallSupportEnvironment {
  isStandalone: boolean
  isSecureContext: boolean
  hasServiceWorker: boolean
  userAgent: string
}

export interface PwaInstallState {
  canInstall: boolean
  isInstalled: boolean
  supportsInstall: boolean
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean }

export interface PwaInstallController extends PwaInstallState {
  install: () => Promise<PwaInstallResult>
}

let installPrompt: PwaBeforeInstallPromptEvent | null = null
let isListening = false
let pwaInstallState: PwaInstallState = { canInstall: false, isInstalled: false, supportsInstall: false }
const subscribers = new Set<() => void>()

export function isPwaStandaloneMode(displayModeStandalone: boolean, navigatorStandalone: boolean): boolean {
  return displayModeStandalone || navigatorStandalone
}

export function isPwaInstallSupportedEnvironment(environment: PwaInstallSupportEnvironment): boolean {
  if (environment.isStandalone) return true
  if (!environment.isSecureContext || !environment.hasServiceWorker) return false

  if (/crios|edgios|opios|firefox|fxios/i.test(environment.userAgent)) return false
  return /chrome|chromium|edg|opr|samsungbrowser/i.test(environment.userAgent)
}

function getStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false

  return isPwaStandaloneMode(
    window.matchMedia('(display-mode: standalone)').matches,
    Boolean((window.navigator as NavigatorWithStandalone).standalone),
  )
}

function getIsInstalled(): boolean {
  return getStandaloneMode() || storage.get(sharedConfig.storageKeys.pwaInstalled) === true
}

function getSupportsInstall(): boolean {
  if (typeof window === 'undefined') return false

  return isPwaInstallSupportedEnvironment({
    isStandalone: getStandaloneMode(),
    isSecureContext: window.isSecureContext,
    hasServiceWorker: 'serviceWorker' in window.navigator,
    userAgent: window.navigator.userAgent,
  })
}

function refreshState(): void {
  const isInstalled = getIsInstalled()
  pwaInstallState = {
    canInstall: installPrompt !== null && !isInstalled,
    isInstalled,
    supportsInstall: getSupportsInstall(),
  }
  subscribers.forEach((subscriber) => subscriber())
}

function subscribe(subscriber: () => void): () => void {
  subscribers.add(subscriber)
  return (): void => { subscribers.delete(subscriber) }
}

function getSnapshot(): PwaInstallState {
  return pwaInstallState
}

function handleBeforeInstallPrompt(event: Event): void {
  event.preventDefault()
  storage.set(sharedConfig.storageKeys.pwaInstalled, false)
  installPrompt = event as PwaBeforeInstallPromptEvent
  refreshState()
}

function handleAppInstalled(): void {
  installPrompt = null
  storage.set(sharedConfig.storageKeys.pwaInstalled, true)
  refreshState()
}

/**
 * Starts the install-event listener once for the lifetime of the app.
 * This does not register a Service Worker or activate PWA support by itself.
 */
export function initializePwaInstallLifecycle(): void {
  if (typeof window === 'undefined' || isListening) return

  isListening = true
  const displayModeQuery = window.matchMedia('(display-mode: standalone)')
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
  displayModeQuery.addEventListener('change', refreshState)
  refreshState()
}

async function requestInstall(): Promise<PwaInstallResult> {
  const promptEvent = installPrompt
  if (promptEvent === null) return 'unavailable'

  try {
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    installPrompt = null
    if (choice.outcome === 'accepted') storage.set(sharedConfig.storageKeys.pwaInstalled, true)
    refreshState()
    return choice.outcome
  } catch {
    installPrompt = null
    refreshState()
    return 'unavailable'
  }
}

/**
 * Reads the app-wide PWA install lifecycle. It exposes no UI and does not enable PWA by itself.
 */
export function usePwaInstall(): PwaInstallController {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const install = useCallback(requestInstall, [])
  return { ...state, install }
}
