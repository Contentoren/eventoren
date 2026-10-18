import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { filterChipStateCreate } from "#ui/interactive/chip/filterChipStateCreate.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"

export type FilterChipTone = "neutral" | "danger" | "warning"

export interface FilterChipProps extends MayHaveClass {
  active: boolean
  onClick: () => void
  children: JSX.Element
  count?: number
  icon?: string
  tone?: FilterChipTone
}

/** Abgerundeter Umschalt-Chip für Filterleisten mit Zähler und Tonwahl. */
export function FilterChip(p: FilterChipProps) {
  const tone = () => p.tone ?? "neutral"
  const state = filterChipStateCreate({ active: () => p.active, tone })

  return (
    <button type="button" aria-pressed={p.active} onClick={p.onClick} class={state.chipClass(p.class)}>
      <Show when={p.icon}>{(icon) => <Icon path={icon()} class="size-4 shrink-0" />}</Show>
      <span>{p.children}</span>
      <Show when={p.count !== undefined}>
        <span class={state.badgeClass()}>{p.count}</span>
      </Show>
    </button>
  )
}
