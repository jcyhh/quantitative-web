import { render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { TldEChart, type EChartOption } from './TldEChart'

const echartsMocks = vi.hoisted(() => ({
    dispose: vi.fn<() => void>(),
    init: vi.fn(),
    register: vi.fn(),
    resize: vi.fn<() => void>(),
    setOption: vi.fn(),
}))

vi.mock('echarts/core', () => ({
    init: echartsMocks.init,
    use: echartsMocks.register,
}))
vi.mock('echarts/charts', () => ({ LineChart: {} }))
vi.mock('echarts/components', () => ({ GridComponent: {}, TooltipComponent: {} }))
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }))

const resizeObservers: FakeResizeObserver[] = []

class FakeResizeObserver implements ResizeObserver {
    private readonly callback: ResizeObserverCallback
    readonly disconnect = vi.fn<() => void>()
    readonly observe = vi.fn<(target: Element, options?: ResizeObserverOptions) => void>()
    readonly unobserve = vi.fn<(target: Element) => void>()

    constructor(callback: ResizeObserverCallback) {
        this.callback = callback
        resizeObservers.push(this)
    }

    takeRecords(): ResizeObserverEntry[] {
        return []
    }

    trigger(): void {
        this.callback([], this)
    }
}

beforeEach(() => {
    resizeObservers.length = 0
    echartsMocks.init.mockReturnValue({
        dispose: echartsMocks.dispose,
        resize: echartsMocks.resize,
        setOption: echartsMocks.setOption,
    })
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
})

test('updates the chart option, responds to resize and releases resources on unmount', () => {
    const firstOption: EChartOption = {
        xAxis: { type: 'category', data: ['Mon', 'Tue'] },
        yAxis: { type: 'value' },
        series: [{ type: 'line', data: [100, 105] }],
    }
    const secondOption: EChartOption = {
        ...firstOption,
        series: [{ type: 'line', data: [105, 110] }],
    }
    const { rerender, unmount } = render(<TldEChart option={firstOption} ariaLabel="Equity curve" />)
    const chartElement = screen.getByRole('img', { name: 'Equity curve' })

    expect(echartsMocks.init).toHaveBeenCalledWith(chartElement, undefined, { renderer: 'canvas' })
    expect(echartsMocks.setOption).toHaveBeenCalledWith(firstOption, { notMerge: true })

    const resizeObserver = resizeObservers[0]
    expect(resizeObserver).toBeDefined()
    if (!resizeObserver) throw new Error('Expected TldEChart to create a ResizeObserver')
    expect(resizeObserver.observe).toHaveBeenCalledWith(chartElement)

    resizeObserver.trigger()
    expect(echartsMocks.resize).toHaveBeenCalledOnce()

    rerender(<TldEChart option={secondOption} ariaLabel="Equity curve" />)
    expect(echartsMocks.setOption).toHaveBeenLastCalledWith(secondOption, { notMerge: true })

    unmount()
    expect(resizeObserver.disconnect).toHaveBeenCalledOnce()
    expect(echartsMocks.dispose).toHaveBeenCalledOnce()
})
