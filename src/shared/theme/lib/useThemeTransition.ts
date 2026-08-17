import { useCallback, type RefObject } from 'react'
import { flushSync } from 'react-dom'
import type { AppTheme } from '../../config/theme'
import { numberAdd, numberDivide, numberSubtract } from '../../lib/number'
import { useAppTheme } from '../model/useAppTheme'

export interface ThemeTransitionOptions {
  originRef?: RefObject<HTMLElement | null>
  duration?: number
  enabled?: boolean
}

interface TransitionOrigin {
  x: number
  y: number
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getTransitionOrigin(originElement?: HTMLElement | null): TransitionOrigin {
  if (originElement === undefined || originElement === null) {
    return { x: numberDivide(window.innerWidth, 2), y: numberDivide(window.innerHeight, 2) }
  }

  const rect = originElement.getBoundingClientRect()
  return {
    x: numberAdd(rect.left, numberDivide(rect.width, 2)),
    y: numberAdd(rect.top, numberDivide(rect.height, 2)),
  }
}

/**
 * Switches any registered app theme with a radial View Transition.
 * Falls back to an immediate change for unsupported browsers and reduced-motion users.
 */
export function useThemeTransition({ originRef, duration = 400, enabled = true }: ThemeTransitionOptions = {}): (nextTheme: AppTheme) => void {
  const { setTheme } = useAppTheme()

  return useCallback((nextTheme: AppTheme): void => {
    const updateTheme = (): void => { flushSync(() => setTheme(nextTheme)) }
    const startViewTransition = document.startViewTransition
    const canAnimate = enabled && !prefersReducedMotion() && startViewTransition !== undefined

    if (!canAnimate) {
      updateTheme()
      return
    }

    const { x, y } = getTransitionOrigin(originRef?.current)
    const endRadius = Math.hypot(
      Math.max(x, numberSubtract(window.innerWidth, x)),
      Math.max(y, numberSubtract(window.innerHeight, y)),
    )
    const transition = startViewTransition(updateTheme)

    void transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
        { duration, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
      )
    }).catch(() => {
      // A skipped transition has already applied the theme; no recovery action is needed.
    })
  }, [duration, enabled, originRef, setTheme])
}
