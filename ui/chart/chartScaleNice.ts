const niceFractions = [1, 2, 2.5, 5, 10]

function clean(value: number): number {
  return Number(value.toPrecision(12))
}

/** Nice axis maximum: step from {1, 2, 2.5, 5} × 10^n so max covers maxValue with ≈ tickCount steps. */
export function chartScaleNice(maxValue: number, tickCount = 4): { max: number; ticks: number[] } {
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return { max: tickCount, ticks: Array.from({ length: tickCount + 1 }, (_, index) => index) }
  }
  const rawStep = maxValue / tickCount
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  const fraction = niceFractions.find((candidate) => candidate >= normalized) ?? 10
  const step = fraction * magnitude
  const max = clean(step * tickCount)
  return { max, ticks: Array.from({ length: tickCount + 1 }, (_, index) => clean(index * step)) }
}
