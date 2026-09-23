import { Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import type { demoSignInEnterOtpPageStateCreate } from "../state/demoSignInEnterOtpPageStateCreate.ts"

export function DemoSignInOtpPage(props: { readonly state: ReturnType<typeof demoSignInEnterOtpPageStateCreate> }) {
  const state = props.state

  return (
    <main class="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-space-6 px-space-5 py-space-12">
      <div class="flex flex-col gap-space-3">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">Eventoren</p>
        <h1 class="text-3xl font-semibold tracking-tight text-content">Demo-Code eingeben</h1>
      </div>
      <Show when={state.errorMessage.get()}>
        <p class="rounded-card border border-danger/50 bg-danger-soft p-space-4 text-sm text-danger" role="alert">
          {state.errorMessage.get()}
        </p>
      </Show>
      <form class="grid gap-space-4" onSubmit={state.submit}>
        <div class="grid gap-space-2">
          <Label for="demo-sign-in-otp-email">E-Mail-Adresse</Label>
          <Input
            id="demo-sign-in-otp-email"
            name="email"
            type="email"
            value={state.email.get()}
            onInput={state.emailInput}
          />
        </div>
        <div class="grid gap-space-2">
          <Label for="demo-sign-in-otp-code">Anmeldecode</Label>
          <Input
            id="demo-sign-in-otp-code"
            name="code"
            inputmode="numeric"
            value={state.code.get()}
            onInput={state.codeInput}
          />
        </div>
        <Button type="submit" variant="filledBlue" size="lg" disabled={state.isSubmitting.get()}>
          {state.isSubmitting.get() ? "Wird angemeldet …" : "Demo anmelden"}
        </Button>
      </form>
    </main>
  )
}
