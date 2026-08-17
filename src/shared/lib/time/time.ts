import { sharedConfig } from '../../config'

export type DateInput = Date | number | string

export interface DateFormatOptions extends Intl.DateTimeFormatOptions {
  fallback?: string
}

/**
 * Formats a date-like value for display. API date strings should include a timezone
 * whenever they represent an instant; otherwise browser parsing can be ambiguous.
 */
export function formatDateTime(value: DateInput | null | undefined, locale: string, options: DateFormatOptions = {}): string {
  const { fallback = '--', ...formatOptions } = options
  const date = toValidDate(value)

  if (!date) return fallback

  return new Intl.DateTimeFormat(locale, { ...formatOptions, timeZone: options.timeZone ?? sharedConfig.time.defaultTimeZone }).format(date)
}

function toValidDate(value: DateInput | null | undefined): Date | null {
  if (value === null || value === undefined) return null

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
