export function numberAdd(...values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

export function numberSubtract(left: number, right: number): number {
  return left - right
}

export function numberMultiply(...values: number[]): number {
  return values.reduce((total, value) => total * value, 1)
}

/** Throws when the divisor is zero. Only use for non-financial values such as UI geometry. */
export function numberDivide(dividend: number, divisor: number): number {
  if (divisor === 0) throw new RangeError('Number division by zero is not allowed.')

  return dividend / divisor
}
