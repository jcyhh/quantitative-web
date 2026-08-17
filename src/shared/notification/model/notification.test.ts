import assert from 'node:assert/strict'
import test from 'node:test'
import { notification } from './notification'

test('notification uses the temporary native dialog fallback', () => {
  const alerts: string[] = []
  const originalWindow = globalThis.window

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      alert(message: string) {
        alerts.push(message)
      },
      confirm() {
        return true
      },
    },
  })

  try {
    notification.success('saved')
    assert.deepEqual(alerts, ['saved'])
    assert.equal(notification.confirm('continue'), true)
  } finally {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
  }
})
