export function readEChartCssVariable(variableName: string): string {
    if (typeof document === 'undefined') return ''
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim()
}
