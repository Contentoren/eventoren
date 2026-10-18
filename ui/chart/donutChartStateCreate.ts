import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { chartDonutArcs } from "./chartDonutArcs.js"
import type { DonutTone } from "./donutToneClass.js"

export interface DonutSegment {
  label: string
  value: number
  tone: DonutTone
}

export function donutChartStateCreate(input: {
  segments: () => DonutSegment[]
  size: () => number
  thickness: () => number
}): {
  total: () => number
  arcs: () => { path: string; startAngle: number; endAngle: number; percent: number; index: number }[]
  activeIndex: () => number | null
  activate: (index: number | null) => void
  percentOf: (value: number) => number
  percentFormat: Intl.NumberFormat
} {
  const active = createSignalObject<number | null>(null)
  const total = () => input.segments().reduce((sum, segment) => sum + Math.max(segment.value, 0), 0)
  return {
    total,
    arcs: () =>
      chartDonutArcs(
        input.segments().map((segment) => segment.value),
        { size: input.size(), thickness: input.thickness() },
      ),
    activeIndex: active.get,
    activate: active.set,
    percentOf: (value: number) => (total() > 0 ? (value / total()) * 100 : 0),
    percentFormat: new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }),
  }
}
