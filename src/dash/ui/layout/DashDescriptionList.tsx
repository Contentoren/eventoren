import { For } from "solid-js"
import type { JSX } from "solid-js"
import { classMerge } from "#ui/utils/classMerge.js"

export interface DashDescriptionItem {
  label: string
  value: JSX.Element | string
  mono?: boolean
}

export interface DashDescriptionListProps {
  items: DashDescriptionItem[]
  columns?: 1 | 2
  class?: string
}

/** Kompakte Definitionsliste für Detailansichten, ein- oder zweispaltig. */
export function DashDescriptionList(p: DashDescriptionListProps) {
  return (
    <dl
      class={classMerge(
        "grid gap-x-6 gap-y-3 text-sm",
        (p.columns ?? 1) === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        p.class,
      )}
    >
      <For each={p.items}>
        {(item) => (
          <div class="min-w-0">
            <dt class="text-xs text-content-muted">{item.label}</dt>
            <dd class={classMerge("mt-0.5 text-content", item.mono && "font-mono tabular-nums")}>{item.value}</dd>
          </div>
        )}
      </For>
    </dl>
  )
}
