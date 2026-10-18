import { For, Show } from "solid-js"
import { segmentedControlStateCreate } from "#ui/input/segmented/segmentedControlStateCreate.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"

export type SegmentedControlSize = "sm" | "md"

export interface SegmentedControlOption {
  value: string
  label: string
  icon?: string
  count?: number
}

export interface SegmentedControlProps extends MayHaveClass {
  value: string
  onChange: (value: string) => void
  options: SegmentedControlOption[]
  ariaLabel: string
  size?: SegmentedControlSize
  fullWidth?: boolean
}

/** Segmentierte Einzelauswahl als Radiogruppe mit Pfeiltasten-Navigation. */
export function SegmentedControl(p: SegmentedControlProps) {
  const state = segmentedControlStateCreate({
    value: () => p.value,
    options: () => p.options,
    onChange: p.onChange,
    size: () => p.size ?? "md",
    fullWidth: () => p.fullWidth ?? false,
    extraClass: () => p.class,
  })

  return (
    <div role="radiogroup" aria-label={p.ariaLabel} class={state.rootClass()} onKeyDown={state.onKeyDown}>
      <For each={p.options}>
        {(option) => (
          <button
            type="button"
            role="radio"
            id={state.optionId(state.optionIndex(option.value))}
            aria-checked={p.value === option.value}
            tabindex={p.value === option.value ? 0 : -1}
            onClick={() => state.selectIndex(state.optionIndex(option.value))}
            class={state.optionClass(p.value === option.value)}
          >
            <Show when={option.icon}>{(icon) => <Icon path={icon()} class="size-4 shrink-0" />}</Show>
            <span>{option.label}</span>
            <Show when={option.count !== undefined}>
              <span class="rounded-full bg-surface-muted px-1.5 text-xs font-semibold tabular-nums">
                {option.count}
              </span>
            </Show>
          </button>
        )}
      </For>
    </div>
  )
}
