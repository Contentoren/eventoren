import { Match, Show, Switch } from "solid-js"
import { mdiArrowLeft } from "@adaptive-ds/mdi/mdiArrowLeft.js"
import { mdiArrowRight } from "@adaptive-ds/mdi/mdiArrowRight.js"
import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { Stepper } from "#ui/static/stepper/Stepper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

import type { DashOnboardingPageState } from "../dashOnboardingPageStateCreate.ts"
import { DashOnboardingStepAccount } from "./DashOnboardingStepAccount.tsx"
import { DashOnboardingStepContracts } from "./DashOnboardingStepContracts.tsx"
import { DashOnboardingStepDetails } from "./DashOnboardingStepDetails.tsx"
import { DashOnboardingStepDone } from "./DashOnboardingStepDone.tsx"
import { DashOnboardingStepOrg } from "./DashOnboardingStepOrg.tsx"

const stepLabels = ["Konto", "Organisation", "Angaben", "Verträge", "Fertig"]

/** Onboarding-Vollbild: links Fortschritt, rechts Karte – mobil kompakt oben. */
export function DashOnboardingPage(p: { state: DashOnboardingPageState }) {
  const state = p.state
  const step = () => state.step()

  return (
    <div class="min-h-dvh bg-surface-base text-content">
      <div class="mx-auto flex min-h-dvh w-full max-w-[1120px] flex-col lg:flex-row">
        <aside class="border-b border-border-subtle bg-surface px-4 py-4 sm:px-6 lg:flex lg:w-[280px] lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <p class="text-lg font-bold tracking-tight text-content" aria-label="eventoren">
            eventoren
          </p>
          <p class="mt-1 hidden text-xs text-content-muted lg:block">Dein Weg zum ersten Event.</p>
          <div class="mt-3 lg:mt-6 lg:flex-1">
            <Stepper
              steps={stepLabels.map((label) => ({ id: label, label }))}
              current={step()}
              orientation="vertical"
            />
          </div>
          <p class="mt-3 hidden text-xs text-content-muted lg:block">
            Demo – es werden keine echten Daten gespeichert.
          </p>
        </aside>

        <main class="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:items-center lg:px-10 lg:py-10">
          <div class="w-full max-w-[560px]">
            <Show when={step() < 4}>
              <p class="mb-1 text-sm text-content-muted lg:hidden" aria-live="polite">
                Schritt {step() + 1} von 5: {stepLabels[step()]}
              </p>
              <div
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={5}
                aria-valuenow={step() + 1}
                class="mb-5 h-1.5 overflow-hidden rounded-full bg-surface-muted lg:hidden"
              >
                <div
                  class="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${((step() + 1) / 5) * 100}%` }}
                />
              </div>
            </Show>

            <h1 class="text-xl font-semibold">{stepLabels[step()]}</h1>
            <p class="mb-5 mt-1 text-sm text-content-muted">
              <Switch>
                <Match when={step() === 0}>Lege dein Konto an – oder nutze dein Demo-Konto weiter.</Match>
                <Match when={step() === 1}>Erzähl uns, wer hinter deinen Events steht.</Match>
                <Match when={step() === 2}>Diese Angaben brauchen wir für Impressum und Auszahlung.</Match>
                <Match when={step() === 3}>Fast geschafft – bitte lies und bestätige beide Dokumente.</Match>
                <Match when={step() === 4}>Deine Organisation ist angelegt und wartet auf Freigabe.</Match>
              </Switch>
            </p>

            <Show when={step() === 0}>
              <DashOnboardingStepAccount state={state} />
            </Show>
            <Show when={step() === 1}>
              <DashOnboardingStepOrg state={state} />
            </Show>
            <Show when={step() === 2}>
              <DashOnboardingStepDetails state={state} />
            </Show>
            <Show when={step() === 3}>
              <DashOnboardingStepContracts state={state} />
            </Show>
            <Show when={step() === 4}>
              <DashOnboardingStepDone state={state} />
            </Show>

            <Show when={step() < 4}>
              <div class="mt-6 flex items-center justify-between gap-2 border-t border-border-subtle pt-4">
                <Show when={step() > 0} fallback={<span />}>
                  <Button
                    type="button"
                    variant={buttonVariant.outline}
                    class="h-9 gap-1.5 px-3 text-sm"
                    onClick={state.goBack}
                  >
                    <Icon path={mdiArrowLeft} class="size-4" />
                    Zurück
                  </Button>
                </Show>
                <Button
                  type="button"
                  variant={buttonVariant.contrast}
                  class="h-10 gap-1.5 px-4 text-sm"
                  disabled={state.saving.get() || !state.canContinue()}
                  onClick={() => state.goStep(step() + 1)}
                >
                  <Show when={state.saving.get()} fallback={state.primaryLabel()}>
                    Wird angelegt …
                  </Show>
                  <Show when={!state.saving.get() && step() < 3}>
                    <Icon path={mdiArrowRight} class="size-4" />
                  </Show>
                  <Show when={!state.saving.get() && step() === 3}>
                    <Icon path={mdiCheck} class="size-4" />
                  </Show>
                </Button>
              </div>
            </Show>
          </div>
        </main>
      </div>
    </div>
  )
}
