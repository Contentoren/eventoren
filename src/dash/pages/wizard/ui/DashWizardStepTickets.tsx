import { For, Show } from "solid-js"
import { mdiCashMultiple } from "@adaptive-ds/mdi/mdiCashMultiple.js"
import { mdiChevronDown } from "@adaptive-ds/mdi/mdiChevronDown.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { mdiTrashCanOutline } from "@adaptive-ds/mdi/mdiTrashCanOutline.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { Input } from "#ui/input/input/Input.jsx"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { ToggleSwitch } from "#ui/input/toggle/ToggleSwitch.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DashDateTimeInput } from "../../../ui/form/DashDateTimeInput.tsx"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashMoneyInput } from "../../../ui/form/DashMoneyInput.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashWizardPageState } from "../dashWizardPageStateCreate.ts"

type QuickKind = "standard" | "early" | "ermaessigt" | "kostenlos"

const quickChips: { id: QuickKind; label: string; hint: string }[] = [
  { id: "standard", label: "Standard", hint: "Eine Ticketart à 25 €" },
  { id: "early", label: "Early Bird + Regulär", hint: "Zwei Reihen mit Staffel" },
  { id: "ermaessigt", label: "Ermäßigt", hint: "Reduzierter Preis" },
  { id: "kostenlos", label: "Kostenlos", hint: "Freikarten-Kontingent" },
]

/** Schritt 2 „Tickets“: Schnellstart-Chips, Ticketreihen mit Preisphasen und Live-Rechnung. */
export function DashWizardStepTickets(p: { state: DashWizardPageState }) {
  const state = p.state
  const errors = () => (state.showErrors.get() ? state.ticketErrors() : {})

  return (
    <div class="flex flex-col gap-4">
      <DashSection title="Schnellstart" description="Ein Klick legt passende Ticketreihen an.">
        <div class="flex flex-wrap gap-2">
          <For each={quickChips}>
            {(chip) => (
              <Button
                type="button"
                variant={buttonVariant.outline}
                class="h-9 gap-1.5 px-3 text-sm"
                title={chip.hint}
                onClick={() => state.quickAdd(chip.id)}
              >
                <Icon path={mdiPlus} class="size-4" />
                {chip.label}
              </Button>
            )}
          </For>
        </div>
      </DashSection>

      <Show when={errors().tickets}>
        {(message) => (
          <p class="text-sm text-danger" role="alert">
            {message()}
          </p>
        )}
      </Show>

      <For each={state.tickets.get()}>
        {(row, index) => (
          <DashSection
            title={row.name.trim() || `Ticketart ${index() + 1}`}
            actions={
              <Button
                type="button"
                variant={buttonVariant.ghost}
                class="h-9 px-3 text-sm"
                onClick={() => state.removeTicket(index())}
                aria-label={`${row.name || "Ticketart"} entfernen`}
              >
                <Icon path={mdiTrashCanOutline} class="size-4" />
                Entfernen
              </Button>
            }
          >
            <div class="flex flex-col gap-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <DashField
                  label="Name"
                  for={`wizard-ticket-${index()}-name`}
                  required
                  error={errors()[`ticket-${index()}-name`]}
                >
                  <Input
                    id={`wizard-ticket-${index()}-name`}
                    class="h-10 text-sm"
                    value={row.name}
                    onInput={(event) => state.updateTicket(index(), { name: event.currentTarget.value })}
                    placeholder="z. B. Standard"
                  />
                </DashField>
                <DashField
                  label="Preis"
                  for={`wizard-ticket-${index()}-price`}
                  required
                  error={errors()[`ticket-${index()}-price`]}
                >
                  <DashMoneyInput
                    id={`wizard-ticket-${index()}-price`}
                    valueCents={row.priceCents}
                    onChange={(cents) => {
                      if (cents === null) return
                      const phases = row.phases.map((phase, phaseIndex) =>
                        phaseIndex === 0 ? { ...phase, priceCents: cents } : phase,
                      )
                      state.updateTicket(index(), { priceCents: cents, phases })
                    }}
                    invalid={errors()[`ticket-${index()}-price`] !== undefined}
                  />
                </DashField>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <DashField
                  label="Kontingent"
                  for={`wizard-ticket-${index()}-capacity`}
                  required
                  error={errors()[`ticket-${index()}-capacity`]}
                >
                  <Input
                    id={`wizard-ticket-${index()}-capacity`}
                    type="number"
                    min={1}
                    step={1}
                    class="h-10 text-sm tabular-nums"
                    value={row.capacity}
                    onInput={(event) => {
                      const raw = event.currentTarget.value
                      state.updateTicket(index(), { capacity: raw === "" ? 0 : Number(raw) })
                    }}
                    placeholder="100"
                  />
                </DashField>
                <Show
                  when={!state.smallBusiness()}
                  fallback={<p class="text-sm text-content-muted">Kleinunternehmer – keine USt.</p>}
                >
                  <DashField label="Steuersatz">
                    <SegmentedControl
                      value={String(row.taxRateBps)}
                      onChange={(value) => state.updateTicket(index(), { taxRateBps: value === "1900" ? 1900 : 700 })}
                      options={[
                        { value: "1900", label: "19 %" },
                        { value: "700", label: "7 %" },
                      ]}
                      ariaLabel={`Steuersatz für ${row.name || `Ticketart ${index() + 1}`}`}
                      size="sm"
                    />
                  </DashField>
                </Show>
              </div>
              <ToggleSwitch
                checked={row.hidden}
                onChange={(checked) => state.updateTicket(index(), { hidden: checked })}
                label="Versteckt"
                description="Nur mit Zugangscode sichtbar."
              />
              <div class="rounded-control border border-border-subtle">
                <Button
                  type="button"
                  variant={buttonVariant.ghost}
                  class="h-9 w-full justify-between px-3 text-sm"
                  aria-expanded={row.phasesExpanded}
                  onClick={() => state.updateTicket(index(), { phasesExpanded: !row.phasesExpanded })}
                >
                  <span>Preisphasen ({row.phases.length})</span>
                  <Icon
                    path={mdiChevronDown}
                    class={`size-4 transition-transform ${row.phasesExpanded ? "rotate-180" : ""}`}
                  />
                </Button>
                <Show when={row.phasesExpanded}>
                  <div class="flex flex-col gap-3 border-t border-border-subtle p-3">
                    <For each={row.phases}>
                      {(phase, phaseIndex) => (
                        <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)_auto]">
                          <DashField
                            label="Phasenname"
                            error={errors()[`ticket-${index()}-phase-${phaseIndex()}-name`]}
                          >
                            <Input
                              class="h-9 text-sm"
                              value={phase.name}
                              onInput={(event) => {
                                const phases = row.phases.map((candidate, current) =>
                                  current === phaseIndex()
                                    ? { ...candidate, name: event.currentTarget.value }
                                    : candidate,
                                )
                                state.updateTicket(index(), { phases })
                              }}
                            />
                          </DashField>
                          <DashField label="Preis" error={errors()[`ticket-${index()}-phase-${phaseIndex()}-price`]}>
                            <DashMoneyInput
                              valueCents={phase.priceCents}
                              onChange={(cents) => {
                                if (cents === null) return
                                const phases = row.phases.map((candidate, current) =>
                                  current === phaseIndex() ? { ...candidate, priceCents: cents } : candidate,
                                )
                                const patch: Partial<typeof row> = { phases }
                                if (phaseIndex() === 0) patch.priceCents = cents
                                state.updateTicket(index(), patch)
                              }}
                            />
                          </DashField>
                          <DashField label="Endet am">
                            <DashDateTimeInput
                              valueIso={phase.endsAt}
                              onChange={(iso) => {
                                const phases = row.phases.map((candidate, current) =>
                                  current === phaseIndex() ? { ...candidate, endsAt: iso } : candidate,
                                )
                                state.updateTicket(index(), { phases })
                              }}
                            />
                          </DashField>
                          <div class="flex items-end gap-2">
                            <DashField label="Kontingent">
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                class="h-9 text-sm tabular-nums"
                                value={phase.quota ?? ""}
                                onInput={(event) => {
                                  const raw = event.currentTarget.value
                                  const phases = row.phases.map((candidate, current) =>
                                    current === phaseIndex()
                                      ? { ...candidate, quota: raw === "" ? null : Number(raw) }
                                      : candidate,
                                  )
                                  state.updateTicket(index(), { phases })
                                }}
                                placeholder="∞"
                              />
                            </DashField>
                            <Show when={row.phases.length > 1}>
                              <Button
                                type="button"
                                variant={buttonVariant.ghost}
                                class="h-9 px-2 text-sm"
                                aria-label={`Phase ${phase.name || phaseIndex() + 1} entfernen`}
                                onClick={() => {
                                  state.updateTicket(index(), {
                                    phases: row.phases.filter((_, current) => current !== phaseIndex()),
                                  })
                                }}
                              >
                                <Icon path={mdiTrashCanOutline} class="size-4" />
                              </Button>
                            </Show>
                          </div>
                        </div>
                      )}
                    </For>
                    <div>
                      <Button
                        type="button"
                        variant={buttonVariant.outline}
                        class="h-9 gap-1.5 px-3 text-sm"
                        onClick={() => {
                          state.updateTicket(index(), {
                            phases: [
                              ...row.phases,
                              {
                                name: `Phase ${row.phases.length + 1}`,
                                priceCents: row.priceCents,
                                endsAt: null,
                                quota: null,
                              },
                            ],
                          })
                        }}
                      >
                        <Icon path={mdiPlus} class="size-4" />
                        Phase hinzufügen
                      </Button>
                    </div>
                  </div>
                </Show>
              </div>
              <p class="text-sm text-content-muted">
                <Icon path={mdiCashMultiple} class="mr-1 inline size-4 align-text-bottom" />
                {state.feeLine(row.phases[0]?.priceCents ?? row.priceCents)}
              </p>
            </div>
          </DashSection>
        )}
      </For>

      <div>
        <Button
          type="button"
          variant={buttonVariant.outline}
          class="h-9 gap-1.5 px-3 text-sm"
          onClick={() =>
            state.addTicketRow({
              name: "",
              priceCents: 2500,
              capacity: 100,
              taxRateBps: state.defaultRate(),
              hidden: false,
              phasesExpanded: false,
              phases: [{ name: "Regulär", priceCents: 2500, endsAt: null, quota: null }],
            })
          }
        >
          <Icon path={mdiPlus} class="size-4" />
          Ticketart hinzufügen
        </Button>
      </div>
    </div>
  )
}
