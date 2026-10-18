import { Show } from "solid-js"
import { mdiArrowLeft } from "@adaptive-ds/mdi/mdiArrowLeft.js"
import { mdiArrowRight } from "@adaptive-ds/mdi/mdiArrowRight.js"
import { mdiClose } from "@adaptive-ds/mdi/mdiClose.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { Stepper } from "#ui/static/stepper/Stepper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { dashWizardPageStateCreate } from "../dashWizardPageStateCreate.ts"
import { DashWizardStepBasis } from "./DashWizardStepBasis.tsx"
import { DashWizardStepReview } from "./DashWizardStepReview.tsx"
import { DashWizardStepTickets } from "./DashWizardStepTickets.tsx"
import { DashWizardSuccess } from "./DashWizardSuccess.tsx"

/** Seite „Event erstellen“: 3-Schritte-Assistent mit Fokus-Layout, Stepper und Live-Vorschau. */
export function DashWizardPage(p: {
  step: () => number
  vorlage: () => string | undefined
  onStep: (step: number) => void
}) {
  const state = dashWizardPageStateCreate({ step: p.step, vorlage: p.vorlage, onStep: p.onStep })

  return (
    <div class="min-h-dvh bg-surface-base text-content">
      <div class="border-b border-border-subtle bg-surface">
        <div class="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Button
            type="button"
            variant={buttonVariant.ghost}
            class="h-9 gap-1.5 px-2 text-sm"
            aria-label="Abbrechen und zurück zu den Events"
            onClick={state.cancelRequest}
          >
            <Icon path={mdiClose} class="size-4 shrink-0" />
            Abbrechen
          </Button>
          <div class="min-w-0 flex-1">
            <Stepper
              steps={[
                { id: "basis", label: "Basis" },
                { id: "tickets", label: "Tickets" },
                { id: "pruefen", label: "Prüfen" },
              ]}
              current={state.step()}
              onStepClick={state.goStep}
              class="mx-auto w-full max-w-md"
            />
          </div>
          <Button
            type="button"
            variant={buttonVariant.outline}
            class="h-9 shrink-0 px-3 text-sm"
            disabled={state.saving.get()}
            onClick={state.saveDraft}
          >
            Als Entwurf speichern
          </Button>
        </div>
      </div>

      <main class="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Show when={state.success.get() === null} fallback={<DashWizardSuccess state={state} />}>
          <div class="flex flex-col gap-4">
            <Show when={state.step() === 0}>
              <DashWizardStepBasis state={state} />
            </Show>
            <Show when={state.step() === 1}>
              <DashWizardStepTickets state={state} />
            </Show>
            <Show when={state.step() === 2}>
              <DashWizardStepReview state={state} />
            </Show>

            <div class="flex items-center justify-between gap-2 border-t border-border-subtle pt-4">
              <Show when={state.step() > 0} fallback={<span />}>
                <Button
                  type="button"
                  variant={buttonVariant.outline}
                  class="h-9 gap-1.5 px-3 text-sm"
                  onClick={() => state.goStep(state.step() - 1)}
                >
                  <Icon path={mdiArrowLeft} class="size-4" />
                  Zurück
                </Button>
              </Show>
              <Show when={state.step() < 2}>
                <Button
                  type="button"
                  variant={buttonVariant.contrast}
                  class="h-9 gap-1.5 px-3 text-sm"
                  onClick={() => state.goStep(state.step() + 1)}
                >
                  Weiter
                  <Icon path={mdiArrowRight} class="size-4" />
                </Button>
              </Show>
            </div>
          </div>
        </Show>
      </main>

      <ConfirmDialog
        open={state.confirmCancel.get()}
        onOpenChange={(open) => state.confirmCancel.set(open)}
        title="Erstellung abbrechen?"
        description="Dein Entwurf bleibt in dieser Sitzung gespeichert, bis du ihn speicherst oder verwirfst."
        confirmLabel="Verwerfen"
        onConfirm={state.cancelConfirm}
      />
    </div>
  )
}
