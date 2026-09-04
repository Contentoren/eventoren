import { For, Show } from "solid-js"
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
      <legend class="mb-space-2 text-sm font-semibold tracking-tight text-content">Zahlungsart wählen</legend>

      <div class="flex flex-col gap-space-3" role="radiogroup">
        <For each={props.options}>
          {(option) => {
            const isSelected = () => props.selected === option.id

            return (
              <label
                for={`payment-method-${option.id}`}
                class={`group relative flex cursor-pointer items-start gap-space-3.5 rounded-2xl border p-space-4 transition-all duration-200 ease-out focus-within:focus-ring ${
                  isSelected()
                    ? "border-brand-accent bg-surface shadow-xs ring-2 ring-brand-accent/25 dark:bg-surface-muted/60"
                    : "border-border-subtle/90 bg-surface hover:border-border-strong/70 hover:bg-surface-muted/40 dark:border-border-strong/30 dark:bg-surface-muted/20 dark:hover:bg-surface-muted/50"
                }`}
              >
                <input
                  id={`payment-method-${option.id}`}
                  type="radio"
                  name="payment-method"
                  value={option.id}
                  checked={isSelected()}
                  onChange={() => props.onSelect(option.id)}
                  class="sr-only"
                />

                {/* Apple-style Custom Radio Indicator */}
                <span
                  aria-hidden="true"
                  class={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                    isSelected()
                      ? "border-brand-accent bg-brand-accent text-brand-content shadow-xs"
                      : "border-border-strong/50 bg-surface group-hover:border-border-strong"
                  }`}
                >
                  <Show when={isSelected()}>
                    <span class="h-2 w-2 rounded-full bg-white" />
                  </Show>
                </span>

                {/* Apple-style Icon Squircle */}
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle/80 bg-surface-muted/80 shadow-xs dark:border-border-strong/30 dark:bg-surface">
                  <TicketPaymentMethodIcon method={option.id} />
                </div>

                {/* Content */}
                <div class="flex min-w-0 flex-1 flex-col gap-space-1">
                  <span class="text-sm font-semibold tracking-tight text-content">{option.name}</span>
                  <p class="text-xs leading-relaxed text-content-muted sm:text-sm">{option.description}</p>
                </div>
              </label>
            )
          }}
        </For>
      </div>
    </fieldset>
  )
}
