import type { EventItem } from "../events/EventItem.ts"
import { ticketBagPaymentMethodsStateCreate } from "./ticketBagPaymentMethodsStateCreate.ts"
import { TicketPaymentBrandIcons } from "./TicketPaymentBrandIcons.tsx"

export function TicketBagPaymentMethods(props: {
  title: string
  events: readonly Pick<EventItem, "allowedStripePaymentMethods">[]
}) {
  const state = ticketBagPaymentMethodsStateCreate({ events: () => props.events })
  return (
    <div class="flex flex-col gap-space-3 rounded-control border border-border-subtle bg-surface-muted/50 p-space-4">
      <p class="text-xs font-medium text-content">{props.title}</p>
      <TicketPaymentBrandIcons brands={state.brands()} label="Zahlungsmethoden" />
      <p class="text-xs text-content-muted">Die verfügbaren Zahlungsmethoden werden im Checkout angezeigt.</p>
    </div>
  )
}
