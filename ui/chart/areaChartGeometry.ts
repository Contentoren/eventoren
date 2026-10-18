export interface AreaChartGeometryPoint {
  x: number
  y: number
}

export interface AreaChartLayout {
  width: number
  height: number
  padLeft: number
  padRight: number
  padTop: number
  padBottom: number
}

export function areaChartRound(value: number): number {
  return Math.round(value * 100) / 100
}

export function areaChartPlotSize(layout: AreaChartLayout): { plotWidth: number; plotHeight: number } {
  return {
    plotWidth: Math.max(0, layout.width - layout.padLeft - layout.padRight),
    plotHeight: Math.max(0, layout.height - layout.padTop - layout.padBottom),
  }
}

export function areaChartXFor(index: number, count: number, padLeft: number, plotWidth: number): number {
  if (count <= 1) return areaChartRound(padLeft + plotWidth / 2)
  const clamped = Math.min(Math.max(0, index), count - 1)
  return areaChartRound(padLeft + (plotWidth * clamped) / (count - 1))
}

export function areaChartYFor(value: number, niceMax: number, padTop: number, plotHeight: number): number {
  if (!Number.isFinite(value) || niceMax <= 0) return areaChartRound(padTop + plotHeight)
  const ratio = Math.min(Math.max(0, value / niceMax), 1)
  return areaChartRound(padTop + plotHeight * (1 - ratio))
}

export function areaChartBaseY(padTop: number, plotHeight: number): number {
  return areaChartRound(padTop + plotHeight)
}

export function areaChartAreaPath(points: AreaChartGeometryPoint[], baseY: number): string {
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) return ""
  let path = `M ${areaChartRound(first.x)} ${areaChartRound(first.y)}`
  for (const point of points.slice(1)) path += ` L ${areaChartRound(point.x)} ${areaChartRound(point.y)}`
  path += ` L ${areaChartRound(last.x)} ${areaChartRound(baseY)} L ${areaChartRound(first.x)} ${areaChartRound(baseY)} Z`
  return path
}

export function areaChartIndexForX(x: number, count: number, padLeft: number, plotWidth: number): number {
  if (count <= 1 || plotWidth <= 0) return 0
  const raw = Math.round(((x - padLeft) / plotWidth) * (count - 1))
  return Math.min(Math.max(0, raw), count - 1)
}

export function areaChartTooltipSide(x: number, width: number, threshold = 200): "left" | "right" {
  return x > width - threshold ? "left" : "right"
}

export function areaChartTooltipTop(pointY: number, height: number, estimate = 76): number {
  return Math.min(Math.max(pointY, estimate / 2 + 4), height - estimate / 2 - 4)
}
