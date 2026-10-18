import type { SparklineTone } from "./Sparkline.jsx"

export const sparklineToneClass: Record<SparklineTone, string> = {
  brand: "text-brand",
  success: "text-success dark:text-emerald-400",
  danger: "text-danger dark:text-red-400",
  neutral: "text-content-muted",
}

export function sparklineStateCreate(input: { values: () => number[]; height: () => number; area: () => boolean }): {
  linePath: () => string
  areaPath: () => string
  isFlat: () => boolean
} {
  const normalized = () => {
    const values = input.values()
    const max = Math.max(...values)
    const min = Math.min(...values)
    const span = max - min || 1
    return values.map((value, index) => ({
      x: values.length === 1 ? 50 : (index / (values.length - 1)) * 100,
      y: input.height() - 3 - ((value - min) / span) * (input.height() - 6),
    }))
  }
  const linePath = () =>
    normalized()
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ")
  const areaPath = () => {
    const height = input.height()
    if (!input.area()) return ""
    return `${linePath()} L 100 ${height} L 0 ${height} Z`
  }
  return { linePath, areaPath, isFlat: () => input.values().length < 2 }
}
