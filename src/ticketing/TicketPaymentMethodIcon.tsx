import { Match, Switch } from "solid-js"
import type { TicketPaymentMethod } from "./TicketPaymentMethod.ts"

export function TicketPaymentMethodIcon(props: { method: TicketPaymentMethod }) {
  return (
    <span aria-hidden="true" class="inline-flex h-5 w-5 shrink-0 items-center justify-center text-content">
      <Switch>
        <Match when={props.method === "wallet"}>
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.88c.62-.75 1.04-1.8 0.93-2.88-.9.04-1.99.6-2.63 1.35-.56.65-1.06 1.7-0.93 2.73 1 .08 2.01-.45 2.63-1.2z" />
          </svg>
        </Match>
        <Match when={props.method === "card"}>
          <svg
            viewBox="0 0 24 24"
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            aria-hidden="true"
          >
            <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
            <path d="M2.5 9.5h19" />
            <rect
              x="5.5"
              y="13"
              width="3.5"
              height="2.5"
              rx="0.5"
              fill="currentColor"
              fill-opacity="0.25"
              stroke="currentColor"
              stroke-width="1"
            />
            <circle
              cx="16"
              cy="14.25"
              r="1.5"
              fill="currentColor"
              fill-opacity="0.2"
              stroke="currentColor"
              stroke-width="1"
            />
            <circle
              cx="18"
              cy="14.25"
              r="1.5"
              fill="currentColor"
              fill-opacity="0.2"
              stroke="currentColor"
              stroke-width="1"
            />
          </svg>
        </Match>
        <Match when={props.method === "paypal"}>
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path
              d="M7.076 21.337H4.55a.8.8 0 0 1-.79-.915L6.347 3.963a.9.9 0 0 1 .89-.763h6.638c3.27 0 5.483 1.636 5.034 5.034-.34 2.576-2.072 4.417-4.664 4.417h-2.52l-1.09 6.883a.8.8 0 0 1-.79.763h-2.77l.02-.96z"
              fill-opacity="0.4"
            />
            <path d="M9.82 17.537h-2.526a.8.8 0 0 1-.79-.915l2.067-13.1a.9.9 0 0 1 .89-.763h6.638c3.27 0 5.483 1.636 5.034 5.034-.34 2.576-2.072 4.417-4.664 4.417H13.95l-1.09 6.883a.8.8 0 0 1-.79.763H9.3l.52-2.319z" />
          </svg>
        </Match>
        <Match when={props.method === "klarna"}>
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M4.5 4h3.2v16H4.5z" />
            <path d="M19.5 20h-3.4l-4.8-7.5V4h3.2v5.7L18.7 4h3.6l-5.6 7.4L19.5 20z" />
            <circle cx="21" cy="18.5" r="1.5" />
          </svg>
        </Match>
        <Match when={props.method === "rechnung"}>
          <svg
            viewBox="0 0 24 24"
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            aria-hidden="true"
          >
            <path d="M3 9 12 4l9 5v1.5H3V9z" stroke-linejoin="round" />
            <path d="M5.5 10.5v6.5M9.5 10.5v6.5M14.5 10.5v6.5M18.5 10.5v6.5" stroke-linecap="round" />
            <path d="M3 17h18v3H3z" stroke-linejoin="round" />
          </svg>
        </Match>
      </Switch>
    </span>
  )
}
