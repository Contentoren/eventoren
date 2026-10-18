import { Show } from "solid-js"

import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { DashMarkdownEditor } from "../../../ui/markdown/DashMarkdownEditor.tsx"
import type { DashDetailsPageState } from "../dashDetailsPageStateCreate.ts"

/** Sektion „Beschreibung“: Markdown-Text mit Vorschau (max. 3000 Zeichen). */
export function DashDetailsBeschreibung(p: { state: DashDetailsPageState }) {
  const draft = () => p.state.draft()
  const disabled = () => !p.state.canEdit()
  const showErrors = () => p.state.showErrorsSignal.get()
  const errors = () => p.state.errors()

  return (
    <DashSection
      id="details-beschreibung"
      title="Beschreibung"
      description="Erzähle deinen Gästen, was sie erwartet."
      class="scroll-mt-24"
    >
      <DashField label="Beschreibung" for="details-description" error={showErrors() ? errors()?.description : null}>
        <Show when={draft()} fallback={null}>
          {(current) => (
            <DashMarkdownEditor
              id="details-description"
              value={current().description}
              onChange={(value) => p.state.setDraft({ description: value })}
              maxLength={3000}
              rows={8}
              invalid={showErrors() && errors()?.description !== null}
            />
          )}
        </Show>
      </DashField>
    </DashSection>
  )
}
