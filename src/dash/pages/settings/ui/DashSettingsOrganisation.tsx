import { Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"

import type { DashOrgKind } from "../../../model/dashOrgKindSchema.ts"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashSettingsPageState } from "../dashSettingsPageStateCreate.ts"

const kindOptions: { value: DashOrgKind; label: string }[] = [
  { value: "verein", label: "Verein" },
  { value: "unternehmen", label: "Unternehmen" },
  { value: "schule", label: "Schule / Abi" },
  { value: "privat", label: "Privatperson" },
]

/** Sektion „Organisation“: Name, Art und Profil-Link mit Live-Prüfung. */
export function DashSettingsOrganisation(p: { state: DashSettingsPageState }) {
  const draft = () => p.state.draft()

  return (
    <DashSection
      id="einstellungen-organisation"
      title="Organisation"
      description="So heißt du auf Eventoren und unter dieser Adresse finden dich Gäste."
    >
      <Show when={draft()}>
        {(current) => (
          <fieldset disabled={p.state.readOnly()} class="flex min-w-0 flex-col gap-4">
            <DashField label="Name" for="settings-name" required error={p.state.nameError()}>
              <Input
                id="settings-name"
                value={current().name}
                onInput={(event) => p.state.setDraft({ name: event.currentTarget.value })}
                maxlength={80}
                class="h-9 text-sm"
                placeholder="Dein Organisationsname"
              />
            </DashField>
            <DashField
              label="Art"
              info="Verein, Unternehmen, Schule oder privat — das steuert auch deine Angaben im Profil."
            >
              <SegmentedControl
                value={current().kind}
                onChange={(value) => p.state.setDraft({ kind: value as DashOrgKind })}
                options={kindOptions}
                ariaLabel="Organisationsart wählen"
              />
            </DashField>
            <DashField
              label="Profil-Link"
              for="settings-slug"
              required
              error={p.state.slugError()}
              hint={`eventoren.de/veranstalter/${p.state.slugPreview() || "dein-link"} · live geprüft`}
            >
              <Input
                id="settings-slug"
                value={current().slug}
                onInput={(event) => p.state.setDraft({ slug: event.currentTarget.value })}
                maxlength={60}
                class="h-9 font-mono text-sm"
                placeholder="dein-link"
                autocapitalize="off"
                spellcheck={false}
              />
            </DashField>
          </fieldset>
        )}
      </Show>
    </DashSection>
  )
}
