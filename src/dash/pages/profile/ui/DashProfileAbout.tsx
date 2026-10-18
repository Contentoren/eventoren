import { DashMarkdownEditor } from "../../../ui/markdown/DashMarkdownEditor.tsx"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashProfilePageState } from "../dashProfilePageStateCreate.ts"

/** Profil-Sektion: öffentliche Beschreibung mit Markdown-Editor. */
export function DashProfileAbout(p: { state: DashProfilePageState; disabled: boolean }) {
  const form = () => p.state.form.get()
  const errors = () => p.state.liveErrors()
  return (
    <DashSection title="Über uns" description="Erzähl deinen Gästen, wer du bist und was sie erwartet.">
      <DashField
        label="Beschreibung"
        hint="Markdown wird unterstützt, z. B. **fett** und Listen."
        error={errors()["description"]}
      >
        <fieldset disabled={p.disabled} class="contents">
          <DashMarkdownEditor
            value={form()?.description ?? ""}
            onChange={(value) => p.state.setText("description", value)}
            label="Beschreibung"
            maxLength={1000}
            rows={8}
            invalid={errors()["description"] !== undefined}
          />
        </fieldset>
      </DashField>
    </DashSection>
  )
}
