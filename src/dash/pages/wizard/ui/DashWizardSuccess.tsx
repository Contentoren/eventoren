import { Show } from "solid-js"
import { mdiCheckCircle } from "@adaptive-ds/mdi/mdiCheckCircle.js"
import { mdiOpenInNew } from "@adaptive-ds/mdi/mdiOpenInNew.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { CopyButton } from "#ui/interactive/copy/CopyButton.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashWizardPageState } from "../dashWizardPageStateCreate.ts"

/** Erfolgsansicht nach dem Speichern: Link kopieren, Seite ansehen, zum Event. */
export function DashWizardSuccess(p: { state: DashWizardPageState }) {
  const state = p.state
  const result = () => state.success.get()

  return (
    <Show when={result()}>
      {(current) => (
        <DashSection title={current().published ? "Dein Event ist online" : "Entwurf gespeichert"}>
          <div class="flex flex-col gap-4">
            <EmptyState
              icon={mdiCheckCircle}
              title={current().published ? "Dein Event ist online" : "Entwurf gespeichert"}
              description={
                current().published
                  ? "Teile den Link mit deinen Gästen."
                  : (current().publishError ?? "Veröffentlichen war gerade nicht möglich – dein Entwurf ist sicher.")
              }
            />
            <div class="flex flex-col gap-2">
              <label for="wizard-link" class="text-sm font-medium text-content">
                Link zu deinem Event
              </label>
              <div class="flex flex-col gap-2 sm:flex-row">
                <Input id="wizard-link" class="h-9 flex-1 text-sm" value={current().publicUrl} readonly />
                <CopyButton value={current().publicUrl} label="Kopieren" ariaLabel="Link kopieren" />
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <LinkButtonInternal
                to={current().publicPath}
                newTab
                variant={buttonVariant.outline}
                class="h-9 gap-1.5 px-3 text-sm"
                icon={mdiOpenInNew}
                iconClass="size-4"
              >
                Seite ansehen
              </LinkButtonInternal>
              <Button type="button" variant={buttonVariant.contrast} class="h-9 px-3 text-sm" onClick={state.openEvent}>
                Zum Event
              </Button>
            </div>
            <Show when={!current().published && current().publishError}>
              {(reason) => (
                <p class="flex items-start gap-2 text-sm text-content-muted">
                  <Icon path={mdiOpenInNew} class="mt-0.5 size-4 shrink-0" />
                  {reason()}
                </p>
              )}
            </Show>
          </div>
        </DashSection>
      )}
    </Show>
  )
}
