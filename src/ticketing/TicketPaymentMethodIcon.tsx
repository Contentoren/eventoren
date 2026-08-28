import { Match, Switch } from "solid-js"
import type { TicketPaymentMethod } from "./TicketPaymentMethod.ts"

export function TicketPaymentMethodIcon(props: { method: TicketPaymentMethod }) {
  return (
    <span aria-hidden="true" class="inline-flex h-8 w-8 shrink-0 items-center justify-center text-content">
      <Switch>
        <Match when={props.method === "wallet"}>
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="2.5" y="5.5" width="19" height="13" rx="3" />
            <path d="M2.5 10.5h19" />
            <path d="M16.5 15h2.5" stroke-linecap="round" />
          </svg>
        </Match>
        <Match when={props.method === "card"}>
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
            <path d="M2.5 9.5h19" />
            <path d="M6 14.5h4" stroke-linecap="round" />
          </svg>
        </Match>
        <Match when={props.method === "paypal"}>
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M7.5 19.5 9.8 4.5h5.2a3.6 3.6 0 0 1 0 7.2h-3.4" stroke-linejoin="round" />
            <path d="M10.6 19.5l.7-4.6h2.9a3.4 3.4 0 0 0 3.3-2.8" stroke-linejoin="round" />
          </svg>
        </Match>
        <Match when={props.method === "klarna"}>
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.6">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5v5l3 1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </Match>
        <Match when={props.method === "rechnung"}>
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" stroke-linejoin="round" />
            <path d="M9 8.5h6M9 12h6" stroke-linecap="round" />
          </svg>
        </Match>
      </Switch>
    </span>
  )
}
