import { For, Show } from "solid-js"
import { TicketWalletPass } from "./TicketWalletPass.tsx"
import { ticketOrderListStateCreate } from "./ticketOrderListStateCreate.ts"

export function TicketOrderList(props: { emptyMessage?: string }) {
  const state = ticketOrderListStateCreate()

  return (
    <section class="flex flex-col gap-space-6" aria-labelledby="ticket-order-list">
      <div class="flex items-baseline justify-between gap-space-4">
        <h2 id="ticket-order-list" class="text-xl font-semibold text-content">
          Meine Tickets
        </h2>
        <p class="text-sm text-content-muted" aria-live="polite">
          {state.countLabel()}
        </p>
      </div>

      <Show when={state.errorMessage()}>
        <p
          role="alert"
          class="rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3 text-sm font-medium text-danger"
        >
          {state.errorMessage()}
        </p>
      </Show>

      <Show when={state.isEmpty()}>
        <p class="text-sm text-content-muted">
          {props.emptyMessage ?? "Du hast noch keine Tickets gekauft. Entdecke jetzt passende Events."}
        </p>
      </Show>

      <ul class="flex flex-col gap-space-6">
        <For each={state.orders()}>
          {(order) => (
            <li>
              <TicketWalletPass order={order} />
            </li>
          )}
        </For>
      </ul>
    </section>
  )
}
