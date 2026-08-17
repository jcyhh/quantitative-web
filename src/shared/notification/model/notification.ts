export type NotificationLevel = 'success' | 'info' | 'warning' | 'error'

function showNativeAlert(message: string): void {
  window.alert(message)
}

/**
 * Global notification entry. Native dialogs are a temporary fallback until the
 * custom notification UI and provider are implemented.
 */
export const notification = {
  success(message: string): void {
    showNativeAlert(message)
  },
  info(message: string): void {
    showNativeAlert(message)
  },
  warning(message: string): void {
    showNativeAlert(message)
  },
  error(message: string): void {
    showNativeAlert(message)
  },
  confirm(message: string): boolean {
    return window.confirm(message)
  },
} as const
