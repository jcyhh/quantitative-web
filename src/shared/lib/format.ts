export function formatPercent(value: number, fractionDigits = 2, locale = 'zh-CN'): string {
  return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value)
}

export function formatCurrency(value: number, currency = 'CNY', locale = 'zh-CN'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}
