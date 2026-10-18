import { For, Show } from "solid-js"
import { mdiChartBar } from "@adaptive-ds/mdi/mdiChartBar.js"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { classMerge } from "#ui/utils/classMerge.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"
import { barChartStateCreate, barChartVisibleLabels } from "./barChartStateCreate.ts"

export interface BarChartBar {
  label: string
  value: number
  highlight?: boolean
}

export interface BarChartProps extends MayHaveClass {
  bars: BarChartBar[]
  height?: number
  valueFormat: (value: number) => string
  ariaLabel: string
  tone?: "brand" | "neutral"
}

/** Small flexible bar chart with hover tooltips and sparse x labels. */
export function BarChart(p: BarChartProps) {
  const state = barChartStateCreate()
  const height = () => p.height ?? 160
  const tone = () => p.tone ?? "brand"
  const max = () => Math.max(1, ...p.bars.map((bar) => (Number.isFinite(bar.value) ? bar.value : 0)))
  const labels = () => barChartVisibleLabels(p.bars.length)

  const toneClass = (highlight: boolean) =>
    tone() === "neutral"
      ? highlight
        ? "bg-slate-500 dark:bg-slate-400"
        : "bg-slate-500/45 dark:bg-slate-400/45"
      : highlight
        ? "bg-brand dark:bg-brand"
        : "bg-brand/45 dark:bg-brand/45"

  if (p.bars.length === 0) {
    return (
      <div style={{ height: `${height()}px` }} class={classMerge("w-full", p.class)}>
        <EmptyState icon={mdiChartBar} title="Keine Daten" />
      </div>
    )
  }

  return (
    <div class={classMerge("w-full", p.class)} role="img" aria-label={p.ariaLabel}>
      <div class="flex items-end gap-0.5 sm:gap-1" style={{ height: `${height()}px` }} role="presentation">
        <For each={p.bars}>
          {(bar, index) => (
            <div
              class="group relative flex h-full min-w-0 flex-1 flex-col justify-end focus-ring rounded-t-[3px]"
              tabindex="0"
              aria-label={`${bar.label}: ${p.valueFormat(bar.value)}`}
              onMouseEnter={() => state.hover(index())}
              onMouseLeave={() => state.hover(null)}
              onFocus={() => state.focus(index())}
              onBlur={state.blur}
            >
              <div
                class={classMerge(
                  "w-full rounded-t-[3px] transition-[height] duration-150 group-hover:opacity-100 group-focus-visible:opacity-100",
                  toneClass(bar.highlight === true),
                  state.activeIndex() !== null && state.activeIndex() !== index() && "opacity-70",
                )}
                style={{ height: `${Math.max(2, (Math.max(0, bar.value) / max()) * 100)}%` }}
              />
              <Show when={state.activeIndex() === index()}>
                <span class="pointer-events-none absolute -top-1 left-1/2 z-10 w-max -translate-x-1/2 -translate-y-full rounded-md border border-border-subtle bg-surface px-2 py-1 text-xs tabular-nums text-content shadow-lg">
                  {p.valueFormat(bar.value)}
                </span>
              </Show>
            </div>
          )}
        </For>
      </div>
      <div class="mt-1 border-t border-border-subtle" aria-hidden="true" />
      <div class="relative mt-1 h-4 text-[11px] text-content-muted" aria-hidden="true">
        <For each={labels()}>
          {(index) => (
            <span
              class="absolute -translate-x-1/2 truncate"
              style={{ left: `${p.bars.length <= 1 ? 50 : (index / (p.bars.length - 1)) * 100}%` }}
            >
              {p.bars[index]?.label ?? ""}
            </span>
          )}
        </For>
      </div>
    </div>
  )
}
