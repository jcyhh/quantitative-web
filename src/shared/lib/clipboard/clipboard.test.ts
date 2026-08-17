import assert from 'node:assert/strict'
import test from 'node:test'
import { copyText } from './clipboard'

test('copyText rejects an empty value before calling the browser library', async () => {
  assert.equal(await copyText(''), false)
})
