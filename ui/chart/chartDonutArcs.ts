export interface ChartDonutArc {
  path: string
  startAngle: number
  endAngle: number
  percent: number
  index: number
}

const fullCircle = 360

function round2(value: number): string {
  return String(Math.round(value * 100) / 100)
}

function polar(cx: number, cy: number, radius: number, angleDegrees: number): { x: number; y: number } {
  const radians = (angleDegrees * Math.PI) / 180
  return { x: cx + radius * Math.sin(radians), y: cy - radius * Math.cos(radians) }
}

function sectorPath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const large = endAngle - startAngle > 180 ? 1 : 0
  const outerStart = polar(cx, cy, outerRadius, startAngle)
  const outerEnd = polar(cx, cy, outerRadius, endAngle)
  const innerEnd = polar(cx, cy, innerRadius, endAngle)
  const innerStart = polar(cx, cy, innerRadius, startAngle)
  const outer = round2(outerRadius)
  const inner = round2(innerRadius)
  return (
    `M ${round2(outerStart.x)} ${round2(outerStart.y)}` +
    ` A ${outer} ${outer} 0 ${large} 1 ${round2(outerEnd.x)} ${round2(outerEnd.y)}` +
    ` L ${round2(innerEnd.x)} ${round2(innerEnd.y)}` +
    ` A ${inner} ${inner} 0 ${large} 0 ${round2(innerStart.x)} ${round2(innerStart.y)} Z`
  )
}

function ringPath(cx: number, cy: number, outerRadius: number, innerRadius: number): string {
  const left = round2(cx - outerRadius)
  const right = round2(cx + outerRadius)
  const middle = round2(cy)
  const innerLeft = round2(cx - innerRadius)
  const innerRight = round2(cx + innerRadius)
  const outer = round2(outerRadius)
  const inner = round2(innerRadius)
  return (
    `M ${left} ${middle}` +
    ` A ${outer} ${outer} 0 1 1 ${right} ${middle}` +
    ` A ${outer} ${outer} 0 1 1 ${left} ${middle} Z` +
    ` M ${innerLeft} ${middle}` +
    ` A ${inner} ${inner} 0 1 0 ${innerRight} ${middle}` +
    ` A ${inner} ${inner} 0 1 0 ${innerLeft} ${middle} Z`
  )
}

/** Annular-sector arcs starting at 12 o'clock, clockwise. Zero values are skipped, gaps need ≥ 2 segments. */
export function chartDonutArcs(
  values: number[],
  opts: { size: number; thickness: number; gapDegrees?: number },
): ChartDonutArc[] {
  const total = values.reduce((sum, value) => sum + (value > 0 ? value : 0), 0)
  if (!(total > 0)) return []
  const center = opts.size / 2
  const outerRadius = center
  const innerRadius = Math.max(center - opts.thickness, 0)
  const entries = values.map((value, index) => ({ value, index })).filter((entry) => entry.value > 0)
  const [single] = entries
  if (entries.length === 1 && single !== undefined) {
    return [
      {
        path: ringPath(center, center, outerRadius, innerRadius),
        startAngle: 0,
        endAngle: fullCircle,
        percent: (single.value / total) * 100,
        index: single.index,
      },
    ]
  }
  const gap = opts.gapDegrees ?? 2
  let cursor = 0
  return entries.map((entry) => {
    const span = (entry.value / total) * fullCircle
    const startAngle = cursor + gap / 2
    const endAngle = cursor + span - gap / 2
    cursor += span
    return {
      path: sectorPath(center, center, outerRadius, innerRadius, startAngle, endAngle),
      startAngle,
      endAngle,
      percent: (entry.value / total) * 100,
      index: entry.index,
    }
  })
}
