import { classMerge } from "#ui/utils/classMerge.js"
import type { MayHaveChildren } from "#ui/utils/MayHaveChildren.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"
import type { ProgressTone } from "./progressPercentCreate.js"
import { progressRingStateCreate } from "./progressRingStateCreate.js"

export interface ProgressRingProps extends MayHaveChildren, MayHaveClass {
  value: number
  max: number
  size?: number
  stroke?: number
  tone?: ProgressTone
  label?: string
}

const toneClasses: Record<ProgressTone, string> = {
  brand: "stroke-brand",
  success: "stroke-emerald-500 dark:stroke-emerald-400",
  warning: "stroke-amber-500 dark:stroke-amber-400",
  danger: "stroke-red-500 dark:stroke-red-400",
  neutral: "stroke-slate-400 dark:stroke-slate-500",
}

/** Circular SVG progress ring with centered content support. */
export function ProgressRing(p: ProgressRingProps) {
  const state = progressRingStateCreate({
    value: () => p.value,
    max: () => p.max,
    size: () => p.size ?? 120,
    stroke: () => p.stroke ?? 10,
  })
  return (
    <div
      role="progressbar"
      aria-label={p.label}
      aria-valuemin={0}
      aria-valuemax={p.max}
      aria-valuenow={Math.min(Math.max(0, p.value), p.max)}
      class={classMerge("relative inline-flex items-center justify-center", p.class)}
      style={{ width: `${state.normalized().size}px`, height: `${state.normalized().size}px` }}
    >
      <svg
        width={state.normalized().size}
        height={state.normalized().size}
        viewBox={`0 0 ${state.normalized().size} ${state.normalized().size}`}
        class="-rotate-90"
      >
        <circle
          cx={state.normalized().size / 2}
          cy={state.normalized().size / 2}
          r={state.radius()}
          fill="none"
          stroke-width={state.normalized().stroke}
          class="stroke-border-subtle"
        />
        <circle
          cx={state.normalized().size / 2}
          cy={state.normalized().size / 2}
          r={state.radius()}
          fill="none"
          stroke-width={state.normalized().stroke}
          stroke-linecap="round"
          stroke-dasharray={`${state.circumference()}`}
          stroke-dashoffset={`${state.dashOffset()}`}
          class={classMerge("transition-[stroke-dashoffset] duration-200", toneClasses[p.tone ?? "brand"])}
        />
      </svg>
      <span class="absolute inset-0 flex items-center justify-center empty:hidden">{p.children}</span>
    </div>
  )
}
