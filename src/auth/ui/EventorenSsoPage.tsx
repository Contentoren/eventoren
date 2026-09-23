import { Show } from "solid-js"
import { Checkbox } from "#ui/input/check/Checkbox.tsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.ts"
import { LinkButtonExternal } from "#ui/interactive/link/LinkButton.tsx"
import type { EventorenSsoPageState } from "./EventorenSsoPageState.ts"
import { eventorenSsoPageStateCreate } from "./eventorenSsoPageStateCreate.ts"

export function EventorenSsoPage(props: {
  readonly returnTo?: string
  readonly isServerAuthorized?: boolean
  readonly state?: EventorenSsoPageState
}) {
  const state =
    props.state ??
    eventorenSsoPageStateCreate({
      returnTo: () => props.returnTo,
      isServerAuthorized: () => props.isServerAuthorized,
    })

  return (
    <main class="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-space-6 px-space-5 py-space-12 text-center">
      <div class="flex flex-col items-center gap-space-3">
        <span class="grid size-14 place-items-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/25">
          E
        </span>
        <p class="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">Eventoren</p>
        <h1 class="text-3xl font-semibold tracking-tight text-content">Single Sign-On</h1>
        <p class="text-sm text-content-muted">
          Melde dich mit deinem Contentoren-Konto an. Bestehende Zitadel-Sitzungen werden automatisch erkannt.
        </p>
      </div>

      <Show when={state.errorMessage()}>
        {(message) => (
          <div
            role="alert"
            class="rounded-card border border-danger/50 bg-danger-soft p-space-4 text-left text-sm text-danger"
          >
            <p class="font-semibold">Die Anmeldung konnte nicht abgeschlossen werden.</p>
            <p class="mt-1">{message()}</p>
          </div>
        )}
      </Show>

      <div class="flex flex-col gap-space-3">
        <LinkButtonExternal
          variant={buttonVariant.filledIndigo}
          size="lg"
          href={state.loginDestination()}
          class="w-full justify-center"
        >
          {state.isPending() ? "Wird angemeldet …" : "Continue with Zitadel"}
        </LinkButtonExternal>
      </div>

      <div class="flex items-center justify-center">
        <Checkbox id="sso-auto-sign-in" checked={state.autoSignIn()} onChange={state.autoSignInToggle}>
          <span class="text-sm font-medium text-content">Automatisch anmelden</span>
        </Checkbox>
      </div>

      <p class="text-xs text-content-muted">Sicheres OpenID Connect · kein lokales Passwort erforderlich</p>
    </main>
  )
}
