import type { CSSProperties, ReactElement } from 'react'
import { useEffect, useRef } from 'react'
import { init, use as registerEChartsExtensions } from 'echarts/core'
import type { EChartsCoreOption, EChartsType } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import styles from './TldEChart.module.scss'

registerEChartsExtensions([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

export type EChartOption = EChartsCoreOption

export interface TldEChartProps {
    option: EChartOption
    ariaLabel: string
    className?: string | undefined
    height?: CSSProperties['height'] | undefined
    style?: CSSProperties | undefined
}

export function TldEChart({ option, ariaLabel, className, height, style }: TldEChartProps): ReactElement {
    const elementRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<EChartsType | null>(null)
    const rootClassName = className ? `${styles.chart} ${className}` : styles.chart
    const chartStyle = height === undefined ? style : { ...style, height }

    useEffect((): (() => void) | undefined => {
        const element = elementRef.current
        if (!element) return undefined

        const chart = init(element, undefined, { renderer: 'canvas' })
        chartRef.current = chart
        const resize = (): void => chart.resize()
        const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => resize())

        if (resizeObserver) resizeObserver.observe(element)
        else window.addEventListener('resize', resize)

        return (): void => {
            resizeObserver?.disconnect()
            if (!resizeObserver) window.removeEventListener('resize', resize)
            chart.dispose()
            if (chartRef.current === chart) chartRef.current = null
        }
    }, [])

    useEffect((): void => {
        chartRef.current?.setOption(option, { notMerge: true })
    }, [option])

    return <div ref={elementRef} className={rootClassName} style={chartStyle} role="img" aria-label={ariaLabel} />
}
