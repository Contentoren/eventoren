import { Match, Switch } from "solid-js"
import type { SiteHeaderAuthProvider } from "./SiteHeaderAuthProvider.ts"

export function SiteHeaderAuthProviderIcon(props: { id: SiteHeaderAuthProvider["id"] }) {
  return (
    <Switch>
      <Match when={props.id === "google"}>
        <svg viewBox="0 0 24 24" aria-hidden="true" class="size-5">
          <path
            fill="#4285F4"
            d="M23 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.17a5.28 5.28 0 01-2.29 3.46v2.88h3.7C21.72 18.8 23 15.8 23 12.27z"
          />
          <path
            fill="#34A853"
            d="M12 23.5c3.1 0 5.7-1.03 7.6-2.8l-3.7-2.88c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.540-2.02-6.45-4.75H1.7v2.98A11.5 11.5 0 0012 23.5z"
          />
          <path fill="#FBBC05" d="M5.55 14.17a6.9 6.9 0 010-4.34V6.85H1.7a11.5 11.5 0 000 10.3l3.85-2.98z" />
          <path
            fill="#EA4335"
            d="M12 4.98c1.69 0 3.2.58 4.4 1.72l3.28-3.28C17.7 1.55 15.1.5 12 .5A11.5 11.5 0 001.7 6.85l3.85 2.98C6.46 7.1 9 4.98 12 4.98z"
          />
        </svg>
      </Match>

      <Match when={props.id === "apple"}>
        <svg viewBox="0 0 24 24" aria-hidden="true" class="size-5" fill="currentColor">
          <path d="M16.4 12.7c0-2.35 1.92-3.48 2-3.53-1.09-1.6-2.79-1.82-3.39-1.84-1.44-.15-2.82.85-3.55.85-.73 0-1.86-.83-3.06-.81-1.57.02-3.02.91-3.83 2.32-1.63 2.83-.42 7.02 1.17 9.32.78 1.12 1.71 2.38 2.93 2.34 1.18-.05 1.62-.76 3.05-.76 1.42 0 1.82.76 3.06.74 1.26-.02 2.06-1.14 2.83-2.27.89-1.3 1.26-2.56 1.28-2.63-.03-.01-2.46-.94-2.49-3.73zM14.1 5.2c.65-.79 1.09-1.88.97-2.97-.94.04-2.07.62-2.74 1.4-.6.7-1.13 1.82-.99 2.89 1.05.08 2.11-.53 2.76-1.32z" />
        </svg>
      </Match>
    </Switch>
  )
}
