import type { CSSProperties, ReactElement } from 'react'
import { useEffect, useRef } from 'react'
import {
    AmapError,
    createAmapPointPicker,
    type AmapCoordinate,
    type AmapGeocodeExtensions,
    type AmapPointPicker,
    type AmapPointSelection,
} from '../../lib/amap'
import styles from './TldAmapPicker.module.scss'

export interface TldAmapPickerProps {
    value?: AmapCoordinate | null | undefined
    zoom?: number | undefined
    reverseGeocodeRadius?: number | undefined
    reverseGeocodeExtensions?: AmapGeocodeExtensions | undefined
    onChange: (selection: AmapPointSelection) => void
    onError?: ((error: AmapError) => void) | undefined
    className?: string | undefined
    height?: CSSProperties['height'] | undefined
    style?: CSSProperties | undefined
}

export function TldAmapPicker({
    value,
    zoom,
    reverseGeocodeRadius,
    reverseGeocodeExtensions,
    onChange,
    onError,
    className,
    height,
    style,
}: TldAmapPickerProps): ReactElement {
    const containerRef = useRef<HTMLDivElement>(null)
    const pickerRef = useRef<AmapPointPicker | null>(null)
    const valueRef = useRef(value)
    const onChangeRef = useRef(onChange)
    const onErrorRef = useRef(onError)
    const rootClassName = className ? `${styles['map-container']} ${className}` : styles['map-container']
    const rootStyle = height === undefined ? style : { ...style, height }

    valueRef.current = value
    onChangeRef.current = onChange
    onErrorRef.current = onError

    useEffect((): (() => void) | undefined => {
        const container = containerRef.current
        if (!container) return undefined

        let active = true
        void createAmapPointPicker(container, {
            initialCoordinate: valueRef.current,
            zoom,
            reverseGeocode: {
                radius: reverseGeocodeRadius,
                extensions: reverseGeocodeExtensions,
            },
            onSelect(selection): void {
                onChangeRef.current(selection)
            },
            onError(error): void {
                onErrorRef.current?.(error)
            },
        }).then(
            (picker) => {
                if (!active) {
                    picker.destroy()
                    return
                }
                pickerRef.current = picker
                picker.setCoordinate(valueRef.current ?? null)
            },
            (error: unknown) => {
                if (!active) return
                onErrorRef.current?.(
                    error instanceof AmapError
                        ? error
                        : new AmapError('sdk-load-failed', 'Unable to initialize the AMap picker', error),
                )
            },
        )

        return (): void => {
            active = false
            const picker = pickerRef.current
            pickerRef.current = null
            picker?.destroy()
        }
    }, [reverseGeocodeExtensions, reverseGeocodeRadius, zoom])

    useEffect((): void => {
        pickerRef.current?.setCoordinate(value ?? null)
    }, [value])

    return <div ref={containerRef} className={rootClassName} style={rootStyle} />
}
