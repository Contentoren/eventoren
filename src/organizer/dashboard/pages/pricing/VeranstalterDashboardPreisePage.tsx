import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { InputDateTime } from "#ui/input/datetime/InputDateTime.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { VeranstalterDashboardPageFrame } from "../../ui/VeranstalterDashboardPageFrame.tsx"
import { veranstalterDashboardPreiseMoneyFormat } from "./veranstalterDashboardPreiseMoneyFormat.ts"
import { veranstalterDashboardPreiseTimeFormat } from "./veranstalterDashboardPreiseTimeFormat.ts"
import { veranstalterDashboardPreisePageStateCreate } from "./veranstalterDashboardPreisePageStateCreate.ts"
import type { VeranstalterDashboardPreiseSearch } from "./veranstalterDashboardPreiseSearchParse.ts"

export function VeranstalterDashboardPreisePage(p: {
  search: () => VeranstalterDashboardPreiseSearch
  changeSearch: (search: VeranstalterDashboardPreiseSearch) => void
  eventKey: () => string
}) {
  const state = veranstalterDashboardPreisePageStateCreate(p)
  return (
    <VeranstalterDashboardPageFrame state={state.page.shell}>
      <div class="flex flex-col gap-5">
        <header>
          <h1 class="text-xl font-semibold">Preise & Codes</h1>
          <p class="text-sm text-content-muted">
            Automatische Preisphasen je Ticketart sowie Rabatt- und Zugangscodes. Alle Zeiten in Europe/Berlin, alle
            Beträge in Euro.
          </p>
        </header>
        <Show when={state.message()}>
          <p class="text-sm" aria-live="polite">
            {state.message()}
          </p>
        </Show>
        <Show when={state.canTickets()} fallback={<p>Keine Berechtigung: Preisphasen brauchen tickets.bearbeiten.</p>}>
          <Show
            when={(() => {
              const data = state.phases()
              return data && "success" in data && data.success ? data.data : undefined
            })()}
            fallback={<p role="alert">{state.scopeError() ?? "Preisphasen werden geladen …"}</p>}
          >
            {(tiers) => (
              <section class="flex flex-col gap-2">
                <h2 class="font-semibold">Preisphasen</h2>
                <For each={tiers()}>
                  {(tier) => (
                    <article class="flex flex-col gap-1 rounded-card border border-border-subtle bg-surface p-4">
                      <div class="flex items-center gap-2">
                        <h3 class="font-semibold">{tier.tierKey}</h3>
                        <span class="text-xs text-content-muted">
                          {tier.activeState === "aktiv"
                            ? `Aktiv: ${tier.phases.find((phase) => phase.phaseKey === tier.activePhaseKey)?.name ?? "—"}`
                            : tier.activeState}
                        </span>
                      </div>
                      <For each={tier.phases}>
                        {(phase) => (
                          <div class="flex flex-wrap items-center gap-2 text-sm">
                            <span>
                              {phase.name} · {veranstalterDashboardPreiseMoneyFormat(phase.priceCents)}
                            </span>
                            <Show when={phase.endsAt}>
                              <span class="text-xs text-content-muted">
                                bis {veranstalterDashboardPreiseTimeFormat(phase.endsAt as string)}
                              </span>
                            </Show>
                            <Show when={phase.quota !== null}>
                              <span class="text-xs text-content-muted">
                                {phase.soldCount} / {phase.quota} verkauft
                              </span>
                            </Show>
                            <Show when={phase.phaseKey === tier.activePhaseKey}>
                              <span class="text-xs font-semibold">aktiv</span>
                            </Show>
                            <Button
                              type="button"
                              onClick={() => void state.archivePhase(phase.phaseId)}
                              disabled={state.busy()}
                            >
                              Archivieren
                            </Button>
                          </div>
                        )}
                      </For>
                    </article>
                  )}
                </For>
                <form onSubmit={state.createPhase} class="flex flex-col gap-2">
                  <h3 class="font-semibold">Phase anlegen</h3>
                  <Input
                    aria-label="Ticketart-Schlüssel"
                    placeholder="Ticketart, z. B. standard"
                    value={state.phaseTier.get()}
                    onInput={(e) => state.phaseTier.set(e.currentTarget.value)}
                    disabled={state.busy()}
                  />
                  <Input
                    aria-label="Phasenname"
                    placeholder="Name, z. B. Early Bird"
                    value={state.phaseName.get()}
                    onInput={(e) => state.phaseName.set(e.currentTarget.value)}
                    disabled={state.busy()}
                  />
                  <Input
                    aria-label="Preis in Euro"
                    placeholder="Preis in Euro, z. B. 15,00"
                    value={state.phasePrice.get()}
                    onInput={(e) => state.phasePrice.set(e.currentTarget.value)}
                    disabled={state.busy()}
                  />
                  <InputDateTime
                    value={state.phaseEndsAt.get()}
                    onInput={(value) => state.phaseEndsAt.set(value)}
                    disabled={state.busy()}
                  />
                  <Input
                    aria-label="Kontingent (optional)"
                    placeholder="Kontingent, z. B. 100"
                    value={state.phaseQuota.get()}
                    onInput={(e) => state.phaseQuota.set(e.currentTarget.value)}
                    disabled={state.busy()}
                  />
                  <Button type="submit" disabled={state.busy()}>
                    Phase speichern
                  </Button>
                </form>
              </section>
            )}
          </Show>
        </Show>
        <Show when={state.canCodes()} fallback={<p>Keine Berechtigung: Codes brauchen codes.bearbeiten.</p>}>
          <Show
            when={(() => {
              const data = state.codes()
              return data && "success" in data && data.success ? data.data : undefined
            })()}
            fallback={<p role="alert">{state.scopeError() ?? "Codes werden geladen …"}</p>}
          >
            {(result) => (
              <section class="flex flex-col gap-2">
                <h2 class="font-semibold">Codes</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Art</th>
                      <th>Wert</th>
                      <th>Nutzung</th>
                      <th>Aktiv</th>
                      <th>Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={result().page}>
                      {(row) => (
                        <tr>
                          <td>{row.code}</td>
                          <td>{row.kind}</td>
                          <td>
                            {row.discountType === "prozent" && row.discountValue !== null
                              ? `${(row.discountValue / 100).toFixed(1)} %`
                              : row.discountType === "betrag" && row.discountValue !== null
                                ? veranstalterDashboardPreiseMoneyFormat(row.discountValue)
                                : row.tierKeys.join(", ")}
                          </td>
                          <td>
                            {row.usedTickets}
                            {row.maxTickets !== null ? ` / ${row.maxTickets}` : ""}
                          </td>
                          <td>{row.active ? "ja" : "nein"}</td>
                          <td>
                            <Button
                              type="button"
                              onClick={() => void state.toggleCode(row.codeId, row.active)}
                              disabled={state.busy()}
                            >
                              Umschalten
                            </Button>{" "}
                            <Button
                              type="button"
                              onClick={() => void state.deleteCode(row.codeId)}
                              disabled={state.busy()}
                            >
                              Löschen
                            </Button>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
                <form onSubmit={state.createCode} class="flex flex-col gap-2">
                  <h3 class="font-semibold">Code anlegen</h3>
                  <label class="text-sm font-medium" for="preise-code-kind">
                    Code-Art
                  </label>
                  <SelectSingleNative
                    id="preise-code-kind"
                    valueSignal={state.codeKind}
                    getOptions={() => ["rabatt", "zugang"]}
                  />
                  <Input
                    aria-label="Code (optional, leer = zufällig)"
                    placeholder="Code, z. B. JAZZ10"
                    value={state.codeValue.get()}
                    onInput={(e) => state.codeValue.set(e.currentTarget.value)}
                    disabled={state.busy()}
                  />
                  <Show when={state.codeKind.get() === "rabatt"}>
                    <label class="text-sm font-medium" for="preise-discount-type">
                      Rabatt-Art
                    </label>
                    <SelectSingleNative
                      id="preise-discount-type"
                      valueSignal={state.codeDiscountType}
                      getOptions={() => ["prozent", "betrag"]}
                    />
                    <Input
                      aria-label="Rabattwert"
                      placeholder="Prozent oder Euro, z. B. 10 oder 5,00"
                      value={state.codeDiscountValue.get()}
                      onInput={(e) => state.codeDiscountValue.set(e.currentTarget.value)}
                      disabled={state.busy()}
                    />
                  </Show>
                  <Input
                    aria-label="Ticketarten (Kommaliste)"
                    placeholder="Ticketarten, z. B. schueler, lehrer"
                    value={state.codeTiers.get()}
                    onInput={(e) => state.codeTiers.set(e.currentTarget.value)}
                    disabled={state.busy()}
                  />
                  <Input
                    aria-label="Max. Tickets (optional)"
                    placeholder="Limit, z. B. 60"
                    value={state.codeMaxTickets.get()}
                    onInput={(e) => state.codeMaxTickets.set(e.currentTarget.value)}
                    disabled={state.busy()}
                  />
                  <Button type="submit" disabled={state.busy()}>
                    Code speichern
                  </Button>
                </form>
                <form onSubmit={state.createBulkCodes} class="flex flex-col gap-2">
                  <h3 class="font-semibold">Mehrere Codes erstellen</h3>
                  <Input
                    aria-label="Präfix"
                    placeholder="Präfix, z. B. ABI-"
                    value={state.bulkPrefix.get()}
                    onInput={(e) => state.bulkPrefix.set(e.currentTarget.value)}
                    disabled={state.busy()}
                  />
                  <Input
                    aria-label="Anzahl"
                    placeholder="Anzahl, z. B. 10"
                    value={state.bulkCount.get()}
                    onInput={(e) => state.bulkCount.set(e.currentTarget.value)}
                    disabled={state.busy()}
                  />
                  <Button type="submit" disabled={state.busy()}>
                    Codes erstellen
                  </Button>
                </form>
              </section>
            )}
          </Show>
        </Show>
      </div>
    </VeranstalterDashboardPageFrame>
  )
}
