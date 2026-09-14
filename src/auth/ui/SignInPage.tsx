import { Show } from "solid-js"
import { LinkButtonExternal } from "#ui/interactive/link/LinkButton.jsx"
import { signInPageStateCreate } from "./signInPageStateCreate.ts"

export function SignInPage(props: { readonly returnTo: string | undefined }) {
  const state = signInPageStateCreate({ returnTo: () => props.returnTo })

  return (
    <main class="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-space-6 px-space-5 py-space-12">
      <div class="flex flex-col gap-space-3">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">Eventoren</p>
        <h1 class="text-3xl font-semibold tracking-tight text-content">Anmelden</h1>
        <p class="text-content-muted">Melde dich mit deinem Eventoren-Konto über den zentralen SSO-Dienst an.</p>
      </div>

      <Show when={state.errorMessage()}>
        <p class="rounded-card border border-danger/50 bg-danger-soft p-space-4 text-sm text-danger" role="alert">
          {state.errorMessage()}
        </p>
      </Show>

      <LinkButtonExternal href={state.loginUrl()} variant="filledBlue" size="lg">
        Mit SSO anmelden
      </LinkButtonExternal>
    </main>
  )
}
