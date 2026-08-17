import assert from 'node:assert/strict'
import test from 'node:test'
import { decimalAdd, decimalDivide, decimalMultiply, decimalSubtract } from './decimal'

test('decimal arithmetic keeps base-10 results exact', () => {
  assert.equal(decimalAdd('0.1', '0.2'), '0.3')
  assert.equal(decimalSubtract('1', '0.9'), '0.1')
  assert.equal(decimalMultiply('19.9', '100'), '1990')
  assert.equal(decimalDivide('1', '8'), '0.125')
})

test('decimal division rejects a zero divisor', () => {
  assert.throws(() => decimalDivide('1', '0'))
})
