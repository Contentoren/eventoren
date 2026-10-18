import { Show } from "solid-js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classMerge } from "#ui/utils/classMerge.js"
import type { MayHaveChildren } from "#ui/utils/MayHaveChildren.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"

export type DotPillTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info"
export type DotPillSize = "sm" | "md"

export interface DotPillProps extends MayHaveChildren, MayHaveClass {
  tone: DotPillTone
  dot?: boolean
  pulse?: boolean
  icon?: string
  size?: DotPillSize
}

const toneClasses: Record<DotPillTone, string> = {
  neutral: "bg-slate-500/10 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300",
  brand: "bg-brand-soft text-brand-strong dark:bg-teal-950/60 dark:text-teal-300",
  success: "bg-success-soft text-success dark:bg-emerald-950/60 dark:text-emerald-300",
  warning: "bg-warning-soft text-warning dark:bg-amber-950/60 dark:text-amber-300",
  danger: "bg-danger-soft text-danger dark:bg-red-950/60 dark:text-red-300",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
}

const dotClasses: Record<DotPillTone, string> = {
  neutral: "bg-slate-500 dark:bg-slate-400",
  brand: "bg-brand dark:bg-teal-300",
  success: "bg-emerald-600 dark:bg-emerald-400",
  warning: "bg-amber-600 dark:bg-amber-400",
  danger: "bg-red-600 dark:bg-red-400",
  info: "bg-sky-600 dark:bg-sky-400",
}

/** Rounded status pill with a soft background and an optional dot. */
export function DotPill(p: DotPillProps) {
  const showDot = () => (p.dot ?? true) && !p.icon
  return (
    <span
      class={classMerge(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        (p.size ?? "md") === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        toneClasses[p.tone],
        p.class,
      )}
    >
      <Show when={p.icon}>{(path) => <Icon path={path()} class="size-3.5" />}</Show>
      <Show when={showDot()}>
        <span class="relative flex size-1.5">
          <Show when={p.pulse}>
            <span
              class={classMerge(
                "absolute inline-flex size-full animate-ping rounded-full opacity-60",
                dotClasses[p.tone],
              )}
            />
          </Show>
          <span class={classMerge("relative inline-flex size-1.5 rounded-full", dotClasses[p.tone])} />
        </span>
      </Show>
      {p.children}
    </span>
  )
}
