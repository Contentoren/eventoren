import { For } from "solid-js"
import type { EventItem } from "../events/EventItem.ts"
import { ticketBagPaymentMethodsStateCreate } from "./ticketBagPaymentMethodsStateCreate.ts"

export function TicketBagPaymentMethods(props: {
  title: string
  events: readonly Pick<EventItem, "allowedStripePaymentMethods">[]
}) {
  const state = ticketBagPaymentMethodsStateCreate({ events: () => props.events })
  return (
    <div class="flex flex-col gap-space-3 rounded-control border border-border-subtle bg-surface-muted/50 p-space-4">
      <p class="text-xs font-medium text-content">{props.title}</p>
      <ul class="text-xs text-content-muted" aria-label="Zahlungsmethoden">
        <For each={state.hints()}>{(label) => <li>{label}</li>}</For>
      </ul>
      <p class="text-xs text-content-muted">Die verfügbaren Zahlungsmethoden werden im Checkout angezeigt.</p>
    </div>
  )
}
