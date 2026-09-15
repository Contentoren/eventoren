import { Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { LinkButtonExternal } from "#ui/interactive/link/LinkButton.jsx"
import type { SignInPageState } from "./SignInPageState.ts"
import { signInPageStateCreate } from "./signInPageStateCreate.ts"

export function SignInPage(props: { readonly returnTo: string | undefined; readonly state?: SignInPageState }) {
  const state = props.state ?? signInPageStateCreate({ returnTo: () => props.returnTo })

  return (
    <main class="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-space-6 px-space-5 py-space-12">
      <div class="flex flex-col gap-space-3">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">Eventoren</p>
        <h1 class="text-3xl font-semibold tracking-tight text-content">Anmelden</h1>
        <p class="text-content-muted">Melde dich mit deinem Eventoren-Konto an.</p>
      </div>

      <Show when={state.errorMessage()}>
        <p class="rounded-card border border-danger/50 bg-danger-soft p-space-4 text-sm text-danger" role="alert">
          {state.errorMessage()}
        </p>
      </Show>

      <form class="grid gap-space-4" onSubmit={state.submitPassword}>
        <div class="grid gap-space-2">
          <Label for="sign-in-email">E-Mail-Adresse</Label>
          <Input
            id="sign-in-email"
            name="email"
            type="email"
            autocomplete="email"
            required
            value={state.email.get()}
            onInput={state.emailInput}
          />
        </div>
        <div class="grid gap-space-2">
          <Label for="sign-in-password">Passwort</Label>
          <Input
            id="sign-in-password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            value={state.password.get()}
            onInput={state.passwordInput}
          />
        </div>
        <Button type="submit" variant="filledBlue" size="lg" disabled={state.isSubmitting.get()}>
          {state.isSubmitting.get() ? "Wird angemeldet …" : "Mit Passwort anmelden"}
        </Button>
      </form>

      <div class="border-t border-content/10 pt-space-5">
        <h2 class="text-lg font-semibold text-content">Anmeldung per E-Mail-Code</h2>
        <p class="mt-space-2 text-sm text-content-muted">
          Wir senden dir einen einmaligen Code an deine E-Mail-Adresse.
        </p>
        <form class="mt-space-4 grid gap-space-4" onSubmit={state.submitEmail}>
          <div class="grid gap-space-2">
            <Label for="sign-in-email-code">E-Mail-Adresse</Label>
            <Input
              id="sign-in-email-code"
              name="email-code"
              type="email"
              autocomplete="email"
              required
              value={state.email.get()}
              onInput={state.emailInput}
            />
          </div>
          <Button type="submit" variant="outline" size="lg" disabled={state.isSubmitting.get()}>
            Code anfordern
          </Button>
        </form>
      </div>

      <div class="border-t border-content/10 pt-space-5">
        <LinkButtonExternal href={state.loginUrl()} variant="outline" size="lg">
          Mit SSO anmelden
        </LinkButtonExternal>
      </div>
    </main>
  )
}
