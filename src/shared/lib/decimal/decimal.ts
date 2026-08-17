import Decimal from 'decimal.js'

export type DecimalInput = string | number

const DecimalValue = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
})

/**
 * Exact decimal arithmetic foundation. Prefer strings for API values and values
 * with more than 15 significant digits. Results remain strings by design.
 */
export function decimalAdd(left: DecimalInput, right: DecimalInput): string {
  return toDecimal(left).plus(right).toFixed()
}

export function decimalSubtract(left: DecimalInput, right: DecimalInput): string {
  return toDecimal(left).minus(right).toFixed()
}

export function decimalMultiply(left: DecimalInput, right: DecimalInput): string {
  return toDecimal(left).times(right).toFixed()
}

/** Throws when the divisor is zero. Division uses 40 significant digits and ROUND_HALF_UP. */
export function decimalDivide(dividend: DecimalInput, divisor: DecimalInput): string {
  const decimalDivisor = toDecimal(divisor)

  if (decimalDivisor.isZero()) throw new RangeError('Decimal division by zero is not allowed.')

  return toDecimal(dividend).dividedBy(decimalDivisor).toFixed()
}

function toDecimal(value: DecimalInput): Decimal {
  return new DecimalValue(value)
}
