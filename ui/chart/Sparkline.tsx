import { createUniqueId, Show } from "solid-js"
import { classMerge } from "#ui/utils/classMerge.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"
import { sparklineStateCreate, sparklineToneClass } from "./sparklineStateCreate.js"

export type SparklineTone = "brand" | "success" | "danger" | "neutral"

export interface SparklineProps extends MayHaveClass {
  values: number[]
  tone?: SparklineTone
  height?: number
  area?: boolean
  ariaLabel?: string
}

/** Minimal SVG trend line: responsive 100-wide viewBox, gradient area, flat muted line for < 2 values. */
export function Sparkline(p: SparklineProps) {
  const gradientId = createUniqueId()
  const state = sparklineStateCreate({
    values: () => p.values,
    height: () => p.height ?? 32,
    area: () => p.area ?? true,
  })
  const tone = () => p.tone ?? "brand"
  const label = () => p.ariaLabel ?? `Sparkline: ${p.values.join(", ")}`
  return (
    <svg
      viewBox={`0 0 100 ${p.height ?? 32}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label()}
      class={classMerge("block w-full", p.class)}
      style={{ height: `${p.height ?? 32}px` }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.2" />
          <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
        </linearGradient>
      </defs>
      <Show
        when={!state.isFlat()}
        fallback={
          <line
            x1="0"
            y1="50%"
            x2="100"
            y2="50%"
            stroke="currentColor"
            stroke-width={1.5}
            vector-effect="non-scaling-stroke"
            class="text-content-muted"
          />
        }
      >
        <Show when={p.area ?? true}>
          <path d={state.areaPath()} fill={`url(#${gradientId})`} stroke="none" />
        </Show>
        <path
          d={state.linePath()}
          fill="none"
          stroke="currentColor"
          stroke-width={1.5}
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
          class={sparklineToneClass[tone()]}
        />
      </Show>
    </svg>
  )
}
