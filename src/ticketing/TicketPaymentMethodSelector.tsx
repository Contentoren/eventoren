import { For, Show } from "solid-js"
import { UiBadge } from "../ui/UiBadge.tsx"
import type { TicketPaymentMethod } from "./TicketPaymentMethod.ts"
import { TicketPaymentMethodIcon } from "./TicketPaymentMethodIcon.tsx"
import type { TicketPaymentMethodOption } from "./TicketPaymentMethodOption.ts"

export function TicketPaymentMethodSelector(props: {
  options: readonly TicketPaymentMethodOption[]
  selected: TicketPaymentMethod
  onSelect: (method: TicketPaymentMethod) => void
}) {
  return (
    <fieldset class="flex flex-col gap-space-3">
      <legend class="mb-space-2 text-sm font-medium text-content">Zahlungsart wählen</legend>

      <For each={props.options}>
        {(option) => (
          <label
            for={`payment-method-${option.id}`}
            class={`focus-within:focus-ring flex cursor-pointer items-start gap-space-4 rounded-control border px-space-4 py-space-4 transition-colors ${
              props.selected === option.id
                ? "border-brand-accent bg-brand-soft ring-1 ring-inset ring-brand-accent/40"
                : "border-border-strong bg-surface-muted hover:border-brand-accent"
            }`}
          >
            <input
              id={`payment-method-${option.id}`}
              type="radio"
              name="payment-method"
              value={option.id}
              checked={props.selected === option.id}
              onChange={() => props.onSelect(option.id)}
              class="mt-space-1 h-4 w-4 shrink-0 accent-brand"
            />

            <TicketPaymentMethodIcon method={option.id} />

            <span class="flex min-w-0 flex-1 flex-col gap-space-1">
              <span class="flex flex-wrap items-center gap-space-2">
                <span class="text-sm font-semibold text-content">{option.name}</span>
                <UiBadge tone={option.badgeTone}>{option.badge}</UiBadge>
              </span>
              <span class="text-sm text-content-muted">{option.description}</span>
              <Show when={props.selected === option.id}>
                <span class="text-sm text-brand-accent">{option.hint}</span>
              </Show>
            </span>
          </label>
        )}
      </For>
    </fieldset>
  )
}
