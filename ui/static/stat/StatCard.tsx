import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { mdiArrowDownRight } from "@adaptive-ds/mdi/mdiArrowDownRight.js"
import { mdiArrowUpRight } from "@adaptive-ds/mdi/mdiArrowUpRight.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { classMerge } from "#ui/utils/classMerge.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"
import { statDeltaFormat } from "./statDeltaFormat.js"

export interface StatDelta {
  value: number
  label?: string
}

export interface StatCardProps extends MayHaveClass {
  label: string
  value: JSX.Element | string
  icon?: string
  delta?: StatDelta | null
  deltaInverted?: boolean
  footer?: JSX.Element
}

/** KPI card: large value, small label, optional delta with arrow. */
export function StatCard(p: StatCardProps) {
  const isPositive = () => (p.delta?.value ?? 0) > 0
  const isNegative = () => (p.delta?.value ?? 0) < 0
  const goodWhenDown = () => p.deltaInverted === true
  const deltaGood = () => (isPositive() && !goodWhenDown()) || (isNegative() && goodWhenDown())
  return (
    <CardWrapper class={classMerge("flex h-full flex-col gap-1.5 border-border-subtle p-4 sm:p-5", p.class)}>
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs text-content-muted">{p.label}</p>
        <Show when={p.icon}>{(path) => <Icon path={path()} class="size-4 text-content-muted" />}</Show>
      </div>
      <p class="text-2xl font-semibold tabular-nums text-content">{p.value}</p>
      <Show when={p.delta}>
        {(delta) => (
          <p class="flex flex-wrap items-center gap-1 text-xs">
            <span
              class={classMerge(
                "inline-flex items-center gap-0.5 font-medium tabular-nums",
                delta().value === 0
                  ? "text-content-muted"
                  : deltaGood()
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-red-700 dark:text-red-400",
              )}
            >
              <Show when={delta().value !== 0}>
                <Icon path={isPositive() ? mdiArrowUpRight : mdiArrowDownRight} class="size-3.5" />
              </Show>
              {statDeltaFormat(delta().value)}
            </span>
            <Show when={delta().label}>{(label) => <span class="text-content-muted">{label()}</span>}</Show>
          </p>
        )}
      </Show>
      <div class="mt-1 text-xs text-content-muted empty:hidden">{p.footer}</div>
    </CardWrapper>
  )
}
