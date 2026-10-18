import { Show } from "solid-js"
import { toggleSwitchStateCreate } from "#ui/input/toggle/toggleSwitchStateCreate.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"

export type ToggleSwitchSize = "sm" | "md"

export interface ToggleSwitchProps extends MayHaveClass {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  id?: string
  size?: ToggleSwitchSize
}

/** Schalter mit Rolle, klickbarem Label und sichtbarem Fokus-Ring. */
export function ToggleSwitch(p: ToggleSwitchProps) {
  const state = toggleSwitchStateCreate({
    checked: () => p.checked,
    onChange: p.onChange,
    disabled: () => p.disabled ?? false,
    size: () => p.size ?? "md",
    id: () => p.id,
  })

  const switchButton = (withLabelling: boolean) => (
    <button
      type="button"
      role="switch"
      id={state.controlId()}
      aria-checked={p.checked}
      aria-labelledby={withLabelling && p.label ? `${state.controlId()}-label` : undefined}
      aria-describedby={withLabelling && p.description ? `${state.controlId()}-description` : undefined}
      disabled={p.disabled}
      onClick={state.toggle}
      class={state.trackClass()}
    >
      <span class={state.thumbClass()} aria-hidden="true" />
    </button>
  )

  return (
    <div class={p.class}>
      <Show when={p.label} fallback={switchButton(false)}>
        <label for={state.controlId()} class="flex cursor-pointer items-start gap-3">
          <span class="mt-0.5 shrink-0">{switchButton(true)}</span>
          <span class="flex min-w-0 flex-col">
            <span id={`${state.controlId()}-label`} class="text-sm font-medium text-content">
              {p.label}
            </span>
            <Show when={p.description}>
              <span id={`${state.controlId()}-description`} class="text-xs text-content-muted">
                {p.description}
              </span>
            </Show>
          </span>
        </label>
      </Show>
    </div>
  )
}
