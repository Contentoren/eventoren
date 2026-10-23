import { For, Show } from "solid-js"
import { mdiBookOpenOutline } from "@adaptive-ds/mdi/mdiBookOpenOutline.js"
import { mdiFileDocumentOutline } from "@adaptive-ds/mdi/mdiFileDocumentOutline.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashOnboardingPageState } from "../dashOnboardingPageStateCreate.ts"

const contractTexts: Record<"agb" | "avv", { title: string; short: string; paragraphs: string[] }> = {
  agb: {
    title: "AGB für Veranstalter",
    short: "Demo-Kurzfassung – 5 Absätze.",
    paragraphs: [
      "1. Geltung: Diese Demo-AGB regeln die Zusammenarbeit zwischen dir als Veranstalter und eventoren bei der Demo.",
      "2. Tickets und Preise: Du legst Preise und Kontingente fest. Gebühren siehst du vor dem Veröffentlichen.",
      "3. Auszahlung: Einnahmen überweisen wir auf dein angegebenes Konto – in der Demo nur simuliert.",
      "4. Storno: Du kannst Events jederzeit absagen. Käufer erhalten in der Demo automatisch ihr Geld zurück.",
      "5. Kündigung: Du kannst dein Konto jederzeit löschen. Demo-Daten verschwinden mit dem Zurücksetzen.",
      "Stand: Demo-Fassung, keine Rechtsberatung.",
    ],
  },
  avv: {
    title: "Auftragsverarbeitungsvertrag (AVV)",
    short: "Demo-Kurzfassung – 6 Absätze.",
    paragraphs: [
      "1. Gegenstand: eventoren verarbeitet Käufer- und Gästedaten in deinem Auftrag – nur für dein Event.",
      "2. Dauer: Die Verarbeitung dauert, solange dein Konto besteht oder bis du die Löschung wünschst.",
      "3. Weisungen: Wir handeln nur nach deinen Einstellungen im Dashboard, etwa beim Nachrichtenversand.",
      "4. Sicherheit: Demo-Daten liegen verschlüsselt und werden täglich gesichert.",
      "5. Unterauftragnehmer: E-Mail- und Zahlungsanbieter siehst du in den Einstellungen – in der Demo simuliert.",
      "6. Rechte der Gäste: Auskunfts- und Löschanfragen leitest du an uns weiter, wir helfen dir dabei.",
    ],
  },
}

/** Schritt 4 „Verträge“: AGB und AVV lesen (Sheet) und zustimmen. */
export function DashOnboardingStepContracts(p: { state: DashOnboardingPageState }) {
  const state = p.state
  const active = () => (state.readSheet.get() ? contractTexts[state.readSheet.get() as "agb" | "avv"] : null)

  const cards = [
    {
      id: "agb" as const,
      title: "AGB für Veranstalter",
      description: "Unsere Spielregeln für Verkauf, Auszahlung und Storno.",
      icon: mdiFileDocumentOutline,
      signal: state.termsAccepted,
    },
    {
      id: "avv" as const,
      title: "Auftragsverarbeitungsvertrag (AVV)",
      description: "So schützen wir die Daten deiner Gäste.",
      icon: mdiBookOpenOutline,
      signal: state.dpaAccepted,
    },
  ]

  return (
    <div class="flex flex-col gap-4">
      <DashSection
        title="Dein Einverständnis"
        description="Bitte lies beide Dokumente und stimme zu – erst dann geht es weiter."
      >
        <div class="flex flex-col gap-3">
          <For each={cards}>
            {(card) => (
              <div
                class={`flex items-start gap-3 rounded-card border p-4 ${card.signal.get() ? "border-success/50 bg-success/5" : "border-border-subtle bg-surface"}`}
              >
                <span class="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-content-muted">
                  <Icon path={card.icon} class="size-5" />
                </span>
                <div class="min-w-0 flex-1">
                  <Checkbox
                    id={`onboarding-${card.id}`}
                    checked={card.signal.get()}
                    onChange={(checked) => state.set(card.signal, checked)}
                  >
                    <span class="block text-sm font-semibold text-content">{card.title}</span>
                    <span class="block text-xs text-content-muted">{card.description}</span>
                  </Checkbox>
                  <div class="mt-2">
                    <Button
                      type="button"
                      variant={buttonVariant.outline}
                      class="h-9 px-3 text-sm"
                      onClick={() => state.readSheet.set(card.id)}
                    >
                      <Icon path={mdiBookOpenOutline} class="size-4" />
                      Lesen
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </For>
          <Show when={state.showErrors.get() && (!state.termsAccepted.get() || !state.dpaAccepted.get())}>
            <p class="text-xs text-danger dark:text-red-300" role="alert">
              Bitte stimme beiden Dokumenten zu, damit du fortfahren kannst.
            </p>
          </Show>
        </div>
      </DashSection>

      <Sheet
        open={state.readSheet.get() !== null}
        onOpenChange={(open) => {
          if (!open) state.readSheet.set(null)
        }}
        title={active()?.title ?? ""}
        description={active()?.short ?? ""}
        size="md"
        footer={
          <Button
            type="button"
            variant={buttonVariant.contrast}
            class="h-9 px-3 text-sm"
            onClick={() => {
              const sheet = state.readSheet.get()
              if (sheet === "agb") state.set(state.termsAccepted, true)
              if (sheet === "avv") state.set(state.dpaAccepted, true)
              state.readSheet.set(null)
            }}
          >
            Verstanden – zustimmen
          </Button>
        }
      >
        <div class="flex flex-col gap-3">
          <For each={active()?.paragraphs ?? []}>{(paragraph) => <p class="text-sm text-content">{paragraph}</p>}</For>
        </div>
      </Sheet>
    </div>
  )
}
