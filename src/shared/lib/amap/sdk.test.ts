import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveAmapLoader } from './sdk'
import { AmapError } from './types'

test('normalizes named and CommonJS AMap Loader exports without trusting the package declaration', async () => {
    const sdk = { Map: class {}, Marker: class {}, Geocoder: class {} }
    const load = async (): Promise<unknown> => sdk

    assert.equal(await resolveAmapLoader({ load })({ key: 'key', version: '2.0', plugins: [] }), sdk)
    assert.equal(await resolveAmapLoader({ default: { load } })({ key: 'key', version: '2.0', plugins: [] }), sdk)
    assert.throws(
        () => resolveAmapLoader({ default: {} }),
        (error: unknown) => error instanceof AmapError && error.code === 'sdk-invalid',
    )
})
