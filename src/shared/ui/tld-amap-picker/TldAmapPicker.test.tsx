import { act, render, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import type { AmapPointPicker, AmapPointSelection, CreateAmapPointPickerOptions } from '../../lib/amap'
import { TldAmapPicker } from './TldAmapPicker'

const amapMocks = vi.hoisted(() => ({
    AmapError: class MockAmapError extends Error {
        readonly code: string

        constructor(code: string, message: string) {
            super(message)
            this.name = 'AmapError'
            this.code = code
        }
    },
    createPointPicker:
        vi.fn<(container: HTMLElement, options: CreateAmapPointPickerOptions) => Promise<AmapPointPicker>>(),
}))

vi.mock('../../lib/amap', () => ({
    AmapError: amapMocks.AmapError,
    createAmapPointPicker: amapMocks.createPointPicker,
}))

const picker = {
    setCoordinate: vi.fn<(coordinate: AmapPointSelection['coordinate'] | null) => void>(),
    destroy: vi.fn<() => void>(),
}

const selection: AmapPointSelection = {
    coordinate: { longitude: 113.54, latitude: 34.82 },
    address: {
        formattedAddress: '河南省郑州市中原区科学大道100号',
        country: '中国',
        province: '河南省',
        city: '郑州市',
        district: '中原区',
        township: '沟赵办事处',
        street: '科学大道',
        streetNumber: '100号',
        adcode: '410102',
        citycode: '0371',
    },
}

beforeEach(() => {
    amapMocks.createPointPicker.mockResolvedValue(picker)
})

test('forwards map selections, updates a controlled coordinate and destroys the picker', async () => {
    const onChange = vi.fn<(nextSelection: AmapPointSelection) => void>()
    const firstCoordinate = { longitude: 113.5, latitude: 34.8 }
    const secondCoordinate = { longitude: 113.6, latitude: 34.9 }
    const { rerender, unmount } = render(<TldAmapPicker value={firstCoordinate} onChange={onChange} />)

    await waitFor(() => expect(amapMocks.createPointPicker).toHaveBeenCalledOnce())
    const pickerOptions = amapMocks.createPointPicker.mock.calls[0]?.[1]
    if (!pickerOptions) throw new Error('Expected TldAmapPicker to create a picker controller')

    act(() => pickerOptions.onSelect(selection))
    expect(onChange).toHaveBeenCalledWith(selection)
    expect(picker.setCoordinate).toHaveBeenCalledWith(firstCoordinate)

    rerender(<TldAmapPicker value={secondCoordinate} onChange={onChange} />)
    expect(picker.setCoordinate).toHaveBeenLastCalledWith(secondCoordinate)

    unmount()
    expect(picker.destroy).toHaveBeenCalledOnce()
})
