import { Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import type { SignInEnterOtpPageState } from "./SignInEnterOtpPageState.ts"
import { signInEnterOtpPageStateCreate } from "./signInEnterOtpPageStateCreate.ts"

export function SignInEnterOtpPage(props: {
  readonly initialEmail: string | undefined
  readonly initialCode: string | undefined
  readonly returnTo: string | undefined
  readonly state?: SignInEnterOtpPageState
}) {
  const state =
    props.state ??
    signInEnterOtpPageStateCreate({
      initialEmail: () => props.initialEmail,
      initialCode: () => props.initialCode,
      returnTo: () => props.returnTo,
    })

  return (
    <main class="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-space-6 px-space-5 py-space-12">
      <div class="flex flex-col gap-space-3">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">Eventoren</p>
        <h1 class="text-3xl font-semibold tracking-tight text-content">Code eingeben</h1>
        <p class="text-content-muted">Gib den sechsstelligen Code aus deiner E-Mail ein.</p>
      </div>
      <Show when={state.errorMessage.get()}>
        <p class="rounded-card border border-danger/50 bg-danger-soft p-space-4 text-sm text-danger" role="alert">
          {state.errorMessage.get()}
        </p>
      </Show>
      <form class="grid gap-space-4" onSubmit={state.submit}>
        <div class="grid gap-space-2">
          <Label for="sign-in-otp-email">E-Mail-Adresse</Label>
          <Input
            id="sign-in-otp-email"
            name="email"
            type="email"
            autocomplete="email"
            required
            value={state.email.get()}
            onInput={state.emailInput}
          />
        </div>
        <div class="grid gap-space-2">
          <Label for="sign-in-otp-code">Anmeldecode</Label>
          <Input
            id="sign-in-otp-code"
            name="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            minlength="6"
            maxlength="6"
            pattern="[0-9]{6}"
            required
            value={state.code.get()}
            onInput={state.codeInput}
          />
        </div>
        <Button type="submit" variant="filledBlue" size="lg" disabled={state.isSubmitting.get()}>
          {state.isSubmitting.get() ? "Wird angemeldet …" : "Anmelden"}
        </Button>
      </form>
    </main>
  )
}
