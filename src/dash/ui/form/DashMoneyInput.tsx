import { cn } from "cn"
import { createEffect, createSignal, on } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { dashMoneyFormat } from "./dashMoneyFormat.ts"
import { dashMoneyParse } from "./dashMoneyParse.ts"

export function dashMoneyInputStateCreate(inputs: {
  valueCents: () => number | null
  onChange: (cents: number | null) => void
}) {
  const [text, setText] = createSignal(dashMoneyFormat(inputs.valueCents()))
  const [focused, setFocused] = createSignal(false)
  const [touched, setTouched] = createSignal(false)

  // Prop in Text übernehmen, solange das Feld nicht fokussiert ist.
  createEffect(
    on(inputs.valueCents, (cents) => {
      if (focused()) return
      const formatted = dashMoneyFormat(cents)
      if (formatted !== text()) setText(formatted)
    }),
  )

  const invalid = () => {
    if (!touched()) return false
    return dashMoneyParse(text()) === null
  }

  const focusInput = () => setFocused(true)

  const textInput = (next: string) => {
    setText(next)
    setTouched(true)
    inputs.onChange(dashMoneyParse(next))
  }

  const blurFormat = () => {
    setFocused(false)
    const parsed = dashMoneyParse(text())
    if (parsed !== null) setText(dashMoneyFormat(parsed))
  }

  return { text, invalid, focusInput, textInput, blurFormat }
}

export type DashMoneyInputState = ReturnType<typeof dashMoneyInputStateCreate>

export function DashMoneyInput(props: {
  valueCents: number | null
  onChange: (cents: number | null) => void
  id?: string
  ariaLabel?: string
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  class?: string
}) {
  const state = dashMoneyInputStateCreate({ valueCents: () => props.valueCents, onChange: props.onChange })
  const showInvalid = () => props.invalid === true || state.invalid()

  return (
    <div class={cn("flex flex-col gap-1", props.class)}>
      <div class="relative">
        <Input
          type="text"
          inputmode="decimal"
          id={props.id}
          aria-label={props.ariaLabel}
          value={state.text()}
          placeholder={props.placeholder ?? "0,00"}
          disabled={props.disabled}
          aria-invalid={showInvalid() ? "true" : undefined}
          onFocus={state.focusInput}
          onInput={(event) => state.textInput(event.currentTarget.value)}
          onBlur={state.blurFormat}
          class={cn("h-10 pr-8 text-sm tabular-nums rounded-control", showInvalid() && "border-danger")}
        />
        <span
          aria-hidden="true"
          class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-content-muted"
        >
          €
        </span>
      </div>
      {showInvalid() && (
        <p role="alert" class="text-xs text-danger">
          Ungültiger Betrag
        </p>
      )}
    </div>
  )
}
