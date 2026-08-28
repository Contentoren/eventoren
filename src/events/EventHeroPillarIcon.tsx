import { Match, Switch } from "solid-js"
import type { EventHeroPillar } from "./EventHeroPillar.ts"

export function EventHeroPillarIcon(props: { id: EventHeroPillar["id"] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-6"
      aria-hidden="true"
    >
      <Switch>
        <Match when={props.id === "auswahl"}>
          <path d="M4 6h9M4 12h9M4 18h9" />
          <path d="M17 5.5l3 3-3 3" />
          <path d="M20 8.5h-3.5" />
          <circle cx="18.5" cy="17" r="2.5" />
        </Match>
        <Match when={props.id === "transparenz"}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v9" />
          <path d="M14.5 9.75a2.5 2.5 0 0 0-2.5-1.25h-.5a2 2 0 0 0 0 4h1a2 2 0 0 1 0 4h-.5a2.5 2.5 0 0 1-2.5-1.25" />
        </Match>
        <Match when={props.id === "wallet"}>
          <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
          <path d="M9.5 7h5v5h-5z" />
          <path d="M9.5 15h2M14.5 15h.01M9.5 17.5h5" />
        </Match>
      </Switch>
    </svg>
  )
}
