import assert from 'node:assert/strict'
import test from 'node:test'
import { enUS } from './en-US'
import { zhCN } from './zh-CN'

test('Chinese and English locale resources expose identical keys', () => {
  assert.deepEqual(getLeafKeys(zhCN), getLeafKeys(enUS))
})

function getLeafKeys(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof nestedValue === 'object' && nestedValue !== null
      ? getLeafKeys(nestedValue as Record<string, unknown>, path)
      : [path]
  }).sort()
}
