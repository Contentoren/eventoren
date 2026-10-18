import { classMerge } from "#ui/utils/classMerge.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"
import { progressPercentCreate, type ProgressTone } from "./progressPercentCreate.js"

export type ProgressBarSize = "sm" | "md"

export interface ProgressBarProps extends MayHaveClass {
  value: number
  max: number
  tone?: ProgressTone
  size?: ProgressBarSize
  label?: string
}

const toneClasses: Record<ProgressTone, string> = {
  brand: "bg-brand",
  success: "bg-emerald-500 dark:bg-emerald-400",
  warning: "bg-amber-500 dark:bg-amber-400",
  danger: "bg-red-500 dark:bg-red-400",
  neutral: "bg-slate-400 dark:bg-slate-500",
}

/** Horizontal progress bar with accessible roles. */
export function ProgressBar(p: ProgressBarProps) {
  const percent = () => progressPercentCreate(p.value, p.max)
  return (
    <div
      role="progressbar"
      aria-label={p.label}
      aria-valuemin={0}
      aria-valuemax={p.max}
      aria-valuenow={Math.min(Math.max(0, p.value), p.max)}
      class={classMerge(
        "w-full overflow-hidden rounded-full bg-surface-muted",
        (p.size ?? "md") === "sm" ? "h-1.5" : "h-2.5",
        p.class,
      )}
    >
      <div
        class={classMerge("h-full rounded-full transition-[width] duration-200", toneClasses[p.tone ?? "brand"])}
        style={{ width: `${percent()}%` }}
      />
    </div>
  )
}
