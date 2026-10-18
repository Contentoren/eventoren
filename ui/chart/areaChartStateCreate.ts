import { createUniqueId, onCleanup, onMount } from "solid-js"
import { isServer } from "solid-js/web"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import {
  areaChartIndexForX,
  areaChartPlotSize,
  areaChartTooltipSide,
  areaChartXFor,
  type AreaChartLayout,
} from "./areaChartGeometry.ts"

export interface AreaChartStateInput {
  count: () => number
  height: () => number
}

const fallbackWidth = 640
const padLeft = 48
const padRight = 12
const padTop = 16
const padBottom = 28

export function areaChartStateCreate(input: AreaChartStateInput) {
  const gradientId = `area-gradient-${createUniqueId()}`
  const activeIndex = createSignalObject<number | null>(null)
  const measuredWidth = createSignalObject(fallbackWidth)
  let container: HTMLDivElement | null = null

  const layout = (): AreaChartLayout => {
    const count = input.count()
    void count
    const width = measuredWidth.get()
    return { width, height: input.height(), padLeft, padRight, padTop, padBottom }
  }

  const plot = () => areaChartPlotSize(layout())

  const xFor = (index: number) => areaChartXFor(index, input.count(), padLeft, plot().plotWidth)

  onMount(() => {
    if (isServer) return
    const element = container
    if (!element) return
    const update = () => {
      const next = Math.round(element.clientWidth)
      if (!Number.isFinite(next) || next <= 0) return
      const current = measuredWidth.get()
      if (Math.abs(next - current) <= 0.5) return
      measuredWidth.set(next)
    }
    update()
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(update)
      observer.observe(element)
      onCleanup(() => observer.disconnect())
      return
    }
    window.addEventListener("resize", update)
    onCleanup(() => window.removeEventListener("resize", update))
  })

  const registerContainer = (element: HTMLDivElement | null) => {
    container = element
  }

  const activateFromClientX = (clientX: number) => {
    const element = container
    if (!element) return
    const rect = element.getBoundingClientRect()
    activeIndex.set(
      areaChartIndexForX(
        rect.width > 0 ? ((clientX - rect.left) / rect.width) * layout().width : 0,
        input.count(),
        padLeft,
        plot().plotWidth,
      ),
    )
  }

  const activatePointer = (clientX: number) => activateFromClientX(clientX)

  const activateTouch = (clientX: number) => activateFromClientX(clientX)

  const moveActive = (delta: -1 | 1) => {
    const count = input.count()
    if (count <= 0) return
    const current = activeIndex.get()
    if (current === null) {
      activeIndex.set(delta > 0 ? 0 : count - 1)
      return
    }
    activeIndex.set(Math.min(Math.max(0, current + delta), count - 1))
  }

  const clearActive = () => activeIndex.set(null)

  const tooltipSide = (index: number) => areaChartTooltipSide(xFor(index), layout().width)

  return {
    gradientId,
    activeIndex: activeIndex.get,
    measuredWidth: measuredWidth.get,
    layout,
    plot,
    xFor,
    registerContainer,
    activatePointer,
    activateTouch,
    moveActive,
    clearActive,
    tooltipSide,
  }
}

export type AreaChartState = ReturnType<typeof areaChartStateCreate>
