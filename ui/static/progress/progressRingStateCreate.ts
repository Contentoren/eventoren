import { createMemo } from "solid-js"

export function progressRingStateCreate(inputs: {
  value: () => number
  max: () => number
  size: () => number
  stroke: () => number
}) {
  const normalized = createMemo(() => {
    const rawSize = inputs.size()
    const size = Number.isFinite(rawSize) && rawSize > 0 ? rawSize : 120
    const rawStroke = inputs.stroke()
    const stroke = Number.isFinite(rawStroke) && rawStroke > 0 ? Math.min(rawStroke, size / 2) : Math.min(10, size / 2)
    return { size, stroke }
  })
  const radius = createMemo(() => (normalized().size - normalized().stroke) / 2)
  const circumference = createMemo(() => 2 * Math.PI * radius())
  const percent = createMemo(() => {
    const max = inputs.max()
    const value = inputs.value()
    if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0
    return Math.min(100, Math.max(0, (value / max) * 100))
  })
  const dashOffset = createMemo(() => circumference() * (1 - percent() / 100))
  return { circumference, dashOffset, normalized, percent, radius }
}
