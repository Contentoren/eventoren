import { For, Show } from "solid-js"
import type { JSX } from "solid-js"
import { mdiChartLine } from "@adaptive-ds/mdi/mdiChartLine.js"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { classMerge } from "#ui/utils/classMerge.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"
import { areaChartBaseY, areaChartTooltipTop, areaChartXFor, areaChartYFor } from "./areaChartGeometry.ts"
import { areaChartStateCreate } from "./areaChartStateCreate.ts"
import { chartPathMonotone } from "./chartPathMonotone.ts"
import { chartScaleNice } from "./chartScaleNice.ts"

export interface AreaChartPoint {
  label: string
  value: number
}

export interface AreaChartMarker {
  index: number
  label: string
}

export interface AreaChartProps extends MayHaveClass {
  points: AreaChartPoint[]
  compare?: number[] | null
  markers?: AreaChartMarker[]
  height?: number
  valueFormat: (value: number) => string
  axisFormat?: (value: number) => string
  xTickEvery?: number
  tooltip?: (index: number) => JSX.Element
  ariaLabel: string
}

/** Responsive SVG area chart with compare series, markers, and keyboard support. */
export function AreaChart(p: AreaChartProps) {
  const height = () => p.height ?? 240
  const count = () => p.points.length

  const scaled = () => {
    const all = p.points.map((point) => point.value)
    for (const value of p.compare ?? []) all.push(value)
    return chartScaleNice(Math.max(0, ...all))
  }

  const state = areaChartStateCreate({ count, height })

  const viewWidth = () => state.layout().width
  const plotWidth = () => state.plot().plotWidth
  const plotHeight = () => state.plot().plotHeight
  const baseY = () => areaChartBaseY(16, plotHeight())
  const niceMax = () => scaled().max

  const linePoints = () =>
    p.points.map((point, index) => ({
      x: areaChartXFor(index, count(), 48, plotWidth()),
      y: areaChartYFor(point.value, niceMax(), 16, plotHeight()),
    }))

  const comparePoints = () => {
    const series = p.compare
    if (!series) return null
    return series.map((value, index) => ({
      x: areaChartXFor(index, series.length, 48, plotWidth()),
      y: areaChartYFor(value, niceMax(), 16, plotHeight()),
    }))
  }

  const linePath = () => chartPathMonotone(linePoints())
  const lastX = () => linePoints()[linePoints().length - 1]?.x ?? 48
  const areaPath = () => `${linePath()} L ${lastX()} ${baseY()} L 48 ${baseY()} Z`
  const comparePath = () => {
    const series = comparePoints()
    return series ? chartPathMonotone(series) : null
  }

  const gridTicks = () => scaled().ticks

  const xTickIndexes = () => {
    const total = count()
    if (total <= 0) return [] as number[]
    const auto = Math.max(2, Math.min(6, total))
    const every = p.xTickEvery ?? Math.max(1, Math.ceil(total / auto))
    const indexes: number[] = []
    for (let index = 0; index < total; index += every) indexes.push(index)
    const last = total - 1
    if (indexes[indexes.length - 1] !== last && every > 1) indexes.push(last)
    return indexes
  }

  if (count() === 0) {
    return (
      <div style={{ height: `${height()}px` }} class={classMerge("w-full", p.class)}>
        <EmptyState icon={mdiChartLine} title="Keine Daten" />
      </div>
    )
  }

  const active = () => state.activeIndex()
  const activePoint = () => (active() === null ? null : p.points[active()!])
  const activeX = () => (active() === null ? 0 : state.xFor(active()!))
  const activeY = () => (active() === null ? 0 : (linePoints()[active()!]?.y ?? 0))

  const tooltipTop = () => areaChartTooltipTop(activeY(), height())
  const tooltipLeftPercent = () => (viewWidth() > 0 ? (activeX() / viewWidth()) * 100 : 50)

  const handlePointerMove = (event: PointerEvent) => state.activatePointer(event.clientX)
  const handleTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0]
    if (touch) state.activateTouch(touch.clientX)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      state.moveActive(-1)
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      state.moveActive(1)
    } else if (event.key === "Escape") {
      state.clearActive()
    }
  }

  const defaultTooltip = (index: number) => {
    const point = p.points[index]
    if (!point) return null
    return (
      <>
        <p class="font-medium text-content">{point.label}</p>
        <p class="tabular-nums text-content">{p.valueFormat(point.value)}</p>
        <Show when={p.compare?.[index] !== undefined}>
          <p class="tabular-nums text-content-muted">Vorzeitraum: {p.valueFormat(p.compare![index]!)}</p>
        </Show>
      </>
    )
  }

  return (
    <div class={classMerge("w-full", p.class)}>
      <div
        ref={state.registerContainer}
        class="relative w-full focus-ring rounded-control"
        tabindex="0"
        role="img"
        aria-label={p.ariaLabel}
        onPointerMove={handlePointerMove}
        onPointerLeave={state.clearActive}
        onTouchMove={handleTouchMove}
        onKeyDown={handleKeyDown}
      >
        <svg
          width="100%"
          height={height()}
          viewBox={`0 0 ${viewWidth()} ${height()}`}
          preserveAspectRatio="none"
          class="block w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={state.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" class="text-brand" stop-opacity="0.18" stop-color="currentColor" />
              <stop offset="100%" class="text-brand" stop-opacity="0" stop-color="currentColor" />
            </linearGradient>
          </defs>
          <For each={gridTicks()}>
            {(tick) => (
              <g>
                <line
                  x1={48}
                  x2={viewWidth() - 12}
                  y1={areaChartYFor(tick, niceMax(), 16, plotHeight())}
                  y2={areaChartYFor(tick, niceMax(), 16, plotHeight())}
                  class="stroke-border-subtle"
                  stroke-opacity="0.5"
                />
                <text
                  x={42}
                  y={areaChartYFor(tick, niceMax(), 16, plotHeight()) + 4}
                  text-anchor="end"
                  class="fill-content-muted text-[11px] tabular-nums"
                >
                  {p.axisFormat ? p.axisFormat(tick) : String(tick)}
                </text>
              </g>
            )}
          </For>
          <For each={xTickIndexes()}>
            {(index) => (
              <text
                x={areaChartXFor(index, count(), 48, plotWidth())}
                y={height() - 8}
                text-anchor="middle"
                class="fill-content-muted text-[11px]"
              >
                {p.points[index]?.label ?? ""}
              </text>
            )}
          </For>
          <For each={p.markers ?? []}>
            {(marker) => {
              const x = () => areaChartXFor(marker.index, count(), 48, plotWidth())
              return (
                <Show when={marker.index >= 0 && marker.index < count()}>
                  <g>
                    <line
                      x1={x()}
                      x2={x()}
                      y1={16}
                      y2={baseY()}
                      class="stroke-content-muted"
                      stroke-dasharray="4 3"
                      stroke-opacity="0.7"
                    />
                    <text x={x()} y={12} text-anchor="middle" class="fill-content-muted text-[11px]">
                      {marker.label}
                    </text>
                  </g>
                </Show>
              )
            }}
          </For>
          <Show when={comparePath()}>
            {(path) => (
              <path d={path()} fill="none" class="stroke-content-muted" stroke-width="1.5" stroke-dasharray="5 4" />
            )}
          </Show>
          <path d={areaPath()} fill={`url(#${state.gradientId})`} />
          <path
            d={linePath()}
            fill="none"
            class="stroke-brand"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <Show when={active() !== null && activePoint()}>
            <g>
              <line
                x1={activeX()}
                x2={activeX()}
                y1={16}
                y2={baseY()}
                class="stroke-content-muted"
                stroke-dasharray="3 3"
              />
              <circle cx={activeX()} cy={activeY()} r="4.5" class="fill-surface stroke-brand" stroke-width="2" />
            </g>
          </Show>
        </svg>
        <Show when={active() !== null && activePoint()}>
          <div
            class="pointer-events-none absolute z-10 w-max max-w-55 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs shadow-lg"
            style={{
              left: state.tooltipSide(active()!) === "left" ? "auto" : `${tooltipLeftPercent()}%`,
              right: state.tooltipSide(active()!) === "left" ? `${100 - tooltipLeftPercent()}%` : "auto",
              top: `${(tooltipTop() / height()) * 100}%`,
            }}
            aria-hidden="true"
          >
            {p.tooltip ? p.tooltip(active()!) : defaultTooltip(active()!)}
          </div>
        </Show>
      </div>
      <p class="sr-only" aria-live="polite">
        <Show when={activePoint()}>{(point) => `${point().label}: ${p.valueFormat(point().value)}`}</Show>
      </p>
    </div>
  )
}
