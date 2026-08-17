import assert from 'node:assert/strict'
import test from 'node:test'
import { numberAdd, numberDivide, numberMultiply, numberSubtract } from './number'

test('number arithmetic supports UI geometry calculations', () => {
  assert.equal(numberAdd(12, 8), 20)
  assert.equal(numberSubtract(12, 8), 4)
  assert.equal(numberMultiply(12, 8), 96)
  assert.equal(numberDivide(12, 8), 1.5)
})

test('number division rejects a zero divisor', () => {
  assert.throws(() => numberDivide(1, 0))
})
