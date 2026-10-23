import { mdiAlertCircleOutline } from "@adaptive-ds/mdi/mdiAlertCircleOutline.js"
import { cn } from "cn"
import type { JSX } from "solid-js"
import { createUniqueId, Show } from "solid-js"
import { InfoPopover } from "#ui/interactive/popover/InfoPopover.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

export interface DashFieldProps {
  label: string
  for?: string
  hint?: string
  error?: string | null
  required?: boolean
  info?: string
  children: JSX.Element
  class?: string
}

/** Formularfeld: Label mit Pflichtstern und Info-Popover, Hinweis- und Fehlertext. */
export function DashField(p: DashFieldProps) {
  const hintId = `dash-field-hint-${createUniqueId()}`
  const errorId = `dash-field-error-${createUniqueId()}`
  const describedBy = () => [p.hint ? hintId : null, p.error ? errorId : null].filter(Boolean).join(" ") || undefined

  return (
    <div class={cn("flex flex-col gap-1.5", p.class)}>
      <span class="flex items-center text-sm font-medium text-content">
        <label for={p.for}>
          {p.label}
          <Show when={p.required}>
            <span class="ml-1 text-content-muted" aria-hidden="true">
              *
            </span>
            <span class="sr-only">(Pflichtfeld)</span>
          </Show>
        </label>
        <Show when={p.info}>
          {(info) => (
            <InfoPopover>
              <p class="max-w-60 text-sm">{info()}</p>
            </InfoPopover>
          )}
        </Show>
      </span>
      <div aria-describedby={describedBy()}>{p.children}</div>
      <Show when={p.hint}>
        {(hint) => (
          <p id={hintId} class="text-xs text-content-muted">
            {hint()}
          </p>
        )}
      </Show>
      <Show when={p.error}>
        {(error) => (
          <p id={errorId} role="alert" class="flex items-center gap-1 text-xs text-danger dark:text-red-300">
            <Icon path={mdiAlertCircleOutline} class="size-3.5 shrink-0" />
            {error()}
          </p>
        )}
      </Show>
    </div>
  )
}
