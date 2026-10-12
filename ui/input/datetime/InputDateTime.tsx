import { For, Show } from "solid-js"
import { inputDateTimeStateCreate } from "#ui/input/datetime/inputDateTimeStateCreate.js"
import { classesInput } from "#ui/input/input/classesInput.js"
import { Input } from "#ui/input/input/Input.jsx"
import { classMerge } from "#ui/utils/classMerge.js"

export interface InputDateTimeProps {
  value?: string
  onInput?: (value: string) => void
  required?: boolean
  disabled?: boolean
  id?: string
  class?: string
  min?: string
  max?: string
}

/** Split date/time inputs preserving the YYYY-MM-DDTHH:mm contract. */
export function InputDateTime(p: InputDateTimeProps) {
  const state = inputDateTimeStateCreate({
    value: () => p.value ?? "",
    onInput: p.onInput,
    min: () => p.min,
    max: () => p.max,
    id: () => p.id,
  })

  return (
    <div class={classMerge("flex flex-col gap-2 sm:flex-row sm:gap-3", p.class)}>
      <Input
        type="date"
        id={p.id}
        value={state.date()}
        onInput={(event) => state.dateChange(event.currentTarget.value)}
        required={p.required}
        disabled={p.disabled}
        min={state.dateMin()}
        max={state.dateMax()}
        class="flex-1"
      />
      <select
        id={state.timeId()}
        aria-label="Uhrzeit"
        value={state.time()}
        onChange={(event) => state.timeChange(event.currentTarget.value)}
        required={p.required}
        disabled={p.disabled}
        class={classMerge(classesInput, "flex-1")}
      >
        <option value="">Uhrzeit</option>
        <Show when={state.customTime()}>{(custom) => <option value={custom()}>{custom()}</option>}</Show>
        <For each={state.timeOptions}>{(option) => <option value={option}>{option}</option>}</For>
      </select>
    </div>
  )
}
