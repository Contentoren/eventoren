import type { JSX } from "solid-js"
import { For, Show } from "solid-js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { mdiChartDonut } from "@adaptive-ds/mdi/mdiChartDonut.js"
import { classMerge } from "#ui/utils/classMerge.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"
import { donutChartStateCreate } from "./donutChartStateCreate.js"
import type { DonutSegment } from "./donutChartStateCreate.js"
import { donutToneClass } from "./donutToneClass.js"

export interface DonutChartProps extends MayHaveClass {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  center?: JSX.Element
  legend?: boolean
  valueFormat: (n: number) => string
  ariaLabel: string
}

/** Donut chart with hover/focus highlight and legend. Empty state when the total is 0. */
export function DonutChart(p: DonutChartProps) {
  const state = donutChartStateCreate({
    segments: () => p.segments,
    size: () => p.size ?? 160,
    thickness: () => p.thickness ?? 18,
  })
  const size = () => p.size ?? 160
  const showLegend = () => p.legend ?? true
  return (
    <div class={classMerge("flex flex-col items-center gap-4", p.class)}>
      <div class="relative" style={{ width: `${size()}px`, height: `${size()}px` }}>
        <Show
          when={state.total() > 0}
          fallback={
            <div
              role="img"
              aria-label={p.ariaLabel}
              class="flex size-full flex-col items-center justify-center gap-1 rounded-full border border-dashed border-border-subtle text-content-muted"
            >
              <Icon path={mdiChartDonut} class="size-6" />
              <span class="text-xs">Keine Daten</span>
            </div>
          }
        >
          <svg
            width={size()}
            height={size()}
            viewBox={`0 0 ${size()} ${size()}`}
            role="img"
            aria-label={p.ariaLabel}
            class="block"
          >
            <For each={state.arcs()}>
              {(arc) => {
                const segment = () => p.segments[arc.index]!
                const dimmed = () => state.activeIndex() !== null && state.activeIndex() !== arc.index
                return (
                  <path
                    d={arc.path}
                    fill="none"
                    stroke="currentColor"
                    stroke-width={1}
                    vector-effect="non-scaling-stroke"
                    tabindex={0}
                    role="img"
                    aria-label={`${segment().label}: ${p.valueFormat(segment().value)} (${state.percentFormat.format(arc.percent)} %)`}
                    onMouseEnter={() => state.activate(arc.index)}
                    onMouseLeave={() => state.activate(null)}
                    onFocus={() => state.activate(arc.index)}
                    onBlur={() => state.activate(null)}
                    class={classMerge(
                      "cursor-pointer fill-current outline-none transition-opacity duration-150 focus-ring",
                      donutToneClass[segment().tone],
                      dimmed() ? "opacity-40" : "opacity-100",
                    )}
                  />
                )
              }}
            </For>
          </svg>
          <Show when={p.center}>
            {(center) => (
              <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                {center()}
              </div>
            )}
          </Show>
        </Show>
      </div>
      <Show when={showLegend() && state.total() > 0}>
        <ul class="flex w-full flex-col gap-1">
          <For each={p.segments}>
            {(segment, index) => (
              <Show when={segment.value > 0}>
                <li>
                  <button
                    type="button"
                    onMouseEnter={() => state.activate(index())}
                    onMouseLeave={() => state.activate(null)}
                    onFocus={() => state.activate(index())}
                    onBlur={() => state.activate(null)}
                    class={classMerge(
                      "flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-sm transition-opacity duration-150 focus-ring",
                      state.activeIndex() !== null && state.activeIndex() !== index() && "opacity-40",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      class={classMerge("size-2.5 shrink-0 rounded-full bg-current", donutToneClass[segment.tone])}
                    />
                    <span class="min-w-0 flex-1 truncate text-left">{segment.label}</span>
                    <span class="font-medium tabular-nums">{p.valueFormat(segment.value)}</span>
                    <span class="w-14 text-right tabular-nums text-content-muted">
                      {state.percentFormat.format(state.percentOf(segment.value))} %
                    </span>
                  </button>
                </li>
              </Show>
            )}
          </For>
        </ul>
      </Show>
    </div>
  )
}
