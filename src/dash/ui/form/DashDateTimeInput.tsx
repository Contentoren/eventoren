import { cn } from "cn"
import { createUniqueId, Show } from "solid-js"
import { adminEventReleaseDateTimeFromIso } from "#src/admin/adminEventReleaseDateTimeFromIso.ts"
import { adminEventReleaseDateTimeToIso } from "#src/admin/adminEventReleaseDateTimeToIso.ts"
import { dashDateTimeInputStateCreate } from "./dashDateTimeInputStateCreate.ts"

export function dashDateTimeInputStateCreateFromIso(inputs: {
  valueIso: () => string | null
  min?: () => string | null | undefined
  onChange: (iso: string | null) => void
}) {
  const fallbackId = `dash-datetime-${createUniqueId()}`

  const localValue = () => {
    const iso = inputs.valueIso()
    if (!iso) return ""
    return adminEventReleaseDateTimeFromIso(iso)
  }

  const localMin = () => {
    const min = inputs.min?.()
    if (!min) return undefined
    return adminEventReleaseDateTimeFromIso(min)
  }

  const localInput = (next: string) => {
    if (!next) {
      inputs.onChange(null)
      return
    }
    const result = adminEventReleaseDateTimeToIso(next)
    if (result.success) inputs.onChange(result.data)
  }

  return { fallbackId, localValue, localMin, localInput }
}

export type DashDateTimeInputState = ReturnType<typeof dashDateTimeInputStateCreateFromIso>

const fieldClass = (invalid: boolean) =>
  cn(
    "h-10 rounded-control border border-input bg-surface-muted px-3 text-sm text-content",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
    invalid && "border-danger focus-visible:ring-danger",
  )

/** Datums- und Uhrzeitwahl als zwei native Eingaben (Europe/Berlin, 15-Minuten-Raster). */
export function DashDateTimeInput(props: {
  valueIso: string | null
  onChange: (iso: string | null) => void
  id?: string
  min?: string | null
  required?: boolean
  disabled?: boolean
  invalid?: boolean
}) {
  const state = dashDateTimeInputStateCreateFromIso({
    valueIso: () => props.valueIso,
    min: () => props.min,
    onChange: props.onChange,
  })
  const fields = dashDateTimeInputStateCreate({
    localValue: state.localValue,
    onLocal: state.localInput,
  })

  const invalid = () => props.invalid === true
  const baseId = () => props.id ?? state.fallbackId

  return (
    <div class="flex flex-col gap-1">
      <div class="flex flex-wrap gap-2" role="group" aria-labelledby={`${baseId()}-label`}>
        <span id={`${baseId()}-label`} class="sr-only">
          Datum und Uhrzeit
        </span>
        <input
          type="date"
          lang="de"
          id={baseId()}
          value={fields.dateValue()}
          min={fields.dateMin(state.localMin()) || undefined}
          required={props.required}
          disabled={props.disabled}
          aria-invalid={invalid() ? "true" : undefined}
          onInput={(event) => fields.dateInput(event.currentTarget.value)}
          class={cn(fieldClass(invalid()), "min-w-[9.5rem] flex-1")}
        />
        <input
          type="time"
          lang="de"
          step="900"
          aria-label="Uhrzeit"
          value={fields.timeValue()}
          required={props.required}
          disabled={props.disabled || !fields.dateValue()}
          aria-invalid={invalid() ? "true" : undefined}
          onInput={(event) => fields.timeInput(event.currentTarget.value)}
          class={cn(fieldClass(invalid()), "w-[7rem]")}
        />
      </div>
      <Show when={invalid()}>
        <p role="alert" class="text-xs text-danger">
          Bitte gib ein gültiges Datum mit Uhrzeit ein.
        </p>
      </Show>
    </div>
  )
}
