import { Show } from "solid-js"
import { mdiEye } from "@adaptive-ds/mdi/mdiEye.js"
import { mdiEyeOff } from "@adaptive-ds/mdi/mdiEyeOff.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { Input } from "#ui/input/input/Input.jsx"
import { Avatar } from "#ui/static/avatar/Avatar.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashOnboardingPageState } from "../dashOnboardingPageStateCreate.ts"

/** Schritt 1 „Konto“: Angemeldete anzeigen oder Name, E-Mail und Passwort erfassen. */
export function DashOnboardingStepAccount(p: { state: DashOnboardingPageState }) {
  const state = p.state
  const errors = () => (state.showErrors.get() ? state.errors() : {})

  return (
    <DashSection title="Dein Konto" description="So meldest du dich an und wirst als Inhaber eingetragen.">
      <div class="flex flex-col gap-4">
        <Show
          when={!state.accountSkipped()}
          fallback={
            <div class="flex items-center gap-3 rounded-control border border-border-subtle bg-surface-muted px-3 py-2.5">
              <Avatar name={state.sessionUser()?.name ?? "?"} size="md" />
              <div class="min-w-0">
                <p class="text-sm font-semibold text-content">Angemeldet als {state.sessionUser()?.name}</p>
                <p class="truncate text-xs text-content-muted">Dein bestehendes Demo-Konto wird übernommen.</p>
              </div>
            </div>
          }
        >
          <DashField label="Name" for="onboarding-name" required error={errors().accountName}>
            <Input
              id="onboarding-name"
              class="h-10 text-sm"
              autocomplete="name"
              value={state.accountName.get()}
              onInput={(event) => state.set(state.accountName, event.currentTarget.value)}
              placeholder="Wie heißt du?"
            />
          </DashField>
          <DashField label="E-Mail" for="onboarding-email" required error={errors().accountEmail}>
            <Input
              id="onboarding-email"
              class="h-10 text-sm"
              type="email"
              autocomplete="email"
              value={state.accountEmail.get()}
              onInput={(event) => state.set(state.accountEmail, event.currentTarget.value)}
              placeholder="name@beispiel.de"
            />
          </DashField>
          <DashField label="Passwort" for="onboarding-password" required error={errors().accountPassword}>
            <div class="relative">
              <Input
                id="onboarding-password"
                class="h-10 pr-11 text-sm"
                type={state.showPassword.get() ? "text" : "password"}
                autocomplete="new-password"
                minlength={8}
                value={state.accountPassword.get()}
                onInput={(event) => state.set(state.accountPassword, event.currentTarget.value)}
                placeholder="Mindestens 8 Zeichen"
              />
              <Button
                type="button"
                variant={buttonVariant.ghost}
                class="absolute inset-y-0 right-1 h-auto px-2"
                aria-label={state.showPassword.get() ? "Passwort verbergen" : "Passwort anzeigen"}
                aria-pressed={state.showPassword.get()}
                onClick={() => state.showPassword.set(!state.showPassword.get())}
              >
                <Icon path={state.showPassword.get() ? mdiEyeOff : mdiEye} class="size-5" />
              </Button>
            </div>
          </DashField>
        </Show>
      </div>
    </DashSection>
  )
}
