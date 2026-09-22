import { mdiArrowLeft } from "@adaptive-ds/mdi/mdiArrowLeft.js"
import { mdiLogout } from "@adaptive-ds/mdi/mdiLogout.js"
import { mdiRefresh } from "@adaptive-ds/mdi/mdiRefresh.js"
import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { errorPageActionsStateCreate } from "./errorPageActionsStateCreate.ts"

interface ErrorPageActionsProps {
  readonly fallbackHref?: string
  readonly showSignOut?: boolean
  readonly class?: string
  readonly children?: JSX.Element
}

export function ErrorPageActions(props: ErrorPageActionsProps) {
  const state = errorPageActionsStateCreate({
    fallbackHref: () => props.fallbackHref,
    showSignOut: () => props.showSignOut,
  })

  return (
    <div class={`mt-6 flex flex-col items-center gap-3 ${props.class ?? ""}`.trim()}>
      {props.children}
      <div class="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" type="button" onClick={state.onBack} class="gap-2">
          <Icon path={mdiArrowLeft} class="size-5" />
          Zurück
        </Button>
        <Button variant="outline" type="button" onClick={state.onRefresh} class="gap-2">
          <Icon path={mdiRefresh} class="size-5" />
          Aktualisieren
        </Button>
        <Show when={state.isSignOutVisible()}>
          <form method="post" action="/logout" onSubmit={state.onSignOut}>
            <Button variant="outline" type="submit" class="gap-2">
              <Icon path={mdiLogout} class="size-5" />
              Abmelden
            </Button>
          </form>
        </Show>
      </div>
    </div>
  )
}
