import { createSignalObject } from "#ui/utils/createSignalObject.js"

const labelSteps = [1, 2, 3, 4, 5, 6, 8, 10, 12]

export function barChartLabelEvery(count: number, maxLabels = 6): number {
  if (count <= maxLabels) return 1
  for (const step of labelSteps) {
    if (Math.ceil(count / step) <= maxLabels) return step
  }
  return Math.ceil(count / maxLabels)
}

export function barChartVisibleLabels(count: number, maxLabels = 6): number[] {
  if (count <= 0) return []
  const every = barChartLabelEvery(count, maxLabels)
  const indexes: number[] = [0, count - 1]
  for (let index = every; index < count - 1; index += every) indexes.push(index)
  return [...new Set(indexes)].sort((left, right) => left - right)
}

export function barChartStateCreate() {
  const hoveredIndex = createSignalObject<number | null>(null)
  const focusedIndex = createSignalObject<number | null>(null)

  const activeIndex = () => hoveredIndex.get() ?? focusedIndex.get()

  const hover = (index: number | null) => hoveredIndex.set(index)
  const focus = (index: number) => focusedIndex.set(index)
  const blur = () => focusedIndex.set(null)

  return { activeIndex, hover, focus, blur }
}

export type BarChartState = ReturnType<typeof barChartStateCreate>
