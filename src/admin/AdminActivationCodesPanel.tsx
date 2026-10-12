import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { EventTicketTier } from "../events/EventTicketTier.ts"
import { UiBadge } from "../ui/UiBadge.tsx"
import { adminActivationCodesStateCreate } from "./adminActivationCodesStateCreate.ts"

export function AdminActivationCodesPanel(props: {
  readonly eventKey: () => string | undefined
  readonly tiers: () => readonly EventTicketTier[]
}) {
  const state = adminActivationCodesStateCreate({ eventKey: props.eventKey, tiers: props.tiers })
  return (
    <CardWrapper class="flex flex-col gap-5 rounded-xl border-0 shadow-lg shadow-slate-900/10 dark:shadow-black/30">
      <div class="flex flex-col gap-1">
        <h2 class="text-lg font-semibold text-content">Freischaltungscodes</h2>
        <p class="text-sm text-content-muted">
          Codes je Ticketprodukt erzeugen und Bestand mit Status sowie Bestellzuordnung prüfen. Das Erzeugen schaltet
          die Codepflicht nicht ein; sie wird unter „Ticketprodukte“ verwaltet.
        </p>
      </div>

      <Show
        when={state.tiers().length > 0}
        fallback={<p class="text-sm text-content-muted">Für dieses Event gibt es noch keine Ticketprodukte.</p>}
      >
        <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div class="flex flex-col gap-1.5">
            <Label for="activation-code-tier">Ticketprodukt</Label>
            <SelectSingleNative
              id="activation-code-tier"
              valueSignal={{ get: state.selectedTierKey, set: state.selectTier }}
              getOptions={() => state.tiers().map((tier) => tier.id)}
              valueText={state.tierName}
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="activation-code-status">Status</Label>
            <SelectSingleNative
              id="activation-code-status"
              valueSignal={{
                get: state.statusFilter,
                set: (value: string) => state.selectStatus(value as "" | "available" | "reserved" | "consumed"),
              }}
              getOptions={() => ["", "available", "reserved", "consumed"]}
              valueText={(value) =>
                value === "" ? "Alle" : state.statusLabel(value as "available" | "reserved" | "consumed")
              }
            />
          </div>
        </div>

        <Show when={state.selectedTier() && !(state.selectedTier()?.activationCodeRequired ?? false)}>
          <p role="note" class="rounded-md bg-warning-soft px-4 py-3 text-sm text-warning">
            Für „{state.selectedTier()?.name}“ ist die Codepflicht derzeit ausgeschaltet. Erzeugte Codes werden erst
            benötigt, wenn die Pflicht unter „Ticketprodukte“ aktiviert wird.
          </p>
        </Show>

        <form
          class="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            void state.generate()
          }}
        >
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label for="activation-code-count">Anzahl erzeugen (1–{state.countMax})</Label>
            <Input
              id="activation-code-count"
              type="number"
              min="1"
              max={state.countMax}
              inputMode="numeric"
              value={state.countInput.get()}
              onInput={(event) => state.countInput.set(event.currentTarget.value)}
              class="min-h-11"
            />
          </div>
          <Button type="submit" disabled={state.generatePending()} class="min-h-11 sm:w-auto">
            {state.generatePending() ? "Wird erzeugt …" : "Codes erzeugen"}
          </Button>
        </form>

        <Show when={state.feedback()}>
          <p role="status" class="rounded-md bg-success-soft px-4 py-3 text-sm text-success">
            {state.feedback()}
          </p>
        </Show>
        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void state.exportCsv()}
              disabled={state.exportPending() || !state.selectedTier()}
              class="min-h-11"
            >
              {state.exportPending() ? "Wird exportiert …" : "CSV exportieren"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void state.exportPdf()}
              disabled={state.exportPending() || !state.selectedTier()}
              class="min-h-11"
            >
              {state.exportPending() ? "Wird exportiert …" : "PDF exportieren"}
            </Button>
          </div>
          <Show when={state.statusFilter() !== ""}>
            <p class="text-xs text-content-muted">
              Der Export enthält immer alle Codes des ausgewählten Produkts in Nummernreihenfolge – unabhängig vom
              aktiven Statusfilter.
            </p>
          </Show>
        </div>
        <Show when={state.errorMessage()}>
          <div class="flex flex-wrap items-center gap-3">
            <p role="alert" class="flex-1 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
              {state.errorMessage()}
            </p>
            <Button size="sm" variant="outline" onClick={state.reload}>
              Erneut versuchen
            </Button>
          </div>
        </Show>

        <Show
          when={state.codes().length > 0 || state.isDone()}
          fallback={
            <p role="status" class="py-4 text-center text-sm text-content-muted">
              Codes werden geladen …
            </p>
          }
        >
          <Show
            when={state.codes().length > 0}
            fallback={
              <p class="py-4 text-center text-sm text-content-muted">
                Noch keine Codes für diese Auswahl. Über das Formular oben Bestand erzeugen.
              </p>
            }
          >
            <div class="overflow-x-auto rounded-lg border border-border-subtle">
              <table class="w-full caption-bottom text-sm">
                <thead class="[&_tr]:border-b">
                  <tr class="border-b">
                    <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nummer</th>
                    <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Code</th>
                    <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                    <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Bestellung</th>
                    <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Kunde</th>
                  </tr>
                </thead>
                <tbody class="[&_tr:last-child]:border-0">
                  <For each={state.codes()}>
                    {(code) => (
                      <tr class="border-b transition-colors hover:bg-muted/50">
                        <td class="p-4 align-middle tabular-nums">{code.number}</td>
                        <td class="p-4 align-middle font-mono font-semibold tracking-wider">{code.code}</td>
                        <td class="p-4 align-middle">
                          <UiBadge tone={state.statusTone(code.status)} class="ring-0">
                            {state.statusLabel(code.status)}
                          </UiBadge>
                        </td>
                        <td class="p-4 align-middle">{state.orderLabel(code)}</td>
                        <td class="p-4 align-middle">{state.customerLabel(code)}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
            <Show when={!state.isDone()}>
              <Button variant="outline" onClick={state.loadMore} disabled={state.isLoading()}>
                {state.isLoading() ? "Wird geladen …" : "Weitere laden"}
              </Button>
            </Show>
          </Show>
        </Show>
      </Show>
    </CardWrapper>
  )
}
