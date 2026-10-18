import { mdiEyeOutline } from "@adaptive-ds/mdi/mdiEyeOutline.js"
import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashSettingsPageState } from "../dashSettingsPageStateCreate.ts"

const agbText =
  "Demo-Text: Mit der Nutzung von Eventoren akzeptierst du unsere AGB für Veranstalter. Du verkaufst Tickets in eigenem Namen, wir wickeln Zahlung und Auszahlung für dich ab. Preise, Gebühren und Erstattungen regelt der jeweilige Vertrag. In der Demo ist das ein gekürzter Platzhalter."

const avvText =
  "Demo-Text: Dieser Auftragsverarbeitungsvertrag (AVV) regelt, wie wir Gästedaten für dich verarbeiten. Wir speichern Bestellungen, Tickets und Nachrichten nur zur Vertragsabwicklung und geben sie nicht an Dritte weiter. In der Demo ist das ein gekürzter Platzhalter."

/** Sektion „Verträge“: AGB und AVV mit Annahmedatum und Lese-Ansicht. */
export function DashSettingsVertraege(p: { state: DashSettingsPageState }) {
  const org = () => p.state.org()
  const contract = () => p.state.contractSignal.get()

  return (
    <DashSection
      id="einstellungen-vertraege"
      title="Verträge"
      description="AGB und Auftragsverarbeitung — von dir angenommen, jederzeit einsehbar."
    >
      <div class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border-subtle px-3 py-2.5 text-sm">
          <div class="min-w-0">
            <p class="font-medium text-content">AGB für Veranstalter</p>
            <Show when={org()?.termsAcceptedAt}>
              {(at) => <p class="text-xs text-content-muted">Angenommen am {dashDateFormat(at(), "datum")}</p>}
            </Show>
          </div>
          <Button
            type="button"
            variant={buttonVariant.outline}
            class="h-9 px-3 text-sm"
            onClick={() => p.state.openContract("agb")}
          >
            Ansehen
          </Button>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border-subtle px-3 py-2.5 text-sm">
          <div class="min-w-0">
            <p class="font-medium text-content">Auftragsverarbeitungsvertrag (AVV)</p>
            <Show when={org()?.dpaAcceptedAt}>
              {(at) => <p class="text-xs text-content-muted">Angenommen am {dashDateFormat(at(), "datum")}</p>}
            </Show>
          </div>
          <Button
            type="button"
            variant={buttonVariant.outline}
            class="h-9 px-3 text-sm"
            onClick={() => p.state.openContract("avv")}
          >
            Ansehen
          </Button>
        </div>
      </div>
      <Sheet
        open={contract() !== null}
        onOpenChange={(open) => {
          if (!open) p.state.closeContract()
        }}
        title={contract() === "avv" ? "Auftragsverarbeitungsvertrag (AVV)" : "AGB für Veranstalter"}
        description="Gekürzter Demo-Text"
        size="md"
        footer={
          <Button type="button" variant={buttonVariant.filled} class="h-9 px-3 text-sm" onClick={p.state.closeContract}>
            <Icon path={mdiEyeOutline} class="size-4" />
            Gelesen
          </Button>
        }
      >
        <p class="text-sm leading-relaxed text-content">{contract() === "avv" ? avvText : agbText}</p>
      </Sheet>
    </DashSection>
  )
}
