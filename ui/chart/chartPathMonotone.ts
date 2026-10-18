function round2(value: number): string {
  return String(Math.round(value * 100) / 100)
}

function chartTangents(points: { x: number; y: number }[]): number[] {
  const deltas: number[] = []
  for (const [index, current] of points.entries()) {
    const next = points[index + 1]
    if (next === undefined) break
    const dx = next.x - current.x
    deltas.push(dx === 0 ? 0 : (next.y - current.y) / dx)
  }
  const tangents = points.map((_, index) => {
    const previous = deltas[index - 1]
    const next = deltas[index]
    if (previous === undefined) return next ?? 0
    if (next === undefined) return previous
    return (previous + next) / 2
  })
  for (const [index, delta] of deltas.entries()) {
    if (delta === 0) {
      tangents[index] = 0
      tangents[index + 1] = 0
    } else {
      const start = tangents[index] ?? 0
      const end = tangents[index + 1] ?? 0
      const alpha = start / delta
      const beta = end / delta
      const squared = alpha * alpha + beta * beta
      if (squared > 9) {
        const tau = 3 / Math.sqrt(squared)
        tangents[index] = tau * alpha * delta
        tangents[index + 1] = tau * beta * delta
      }
    }
  }
  return tangents
}

/** Monotone cubic interpolation (Fritsch–Carlson): never overshoots, flat segments stay flat. */
export function chartPathMonotone(points: { x: number; y: number }[]): string {
  const [first, second] = points
  if (first === undefined) return ""
  if (points.length === 1 || second === undefined) return `M ${round2(first.x)} ${round2(first.y)}`
  if (points.length === 2) return `M ${round2(first.x)} ${round2(first.y)} L ${round2(second.x)} ${round2(second.y)}`
  const tangents = chartTangents(points)
  let path = `M ${round2(first.x)} ${round2(first.y)}`
  for (const [index, current] of points.entries()) {
    const next = points[index + 1]
    if (next === undefined) break
    const startTangent = tangents[index] ?? 0
    const endTangent = tangents[index + 1] ?? 0
    const dx = next.x - current.x
    const control1x = current.x + dx / 3
    const control1y = current.y + (startTangent * dx) / 3
    const control2x = next.x - dx / 3
    const control2y = next.y - (endTangent * dx) / 3
    path += ` C ${round2(control1x)} ${round2(control1y)} ${round2(control2x)} ${round2(control2y)} ${round2(next.x)} ${round2(next.y)}`
  }
  return path
}
