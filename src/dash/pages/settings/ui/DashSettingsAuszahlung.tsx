import { Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"

import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashSettingsPageState } from "../dashSettingsPageStateCreate.ts"

/** Sektion „Auszahlung“: Kontoinhaber und IBAN mit Prüfung — leserechts- oder bankrechts-gesteuert. */
export function DashSettingsAuszahlung(p: { state: DashSettingsPageState }) {
  const draft = () => p.state.draft()

  return (
    <DashSection
      id="einstellungen-auszahlung"
      title="Auszahlung"
      description="Dahin überweisen wir deine Ticketeinnahmen."
      footer="Ausgezahlt wird 3 Tage nach Eventende."
    >
      <Show when={draft()}>
        {(current) => (
          <Show
            when={p.state.maySeeBank()}
            fallback={
              <div class="flex flex-col gap-4">
                <div class="rounded-control border border-border-subtle bg-surface-muted px-3 py-2.5 text-sm">
                  <p class="text-xs text-content-muted">Kontoinhaber</p>
                  <p class="font-medium text-content">{p.state.org()?.bank.holder}</p>
                </div>
                <div class="rounded-control border border-border-subtle bg-surface-muted px-3 py-2.5 text-sm">
                  <p class="text-xs text-content-muted">IBAN</p>
                  <p class="font-mono font-medium text-content">{p.state.maskedIban()}</p>
                </div>
                <p class="text-sm text-content-muted">
                  Nur freigegebene Teammitglieder mit Bankrecht sehen und ändern deine Bankdaten. Frag deine Inhaberin
                  oder deinen Inhaber.
                </p>
              </div>
            }
          >
            <fieldset disabled={p.state.readOnly()} class="flex min-w-0 flex-col gap-4">
              <DashField label="Kontoinhaber" for="settings-holder" required>
                <Input
                  id="settings-holder"
                  value={current().bankHolder}
                  onInput={(event) => p.state.setDraft({ bankHolder: event.currentTarget.value })}
                  maxlength={80}
                  class="h-9 text-sm"
                  placeholder="Wer erhält die Auszahlung?"
                />
              </DashField>
              <DashField
                label="IBAN"
                for="settings-iban"
                required
                error={p.state.ibanError()}
                hint="Wir prüfen und formatieren deine IBAN automatisch."
              >
                <Input
                  id="settings-iban"
                  value={current().bankIban}
                  onInput={(event) => p.state.setDraft({ bankIban: event.currentTarget.value })}
                  class="h-9 font-mono text-sm"
                  placeholder="DE00 0000 0000 0000 0000 00"
                  autocapitalize="characters"
                  spellcheck={false}
                />
              </DashField>
            </fieldset>
          </Show>
        )}
      </Show>
    </DashSection>
  )
}
